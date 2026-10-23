import { budgetAllocations } from "../budget.ts";
import { baseIdeas } from "../templates.ts";
import { money } from "../format.ts";
import type { ChatRequest } from "./schemas.ts";

export function budgetSnapshot(input: ChatRequest) {
  const lastQuestion =
    input.messages.filter((message) => message.role === "user").at(-1)?.text ??
    "";
  if (!/budget|sav(e|ing)|cost|spend|afford/i.test(lastQuestion)) return "";
  const available = input.event.budget - input.spending;
  const allocations = budgetAllocations({ ...input.event, expenses: [] });
  return `Your budget: ${money(input.event.budget)}\nRecorded expenses: ${money(input.spending)}\n${available < 0 ? "Over budget" : "Available"}: ${money(Math.abs(available))}\n\nSuggested allocation of your original total budget:\n${allocations.map((row) => `${row.category}: ${money(row.planned)}`).join("\n")}\nThese allocations include amounts already recorded, not additional spending.\n\n`;
}
export function builtInGuidance(input: ChatRequest) {
  const question =
    input.messages
      .filter((message) => message.role === "user")
      .at(-1)
      ?.text.toLowerCase() ?? "";
  if (/budget|sav(e|ing)|cost|spend|afford/.test(question))
    return (
      budgetSnapshot(input) +
      `Start with what matters most to you. Compare itemized quotes, choose seasonal food and flowers, and reuse decor between spaces. Keep a contingency within your total budget. Check recorded spending before making your next booking.\n\nThis is built-in guidance. Sign in for a personalized Gemini conversation when available.`
    );
  if (/vendor|florist|photograph|cater/.test(question))
    return `Before booking a vendor for ${input.event.name}, ask:\n\n• Are you available on ${input.event.date} in ${input.event.location}?\n• What is included, and what costs extra?\n• What are the deposit and cancellation terms?\n• What is your backup plan? Can you share recent references?\n\nRequest comparable written quotes, update your vendor checklist, and record confirmed expenses in Budget. This is built-in guidance.`;
  if (/next|task|step|timeline|plan/.test(question))
    return `Let’s take ${input.event.name} one step at a time.\n\n${
      input.tasks.length
        ? input.tasks
            .slice(0, 3)
            .map(
              (task, index) =>
                `${index + 1}. ${task.title} — aim for ${task.date}.`,
            )
            .join("\n")
        : "Confirm your venue and must-haves, then start your guest list."
    }\n\nFocus on the most time-sensitive booking first. Include accessibility, dietary needs and a weather backup where relevant. This is built-in guidance.`;
  return `A little inspiration for your ${input.event.type.toLowerCase()}:\n\n${baseIdeas(
    input.event,
  )
    .map((idea, index) => `${index + 1}. ${idea.title}\n${idea.description}`)
    .join(
      "\n\n",
    )}\n\nThis is built-in guidance; Gemini can personalize your next question when connected.`;
}
