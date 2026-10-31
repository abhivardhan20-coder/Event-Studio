"use client";
import { useState, type FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  categories,
  taskCategories,
  expenseSchema,
  guestSchema,
  taskSchema,
  vendorSchema,
  type ItemKind,
  type PlannerItems,
  type PlannerItem,
} from "@/lib/model";
import type { ZodType } from "zod";
import { todayISO, uid } from "@/lib/format";
import {
  validationErrors,
  focusFirstError,
  type FieldErrors,
  SAVE_ERROR,
} from "@/lib/form-validation";
import { Field, Modal } from "../ui";

type ItemSaveArguments = {
  [Kind in ItemKind]: [kind: Kind, item: PlannerItems[Kind]];
}[ItemKind];
type ItemFields = {
  [Kind in ItemKind]: { kind: Kind; item?: PlannerItems[Kind] };
}[ItemKind];
export type ItemFormProps = ItemFields & {
  close: () => void;
  save: (...selection: ItemSaveArguments) => boolean;
  remove: (kind: ItemKind, id: string) => boolean;
};
export function ItemForm({ kind, item, close, save, remove }: ItemFormProps) {
  const [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const task = kind === "task" ? item : undefined,
    expense = kind === "expense" ? item : undefined,
    vendor = kind === "vendor" ? item : undefined,
    guest = kind === "guest" ? item : undefined;
  const labels = {
    task: ["A little to-do.", "Make a little space for the next step."],
    expense: [
      "The little things add up.",
      "Every detail deserves a place in your budget.",
    ],
    vendor: [
      "Meet your dream team.",
      "Keep the people behind your celebration together.",
    ],
    guest: [
      "One more happy face.",
      "The people are what make it a celebration.",
    ],
  };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    setFieldErrors({});
    const f = new FormData(form),
      id = item?.id ?? uid();
    const get = (key: string) => String(f.get(key) ?? "").trim();
    const number = (key: string) => (get(key) === "" ? NaN : Number(get(key)));
    function commit<Value extends PlannerItem>(
      schema: ZodType<Value>,
      candidate: unknown,
      onSave: (value: Value) => boolean,
    ) {
      const result = schema.safeParse(candidate);
      if (!result.success) {
        const errors = validationErrors(result.error.issues);
        setFieldErrors(errors);
        setError(
          result.error.issues[0]?.message ?? "Check the highlighted details.",
        );
        focusFirstError(form, errors);
        return;
      }
      try {
        if (!onSave(result.data)) setError(SAVE_ERROR);
      } catch {
        setError(SAVE_ERROR);
      }
    }
    switch (kind) {
      case "task":
        commit(
          taskSchema,
          {
            id,
            title: get("title"),
            category: get("category"),
            date: get("date"),
            done: task?.done ?? false,
          },
          (value) => save("task", value),
        );
        break;
      case "expense":
        commit(
          expenseSchema,
          {
            id,
            name: get("name"),
            category: get("category"),
            amount: number("amount"),
            paid: f.get("paid") === "on",
          },
          (value) => save("expense", value),
        );
        break;
      case "vendor":
        commit(
          vendorSchema,
          {
            id,
            name: get("name"),
            category: get("category"),
            contact: get("contact"),
            quote: number("quote"),
            status: get("status"),
            checklist: vendor?.checklist ?? [false, false, false, false],
          },
          (value) => save("vendor", value),
        );
        break;
      case "guest":
        commit(
          guestSchema,
          {
            id,
            name: get("name"),
            email: get("email"),
            rsvp: get("rsvp"),
            group: get("group"),
            dietary: get("dietary"),
          },
          (value) => save("guest", value),
        );
        break;
    }
  }
  function confirmRemoval() {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      if (!remove(kind, item.id))
        setError(
          "This item could not be removed. Your existing plan was kept.",
        );
    } catch {
      setError("This item could not be removed. Your existing plan was kept.");
    }
  }
  return (
    <Modal title={labels[kind][0]} subtitle={labels[kind][1]} close={close}>
      <form className="item-form" onSubmit={submit} noValidate>
        {kind === "task" ? (
          <>
            <Field label="What needs a little love?" error={fieldErrors.title}>
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Book the perfect photographer"
                defaultValue={task?.title}
              />
            </Field>
            <div className="form-grid">
              <Field label="When’s it due?" error={fieldErrors.date}>
                <input
                  name="date"
                  required
                  type="date"
                  defaultValue={task?.date ?? todayISO()}
                />
              </Field>
              <Field label="Category" error={fieldErrors.category}>
                <select
                  name="category"
                  defaultValue={task?.category ?? "Other"}
                >
                  {taskCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field
              error={fieldErrors.name}
              label={
                kind === "expense"
                  ? "What’s the expense?"
                  : kind === "vendor"
                    ? "Vendor or business name"
                    : "Guest’s full name"
              }
            >
              <input
                name="name"
                required
                maxLength={kind === "guest" ? 100 : 120}
                placeholder={
                  kind === "expense"
                    ? "e.g. Flowers for the tables"
                    : kind === "vendor"
                      ? "e.g. Petals & Stories"
                      : "e.g. Ananya Sharma"
                }
                defaultValue={expense?.name ?? vendor?.name ?? guest?.name}
              />
            </Field>
            {kind !== "guest" && (
              <div className="form-grid">
                <Field label="Category" error={fieldErrors.category}>
                  <select
                    name="category"
                    defaultValue={
                      expense?.category ?? vendor?.category ?? "Venue"
                    }
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={kind === "expense" ? "Amount (₹)" : "Quote (₹)"}
                  error={
                    kind === "expense" ? fieldErrors.amount : fieldErrors.quote
                  }
                >
                  <input
                    name={kind === "expense" ? "amount" : "quote"}
                    type="number"
                    min={0}
                    max={100000000}
                    step="0.01"
                    required
                    defaultValue={
                      expense?.amount ??
                      vendor?.quote ??
                      (kind === "vendor" ? 0 : undefined)
                    }
                    placeholder="0"
                  />
                </Field>
              </div>
            )}
            {kind === "expense" && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="paid"
                  defaultChecked={expense?.paid ?? false}
                />
                <span>This expense has been paid</span>
              </label>
            )}
            {kind === "vendor" && (
              <>
                <Field label="Contact details" error={fieldErrors.contact}>
                  <input
                    name="contact"
                    maxLength={200}
                    placeholder="Email, phone number or a little note"
                    defaultValue={vendor?.contact}
                  />
                </Field>
                <Field
                  label="Where are you in the conversation?"
                  error={fieldErrors.status}
                >
                  <select
                    name="status"
                    defaultValue={vendor?.status ?? "To contact"}
                  >
                    {["To contact", "Contacted", "Shortlisted", "Booked"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </Field>
                <small className="subtle-text">
                  Quotes are tracked here. Add confirmed costs separately in
                  Budget.
                </small>
              </>
            )}
            {kind === "guest" && (
              <>
                <Field
                  label="Email address (optional)"
                  error={fieldErrors.email}
                >
                  <input
                    name="email"
                    type="email"
                    maxLength={200}
                    placeholder="hello@example.com"
                    defaultValue={guest?.email}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Their little circle" error={fieldErrors.group}>
                    <input
                      name="group"
                      maxLength={60}
                      placeholder="Family, friends, neighbors…"
                      defaultValue={guest?.group ?? "Friends"}
                    />
                  </Field>
                  <Field label="RSVP" error={fieldErrors.rsvp}>
                    <select name="rsvp" defaultValue={guest?.rsvp ?? "Pending"}>
                      {["Pending", "Confirmed", "Declined"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field
                  label="Anything we should remember? (optional)"
                  error={fieldErrors.dietary}
                >
                  <input
                    name="dietary"
                    maxLength={200}
                    placeholder="Dietary needs, accessibility, a special request…"
                    defaultValue={guest?.dietary}
                  />
                </Field>
              </>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {item ? (
            <button
              className="button delete-button"
              type="button"
              onClick={confirmRemoval}
            >
              <Trash2 size={15} />
              {confirmDelete ? "Confirm removal" : "Remove"}
            </button>
          ) : (
            <button className="button secondary" onClick={close} type="button">
              Maybe later
            </button>
          )}
          <button className="button primary" type="submit">
            <Check size={16} />
            {item ? "Save changes" : `Add ${kind}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
