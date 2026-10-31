// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventForm, ItemForm, SettingsForm } from "../components/forms";
import { seedStore } from "../lib/seed";
import { SAVE_ERROR } from "../lib/form-validation";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const sample = () => seedStore().events[0];
const settings = (save = vi.fn(() => true)) => ({
  profile: "Aanya",
  liveAI: false,
  close: vi.fn(),
  save,
  backup: vi.fn(),
  restore: vi.fn(() => "Restored one event."),
  recovery: vi.fn(),
});

function fillNewEvent() {
  fireEvent.change(screen.getByLabelText("Give your celebration a name"), {
    target: { value: "Our garden celebration" },
  });
  fireEvent.change(screen.getByLabelText("Where’s the celebration?"), {
    target: { value: "Bengaluru" },
  });
  fireEvent.change(screen.getByLabelText("Your total budget (₹)"), {
    target: { value: "50000" },
  });
  fireEvent.change(screen.getByLabelText("How many happy faces?"), {
    target: { value: "40" },
  });
}

describe("field validation contracts", () => {
  it("rejects a whitespace workspace name, associates the error and focuses the field", async () => {
    const props = settings(),
      user = userEvent.setup();
    render(<SettingsForm {...props} />);
    const input = screen.getByLabelText("What should we call you?");
    await user.clear(input);
    await user.type(input, "   ");
    await user.click(
      screen.getByRole("button", { name: "Save your workspace" }),
    );
    expect(props.save).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorId = input
      .getAttribute("aria-describedby")
      ?.split(" ")
      .find((id) => id.endsWith("-error"));
    expect(
      errorId && document.getElementById(errorId)?.textContent,
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/workspace name/);
  });

  it("trims a valid profile before committing it", async () => {
    const props = settings(),
      user = userEvent.setup();
    render(<SettingsForm {...props} />);
    fireEvent.change(screen.getByLabelText("What should we call you?"), {
      target: { value: "  Mira  " },
    });
    await user.click(
      screen.getByRole("button", { name: "Save your workspace" }),
    );
    expect(props.save).toHaveBeenCalledWith("Mira");
  });

  it("validates email syntax and focuses the invalid guest field", async () => {
    const save = vi.fn(() => true),
      user = userEvent.setup();
    render(
      <ItemForm
        kind="guest"
        save={save}
        remove={() => true}
        close={() => {}}
      />,
    );
    await user.type(screen.getByLabelText("Guest’s full name"), "Mira Rao");
    await user.type(
      screen.getByLabelText("Email address (optional)"),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: "Add guest" }));
    expect(save).not.toHaveBeenCalled();
    const email = screen.getByLabelText("Email address (optional)");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(email));
  });

  it("accepts a zero-cost expense and rejects more than two decimal places", async () => {
    const save = vi.fn(() => true),
      user = userEvent.setup();
    render(
      <ItemForm
        kind="expense"
        save={save}
        remove={() => true}
        close={() => {}}
      />,
    );
    await user.type(
      screen.getByLabelText("What’s the expense?"),
      "Donated flowers",
    );
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Amount (₹)").getAttribute("aria-invalid"),
    ).toBe("true");
    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    expect(save).toHaveBeenCalledWith(
      "expense",
      expect.objectContaining({ amount: 0 }),
    );
    save.mockClear();
    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "1.234" },
    });
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Amount (₹)").getAttribute("aria-invalid"),
    ).toBe("true");
  });
});

describe("failed mutations remain visible", () => {
  it("keeps a rejected profile change open with an error", async () => {
    const props = settings(vi.fn(() => false)),
      user = userEvent.setup();
    render(<SettingsForm {...props} />);
    await user.click(
      screen.getByRole("button", { name: "Save your workspace" }),
    );
    expect(screen.getByRole("alert").textContent).toBe(SAVE_ERROR);
    expect(props.close).not.toHaveBeenCalled();
  });

  it("reports a rejected item save and removal instead of claiming success", async () => {
    const user = userEvent.setup(),
      original = sample().vendors[0];
    render(
      <ItemForm
        kind="vendor"
        item={original}
        save={() => false}
        remove={() => false}
        close={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert").textContent).toBe(SAVE_ERROR);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(screen.getByRole("alert").textContent).toMatch(
      /could not be removed/,
    );
  });

  it("catches impossible task rescheduling without rejecting the submit promise", async () => {
    const event = sample(),
      save = vi.fn(() => true),
      user = userEvent.setup();
    event.date = "2000-01-01";
    event.tasks[0] = { ...event.tasks[0], date: "9999-12-31", done: false };
    render(
      <EventForm event={event} liveAI={false} close={() => {}} save={save} />,
    );
    fireEvent.change(screen.getByLabelText("The big day"), {
      target: { value: "9999-12-31" },
    });
    await user.click(screen.getByRole("button", { name: "Save the details" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/highlighted/);
    expect(
      screen.getByLabelText("The big day").getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("shows a storage rejection after successful plan generation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ event: { ...sample(), source: "built-in" } }),
        ),
    );
    const user = userEvent.setup(),
      save = vi.fn(() => false);
    render(<EventForm liveAI={false} close={() => {}} save={save} />);
    fillNewEvent();
    await user.click(
      screen.getByRole("button", { name: "Create my celebration plan" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(SAVE_ERROR),
    );
    expect(save).toHaveBeenCalledOnce();
  });
});

describe("form lifetime", () => {
  it("aborts generation when the form unmounts", async () => {
    const transport = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    vi.stubGlobal("fetch", transport);
    const { unmount } = render(
      <EventForm liveAI={false} close={() => {}} save={() => true} />,
    );
    fillNewEvent();
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Create my celebration plan" })
        .closest("form")!,
    );
    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    unmount();
    expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
  });

  it("does not restore a late file read after the dialog closes", async () => {
    let resolveRead: (raw: string) => void = () => {};
    const props = settings(),
      file = new File(["{}"], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    });
    const { unmount } = render(<SettingsForm {...props} />);
    fireEvent.change(screen.getByLabelText("Restore a Gather backup"), {
      target: { files: [file] },
    });
    unmount();
    await act(async () => {
      resolveRead("{}");
    });
    expect(props.restore).not.toHaveBeenCalled();
  });
});
