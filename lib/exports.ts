import type { Celebration } from "./model.ts";
import { budgetTotals } from "./budget.ts";
import { money, dateLabel } from "./format.ts";

export function exportPlan(event: Celebration) {
  const total = budgetTotals(event).recorded;
  return [
    `GATHER · YOUR CELEBRATION PLAN`,
    event.name,
    `${event.type} · ${dateLabel(event.date)} · ${event.location}`,
    `${event.guestCount} expected guests · Budget: ${money(event.budget)}`,
    "",
    event.summary,
    "",
    "BUDGET",
    `Recorded: ${money(total)} · Remaining: ${money(budgetTotals(event).remaining)}`,
    ...event.expenses.map(
      (e) =>
        `- ${e.name}: ${money(e.amount)} (${e.category}, ${e.paid ? "Paid" : "Unpaid"})`,
    ),
    "",
    "TIMELINE",
    ...event.tasks
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (t) =>
          `${t.done ? "[x]" : "[ ]"} ${dateLabel(t.date, true)} · ${t.title}`,
      ),
    "",
    "VENDORS",
    ...event.vendors.map(
      (v) =>
        `- ${v.name} · ${v.category} · ${v.status} · ${money(v.quote)} · ${v.contact}`,
    ),
    "",
    "GUESTS",
    ...event.guests.map(
      (g) => `- ${g.name} · ${g.rsvp}${g.dietary ? ` · ${g.dietary}` : ""}`,
    ),
    "",
    "IDEAS",
    ...event.ideas.map((i) => `${i.title}\n${i.description}`),
  ].join("\n");
}
