"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
import {
  budgetTotals,
  todayISO,
  uid,
  type Celebration,
  type Task,
} from "@/lib/planner";

import {
  chatReplySchema,
  readApiResponse,
  SIGN_IN_PATH,
} from "@/lib/api-client";
import { useDialog } from "./ui";

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
  requiresSignIn = false,
  close,
  addTask,
}: {
  event: Celebration;
  prompt: string;
  liveAI: boolean;
  requiresSignIn?: boolean;
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
  const drawer = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const cancelled = useRef(false);
  useDialog(drawer, close);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  const sendPrompt = useEffectEvent((text: string) => {
    void send(text);
  });
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed && prompt && !started.current) {
        started.current = true;
        sendPrompt(prompt);
      }
    });
    return () => {
      disposed = true;
    };
  }, [prompt]);
  async function send(text: string) {
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true;
    cancelled.current = false;
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
    const activeController = new AbortController();
    controller.current = activeController;
    const timeout = setTimeout(() => activeController.abort(), 35000);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          mode: requiresSignIn ? "built-in" : "auto",
          event: {
            name: event.name,
            type: event.type,
            date: event.date,
            location: event.location,
            budget: event.budget,
            guestCount: event.guestCount,
            vibe: event.vibe,
          },
          spending: budgetTotals(event).recorded,
          tasks: event.tasks
            .filter((t) => !t.done)
            .slice(0, 8)
            .map((t) => ({ title: t.title, date: t.date })),
          messages: next
            .filter((m) => m.id !== "welcome")
            .slice(-8)
            .map(({ role, text }) => ({ role, text: text.slice(0, 2000) })),
        }),
        signal: activeController.signal,
      });
      const data = chatReplySchema.parse(await readApiResponse(response));
      if (!mounted.current || activeController.signal.aborted) return;
      const reply = data.text;
      setMessages((current) => [
        ...current,
        { id: uid(), role: "assistant", text: reply, source: data.source },
      ]);
    } catch (err) {
      if (!mounted.current) return;
      setError(
        cancelled.current
          ? "Response cancelled. You can try another question."
          : activeController.signal.aborted
            ? "That took a little too long. Try again in a moment."
            : err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  return (
    <section
      ref={drawer}
      tabIndex={-1}
      aria-modal="true"
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
            {liveAI && !requiresSignIn
              ? "Powered by Gemini"
              : "Built-in planning companion"}
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
      <div
        className="assistant-messages"
        role="log"
        aria-label="Planning conversation"
        aria-live="polite"
        aria-relevant="additions text"
      >
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
          <div className="thinking" role="status">
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
        {requiresSignIn && (
          <p className="signin-note">
            <a href={SIGN_IN_PATH} target="_top">
              Sign in with ChatGPT
            </a>{" "}
            for live Gemini ideas. Built-in guidance is ready now.
          </p>
        )}
        {busy && (
          <button
            className="text-button"
            onClick={() => {
              cancelled.current = true;
              controller.current?.abort();
            }}
          >
            Cancel response
          </button>
        )}
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
    </section>
  );
}
function HeartIcon() {
  return <span className="context-flower">✿</span>;
}
