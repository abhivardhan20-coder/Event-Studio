import { budgetTotals } from "./budget.ts";
import type { Celebration } from "./model.ts";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_CHAT_TASKS,
  MAX_REQUEST_BYTES,
} from "./request-limits.ts";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Keep a recent, contiguous conversation that fits the server's UTF-8 limit. */
export function buildChatBody(
  event: Celebration,
  turns: readonly ChatTurn[],
  mode: "auto" | "built-in",
) {
  const messages = turns
    .slice(-MAX_CHAT_MESSAGES)
    .map(({ role, text }) => ({
      role,
      text: text.trim().slice(0, MAX_CHAT_MESSAGE_CHARS),
    }))
    .filter(({ text }) => text.length > 0);
  const discardLeadingReplies = () => {
    while (messages[0]?.role === "assistant") messages.shift();
  };
  discardLeadingReplies();
  if (messages.at(-1)?.role !== "user")
    throw new Error("Enter a question for your planning assistant.");

  const body = {
    action: "chat" as const,
    mode,
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
      .filter((task) => !task.done)
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, MAX_CHAT_TASKS)
      .map(({ title, date }) => ({ title, date })),
    messages,
  };
  const encoder = new TextEncoder();
  let raw = JSON.stringify(body);
  while (encoder.encode(raw).byteLength > MAX_REQUEST_BYTES) {
    if (messages.length > 1) {
      messages.shift();
      discardLeadingReplies();
    } else if (body.tasks.length) {
      // Retain the complete latest question and the most urgent tasks.
      body.tasks.pop();
    } else {
      throw new Error("Please shorten your event details before asking again.");
    }
    raw = JSON.stringify(body);
  }
  return raw;
}
