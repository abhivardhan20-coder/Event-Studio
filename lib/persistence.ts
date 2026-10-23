import { LIMITS, storeSchema, type PlannerStore } from "./model.ts";
import { mergeBackup } from "./state.ts";

export const STORAGE_KEY = "gather-planner-v1";
export const RECOVERY_KEY = `${STORAGE_KEY}-recovery`;
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface PlannerSnapshot {
  store: PlannerStore | null;
  persisted: boolean;
  warning: string;
}
export const SERVER_SNAPSHOT: PlannerSnapshot = {
  store: null,
  persisted: false,
  warning: "",
};
type StoreUpdate = PlannerStore | ((current: PlannerStore) => PlannerStore);

export function parseBackup(raw: string): PlannerStore {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.backupBytes)
    throw new Error(
      "This backup is too large. Choose a Gather backup smaller than 5 MB.",
    );
  try {
    const store = storeSchema.parse(JSON.parse(raw));
    return {
      ...store,
      activeId: store.events.some((event) => event.id === store.activeId)
        ? store.activeId
        : store.events[0].id,
    };
  } catch {
    throw new Error(
      "This file is not a valid Gather backup. Your existing plans were kept.",
    );
  }
}

/** A small external store keeps persistence out of React effects and is independently testable. */
export function createPlannerRepository(
  storageFactory: () => StorageAdapter,
  seed: () => PlannerStore,
) {
  let snapshot: PlannerSnapshot = SERVER_SNAPSHOT;
  let writable = true;
  const listeners = new Set<() => void>();
  function emit() {
    for (const listener of listeners) listener();
  }
  function persist(store: PlannerStore, warning = "") {
    try {
      if (!writable) throw new Error("Recovery must be preserved");
      storageFactory().setItem(STORAGE_KEY, JSON.stringify(store));
      snapshot = { store, persisted: true, warning };
    } catch {
      snapshot = {
        store,
        persisted: false,
        warning:
          warning ||
          "Changes are only in memory because browser storage is unavailable or full. Export a backup before closing this page.",
      };
    }
  }
  function getSnapshot() {
    if (snapshot.store) return snapshot;
    try {
      const storage = storageFactory();
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          snapshot = { store: parseBackup(raw), persisted: true, warning: "" };
        } catch {
          try {
            storage.setItem(RECOVERY_KEY, raw);
          } catch {
            writable = false;
          }
          persist(
            seed(),
            "Your previous save could not be read. A recovery copy was preserved; download it in Settings before restoring a valid backup.",
          );
        }
      } else persist(seed());
    } catch {
      writable = false;
      persist(seed());
    }
    return snapshot;
  }
  function update(change: StoreUpdate) {
    const current = getSnapshot().store;
    if (!current) return false;
    let value: unknown;
    try {
      value = typeof change === "function" ? change(current) : change;
    } catch {
      snapshot = {
        ...snapshot,
        warning:
          "That change contains invalid details. Your existing plan was kept.",
      };
      emit();
      return false;
    }
    const next = storeSchema.safeParse(value);
    if (!next.success) {
      snapshot = {
        ...snapshot,
        warning:
          "That change exceeds a record limit or contains invalid details. Your existing plan was kept.",
      };
      emit();
      return false;
    }
    persist(next.data);
    emit();
    return true;
  }
  function acceptExternal(raw: string | null) {
    if (!raw) {
      snapshot = {
        ...getSnapshot(),
        persisted: false,
        warning:
          "Browser storage was cleared in another tab. Your open plan is still available to export.",
      };
      emit();
      return;
    }
    try {
      snapshot = { store: parseBackup(raw), persisted: true, warning: "" };
      emit();
    } catch {
      snapshot = {
        ...getSnapshot(),
        warning:
          "Another tab saved invalid data. Your current workspace was kept.",
      };
      emit();
    }
  }
  function restore(raw: string) {
    const incoming = parseBackup(raw);
    const current = getSnapshot().store;
    if (!current) throw new Error("Your workspace is still loading.");
    const merged = mergeBackup(current, incoming);
    const count = merged.events.length - current.events.length;
    if (!update(merged))
      throw new Error(
        "The backup could not be restored. Your existing plans were kept.",
      );
    return `Restored ${count} ${count === 1 ? "event" : "events"}. Existing events were kept.`;
  }
  return {
    getSnapshot,
    update,
    restore,
    acceptExternal,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    recovery() {
      return (
        storageFactory().getItem(RECOVERY_KEY) ??
        storageFactory().getItem(STORAGE_KEY)
      );
    },
  };
}
