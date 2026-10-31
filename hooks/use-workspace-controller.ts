"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlannerStore } from "./use-planner-store";
import { useAIStatus } from "./use-ai-status";
import {
  itemDialog,
  eventProgress,
  type OpenItem,
  type SimpleDialog,
  type WorkspaceDialog,
} from "@/lib/workspace";
import { removeItem, saveItem } from "@/lib/state";
import type {
  Celebration,
  Idea,
  ItemKind,
  PlannerItem,
  PlannerStore,
  Tab,
  Task,
} from "@/lib/model";

/** Own state transitions here; visual components only render the current workspace. */
export function useWorkspaceController() {
  const repository = usePlannerStore();
  const { store, setStore } = repository;
  const { configured: liveAI, requiresSignIn } = useAIStatus();
  const [{ tab, savedOnly }, setView] = useState<{
    tab: Tab;
    savedOnly: boolean;
  }>({ tab: "Overview", savedOnly: false });
  const [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const event =
    store?.events.find((event) => event.id === store.activeId) ??
    store?.events[0];
  const notify = useCallback((message: string) => setToast(message), []);
  const closeModal = useCallback(() => setDialog(null), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const update = useCallback(
    (updater: (event: Celebration) => Celebration) =>
      setStore((current) => ({
        ...current,
        events: current.events.map((event) =>
          event.id === current.activeId ? updater(event) : event,
        ),
      })),
    [setStore],
  );
  const setModal = (type: SimpleDialog | null) => {
    setSidebarOpen(false);
    setDialog(type ? { type } : null);
  };
  const openItem: OpenItem = (kind, item) => {
    if (!event) return;
    setSidebarOpen(false);
    setDialog(itemDialog(kind, item, event.id));
  };
  const go = (next: Tab) => {
    setView({ tab: next, savedOnly: false });
    setSidebarOpen(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const setSavedOnly = (savedOnly: boolean) =>
    setView((current) => ({ ...current, savedOnly }));
  const ask = (prompt = "") => {
    setSidebarOpen(false);
    setDialog({ type: "assistant", prompt });
  };
  const setIdea = (idea: Idea | null) => {
    setSidebarOpen(false);
    setDialog(idea ? { type: "idea", idea } : null);
  };
  const toggleTask = (id: string) =>
    update((event) => ({
      ...event,
      tasks: event.tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    }));
  const saveIdea = (id: string) =>
    update((event) => ({
      ...event,
      ideas: event.ideas.map((idea) =>
        idea.id === id ? { ...idea, saved: !idea.saved } : idea,
      ),
    }));
  const createOrUpdate = (next: Celebration) => {
    const editing = dialog?.type === "edit-event";
    if (
      !store ||
      (editing && next.id !== event?.id) ||
      (!editing && store.events.some((event) => event.id === next.id))
    )
      return false;
    const committed = setStore((current) => {
      if (editing && !current.events.some((event) => event.id === next.id))
        throw new Error("The event changed while editing.");
      return {
        ...current,
        activeId: next.id,
        events: editing
          ? current.events.map((event) => (event.id === next.id ? next : event))
          : [...current.events, next],
      };
    });
    if (!committed) return false;
    setView({ tab: "Overview", savedOnly: false });
    closeModal();
    notify(
      editing
        ? "Your event details are updated."
        : `Your ${next.type.toLowerCase()} plan is ready. Let's make it special.`,
    );
    return true;
  };
  const itemSave = (kind: ItemKind, value: PlannerItem) => {
    if (
      dialog?.type !== "item" ||
      dialog.eventId !== event?.id ||
      dialog.kind !== kind ||
      (dialog.item && dialog.item.id !== value.id)
    )
      return false;
    const editor = dialog;
    if (
      !update((event) => {
        if (event.id !== editor.eventId)
          throw new Error("The event changed while editing.");
        const records = {
          task: event.tasks,
          expense: event.expenses,
          vendor: event.vendors,
          guest: event.guests,
        }[kind];
        if (
          editor.item &&
          !records.some((record) => record.id === editor.item?.id)
        )
          throw new Error("This record was removed in another tab.");
        return saveItem(event, kind, value);
      })
    )
      return false;
    const editing = dialog?.type === "item" && dialog.item !== undefined;
    closeModal();
    notify(
      `${kind[0].toUpperCase() + kind.slice(1)} ${editing ? "updated" : "added"}. One less thing to think about.`,
    );
    return true;
  };
  const itemRemove = (kind: ItemKind, id: string) => {
    if (
      dialog?.type !== "item" ||
      dialog.eventId !== event?.id ||
      dialog.kind !== kind ||
      dialog.item?.id !== id
    )
      return false;
    const editor = dialog;
    if (
      !update((event) => {
        if (event.id !== editor.eventId)
          throw new Error("The event changed while editing.");
        return removeItem(event, kind, id);
      })
    )
      return false;
    closeModal();
    notify("Removed from your plan.");
    return true;
  };
  const saveProfile = (profile: string) => {
    if (!setStore((current) => ({ ...current, profile }))) return false;
    closeModal();
    notify("Your workspace is updated.");
    return true;
  };
  const addTask = (task: Task) => {
    if (!update((event) => ({ ...event, tasks: [...event.tasks, task] })))
      return false;
    notify("Added to your timeline.");
    return true;
  };
  const switchEvent = (id: string) => {
    if (!store?.events.some((event) => event.id === id)) return false;
    if (store.activeId === id) return true;
    if (!setStore((current) => ({ ...current, activeId: id }))) return false;
    closeModal();
    closeSidebar();
    return true;
  };
  const upcoming =
    event?.tasks
      .filter((task) => !task.done)
      .sort((a, b) => a.date.localeCompare(b.date)) ?? [];
  const idea =
    dialog?.type === "idea"
      ? (event?.ideas.find((idea) => idea.id === dialog.idea.id) ?? dialog.idea)
      : null;
  return {
    ...repository,
    update,
    liveAI,
    requiresSignIn,
    store,
    event,
    tab,
    savedOnly,
    dialog,
    sidebarOpen,
    setSidebarOpen,
    closeSidebar,
    toast,
    setToast,
    headingRef,
    notify,
    closeModal,
    setModal,
    openItem,
    go,
    setSavedOnly,
    ask,
    setIdea,
    toggleTask,
    saveIdea,
    createOrUpdate,
    itemSave,
    removeItem: itemRemove,
    saveProfile,
    addTask,
    switchEvent,
    upcoming,
    idea,
    progress: event ? eventProgress(event) : 0,
    saved: event?.ideas.filter((idea) => idea.saved).length ?? 0,
  };
}
export type WorkspaceController = ReturnType<typeof useWorkspaceController>;
export type ReadyWorkspace = WorkspaceController & {
  store: PlannerStore;
  event: Celebration;
};
export function workspaceReady(
  workspace: WorkspaceController,
): workspace is ReadyWorkspace {
  return workspace.store !== null && workspace.event !== undefined;
}
