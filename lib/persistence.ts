import { LIMITS, storeSchema, type PlannerStore } from "./model.ts";
import { mergeBackup, PlannerConflictError } from "./state.ts";
import { exportBackup } from "./exports.ts";

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
  let initialized = false;
  let writable = true;
  let conflicted = false;
  let recoveryRaw: string | null = null;
  const listeners = new Set<() => void>();
  const conflictWarning =
    "Another tab changed your saved plans while this workspace had unsaved changes. Both versions were kept. Export this workspace and download the browser recovery copy in Settings before reloading.";
  const sizeWarning =
    "That change would make your workspace larger than the 5 MB backup limit. Your existing plans were kept. Export a backup before removing records or splitting your workspace.";
  function emit() {
    for (const listener of listeners) listener();
  }
  function persist(store: PlannerStore, raw: string, warning = "") {
    try {
      if (!writable || conflicted)
        throw new Error("Recovery must be preserved");
      storageFactory().setItem(STORAGE_KEY, raw);
      snapshot = { store, persisted: true, warning };
    } catch {
      snapshot = {
        store,
        persisted: false,
        warning:
          (conflicted ? conflictWarning : warning) ||
          "Changes are only in memory because browser storage is unavailable or full. Export a backup before closing this page.",
      };
    }
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    try {
      const storage = storageFactory();
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          snapshot = { store: parseBackup(raw), persisted: true, warning: "" };
        } catch {
          // Keep the newest original available even if the disk recovery
          // slot cannot be updated or storage access is later revoked.
          recoveryRaw = raw;
          try {
            storage.setItem(RECOVERY_KEY, raw);
          } catch {
            writable = false;
          }
          const fresh = seed();
          persist(
            fresh,
            exportBackup(fresh),
            "Your previous save could not be read. A recovery copy was preserved; download it in Settings before restoring a valid backup.",
          );
        }
      } else {
        const fresh = seed();
        persist(fresh, exportBackup(fresh));
      }
    } catch {
      writable = false;
      const fresh = seed();
      persist(fresh, exportBackup(fresh));
    }
    emit();
  }
  /** Reading React snapshots must not read storage, seed records or write data. */
  function getSnapshot() {
    return snapshot;
  }
  function update(change: StoreUpdate) {
    initialize();
    const current = getSnapshot().store;
    if (!current) return false;
    let value: unknown;
    try {
      // Updaters may fail after mutating their argument. Isolate them from the
      // published snapshot so rejection genuinely leaves the old plan intact.
      if (typeof change === "function") {
        const workingCopy =
          typeof structuredClone === "function"
            ? structuredClone(current)
            : (JSON.parse(JSON.stringify(current)) as PlannerStore);
        value = change(workingCopy);
      } else {
        value = change;
      }
    } catch (error) {
      snapshot = {
        ...snapshot,
        warning:
          error instanceof PlannerConflictError
            ? error.message
            : "That change contains invalid details. Your existing plan was kept.",
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
    let raw: string;
    try {
      raw = exportBackup(next.data);
    } catch {
      snapshot = { ...snapshot, warning: sizeWarning };
      emit();
      return false;
    }
    persist(next.data, raw);
    emit();
    return true;
  }
  function acceptExternal(raw: string | null) {
    initialize();
    if (!raw) {
      conflicted = true;
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
      const incoming = parseBackup(raw);
      if (!snapshot.persisted) {
        // A successful save elsewhere must not erase this tab's pending work.
        // Keep the remote JSON separately so the Settings recovery download
        // can preserve it too; prevent a later edit from overwriting it.
        recoveryRaw = raw;
        conflicted = true;
        snapshot = { ...snapshot, warning: conflictWarning };
      } else {
        snapshot = { store: incoming, persisted: true, warning: "" };
      }
      emit();
    } catch {
      recoveryRaw = raw;
      snapshot = {
        ...getSnapshot(),
        persisted: false,
        warning:
          "Another tab saved invalid data. Your current workspace was kept.",
      };
      emit();
    }
  }
  function restore(raw: string) {
    initialize();
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
    initialize,
    update,
    restore,
    acceptExternal,
    subscribe(listener: () => void) {
      listeners.add(listener);
      // useSyncExternalStore subscribes after rendering, so hydration and any
      // initial persistence happen here, never inside getSnapshot().
      initialize();
      return () => {
        listeners.delete(listener);
      };
    },
    recovery() {
      return (
        recoveryRaw ??
        storageFactory().getItem(RECOVERY_KEY) ??
        storageFactory().getItem(STORAGE_KEY)
      );
    },
  };
}
