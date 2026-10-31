import { describe, expect, it } from "vitest";
import { budgetSnapshot, builtInGuidance } from "../lib/server/guidance";
import { seedStore } from "../lib/seed";
import type { ChatRequest } from "../lib/server/schemas";

const request = (text: string): ChatRequest => ({
  action: "chat",
  mode: "built-in",
  event: seedStore().events[0],
  spending: 1234.56,
  tasks: [],
  messages: [{ role: "user", text }],
});

describe("planning question interpretation", () => {
  it.each([
    "How much do I have left?",
    "What is our remaining balance?",
    "Help me track expenses",
    "How much money is available?",
    "Can we afford this?",
    "How can we save money?",
  ])("answers %s with the app's exact balance", (question) => {
    expect(budgetSnapshot(request(question))).toContain("₹7,98,765.44");
    expect(builtInGuidance(request(question))).toContain("₹7,98,765.44");
  });

  it.each([
    "Use the left side of the garden",
    "A lifesaver theme",
    "Save-the-date invitation ideas",
  ])("keeps unrelated question %s focused on ideas", (question) => {
    expect(budgetSnapshot(request(question))).toBe("");
  });

  it("puts the earliest unfinished tasks first in next-step guidance", () => {
    const input = request("What should I do next?");
    input.tasks = [
      { title: "Later booking", date: "2027-03-20" },
      { title: "Urgent permit", date: "2027-01-02" },
      { title: "Guest confirmation", date: "2027-02-10" },
      { title: "Earliest deposit", date: "2027-01-01" },
    ];
    const original = structuredClone(input.tasks);
    const text = builtInGuidance(input);
    expect(text).toContain("1. Earliest deposit");
    expect(text).toContain("2. Urgent permit");
    expect(text).not.toContain("Later booking");
    expect(input.tasks).toEqual(original);
  });
});
