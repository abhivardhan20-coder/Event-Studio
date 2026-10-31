import { describe, expect, it, vi } from "vitest";
import { buildChatBody, type ChatTurn } from "../lib/chat-request";
import { MAX_REQUEST_BYTES, MAX_CHAT_MESSAGES } from "../lib/request-limits";
import { seedStore } from "../lib/seed";
import { todayISO, dateOffset } from "../lib/format";
import { requestSchema } from "../lib/server/schemas";
import { createPlannerApi } from "../lib/server/planner-api";
import { chatReplySchema } from "../lib/api-client";

describe("assistant request context", () => {
  it("includes an urgent task appended after eight later tasks and skips completed work", () => {
    const event = seedStore().events[0];
    const task = event.tasks[0];
    event.tasks = Array.from({ length: 9 }, (_, index) => ({
      ...task,
      id: `later-${index}`,
      title: `Later task ${index}`,
      date: dateOffset(todayISO(), index + 10),
      done: false,
    }));
    event.tasks.push({
      ...task,
      id: "urgent",
      title: "Urgent permit",
      date: todayISO(),
      done: false,
    });
    event.tasks.push({
      ...task,
      id: "completed",
      title: "Already complete",
      date: "2000-01-01",
      done: true,
    });
    const before = structuredClone(event);
    const payload = requestSchema.parse(
      JSON.parse(
        buildChatBody(event, [{ role: "user", text: "What next?" }], "auto"),
      ),
    );
    if (payload.action !== "chat") throw new Error("Expected chat");
    expect(payload.tasks).toHaveLength(8);
    expect(payload.tasks[0].title).toBe("Urgent permit");
    expect(
      payload.tasks.some((item) => item.title === "Already complete"),
    ).toBe(false);
    expect(event).toEqual(before);
  });

  it("fits a long multilingual conversation through the actual API without dropping the latest question", async () => {
    const event = seedStore().events[0];
    const history: ChatTurn[] = Array.from({ length: 7 }, (_, index) => ({
      role: index % 2 === 0 ? "assistant" : "user",
      text: "अ".repeat(2000),
    }));
    const question = "How much money do I have left?";
    history.push({ role: "user", text: question });
    const before = structuredClone(history);
    expect(
      new TextEncoder().encode(JSON.stringify({ messages: history }))
        .byteLength,
    ).toBeGreaterThan(MAX_REQUEST_BYTES);
    const body = buildChatBody(event, history, "built-in");
    expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(
      MAX_REQUEST_BYTES,
    );
    const payload = JSON.parse(body);
    expect(payload.messages.at(-1)).toEqual({ role: "user", text: question });
    expect(payload.messages[0].role).toBe("user");
    expect(payload.messages.length).toBeLessThan(MAX_CHAT_MESSAGES);
    expect(history).toEqual(before);
    const generate = vi.fn();
    const api = createPlannerApi({
      configuration: () => ({ model: "unused" }),
      generate,
      limiter: { consume: async () => ({ allowed: true, retryAfter: 0 }) },
    });
    const response = await api.POST(
      new Request("https://gather.example/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );
    expect(response.status).toBe(200);
    expect(chatReplySchema.parse(await response.json()).text).toContain(
      "₹4,76,000",
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("bounds JSON escape expansion while retaining the latest question", () => {
    const event = seedStore().events[0];
    event.name = "\ud800".repeat(100);
    event.location = "\ud800".repeat(120);
    event.vibe = "\ud800".repeat(300);
    event.tasks = Array.from({ length: 8 }, (_, index) => ({
      ...event.tasks[0],
      id: `escaped-${index}`,
      title: "\ud800".repeat(200),
      date: dateOffset(todayISO(), index),
      done: false,
    }));
    const question = "\ud800".repeat(2000);
    const raw = buildChatBody(
      event,
      [{ role: "user", text: question }],
      "auto",
    );
    const payload = requestSchema.parse(JSON.parse(raw));
    if (payload.action !== "chat") throw new Error("Expected chat");
    expect(new TextEncoder().encode(raw).byteLength).toBeLessThanOrEqual(
      MAX_REQUEST_BYTES,
    );
    expect(payload.messages[0].text).toBe(question);
    expect(payload.tasks.length).toBeLessThan(8);
  });

  it("excludes contact records and clips per-message characters and history to the shared contract", () => {
    const event = seedStore().events[0];
    event.guests[0].email = "private-guest@example.com";
    event.vendors[0].contact = "private-vendor@example.com";
    const history: ChatTurn[] = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? "assistant" : "user",
      text: "x".repeat(2100),
    }));
    const raw = buildChatBody(event, history, "auto");
    const payload = requestSchema.parse(JSON.parse(raw));
    if (payload.action !== "chat") throw new Error("Expected chat");
    expect(payload.messages.length).toBeLessThanOrEqual(MAX_CHAT_MESSAGES);
    expect(payload.messages.every((turn) => turn.text.length === 2000)).toBe(
      true,
    );
    expect(raw).not.toContain("private-guest@example.com");
    expect(raw).not.toContain("private-vendor@example.com");
    expect(payload.event).not.toHaveProperty("guests");
    expect(payload.event).not.toHaveProperty("vendors");
  });

  it.each([
    { turns: [] as ChatTurn[] },
    { turns: [{ role: "assistant" as const, text: "Reply only" }] },
  ])("rejects a conversation without a final user question", ({ turns }) => {
    expect(() => buildChatBody(seedStore().events[0], turns, "auto")).toThrow(
      /Enter a question/,
    );
  });

  it("reports oversized invalid context before sending a request", () => {
    const event = seedStore().events[0];
    event.vibe = "x".repeat(MAX_REQUEST_BYTES);
    expect(() =>
      buildChatBody(event, [{ role: "user", text: "Help" }], "auto"),
    ).toThrow(/shorten your event details/);
  });
});
