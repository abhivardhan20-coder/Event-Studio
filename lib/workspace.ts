import {
  itemSchemas,
  type Celebration,
  type Idea,
  type ItemKind,
  type PlannerItems,
} from "./model";

export type SimpleDialog =
  "event" | "edit-event" | "settings" | "help" | "notifications";
export type ItemDialog = {
  [Kind in ItemKind]: {
    type: "item";
    kind: Kind;
    eventId: string;
    item?: PlannerItems[Kind];
  };
}[ItemKind];
export type WorkspaceDialog =
  | { type: Exclude<SimpleDialog, "edit-event"> }
  | { type: "edit-event"; event: Celebration }
  | ItemDialog
  | { type: "assistant"; prompt: string }
  | { type: "idea"; idea: Idea };
export type OpenItem = <Kind extends ItemKind>(
  kind: Kind,
  item?: PlannerItems[Kind],
) => void;

/** Compare validated JSON snapshots independently of object key insertion order. */
export function matchesSnapshot(current: unknown, original: unknown): boolean {
  if (Object.is(current, original)) return true;
  if (
    current === null ||
    original === null ||
    typeof current !== "object" ||
    typeof original !== "object"
  )
    return false;
  if (Array.isArray(current) || Array.isArray(original))
    return (
      Array.isArray(current) &&
      Array.isArray(original) &&
      current.length === original.length &&
      current.every((value, index) => matchesSnapshot(value, original[index]))
    );
  const currentRecord = current as Record<string, unknown>;
  const originalRecord = original as Record<string, unknown>;
  const keys = Object.keys(originalRecord);
  return (
    Object.keys(currentRecord).length === keys.length &&
    keys.every(
      (key) =>
        Object.hasOwn(currentRecord, key) &&
        matchesSnapshot(currentRecord[key], originalRecord[key]),
    )
  );
}

/** Validate at the editor boundary, keeping the item kind and its value correlated. */
export function itemDialog(
  kind: ItemKind,
  item: PlannerItems[ItemKind] | undefined,
  eventId: string,
): ItemDialog {
  switch (kind) {
    case "task":
      return {
        type: "item",
        eventId,
        kind,
        item: item === undefined ? undefined : itemSchemas.task.parse(item),
      };
    case "expense":
      return {
        type: "item",
        eventId,
        kind,
        item: item === undefined ? undefined : itemSchemas.expense.parse(item),
      };
    case "vendor":
      return {
        type: "item",
        eventId,
        kind,
        item: item === undefined ? undefined : itemSchemas.vendor.parse(item),
      };
    case "guest":
      return {
        type: "item",
        eventId,
        kind,
        item: item === undefined ? undefined : itemSchemas.guest.parse(item),
      };
  }
}

export function eventProgress(event: Celebration) {
  const completed = event.tasks.filter((task) => task.done).length;
  return event.tasks.length
    ? Math.round((completed / event.tasks.length) * 100)
    : 0;
}
