import {
  eventSchema,
  itemSchemas,
  storeSchema,
  type Celebration,
  type EventInput,
  type ItemKind,
  type PlannerItem,
  type PlannerStore,
} from "./model.ts";
import { dateOffset, daysUntil } from "./format.ts";

/** Preserve completed history while moving outstanding tasks by the event date delta. */
export function editEvent(
  event: Celebration,
  input: EventInput,
  moveTasks: boolean,
): Celebration {
  const delta = daysUntil(input.date, event.date);
  return eventSchema.parse({
    ...event,
    ...input,
    tasks: moveTasks
      ? event.tasks.map((task) =>
          task.done ? task : { ...task, date: dateOffset(task.date, delta) },
        )
      : event.tasks,
  });
}

export function saveItem(
  event: Celebration,
  kind: ItemKind,
  value: PlannerItem,
): Celebration {
  switch (kind) {
    case "task": {
      const item = itemSchemas.task.parse(value);
      return eventSchema.parse({ ...event, tasks: upsert(event.tasks, item) });
    }
    case "expense": {
      const item = itemSchemas.expense.parse(value);
      return eventSchema.parse({
        ...event,
        expenses: upsert(event.expenses, item),
      });
    }
    case "vendor": {
      const item = itemSchemas.vendor.parse(value);
      return eventSchema.parse({
        ...event,
        vendors: upsert(event.vendors, item),
      });
    }
    case "guest": {
      const item = itemSchemas.guest.parse(value);
      return eventSchema.parse({
        ...event,
        guests: upsert(event.guests, item),
      });
    }
  }
}
function upsert<T extends { id: string }>(items: T[], value: T): T[] {
  return items.some((item) => item.id === value.id)
    ? items.map((item) => (item.id === value.id ? value : item))
    : [...items, value];
}

export function removeItem(
  event: Celebration,
  kind: ItemKind,
  id: string,
): Celebration {
  switch (kind) {
    case "task":
      return { ...event, tasks: event.tasks.filter((item) => item.id !== id) };
    case "expense":
      return {
        ...event,
        expenses: event.expenses.filter((item) => item.id !== id),
      };
    case "vendor":
      return {
        ...event,
        vendors: event.vendors.filter((item) => item.id !== id),
      };
    case "guest":
      return {
        ...event,
        guests: event.guests.filter((item) => item.id !== id),
      };
  }
}

/** Import merges by stable IDs; it never silently overwrites events already on this device. */
export function mergeBackup(
  current: PlannerStore,
  incoming: PlannerStore,
): PlannerStore {
  const existingIds = new Set(current.events.map((event) => event.id));
  const additions = incoming.events.filter(
    (event) => !existingIds.has(event.id),
  );
  if (!additions.length)
    throw new Error(
      "These events are already in your workspace. Your existing plans were kept.",
    );
  return storeSchema.parse({
    ...current,
    events: [...current.events, ...additions],
    activeId: additions[0].id,
  });
}
