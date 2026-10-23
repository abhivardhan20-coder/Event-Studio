"use client";
import {
  cloneElement,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { X, ArrowUpRight, Plus } from "lucide-react";

export function useDialog(
  ref: RefObject<HTMLElement | null>,
  close: () => void,
) {
  const dismiss = useEffectEvent(close);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const oldOverflow = document.body.style.overflow;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".sidebar, .main-shell, .assistant-fab",
      ),
    );
    const inert = background.map((element) => element.inert ?? false);
    background.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href],[tabindex="0"]',
        ),
      ).filter(
        (element) =>
          !element.matches(":disabled,[hidden]") &&
          !element.closest("[hidden],[inert]"),
      );
    (
      dialog.querySelector<HTMLElement>(
        "input:not(:disabled),textarea:not(:disabled)",
      ) ??
      focusable()[0] ??
      dialog
    ).focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0],
        last = elements.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = oldOverflow;
      background.forEach((element, index) => {
        element.inert = inert[index];
      });
      if (previous?.isConnected) previous.focus();
    };
  }, [ref]);
}

export function Modal({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId(),
    descriptionId = useId();
  useDialog(ref, close);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">A LITTLE LESS TO THINK ABOUT</span>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={descriptionId}>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function SectionHeader({
  title,
  description,
  action,
  actionLabel = "View all",
}: {
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={action}>
          {actionLabel}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  label,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button primary" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string }>;
  hint?: string;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const hintId = `${id}-hint`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-describedby":
          [children.props["aria-describedby"], hint ? hintId : undefined]
            .filter(Boolean)
            .join(" ") || undefined,
      })}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function downloadFile(
  content: string,
  name: string,
  type = "text/plain",
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
