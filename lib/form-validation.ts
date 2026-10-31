import type { ZodIssue } from "zod";

export type FieldErrors = Partial<Record<string, string>>;
export const SAVE_ERROR =
  "This change could not be saved. Your existing plan was kept. Check the record limit, or close and reopen this form if another tab changed your event.";

/** Preserve the first issue for each native form control, in schema order. */
export function validationErrors(issues: readonly ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** Run after React commits the descriptions so focused controls announce errors. */
export function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  queueMicrotask(() => {
    if (!form.isConnected) return;
    for (const field of Object.keys(errors)) {
      const control = form.elements.namedItem(field);
      if (control instanceof HTMLElement && !control.matches(":disabled")) {
        control.focus();
        return;
      }
    }
  });
}
