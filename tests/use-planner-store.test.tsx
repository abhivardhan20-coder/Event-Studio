// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../lib/persistence";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function storageEvent(
  key: string | null,
  newValue: string | null,
  storageArea: Storage | null = window.localStorage,
) {
  // Deliver the event contract with the same deterministic storage adapter as
  // the hook. jsdom's StorageEvent constructor only accepts its native Storage.
  const event = new Event("storage");
  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
    storageArea: { value: storageArea },
  });
  return event;
}

it("responds to localStorage.clear events without erasing the open workspace", async () => {
  vi.resetModules();
  window.localStorage.clear();
  const { usePlannerStore } = await import("../hooks/use-planner-store");
  const { result } = renderHook(() => usePlannerStore());
  await waitFor(() => expect(result.current.store).not.toBeNull());
  const current = result.current.store;
  act(() => {
    window.localStorage.clear();
    window.dispatchEvent(storageEvent(null, null));
  });
  expect(result.current.store).toBe(current);
  expect(result.current.persisted).toBe(false);
  expect(result.current.warning).toMatch(/cleared in another tab/);
});

it("ignores unrelated storage and detached storage events", async () => {
  vi.resetModules();
  const { usePlannerStore } = await import("../hooks/use-planner-store");
  const { result } = renderHook(() => usePlannerStore());
  await waitFor(() => expect(result.current.store).not.toBeNull());
  const current = result.current.store;
  act(() => {
    window.dispatchEvent(storageEvent("other-app", "invalid"));
    window.dispatchEvent(storageEvent(STORAGE_KEY, "invalid", null));
  });
  expect(result.current.store).toBe(current);
  expect(result.current.warning).toBe("");
});
