"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Heart,
  LoaderCircle,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  categories,
  eventInputSchema,
  eventSchema,
  expenseSchema,
  guestSchema,
  taskSchema,
  vendorSchema,
  todayISO,
  uid,
  dateOffset,
  editEvent,
  LIMITS,
  type Celebration,
  type EventType,
  type Expense,
  type Guest,
  type Task,
  type Vendor,
} from "@/lib/planner";
import type { ItemKind } from "@/lib/model";
import { readApiResponse, SIGN_IN_PATH } from "@/lib/api-client";
import { Field, Modal } from "./ui";

export function EventForm({
  event,
  liveAI,
  requiresSignIn = false,
  close,
  save,
}: {
  event?: Celebration;
  liveAI: boolean;
  requiresSignIn?: boolean;
  close: () => void;
  save: (event: Celebration) => void;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? "Wedding"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [moveTasks, setMoveTasks] = useState(true);
  const [useAI, setUseAI] = useState(liveAI && !requiresSignIn);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const parsed = eventInputSchema.safeParse({
      name: data.get("name"),
      type,
      date: data.get("date"),
      location: data.get("location"),
      budget: Number(data.get("budget")),
      guestCount: Number(data.get("guestCount")),
      vibe: data.get("vibe"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (event) {
      save(editEvent(event, parsed.data, moveTasks));
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          mode: useAI ? "auto" : "built-in",
          event: parsed.data,
        }),
        signal: controller.signal,
      });
      const payload = await readApiResponse(response);
      const result = eventSchema.safeParse(
        typeof payload === "object" && payload !== null && "event" in payload
          ? payload.event
          : undefined,
      );
      if (!result.success)
        throw new Error(
          "We couldn’t read the generated plan. Please try again.",
        );
      if (!controller.signal.aborted) save(result.data);
    } catch (err) {
      if (controller.signal.aborted)
        setError("Planning took a little too long. Please try again.");
      else
        setError(
          err instanceof Error
            ? err.message
            : "We couldn’t connect. Please try again.",
        );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={event ? "The little details." : "What are we celebrating?"}
      subtitle={
        event
          ? "Keep your plan in step with your vision."
          : "Every great celebration starts with a little idea."
      }
      close={close}
      wide
    >
      <form onSubmit={submit} className="event-form">
        <fieldset
          className="form-fields"
          disabled={busy}
          aria-label="Celebration details"
        >
          <div className="event-type-options">
            {(
              [
                {
                  name: "Wedding",
                  icon: Heart,
                  note: "Your forever kind of day",
                },
                {
                  name: "Birthday",
                  icon: PartyPopper,
                  note: "Another year of wonderful",
                },
                {
                  name: "Community",
                  icon: Users,
                  note: "Better when we’re together",
                },
              ] as const
            ).map(({ name, icon: Icon, note }) => (
              <button
                type="button"
                key={name}
                className={type === name ? "selected" : ""}
                onClick={() => setType(name)}
                aria-pressed={type === name}
              >
                <Icon size={24} strokeWidth={1.4} />
                <strong>{name}</strong>
                <small>{note}</small>
                {type === name && (
                  <span className="type-check">
                    <Check size={11} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <Field label="Give your celebration a name">
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder={
                type === "Wedding"
                  ? "e.g. Maya & Arjun’s wedding"
                  : type === "Birthday"
                    ? "e.g. Aanya’s 25th birthday"
                    : "e.g. Our neighborhood garden party"
              }
              defaultValue={event?.name}
            />
          </Field>
          <div className="form-grid">
            <Field label="The big day">
              <input
                name="date"
                type="date"
                required
                min={event ? undefined : todayISO()}
                defaultValue={event?.date ?? dateOffset(todayISO(), 60)}
              />
            </Field>
            <Field label="Where’s the celebration?">
              <input
                name="location"
                required
                minLength={2}
                maxLength={120}
                placeholder="City, venue or a little of both"
                defaultValue={event?.location}
              />
            </Field>
            <Field label="Your total budget (₹)">
              <input
                name="budget"
                type="number"
                min={100}
                max={100000000}
                step="0.01"
                required
                placeholder="e.g. 500000"
                defaultValue={event?.budget}
              />
            </Field>
            <Field label="How many happy faces?">
              <input
                name="guestCount"
                type="number"
                min={1}
                max={100000}
                step={1}
                required
                placeholder="e.g. 100"
                defaultValue={event?.guestCount}
              />
            </Field>
          </div>
          <Field
            label="Tell us your kind of magic"
            hint="Colors, traditions, favorite things, dietary needs… whatever makes it yours."
          >
            <textarea
              name="vibe"
              maxLength={300}
              rows={3}
              placeholder="An intimate garden celebration, warm earthy colors, seasonal food and lots of fairy lights…"
              defaultValue={event?.vibe}
            />
          </Field>
          {event ? (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={moveTasks}
                onChange={(e) => setMoveTasks(e.target.checked)}
              />
              Move unfinished tasks by the same number of days if the event date
              changes. Completed tasks keep their dates.
            </label>
          ) : (
            <div className="planning-mode">
              {liveAI && !requiresSignIn && (
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                  />
                  Personalize this plan with Gemini
                </label>
              )}
              {requiresSignIn && (
                <p>
                  <a href={SIGN_IN_PATH} target="_top">
                    Sign in with ChatGPT
                  </a>{" "}
                  for Gemini personalization, or create a built-in plan now.
                </p>
              )}
            </div>
          )}
          <div className="note form-ai-note">
            <Sparkles size={19} />
            <p>
              {event
                ? "Your expenses, vendor details and guest list stay together when you update this event."
                : useAI
                  ? "Gemini will create a personalized timeline, vendor checklist and celebration ideas from your details."
                  : "Start with an editable built-in timeline, budget allocation, vendor checklist and celebration ideas."}
            </p>
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={close}>
            Maybe later
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle size={17} className="spin" />
                Bringing your plan together…
              </>
            ) : event ? (
              <>
                Save the details
                <Check size={16} />
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Create my celebration plan
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type Item = Task | Expense | Vendor | Guest;
export function ItemForm({
  kind,
  item,
  close,
  save,
  remove,
}: {
  kind: ItemKind;
  item?: Item;
  close: () => void;
  save: (kind: ItemKind, item: Item) => void;
  remove: (kind: ItemKind, id: string) => void;
}) {
  const [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const task = kind === "task" && item && "title" in item ? item : undefined,
    expense = kind === "expense" && item && "amount" in item ? item : undefined,
    vendor =
      kind === "vendor" && item && "checklist" in item ? item : undefined,
    guest = kind === "guest" && item && "rsvp" in item ? item : undefined;
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
    const f = new FormData(e.currentTarget),
      id = item?.id ?? uid();
    const get = (key: string) => String(f.get(key) ?? "").trim();
    let value: unknown;
    if (kind === "task")
      value = {
        id,
        title: get("title"),
        category: get("category"),
        date: get("date"),
        done: task?.done ?? false,
      };
    if (kind === "expense")
      value = {
        id,
        name: get("name"),
        category: get("category"),
        amount: Number(f.get("amount")),
        paid: f.get("paid") === "on",
      };
    if (kind === "vendor")
      value = {
        id,
        name: get("name"),
        category: get("category"),
        contact: get("contact"),
        quote: Number(f.get("quote")),
        status: get("status"),
        checklist: vendor?.checklist ?? [false, false, false, false],
      };
    if (kind === "guest")
      value = {
        id,
        name: get("name"),
        email: get("email"),
        rsvp: get("rsvp"),
        group: get("group"),
        dietary: get("dietary"),
      };
    const schema = {
      task: taskSchema,
      expense: expenseSchema,
      vendor: vendorSchema,
      guest: guestSchema,
    }[kind];
    const result = schema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(`${issue.path.join(" ") || "Detail"}: ${issue.message}`);
      return;
    }
    save(kind, result.data);
  }
  return (
    <Modal title={labels[kind][0]} subtitle={labels[kind][1]} close={close}>
      <form className="item-form" onSubmit={submit}>
        {kind === "task" ? (
          <>
            <Field label="What needs a little love?">
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Book the perfect photographer"
                defaultValue={task?.title}
              />
            </Field>
            <div className="form-grid">
              <Field label="When’s it due?">
                <input
                  name="date"
                  required
                  type="date"
                  defaultValue={task?.date ?? todayISO()}
                />
              </Field>
              <Field label="Category">
                <select
                  name="category"
                  defaultValue={task?.category ?? "Other"}
                >
                  {[...categories, "Guests", "Vendors", "Celebration"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field
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
                <Field label="Category">
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
                <Field label={kind === "expense" ? "Amount (₹)" : "Quote (₹)"}>
                  <input
                    name={kind === "expense" ? "amount" : "quote"}
                    type="number"
                    min={kind === "expense" ? 1 : 0}
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
                <Field label="Contact details">
                  <input
                    name="contact"
                    maxLength={200}
                    placeholder="Email, phone number or a little note"
                    defaultValue={vendor?.contact}
                  />
                </Field>
                <Field label="Where are you in the conversation?">
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
                <Field label="Email address (optional)">
                  <input
                    name="email"
                    type="email"
                    maxLength={200}
                    placeholder="hello@example.com"
                    defaultValue={guest?.email}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Their little circle">
                    <input
                      name="group"
                      maxLength={60}
                      placeholder="Family, friends, neighbors…"
                      defaultValue={guest?.group ?? "Friends"}
                    />
                  </Field>
                  <Field label="RSVP">
                    <select name="rsvp" defaultValue={guest?.rsvp ?? "Pending"}>
                      {["Pending", "Confirmed", "Declined"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Anything we should remember? (optional)">
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
              onClick={() =>
                confirmDelete ? remove(kind, item.id) : setConfirmDelete(true)
              }
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

export function SettingsForm({
  profile,
  liveAI,
  requiresSignIn = false,
  close,
  save,
  backup,
  restore,
  recovery,
}: {
  profile: string;
  liveAI: boolean;
  requiresSignIn?: boolean;
  close: () => void;
  save: (name: string) => void;
  backup: () => void;
  restore: (raw: string) => string;
  recovery: () => void;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  return (
    <Modal
      title="Make yourself at home."
      subtitle="Your workspace, your little way."
      close={close}
    >
      <form
        className="item-form"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(
            new FormData(e.currentTarget).get("profile") ?? "",
          ).trim();
          if (name) save(name);
        }}
      >
        <Field label="What should we call you?">
          <input
            name="profile"
            defaultValue={profile}
            required
            maxLength={40}
          />
        </Field>
        <div className="settings-block">
          <div>
            <Sparkles size={20} />
            <strong>Gemini connection</strong>
            <span className={`status-pill ${liveAI ? "green" : "peach"}`}>
              {liveAI ? "Connected" : "Built-in mode"}
            </span>
          </div>
          <p>
            {liveAI
              ? requiresSignIn
                ? "Sign in with ChatGPT to use personalized Gemini planning. Built-in plans are available now."
                : "Your AI assistant is ready. API credentials are held securely on the server."
              : "Editable built-in plans and guidance are available. Live AI is temporarily unavailable."}
          </p>
        </div>
        <div className="settings-block">
          <div>
            <ShieldCheck size={20} />
            <strong>A little peace of mind</strong>
          </div>
          <p>
            Plans save in this browser on this device. Download a JSON backup to
            keep an extra copy. Guest contacts aren’t included in AI requests.
          </p>
          <button
            className="button secondary small"
            type="button"
            onClick={backup}
          >
            <Download size={15} />
            Download backup
          </button>
          <Field
            label="Restore a Gather backup"
            hint="JSON files up to 5 MB. New events are added; existing events are kept."
          >
            <input
              type="file"
              accept=".json,application/json"
              disabled={restoring}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setError("");
                setResult("");
                setRestoring(true);
                try {
                  if (file.size > LIMITS.backupBytes)
                    throw new Error("Choose a backup smaller than 5 MB.");
                  setResult(restore(await file.text()));
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "This backup could not be restored.",
                  );
                } finally {
                  setRestoring(false);
                  input.value = "";
                }
              }}
            />
          </Field>
          <button type="button" className="text-button" onClick={recovery}>
            Download browser recovery copy
          </button>
          {restoring && <p role="status">Reading your backup…</p>}
          {result && <p role="status">{result}</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={close}>
            Close
          </button>
          <button className="button primary" type="submit">
            Save your workspace
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
