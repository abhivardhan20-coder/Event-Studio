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
  type Celebration,
  type EventType,
  type Expense,
  type Guest,
  type Task,
  type Vendor,
} from "@/lib/planner";
import type { ItemKind } from "./planner-app";
import { Field, Modal } from "./ui";

export function EventForm({
  event,
  liveAI,
  close,
  save,
}: {
  event?: Celebration;
  liveAI: boolean;
  close: () => void;
  save: (event: Celebration) => void;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? "Wedding"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
      save({ ...event, ...parsed.data });
      return;
    }
    setBusy(true);
    request.current = new AbortController();
    const timeout = setTimeout(() => request.current?.abort(), 40000);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", event: parsed.data }),
        signal: request.current.signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        event?: unknown;
      };
      if (!response.ok)
        throw new Error(
          payload.error ?? "Your plan couldn’t be generated. Please try again.",
        );
      const result = eventSchema.safeParse(payload.event);
      if (!result.success)
        throw new Error(
          "We couldn’t read the generated plan. Please try again.",
        );
      if (!request.current.signal.aborted) save(result.data);
    } catch (err) {
      if (request.current.signal.aborted)
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
              step="1"
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
        <div className="note form-ai-note">
          <Sparkles size={19} />
          <p>
            {event
              ? "Your tasks, expenses and guest list stay together. Adjust dates in Timeline if your event date changes."
              : liveAI
                ? "Gemini will create a personalized timeline, vendor checklist and celebration ideas from your details."
                : "Start with a thoughtful built-in plan. Live Gemini generation is available once your server API key is connected."}
          </p>
        </div>
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
  event,
  close,
  save,
  remove,
}: {
  kind: ItemKind;
  item?: Item;
  event: Celebration;
  close: () => void;
  save: (kind: ItemKind, item: Item) => void;
  remove: (kind: ItemKind, id: string) => void;
}) {
  const [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const task = kind === "task" ? (item as Task | undefined) : undefined,
    expense = kind === "expense" ? (item as Expense | undefined) : undefined,
    vendor = kind === "vendor" ? (item as Vendor | undefined) : undefined,
    guest = kind === "guest" ? (item as Guest | undefined) : undefined;
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
      setError("A detail doesn’t look quite right. Please check the form.");
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
  close,
  save,
  backup,
}: {
  profile: string;
  liveAI: boolean;
  close: () => void;
  save: (name: string) => void;
  backup: () => void;
}) {
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
              ? "Your AI assistant is ready. API credentials are held securely on the server."
              : "The app works with built-in planning templates. To enable live AI, set GEMINI_API_KEY in your server environment and restart or redeploy. Never put your key in browser code."}
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
