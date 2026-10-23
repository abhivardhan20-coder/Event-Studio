import { categories, colors, type Celebration } from "./model.ts";

export function budgetAllocations(
  event: Pick<Celebration, "type" | "budget" | "expenses">,
) {
  const ratios =
    event.type === "Wedding"
      ? [0.3, 0.3, 0.14, 0.1, 0.06, 0.1]
      : event.type === "Birthday"
        ? [0.2, 0.3, 0.18, 0.07, 0.15, 0.1]
        : [0.25, 0.25, 0.1, 0.05, 0.15, 0.2];
  const budgetCents = Math.round(event.budget * 100);
  const plannedCents = ratios.map((ratio, index) =>
    index < 5 ? Math.round(budgetCents * ratio) : 0,
  );
  plannedCents[5] =
    budgetCents -
    plannedCents.slice(0, 5).reduce((sum, amount) => sum + amount, 0);
  const spentCents = new Map<string, number>();
  for (const expense of event.expenses)
    spentCents.set(
      expense.category,
      (spentCents.get(expense.category) ?? 0) +
        Math.round(expense.amount * 100),
    );
  return categories.map((category, i) => ({
    category,
    planned: plannedCents[i] / 100,
    spent: (spentCents.get(category) ?? 0) / 100,
    color: colors[i],
  }));
}

export function budgetTotals(event: Pick<Celebration, "budget" | "expenses">) {
  const recordedCents = event.expenses.reduce(
    (sum, expense) => sum + Math.round(expense.amount * 100),
    0,
  );
  const paidCents = event.expenses.reduce(
    (sum, expense) =>
      sum + (expense.paid ? Math.round(expense.amount * 100) : 0),
    0,
  );
  return {
    recorded: recordedCents / 100,
    paid: paidCents / 100,
    unpaid: (recordedCents - paidCents) / 100,
    remaining: (Math.round(event.budget * 100) - recordedCents) / 100,
  };
}
