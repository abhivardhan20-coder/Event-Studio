"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { Check, Download, ShieldCheck, Sparkles } from "lucide-react";
import { LIMITS, profileSchema } from "@/lib/model";
import {
  focusFirstError,
  type FieldErrors,
  SAVE_ERROR,
} from "@/lib/form-validation";
import { Field, Modal } from "../ui";

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
  save: (name: string) => boolean;
  backup: () => void;
  restore: (raw: string) => string;
  recovery: () => void;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const mounted = useRef(true),
    readSequence = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      readSequence.current += 1;
    };
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const form = event.currentTarget;
    const parsed = profileSchema.safeParse(new FormData(form).get("profile"));
    if (!parsed.success) {
      const errors = { profile: parsed.error.issues[0].message };
      setFieldErrors(errors);
      setError("Please check your workspace name.");
      focusFirstError(form, errors);
      return;
    }
    try {
      if (!save(parsed.data)) setError(SAVE_ERROR);
    } catch {
      setError(SAVE_ERROR);
    }
  }
  async function restoreFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget,
      file = input.files?.[0];
    if (!file) return;
    const sequence = ++readSequence.current;
    setError("");
    setResult("");
    setRestoring(true);
    try {
      if (file.size > LIMITS.backupBytes)
        throw new Error("Choose a backup smaller than 5 MB.");
      const raw = await file.text();
      if (mounted.current && sequence === readSequence.current)
        setResult(restore(raw));
    } catch (error) {
      if (mounted.current && sequence === readSequence.current)
        setError(
          error instanceof Error
            ? error.message
            : "This backup could not be restored.",
        );
    } finally {
      if (mounted.current && sequence === readSequence.current) {
        setRestoring(false);
        input.value = "";
      }
    }
  }
  function download(action: () => void) {
    setError("");
    try {
      action();
    } catch {
      setError(
        "Your download could not start. Please try again in this browser.",
      );
    }
  }
  return (
    <Modal
      title="Make yourself at home."
      subtitle="Your workspace, your little way."
      close={close}
    >
      <form className="item-form" onSubmit={submit} noValidate>
        <Field label="What should we call you?" error={fieldErrors.profile}>
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
            onClick={() => download(backup)}
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
              onChange={restoreFile}
            />
          </Field>
          <button
            type="button"
            className="text-button"
            onClick={() => download(recovery)}
          >
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
          <button className="button primary" type="submit" disabled={restoring}>
            Save your workspace
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
