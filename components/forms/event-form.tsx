"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Heart,
  LoaderCircle,
  PartyPopper,
  Sparkles,
  Users,
} from "lucide-react";
import {
  eventInputSchema,
  eventSchema,
  type Celebration,
  type EventType,
} from "@/lib/model";
import { todayISO, dateOffset } from "@/lib/format";
import { editEvent } from "@/lib/state";
import { readApiResponse, SIGN_IN_PATH } from "@/lib/api-client";
import {
  validationErrors,
  focusFirstError,
  type FieldErrors,
  SAVE_ERROR,
} from "@/lib/form-validation";
import { Field, Modal } from "../ui";

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
  save: (event: Celebration) => boolean;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? "Wedding"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [moveTasks, setMoveTasks] = useState(true);
  const [useAI, setUseAI] = useState(liveAI && !requiresSignIn);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  function commit(next: Celebration) {
    try {
      if (!save(next)) setError(SAVE_ERROR);
    } catch {
      setError(SAVE_ERROR);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setError("");
    setFieldErrors({});
    const data = new FormData(form);
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
      const errors = validationErrors(parsed.error.issues);
      setFieldErrors(errors);
      setError("Check the highlighted celebration details.");
      focusFirstError(form, errors);
      return;
    }
    if (!event && parsed.data.date < todayISO()) {
      const errors = {
        date: "Choose today or a future date for your celebration.",
      };
      setFieldErrors(errors);
      setError("Check the highlighted celebration details.");
      focusFirstError(form, errors);
      return;
    }
    if (event) {
      let next: Celebration;
      try {
        next = editEvent(event, parsed.data, moveTasks);
      } catch {
        const errors = {
          date: "These dates could not be applied. Keep existing task dates or choose a closer event date.",
        };
        setFieldErrors(errors);
        setError("Check the highlighted celebration details.");
        focusFirstError(form, errors);
        return;
      }
      commit(next);
      return;
    }
    inFlight.current = true;
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
      if (mounted.current && !controller.signal.aborted) commit(result.data);
    } catch (err) {
      if (!mounted.current) return;
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
      inFlight.current = false;
      if (request.current === controller) request.current = null;
      if (mounted.current) setBusy(false);
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
      <form onSubmit={submit} className="event-form" noValidate>
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
          <Field label="Give your celebration a name" error={fieldErrors.name}>
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
            <Field label="The big day" error={fieldErrors.date}>
              <input
                name="date"
                type="date"
                required
                min={event ? undefined : todayISO()}
                defaultValue={event?.date ?? dateOffset(todayISO(), 60)}
              />
            </Field>
            <Field
              label="Where’s the celebration?"
              error={fieldErrors.location}
            >
              <input
                name="location"
                required
                minLength={2}
                maxLength={120}
                placeholder="City, venue or a little of both"
                defaultValue={event?.location}
              />
            </Field>
            <Field label="Your total budget (₹)" error={fieldErrors.budget}>
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
            <Field label="How many happy faces?" error={fieldErrors.guestCount}>
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
            error={fieldErrors.vibe}
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
