"use client";
import { useEffect, useEffectEvent, type RefObject } from "react";

interface DialogOptions {
  enabled?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}
interface DialogSession {
  element: HTMLElement;
  close: () => void;
  lastFocus: HTMLElement | null;
}

// A single modal stack also handles a drawer opening another dialog. Only the
// top layer contains focus; isolation follows the DOM rather than CSS classes.
const dialogs: DialogSession[] = [];
const isolated = new Map<HTMLElement, boolean>();
let overflowBeforeDialogs = "";
let isolationObserver: MutationObserver | undefined;
const activeDialog = () => dialogs.at(-1);

function available(element: HTMLElement) {
  if (element.matches(':disabled,input[type="hidden"]')) return false;
  const style = getComputedStyle(element);
  if (style.visibility === "hidden" || style.visibility === "collapse")
    return false;
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    if (
      current.hidden ||
      current.inert ||
      current.getAttribute("aria-hidden") === "true" ||
      getComputedStyle(current).display === "none"
    )
      return false;
    if (current.tagName === "DETAILS" && !current.hasAttribute("open")) {
      const summary = current.querySelector(":scope > summary");
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

function tabStops(dialog: HTMLElement) {
  const elements = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button,input,select,textarea,a[href],area[href],iframe,summary,[tabindex],[contenteditable="true"],[contenteditable=""]',
    ),
  ).filter(
    (element) =>
      (element.tabIndex >= 0 ||
        (element.isContentEditable && !element.hasAttribute("tabindex"))) &&
      available(element),
  );
  // Native radio groups have a single sequential tab stop.
  return elements
    .filter((element) => {
      if (
        !(element instanceof HTMLInputElement) ||
        element.type !== "radio" ||
        !element.name
      )
        return true;
      const group = elements.filter(
        (candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement &&
          candidate.type === "radio" &&
          candidate.name === element.name &&
          candidate.form === element.form,
      );
      return element === (group.find((radio) => radio.checked) ?? group[0]);
    })
    .sort(
      (a, b) =>
        (a.tabIndex > 0 ? a.tabIndex : Number.MAX_SAFE_INTEGER) -
        (b.tabIndex > 0 ? b.tabIndex : Number.MAX_SAFE_INTEGER),
    );
}

function focusInside(session: DialogSession) {
  const previous = session.lastFocus;
  const target =
    previous?.isConnected &&
    session.element.contains(previous) &&
    available(previous)
      ? previous
      : (tabStops(session.element)[0] ?? session.element);
  target.focus();
}

function isolateBackground() {
  for (const [element, inert] of isolated) element.inert = inert;
  isolated.clear();
  const active = activeDialog();
  if (!active) return;
  for (
    let branch: HTMLElement | null = active.element;
    branch?.parentElement;
    branch = branch.parentElement
  ) {
    for (const sibling of branch.parentElement.children) {
      if (sibling instanceof HTMLElement && sibling !== branch) {
        isolated.set(sibling, sibling.inert ?? false);
        sibling.inert = true;
      }
    }
    if (branch.parentElement === document.body) break;
  }
}

function containFocus(event: FocusEvent) {
  const active = activeDialog();
  if (!active || !(event.target instanceof HTMLElement)) return;
  if (active.element.contains(event.target)) active.lastFocus = event.target;
  else focusInside(active);
}

function handleDialogKey(event: KeyboardEvent) {
  const active = activeDialog();
  if (!active) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    active.close();
    return;
  }
  if (event.key !== "Tab") return;
  const elements = tabStops(active.element);
  const current = document.activeElement;
  const first = elements[0],
    last = elements.at(-1);
  if (!first) {
    event.preventDefault();
    active.element.focus();
  } else if (!(current instanceof HTMLElement) || !elements.includes(current)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  } else if (event.shiftKey && current === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

export function useDialog(
  ref: RefObject<HTMLElement | null>,
  close: () => void,
  { enabled = true, initialFocus, restoreFocus = true }: DialogOptions = {},
) {
  const dismiss = useEffectEvent(close);
  useEffect(() => {
    const dialog = ref.current;
    if (!enabled || !dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalTabIndex = dialog.getAttribute("tabindex");
    if (originalTabIndex === null) dialog.tabIndex = -1;
    const session: DialogSession = {
      element: dialog,
      close: () => dismiss(),
      lastFocus: null,
    };
    if (!dialogs.length) {
      overflowBeforeDialogs = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleDialogKey, true);
      document.addEventListener("focusin", containFocus, true);
      isolationObserver = new MutationObserver((records) => {
        const active = activeDialog();
        if (
          active &&
          records.some((record) => !active.element.contains(record.target))
        )
          isolateBackground();
      });
      isolationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
    dialogs.push(session);
    isolateBackground();
    const preferred = initialFocus?.current;
    const elements = tabStops(dialog);
    const target =
      preferred && dialog.contains(preferred) && available(preferred)
        ? preferred
        : (elements.find((element) => element.matches("input,textarea")) ??
          elements[0] ??
          dialog);
    target.focus();
    return () => {
      const wasActive = activeDialog() === session;
      const index = dialogs.indexOf(session);
      if (index >= 0) dialogs.splice(index, 1);
      isolateBackground();
      if (!dialogs.length) {
        isolationObserver?.disconnect();
        isolationObserver = undefined;
        document.body.style.overflow = overflowBeforeDialogs;
        document.removeEventListener("keydown", handleDialogKey, true);
        document.removeEventListener("focusin", containFocus, true);
      }
      if (originalTabIndex === null) dialog.removeAttribute("tabindex");
      if (!wasActive) return;
      const active = activeDialog();
      if (
        restoreFocus &&
        previous?.isConnected &&
        available(previous) &&
        (!active || active.element.contains(previous))
      )
        previous.focus();
      else if (active) focusInside(active);
    };
  }, [ref, enabled, initialFocus, restoreFocus]);
}
