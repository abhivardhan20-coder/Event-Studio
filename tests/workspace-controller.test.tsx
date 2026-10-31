// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createElement,
  createRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { usePlannerStore } from "../hooks/use-planner-store";
import { useAIStatus } from "../hooks/use-ai-status";
import {
  useWorkspaceController,
  workspaceReady,
  type WorkspaceController,
} from "../hooks/use-workspace-controller";
import { WorkspaceDialogs } from "../components/workspace/dialogs";
import { seedStore } from "../lib/seed";
import { storeSchema, type PlannerStore } from "../lib/model";

vi.mock("../hooks/use-planner-store", () => ({ usePlannerStore: vi.fn() }));
vi.mock("../hooks/use-ai-status", () => ({ useAIStatus: vi.fn() }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));

let currentStore: PlannerStore;
let allowWrites: boolean;
let setStore: ReturnType<
  typeof vi.fn<
    (
      change: PlannerStore | ((current: PlannerStore) => PlannerStore),
    ) => boolean
  >
>;

beforeEach(() => {
  currentStore = seedStore();
  allowWrites = true;
  setStore = vi.fn((change) => {
    if (!allowWrites) return false;
    try {
      const candidate =
        typeof change === "function" ? change(currentStore) : change;
      const parsed = storeSchema.safeParse(candidate);
      if (!parsed.success) return false;
      currentStore = parsed.data;
      return true;
    } catch {
      return false;
    }
  });
  vi.mocked(usePlannerStore).mockImplementation(() => ({
    store: currentStore,
    persisted: true,
    warning: "",
    setStore,
    restoreBackup: () => "Restored one event.",
    recoveryBackup: () => null,
  }));
  vi.mocked(useAIStatus).mockReturnValue({
    configured: false,
    provider: "gemini",
    requiresSignIn: false,
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function commit(action: () => boolean) {
  let accepted = false;
  act(() => {
    accepted = action();
  });
  return accepted;
}

const DialogHarness = forwardRef<WorkspaceController>(
  function DialogHarness(_props, ref) {
    const workspace = useWorkspaceController();
    useImperativeHandle(ref, () => workspace, [workspace]);
    return workspaceReady(workspace) ? (
      <WorkspaceDialogs workspace={workspace} />
    ) : null;
  },
);

describe("exclusive workspace dialogs", () => {
  it("replaces forms, the assistant and idea details with a single dialog state", () => {
    const { result } = renderHook(useWorkspaceController);
    act(() => result.current.setModal("event"));
    expect(result.current.dialog).toEqual({ type: "event" });
    act(() => result.current.ask("Help with our budget"));
    expect(result.current.dialog).toEqual({
      type: "assistant",
      prompt: "Help with our budget",
    });
    const idea = currentStore.events[0].ideas[0];
    act(() => result.current.setIdea(idea));
    expect(result.current.dialog).toEqual({ type: "idea", idea });
    act(() => result.current.setModal("settings"));
    expect(result.current.dialog).toEqual({ type: "settings" });
    act(() => result.current.closeModal());
    expect(result.current.dialog).toBeNull();
  });

  it("opens the selected record in the matching item editor and resets stale items for a new editor", () => {
    const { result } = renderHook(useWorkspaceController),
      vendor = currentStore.events[0].vendors[0];
    act(() => result.current.openItem("vendor", vendor));
    expect(result.current.dialog).toEqual({
      type: "item",
      eventId: currentStore.activeId,
      kind: "vendor",
      item: vendor,
    });
    act(() => result.current.openItem("guest"));
    expect(result.current.dialog).toEqual({
      type: "item",
      eventId: currentStore.activeId,
      kind: "guest",
      item: undefined,
    });
  });

  it("closes mobile navigation when opening an idea dialog", () => {
    const { result } = renderHook(useWorkspaceController);
    act(() => result.current.setSidebarOpen(true));
    act(() => result.current.setIdea(currentStore.events[0].ideas[0]));
    expect(result.current.sidebarOpen).toBe(false);
  });
});

describe("transaction results", () => {
  it("retains item editors when a save fails, and closes them only after a successful write", () => {
    const { result } = renderHook(useWorkspaceController),
      original = currentStore.events[0].tasks[0];
    act(() => result.current.openItem("task", original));
    allowWrites = false;
    expect(
      commit(() =>
        result.current.itemSave("task", { ...original, title: "Updated task" }),
      ),
    ).toBe(false);
    expect(result.current.dialog?.type).toBe("item");
    expect(result.current.toast).toBe("");
    expect(currentStore.events[0].tasks[0].title).toBe(original.title);
    allowWrites = true;
    expect(
      commit(() =>
        result.current.itemSave("task", { ...original, title: "Updated task" }),
      ),
    ).toBe(true);
    expect(result.current.dialog).toBeNull();
    expect(result.current.toast).toMatch(/updated/);
    expect(currentStore.events[0].tasks[0].title).toBe("Updated task");
  });

  it("retains a removal confirmation after failure and removes the record only on success", () => {
    const { result } = renderHook(useWorkspaceController),
      original = currentStore.events[0].guests[0];
    act(() => result.current.openItem("guest", original));
    allowWrites = false;
    expect(commit(() => result.current.removeItem("guest", original.id))).toBe(
      false,
    );
    expect(result.current.dialog?.type).toBe("item");
    expect(result.current.toast).toBe("");
    allowWrites = true;
    expect(commit(() => result.current.removeItem("guest", original.id))).toBe(
      true,
    );
    expect(result.current.dialog).toBeNull();
    expect(
      currentStore.events[0].guests.some((guest) => guest.id === original.id),
    ).toBe(false);
  });

  it("keeps profile and event dialogs open when storage rejects the change", () => {
    const { result } = renderHook(useWorkspaceController);
    act(() => result.current.setModal("settings"));
    allowWrites = false;
    expect(commit(() => result.current.saveProfile("Mira"))).toBe(false);
    expect(result.current.dialog?.type).toBe("settings");
    act(() => result.current.setModal("edit-event"));
    expect(
      commit(() =>
        result.current.createOrUpdate({
          ...currentStore.events[0],
          name: "Edited celebration",
        }),
      ),
    ).toBe(false);
    expect(result.current.dialog?.type).toBe("edit-event");
    expect(result.current.toast).toBe("");
    allowWrites = true;
    expect(
      commit(() =>
        result.current.createOrUpdate({
          ...currentStore.events[0],
          name: "Edited celebration",
        }),
      ),
    ).toBe(true);
    expect(result.current.dialog).toBeNull();
    expect(currentStore.events[0].name).toBe("Edited celebration");
  });

  it("returns a failed follow-up result without a success notification", () => {
    const { result } = renderHook(useWorkspaceController),
      originalCount = currentStore.events[0].tasks.length;
    const task = {
      ...currentStore.events[0].tasks[0],
      id: "follow-up",
      title: "Confirm our follow-up",
    };
    act(() => result.current.ask());
    allowWrites = false;
    expect(commit(() => result.current.addTask(task))).toBe(false);
    expect(result.current.toast).toBe("");
    expect(result.current.dialog?.type).toBe("assistant");
    expect(currentStore.events[0].tasks).toHaveLength(originalCount);
    allowWrites = true;
    expect(commit(() => result.current.addTask(task))).toBe(true);
    expect(result.current.toast).toBe("Added to your timeline.");
    expect(currentStore.events[0].tasks).toHaveLength(originalCount + 1);
  });

  it("rejects unknown event selection without changing the current workspace", () => {
    const { result, rerender } = renderHook(useWorkspaceController),
      original = structuredClone(currentStore);
    expect(commit(() => result.current.switchEvent("unknown-event"))).toBe(
      false,
    );
    rerender();
    expect(currentStore).toEqual(original);
    expect(result.current.event?.id).toBe(original.activeId);
  });

  it("rejects an unknown event ID in an edit dialog instead of selecting a missing event", () => {
    const { result } = renderHook(useWorkspaceController),
      original = structuredClone(currentStore);
    act(() => result.current.setModal("edit-event"));
    expect(
      commit(() =>
        result.current.createOrUpdate({
          ...original.events[0],
          id: "unknown-edit",
        }),
      ),
    ).toBe(false);
    expect(currentStore).toEqual(original);
    expect(result.current.dialog?.type).toBe("edit-event");
    expect(result.current.toast).toBe("");
  });

  it("does not recreate a record removed in another tab while its editor is open", () => {
    const { result } = renderHook(useWorkspaceController);
    const task = currentStore.events[0].tasks[0];
    act(() => result.current.openItem("task", task));
    currentStore.events[0].tasks = currentStore.events[0].tasks.filter(
      (record) => record.id !== task.id,
    );
    const before = structuredClone(currentStore);
    expect(
      commit(() =>
        result.current.itemSave("task", { ...task, title: "Stale edit" }),
      ),
    ).toBe(false);
    expect(currentStore).toEqual(before);
    expect(result.current.dialog?.type).toBe("item");
    expect(result.current.toast).toBe("");
  });

  it("closes local editors on event switch and rejects stale editors after external selection changes", () => {
    const second = {
      ...structuredClone(currentStore.events[0]),
      id: "second-event",
    };
    currentStore.events.push(second);
    const { result, rerender } = renderHook(useWorkspaceController);
    const task = currentStore.events[0].tasks[0];
    act(() => result.current.openItem("task", task));
    currentStore = { ...currentStore, activeId: second.id };
    rerender();
    const before = structuredClone(currentStore);
    expect(
      commit(() =>
        result.current.itemSave("task", { ...task, title: "Stale edit" }),
      ),
    ).toBe(false);
    expect(commit(() => result.current.removeItem("task", task.id))).toBe(
      false,
    );
    expect(currentStore).toEqual(before);
    expect(
      commit(() => result.current.switchEvent(currentStore.events[0].id)),
    ).toBe(true);
    expect(result.current.dialog).toBeNull();
  });
});

describe("dialog extraction integration", () => {
  it("renders the selected vendor editor and keeps it open after a rejected write", async () => {
    const ref = createRef<WorkspaceController>(),
      user = userEvent.setup();
    render(<DialogHarness ref={ref} />);
    const vendor = currentStore.events[0].vendors[0];
    act(() => ref.current?.openItem("vendor", vendor));
    expect(
      (screen.getByLabelText("Vendor or business name") as HTMLInputElement)
        .value,
    ).toBe(vendor.name);
    expect(screen.queryByLabelText("Guest’s full name")).toBeNull();
    allowWrites = false;
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert").textContent).toMatch(/could not be saved/);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    allowWrites = true;
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not label an assistant follow-up as added when the repository rejects it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          text: "Confirm the venue access route.",
          source: "built-in",
        }),
      ),
    );
    const ref = createRef<WorkspaceController>(),
      user = userEvent.setup();
    render(<DialogHarness ref={ref} />);
    act(() => ref.current?.ask());
    await user.type(
      screen.getByLabelText("Message your planning assistant"),
      "How can we improve accessibility?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Confirm the venue access route.");
    allowWrites = false;
    await user.click(
      screen.getByRole("button", { name: "Add a follow-up task" }),
    );
    expect(screen.getByRole("alert").textContent).toMatch(/could not be added/);
    expect(
      screen.queryByRole("button", { name: "Follow-up added" }),
    ).toBeNull();
    expect(ref.current?.toast).toBe("");
  });
});
