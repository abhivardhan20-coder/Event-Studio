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
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    if (
      event.storageArea === storage &&
      (event.key === STORAGE_KEY || event.key === null)
    )
      repository.acceptExternal(event.key === null ? null : event.newValue);
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
