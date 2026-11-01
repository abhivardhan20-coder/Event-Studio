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

it("reads the newest stored workspace when an older notification arrives", async () => {
  vi.resetModules();
  const { usePlannerStore } = await import("../hooks/use-planner-store");
  const { result } = renderHook(() => usePlannerStore());
  await waitFor(() => expect(result.current.store).not.toBeNull());
  const oldValue = JSON.stringify({
    ...result.current.store,
    profile: "Older remote name",
  });
  const latest = { ...result.current.store, profile: "Latest accepted name" };
  act(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
    window.dispatchEvent(storageEvent(STORAGE_KEY, oldValue));
  });
  expect(result.current.store?.profile).toBe("Latest accepted name");
  expect(result.current.persisted).toBe(true);
  expect(result.current.warning).toBe("");
});

it("does not treat an old clear notification as a new clear after another tab has saved", async () => {
  vi.resetModules();
  const { usePlannerStore } = await import("../hooks/use-planner-store");
  const { result } = renderHook(() => usePlannerStore());
  await waitFor(() => expect(result.current.store).not.toBeNull());
  act(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...result.current.store, profile: "Saved after clear" }),
    );
    window.dispatchEvent(storageEvent(null, null));
  });
  expect(result.current.store?.profile).toBe("Saved after clear");
  expect(result.current.persisted).toBe(true);
  expect(result.current.warning).toBe("");
});

it("keeps the open workspace when reading storage becomes unavailable", async () => {
  vi.resetModules();
  const { usePlannerStore } = await import("../hooks/use-planner-store");
  const { result } = renderHook(() => usePlannerStore());
  await waitFor(() => expect(result.current.store).not.toBeNull());
  const before = result.current.store;
  vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  act(() => window.dispatchEvent(storageEvent(STORAGE_KEY, "invalid")));
  expect(result.current.store).toBe(before);
  expect(result.current.warning).toBe("");
});
