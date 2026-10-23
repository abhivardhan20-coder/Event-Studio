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
    if (event.storageArea === window.localStorage && event.key === STORAGE_KEY)
      repository.acceptExternal(event.newValue);
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
