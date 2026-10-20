import test from "node:test";
import assert from "node:assert/strict";
import {
  budgetAllocations,
  createPlan,
  dateOffset,
  eventInputSchema,
  eventSchema,
  eventTypes,
  expenseSchema,
  exportPlan,
  seedStore,
  storeSchema,
  todayISO,
} from "../lib/planner.ts";

test("every celebration type produces a complete, valid plan", () => {
  for (const type of eventTypes) {
    const plan = createPlan({
      name: "A lovely celebration",
      type,
      date: dateOffset(todayISO(), 10),
      location: "Bengaluru",
      budget: 100000,
      guestCount: 50,
      vibe: "Local, seasonal, welcoming",
    });
    assert.equal(eventSchema.safeParse(plan).success, true);
    assert.ok(plan.tasks.length >= 8);
    assert.ok(
      plan.tasks.every((t) => t.date >= todayISO() && t.date <= plan.date),
    );
    assert.equal(plan.ideas.length, 3);
    assert.ok(plan.ideas.every((i) => i.description.length > 80));
    assert.ok(plan.vendors.length >= 3);
    assert.ok(
      plan.vendors.every(
        (v) => v.checklist.length === 4 && v.status === "To contact",
      ),
    );
    assert.equal(
      budgetAllocations(plan).reduce((sum, a) => sum + a.planned, 0),
      plan.budget,
    );
  }
});
test("spending and exports include both paid and outstanding expenses", () => {
  const sample = seedStore().events[0];
  assert.equal(
    budgetAllocations(sample).reduce((sum, a) => sum + a.spent, 0),
    324000,
  );
  const exported = exportPlan(sample);
  assert.ok(
    exported.includes("TIMELINE") &&
      exported.includes("VENDORS") &&
      exported.includes("GUESTS"),
  );
  assert.ok(
    exported.includes("Photography package") && exported.includes("Unpaid"),
  );
  assert.equal(storeSchema.safeParse(seedStore()).success, true);
});
test("invalid dates, negative budgets and nonfinite expenses are rejected", () => {
  const valid = seedStore().events[0];
  assert.equal(
    eventInputSchema.safeParse({ ...valid, budget: -1 }).success,
    false,
  );
  assert.equal(
    eventInputSchema.safeParse({ ...valid, date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    eventInputSchema.safeParse({ ...valid, guestCount: 1.5 }).success,
    false,
  );
  assert.equal(
    expenseSchema.safeParse({ ...valid.expenses[0], amount: Infinity }).success,
    false,
  );
  assert.equal(
    expenseSchema.safeParse({ ...valid.expenses[0], category: "Unknown" })
      .success,
    false,
  );
});

test("budget allocation rounding always preserves the exact total", () => {
  const sample = seedStore().events[0];
  for (const budget of [101, 1001, 123457]) {
    for (const type of eventTypes) {
      assert.equal(
        budgetAllocations({ ...sample, type, budget }).reduce(
          (sum, row) => sum + row.planned,
          0,
        ),
        budget,
      );
    }
  }
});
