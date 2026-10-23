import { describe, expect, it, vi } from "vitest";
import {
  createPlannerRepository,
  parseBackup,
  RECOVERY_KEY,
  STORAGE_KEY,
  type StorageAdapter,
} from "../lib/persistence";
import { seedStore } from "../lib/seed";

function memory(initial?: string) {
  const values = new Map<string, string>(
    initial === undefined ? [] : [[STORAGE_KEY, initial]],
  );
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  return { storage, values };
}
describe("browser persistence", () => {
  it("caches stable snapshots and persists valid changes", () => {
    const { storage } = memory(),
      repo = createPlannerRepository(() => storage, seedStore),
      listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);
    expect(repo.getSnapshot()).toBe(repo.getSnapshot());
    expect(
      repo.update((current) => ({ ...current, profile: "New name" })),
    ).toBe(true);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).profile).toBe("New name");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
  it("preserves corrupt saves in a recovery slot before writing a new plan", () => {
    const { storage } = memory("not-json"),
      repo = createPlannerRepository(() => storage, seedStore);
    expect(repo.getSnapshot().warning).toMatch(/recovery/);
    expect(storage.getItem(RECOVERY_KEY)).toBe("not-json");
    expect(repo.recovery()).toBe("not-json");
  });
  it("does not overwrite original data when recovery storage is full", () => {
    const { storage } = memory("broken");
    storage.setItem = () => {
      throw new Error("Quota");
    };
    const repo = createPlannerRepository(() => storage, seedStore);
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe("broken");
    expect(
      repo.update((current) => ({ ...current, profile: "Still usable" })),
    ).toBe(true);
    expect(repo.getSnapshot().store?.profile).toBe("Still usable");
  });
  it("supports denied storage and clearly reports in-memory changes", () => {
    const repo = createPlannerRepository(() => {
      throw new Error("Blocked");
    }, seedStore);
    expect(repo.getSnapshot().store).not.toBeNull();
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(repo.getSnapshot().warning).toMatch(/Export/);
  });
  it("rejects invalid mutations and updater failures without data loss", () => {
    const { storage } = memory(),
      repo = createPlannerRepository(() => storage, seedStore);
    const original = repo.getSnapshot().store;
    expect(repo.update((current) => ({ ...current, profile: "" }))).toBe(false);
    expect(
      repo.update(() => {
        throw new Error("Invalid update");
      }),
    ).toBe(false);
    expect(repo.getSnapshot().store).toBe(original);
  });
  it("handles valid, invalid and cleared cross-tab updates", () => {
    const { storage } = memory(),
      repo = createPlannerRepository(() => storage, seedStore);
    const incoming = { ...seedStore(), profile: "Another tab" };
    repo.acceptExternal(JSON.stringify(incoming));
    expect(repo.getSnapshot().store?.profile).toBe("Another tab");
    repo.acceptExternal("invalid");
    expect(repo.getSnapshot().store?.profile).toBe("Another tab");
    repo.acceptExternal(null);
    expect(repo.getSnapshot().persisted).toBe(false);
  });
  it("restores new events, rejects invalid files and normalizes stale selection", () => {
    const { storage } = memory(),
      repo = createPlannerRepository(() => storage, seedStore);
    const incoming = seedStore();
    incoming.events[0].id = "restored";
    incoming.activeId = "missing";
    expect(parseBackup(JSON.stringify(incoming)).activeId).toBe("restored");
    expect(repo.restore(JSON.stringify(incoming))).toMatch(/Restored 1 event/);
    expect(repo.getSnapshot().store?.events).toHaveLength(2);
    expect(() => repo.restore("{}")).toThrow(/valid Gather backup/);
    expect(() => parseBackup(" ".repeat(5 * 1024 * 1024 + 1))).toThrow(
      /too large/,
    );
  });
});
