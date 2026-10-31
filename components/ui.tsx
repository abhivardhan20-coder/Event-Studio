"use client";
import {
  cloneElement,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type AriaAttributes,
} from "react";
import { X, ArrowUpRight, Plus } from "lucide-react";

import { useDialog } from "@/hooks/use-dialog";
export { useDialog } from "@/hooks/use-dialog";

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
  error,
}: {
  label: string;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: AriaAttributes["aria-invalid"];
  }>;
  hint?: string;
  error?: string;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby":
          [
            children.props["aria-describedby"],
            hint ? hintId : undefined,
            error ? errorId : undefined,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
      })}
      {hint && <small id={hintId}>{hint}</small>}
      {error && (
        <small id={errorId} className="field-error">
          {error}
        </small>
      )}
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
