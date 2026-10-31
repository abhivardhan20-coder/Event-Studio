import { describe, expect, it, vi } from "vitest";
import {
  createPlannerRepository,
  parseBackup,
  RECOVERY_KEY,
  STORAGE_KEY,
  SERVER_SNAPSHOT,
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
function initializedRepository(
  ...args: Parameters<typeof createPlannerRepository>
) {
  const repository = createPlannerRepository(...args);
  repository.initialize();
  return repository;
}

describe("browser persistence", () => {
  it("keeps snapshot reads pure and hydrates once after subscribing", () => {
    const { storage } = memory();
    const read = vi.spyOn(storage, "getItem");
    const write = vi.spyOn(storage, "setItem");
    const seed = vi.fn(seedStore);
    const repo = createPlannerRepository(() => storage, seed);
    expect(repo.getSnapshot()).toBe(SERVER_SNAPSHOT);
    expect(repo.getSnapshot()).toBe(SERVER_SNAPSHOT);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(seed).not.toHaveBeenCalled();
    const unsubscribe = repo.subscribe(vi.fn());
    const snapshot = repo.getSnapshot();
    expect(snapshot.store).not.toBeNull();
    expect(snapshot.persisted).toBe(true);
    repo.initialize();
    repo.getSnapshot();
    expect(seed).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    unsubscribe();
  });
  it("caches stable snapshots and persists valid changes", () => {
    const { storage } = memory(),
      repo = initializedRepository(() => storage, seedStore),
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
      repo = initializedRepository(() => storage, seedStore);
    expect(repo.getSnapshot().warning).toMatch(/recovery/);
    expect(storage.getItem(RECOVERY_KEY)).toBe("not-json");
    expect(repo.recovery()).toBe("not-json");
  });
  it("does not overwrite original data when recovery storage is full", () => {
    const { storage } = memory("broken");
    storage.setItem = () => {
      throw new Error("Quota");
    };
    const repo = initializedRepository(() => storage, seedStore);
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe("broken");
    expect(
      repo.update((current) => ({ ...current, profile: "Still usable" })),
    ).toBe(true);
    expect(repo.getSnapshot().store?.profile).toBe("Still usable");
  });
  it("supports denied storage and clearly reports in-memory changes", () => {
    const repo = initializedRepository(() => {
      throw new Error("Blocked");
    }, seedStore);
    expect(repo.getSnapshot().store).not.toBeNull();
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(repo.getSnapshot().warning).toMatch(/Export/);
  });
  it("rejects invalid mutations and updater failures without data loss", () => {
    const { storage } = memory(),
      repo = initializedRepository(() => storage, seedStore);
    const original = repo.getSnapshot().store;
    expect(repo.update((current) => ({ ...current, profile: "" }))).toBe(false);
    expect(
      repo.update(() => {
        throw new Error("Invalid update");
      }),
    ).toBe(false);
    expect(repo.getSnapshot().store).toBe(original);
  });
  it.each(["throw", "invalid"])(
    "rolls back an updater that mutates before %s",
    (mode) => {
      const { storage } = memory();
      const repo = initializedRepository(() => storage, seedStore);
      const original = repo.getSnapshot().store;
      const saved = storage.getItem(STORAGE_KEY);
      expect(
        repo.update((current) => {
          current.profile = "";
          current.events[0].tasks[0].title = "Overwritten title";
          if (mode === "throw") throw new Error("Update failed");
          return current;
        }),
      ).toBe(false);
      expect(repo.getSnapshot().store).toBe(original);
      expect(original?.profile).not.toBe("");
      expect(original?.events[0].tasks[0].title).not.toBe("Overwritten title");
      expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    },
  );
  it("supports valid updater mutations without mutating an earlier published snapshot", () => {
    const { storage } = memory();
    const repo = initializedRepository(() => storage, seedStore);
    const original = repo.getSnapshot().store;
    expect(
      repo.update((current) => {
        current.profile = "New name";
        return current;
      }),
    ).toBe(true);
    expect(original?.profile).not.toBe("New name");
    expect(repo.getSnapshot().store?.profile).toBe("New name");
  });
  it("preserves both versions when another tab saves while local changes are unsaved", () => {
    const { storage, values } = memory();
    const repo = initializedRepository(() => storage, seedStore);
    const set = storage.setItem;
    storage.setItem = () => {
      throw new Error("Quota exceeded");
    };
    repo.update((current) => ({ ...current, profile: "Pending local name" }));
    expect(repo.getSnapshot().persisted).toBe(false);
    storage.setItem = set;
    const incoming = JSON.stringify({ ...seedStore(), profile: "Remote name" });
    values.set(STORAGE_KEY, incoming);
    repo.acceptExternal(incoming);
    expect(repo.getSnapshot().store?.profile).toBe("Pending local name");
    expect(repo.getSnapshot().warning).toMatch(/Both versions were kept/);
    expect(repo.recovery()).toBe(incoming);
    repo.update((current) => ({ ...current, profile: "Further local edit" }));
    expect(repo.getSnapshot().store?.profile).toBe("Further local edit");
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(values.get(STORAGE_KEY)).toBe(incoming);
  });
  it("handles valid, invalid and cleared cross-tab updates", () => {
    const { storage } = memory(),
      repo = initializedRepository(() => storage, seedStore);
    const incoming = { ...seedStore(), profile: "Another tab" };
    repo.acceptExternal(JSON.stringify(incoming));
    expect(repo.getSnapshot().store?.profile).toBe("Another tab");
    repo.acceptExternal("invalid");
    expect(repo.getSnapshot().store?.profile).toBe("Another tab");
    expect(repo.getSnapshot().persisted).toBe(false);
    expect(repo.recovery()).toBe("invalid");
    repo.acceptExternal(null);
    expect(repo.getSnapshot().persisted).toBe(false);
  });
  it("restores new events, rejects invalid files and normalizes stale selection", () => {
    const { storage } = memory(),
      repo = initializedRepository(() => storage, seedStore);
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
  it("rejects outgoing state that its own backup reader could not restore", () => {
    const { storage } = memory();
    const repo = initializedRepository(() => storage, seedStore);
    const original = repo.getSnapshot().store;
    const saved = storage.getItem(STORAGE_KEY);
    const large = largeWorkspace(10000, "large");
    expect(
      new TextEncoder().encode(JSON.stringify(large)).length,
    ).toBeGreaterThan(5 * 1024 * 1024);
    expect(repo.update(large)).toBe(false);
    expect(repo.getSnapshot().warning).toMatch(/5 MB backup limit/);
    expect(repo.getSnapshot().store).toBe(original);
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
  });
  it("rejects a merged backup over the size cap while keeping the current workspace restorable", () => {
    const { storage } = memory();
    const repo = initializedRepository(() => storage, seedStore);
    const current = largeWorkspace(4000, "current");
    const incoming = largeWorkspace(4000, "incoming");
    expect(repo.update(current)).toBe(true);
    const saved = storage.getItem(STORAGE_KEY);
    expect(() => repo.restore(JSON.stringify(incoming))).toThrow(
      /could not be restored/,
    );
    expect(storage.getItem(STORAGE_KEY)).toBe(saved);
    expect(parseBackup(storage.getItem(STORAGE_KEY)!)).toEqual(current);
  });
});

function largeWorkspace(guestCount: number, id: string) {
  const store = seedStore();
  store.events[0].id = id;
  store.activeId = id;
  const guest = {
    ...store.events[0].guests[0],
    name: "N".repeat(100),
    email: `${"l".repeat(40)}@${"a".repeat(60)}.${"b".repeat(60)}.example.com`,
    group: "G".repeat(60),
    dietary: "D".repeat(200),
  };
  store.events[0].guests = Array.from({ length: guestCount }, (_, index) => ({
    ...guest,
    id: String(index).padStart(100, "i"),
  }));
  return store;
}
