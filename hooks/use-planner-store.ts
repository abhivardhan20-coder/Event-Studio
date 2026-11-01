"use client";
import { useSyncExternalStore } from "react";
import {
  createPlannerRepository,
  SERVER_SNAPSHOT,
  STORAGE_KEY,
} from "@/lib/persistence";
import { seedStore } from "@/lib/seed";

const repository = createPlannerRepository(
  () => window.localStorage,
  seedStore,
);
function subscribe(listener: () => void) {
  const unsubscribe = repository.subscribe(listener);
  const onStorage = (event: StorageEvent) => {
    try {
      const storage = window.localStorage;
      if (
        event.storageArea === storage &&
        (event.key === STORAGE_KEY || event.key === null)
      )
        // Notifications can be queued behind newer writes, including saves
        // made after a clear. Synchronize from the value that exists now.
        repository.acceptExternal(storage.getItem(STORAGE_KEY));
    } catch {
      // Losing storage access must not replace or interrupt the open plan.
      return;
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}
const serverSnapshot = () => SERVER_SNAPSHOT;
export function usePlannerStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    repository.getSnapshot,
    serverSnapshot,
  );
  return {
    ...snapshot,
    setStore: repository.update,
    restoreBackup: repository.restore,
    recoveryBackup: repository.recovery,
  };
}
