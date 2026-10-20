"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronRight,
  Leaf,
  LoaderCircle,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { todayISO, uid, type Celebration, type Task } from "@/lib/planner";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
  actionAdded?: boolean;
}
export function Assistant({
  event,
  prompt,
  liveAI,
  close,
  addTask,
}: {
  event: Celebration;
  prompt: string;
  liveAI: boolean;
  close: () => void;
  addTask: (task: Task) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hello, let’s make ${event.name} feel a little more you. I can help with your budget, thoughtful ideas, vendor questions, or the next little step. What’s on your mind?`,
    },
  ]);
  const [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const scroll = useRef<HTMLDivElement>(null),
    controller = useRef<AbortController | null>(null),
    started = useRef(false),
    inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (prompt && !started.current) {
      started.current = true;
      void send(prompt);
    }
  }, [prompt]);
  async function send(text: string) {
    if (busy || !text.trim()) return;
    const next =
      messages.at(-1)?.role === "user" && messages.at(-1)?.text === text.trim()
        ? messages
        : [
            ...messages,
            { id: uid(), role: "user" as const, text: text.trim() },
          ];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 35000);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          event: {
            name: event.name,
            type: event.type,
            date: event.date,
            location: event.location,
            budget: event.budget,
            guestCount: event.guestCount,
            vibe: event.vibe,
          },
          spending: event.expenses.reduce((s, e) => s + e.amount, 0),
          tasks: event.tasks
            .filter((t) => !t.done)
            .slice(0, 8)
            .map((t) => ({ title: t.title, date: t.date })),
          messages: next
            .filter((m) => m.id !== "welcome")
            .slice(-8)
            .map(({ role, text }) => ({ role, text: text.slice(0, 2000) })),
        }),
        signal: controller.current.signal,
      });
      const data = (await response.json()) as {
        error?: string;
        text?: string;
        source?: string;
      };
      if (!response.ok)
        throw new Error(
          data.error ?? "We couldn’t reach your planning companion.",
        );
      if (typeof data.text !== "string" || !data.text.trim())
        throw new Error("No idea came through. Please try again.");
      const reply = data.text;
      setMessages((current) => [
        ...current,
        { id: uid(), role: "assistant", text: reply, source: data.source },
      ]);
    } catch (err) {
      setError(
        controller.current.signal.aborted
          ? "That took a little too long. Try again in a moment."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  return (
    <aside
      className="assistant-drawer"
      role="dialog"
      aria-label="Gather planning assistant"
    >
      <div className="assistant-header">
        <span className="assistant-header-icon">
          <Sparkles size={22} />
        </span>
        <div>
          <h2>A little help from Gather</h2>
          <span>
            <i />
            {liveAI ? "Powered by Gemini" : "Built-in planning companion"}
          </span>
        </div>
        <button
          className="icon-button"
          aria-label="Close assistant"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      <div className="assistant-context">
        <HeartIcon />
        <span>
          Planning for <strong>{event.name}</strong>
        </span>
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message) => (
          <div className={`chat-message ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span className="chat-icon">
                <Sparkles size={15} />
              </span>
            )}
            <div>
              <div className="message-text">
                {message.text.split("\n").map((line, i) => (
                  <p key={i}>{line.replace(/\*\*/g, "") || "\u00a0"}</p>
                ))}
              </div>
              {message.source && (
                <span className="message-source">
                  {message.source === "gemini"
                    ? "A little inspiration from Gemini"
                    : "Built-in guidance · connect Gemini for live AI"}
                </span>
              )}
              {message.source && (
                <button
                  className="chat-save"
                  disabled={message.actionAdded}
                  onClick={() => {
                    addTask({
                      id: uid(),
                      title: `Follow up: ${messages[messages.indexOf(message) - 1]?.text.slice(0, 130) ?? "Gather’s suggestion"}`,
                      category: "Other",
                      date: todayISO(),
                      done: false,
                    });
                    setMessages((current) =>
                      current.map((m) =>
                        m.id === message.id ? { ...m, actionAdded: true } : m,
                      ),
                    );
                  }}
                >
                  {message.actionAdded ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}{" "}
                  {message.actionAdded
                    ? "Follow-up added"
                    : "Add a follow-up task"}
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="thinking">
            <Sparkles size={16} />
            <span>A little thought goes a long way</span>
            <LoaderCircle size={15} className="spin" />
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => {
                const last = messages.filter((m) => m.role === "user").at(-1);
                if (last) void send(last.text);
              }}
            >
              Try again
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        <div ref={scroll} />
      </div>
      <div className="assistant-bottom">
        {messages.length < 3 && (
          <div className="prompt-chips">
            {[
              "Personalize my budget",
              "What should I do next?",
              "Find my celebration style",
            ].map((q) => (
              <button key={q} disabled={busy} onClick={() => void send(q)}>
                {q}
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={submit}>
          <input
            ref={inputRef}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            placeholder="A big idea or a little question…"
            aria-label="Message your planning assistant"
            disabled={busy}
          />
          <button
            disabled={busy || !input.trim()}
            type="submit"
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </form>
        <span className="assistant-disclaimer">
          <Leaf size={11} />
          Ideas to inspire. Confirm prices and details locally.
        </span>
      </div>
    </aside>
  );
}
function HeartIcon() {
  return <span className="context-flower">✿</span>;
}
