import { describe, expect, it } from "vitest";
import {
  budgetAllocations,
  budgetTotals,
  createPlan,
  dateOffset,
  daysUntil,
  eventInputSchema,
  eventSchema,
  eventTypes,
  expenseSchema,
  guestSchema,
  seedStore,
  storeSchema,
  todayISO,
  vendorSchema,
} from "../lib/planner";
import { editEvent, mergeBackup, removeItem, saveItem } from "../lib/state";
import { exportCalendar } from "../lib/calendar";

const sample = () => seedStore().events[0];
describe("record validation", () => {
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "26-01-01",
    "",
    "not-a-date",
  ])("rejects impossible date %s", (date) => {
    expect(eventInputSchema.safeParse({ ...sample(), date }).success).toBe(
      false,
    );
  });
  it("accepts leap day and rejects fractional guest counts", () => {
    expect(
      eventInputSchema.safeParse({ ...sample(), date: "2028-02-29" }).success,
    ).toBe(true);
    expect(
      eventInputSchema.safeParse({ ...sample(), guestCount: 1.5 }).success,
    ).toBe(false);
  });
  it.each([NaN, Infinity, -1, 1.234, 100000001])(
    "rejects invalid expense amount %s",
    (amount) => {
      expect(
        expenseSchema.safeParse({ ...sample().expenses[0], amount }).success,
      ).toBe(false);
    },
  );
  it("rejects empty names, invalid emails and unknown categories", () => {
    const event = sample();
    expect(
      vendorSchema.safeParse({ ...event.vendors[0], name: "   " }).success,
    ).toBe(false);
    expect(
      guestSchema.safeParse({ ...event.guests[0], email: "bad@" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ ...event.expenses[0], category: "Injected" })
        .success,
    ).toBe(false);
  });
  it("rejects remote images and duplicate IDs in backups", () => {
    const event = sample();
    expect(
      eventSchema.safeParse({
        ...event,
        ideas: [{ ...event.ideas[0], image: "https://tracking.example/pixel" }],
      }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...event,
        tasks: [event.tasks[0], event.tasks[0]],
      }).success,
    ).toBe(false);
    expect(
      storeSchema.safeParse({ ...seedStore(), events: [event, event] }).success,
    ).toBe(false);
  });
  it("enforces collection caps", () => {
    const event = sample();
    expect(
      eventSchema.safeParse({
        ...event,
        tasks: Array.from({ length: 301 }, (_, i) => ({
          ...event.tasks[0],
          id: String(i),
        })),
      }).success,
    ).toBe(false);
  });
});
describe("money and dates", () => {
  it.each(eventTypes)("allocates every paise exactly for %s", (type) => {
    for (const budget of [100.01, 101.99, 1001.37, 99999999.99]) {
      expect(
        budgetAllocations({ ...sample(), type, budget }).reduce(
          (sum, row) => sum + Math.round(row.planned * 100),
          0,
        ),
      ).toBe(Math.round(budget * 100));
    }
  });
  it("separates paid and unpaid without floating point drift", () => {
    const event = {
      ...sample(),
      budget: 100,
      expenses: [
        { ...sample().expenses[0], id: "a", amount: 0.1, paid: true },
        { ...sample().expenses[0], id: "b", amount: 0.2, paid: false },
      ],
    };
    expect(budgetTotals(event)).toEqual({
      recorded: 0.3,
      paid: 0.1,
      unpaid: 0.2,
      remaining: 99.7,
    });
    expect(budgetTotals({ ...event, budget: 0.1 }).remaining).toBe(-0.2);
  });
  it("compares calendar days across DST and year boundaries", () => {
    expect(daysUntil("2026-03-09", "2026-03-07")).toBe(2);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
    expect(todayISO(new Date("2026-10-22T20:00:00Z"))).toBe("2026-10-23");
    expect(dateOffset("2028-02-28", 1)).toBe("2028-02-29");
  });
});
describe("planner changes", () => {
  it.each(eventTypes)(
    "creates complete plans for %s, including same-day celebrations",
    (type) => {
      const event = createPlan({ ...sample(), type, date: todayISO() });
      expect(eventSchema.safeParse(event).success).toBe(true);
      expect(event.tasks.every((task) => task.date === todayISO())).toBe(true);
      expect(event.vendors.length).toBeGreaterThanOrEqual(3);
      expect(event.ideas).toHaveLength(3);
    },
  );
  it("moves outstanding tasks while preserving completed history", () => {
    const original = sample();
    original.tasks = [
      { ...original.tasks[0], done: false, date: "2026-11-01" },
      { ...original.tasks[1], done: true, date: "2026-10-01" },
    ];
    const edited = editEvent(
      original,
      { ...original, date: dateOffset(original.date, 7) },
      true,
    );
    expect(edited.tasks.map((task) => task.date)).toEqual([
      "2026-11-08",
      "2026-10-01",
    ]);
    expect(original.tasks[0].date).toBe("2026-11-01");
    expect(
      editEvent(
        original,
        { ...original, date: dateOffset(original.date, 7) },
        false,
      ).tasks,
    ).toEqual(original.tasks);
  });
  it("upserts by ID and removes only the chosen collection", () => {
    const original = sample(),
      task = { ...original.tasks[0], title: "Updated task" };
    const updated = saveItem(original, "task", task);
    expect(updated.tasks).toHaveLength(original.tasks.length);
    expect(updated.tasks[0].title).toBe("Updated task");
    expect(original.tasks[0].title).not.toBe(task.title);
    expect(
      saveItem(original, "task", { ...task, id: "new" }).tasks,
    ).toHaveLength(original.tasks.length + 1);
    expect(
      removeItem(updated, "task", task.id).tasks.some(
        (item) => item.id === task.id,
      ),
    ).toBe(false);
    expect(removeItem(updated, "guest", "missing").vendors).toEqual(
      updated.vendors,
    );
  });
  it("validates an item against its declared kind", () => {
    expect(() => saveItem(sample(), "guest", sample().tasks[0])).toThrow();
  });
  it("merges new events without silently replacing current events", () => {
    const current = seedStore(),
      incoming = {
        ...current,
        events: [
          { ...current.events[0], name: "Untrusted overwrite" },
          { ...current.events[0], id: "new-event" },
        ],
      };
    const merged = mergeBackup(current, incoming);
    expect(merged.events).toHaveLength(2);
    expect(merged.events[0].name).toBe(current.events[0].name);
    expect(merged.activeId).toBe("new-event");
    expect(() => mergeBackup(current, current)).toThrow(/already/);
  });
});
describe("calendar export", () => {
  it("escapes property injection and folds Unicode at 75 UTF-8 bytes", () => {
    const event = sample();
    event.tasks = [
      {
        ...event.tasks[0],
        id: "unsafe\r\nUID:evil",
        title: "🎉".repeat(45) + "\r\nATTENDEE:bad,semicolon;",
      },
    ];
    const result = exportCalendar(event, new Date("2026-10-23T00:00:00Z"));
    expect(result).not.toContain("\r\nATTENDEE:");
    expect(result).toContain("\\nATTENDEE:bad\\,semicolon\\;");
    expect(result).toContain("DTEND;VALUE=DATE:");
    expect(
      result
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(result.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
