// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, StrictMode } from "react";
import axe from "axe-core";
import { Field, Modal } from "../components/ui";
import { EventForm, ItemForm, SettingsForm } from "../components/forms";
import { Assistant } from "../components/assistant";
import {
  BudgetView,
  GuestsView,
  InspirationView,
  Overview,
  TimelineView,
  VendorsView,
} from "../components/views";
import { seedStore } from "../lib/seed";
import { dateOffset } from "../lib/format";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
const event = () => seedStore().events[0];
async function checkAccessibility(container: HTMLElement) {
  // jsdom has no layout or canvas: contrast is reviewed separately in CSS.
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
describe("dialog keyboard accessibility", () => {
  it("links labels and hints to their input", async () => {
    const { container } = render(
      <Field label="Guest name" hint="Use their preferred name">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Guest name");
    expect(input.getAttribute("aria-describedby")).toBe(
      screen.getByText("Use their preferred name").id,
    );
    await checkAccessibility(container);
  });
  it("traps focus, skips disabled controls, dismisses on Escape and restores focus", async () => {
    const user = userEvent.setup(),
      close = vi.fn();
    const launcher = document.createElement("button");
    launcher.textContent = "Open";
    document.body.appendChild(launcher);
    launcher.focus();
    const background = document.createElement("main");
    background.className = "main-shell";
    document.body.appendChild(background);
    const { unmount, container } = render(
      <Modal title="Edit celebration" subtitle="A little detail" close={close}>
        <input aria-label="Event name" />
        <button disabled>Unavailable</button>
        <button>Save</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Event name"));
    expect(background.inert).toBe(true);
    screen.getByRole("button", { name: "Save" }).focus();
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close dialog" }),
    );
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Save" }),
    );
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
    await checkAccessibility(container);
    unmount();
    expect(background.inert).toBe(false);
    expect(document.activeElement).toBe(launcher);
  });
  it("keeps focus stable when a parent supplies a new close callback", () => {
    const { rerender } = render(
      <Modal title="Details" close={() => {}}>
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    button.focus();
    rerender(
      <Modal title="Details" close={() => {}}>
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(button);
  });
});
describe("planning forms", () => {
  it("saves the event and shifts unfinished dates by default", async () => {
    const original = event(),
      save = vi.fn(),
      user = userEvent.setup();
    render(
      <EventForm
        event={original}
        liveAI={false}
        close={() => {}}
        save={save}
      />,
    );
    fireEvent.change(screen.getByLabelText("The big day"), {
      target: { value: dateOffset(original.date, 7) },
    });
    await user.click(screen.getByRole("button", { name: /Save the details/ }));
    expect(save).toHaveBeenCalledOnce();
    const updated = save.mock.calls[0][0];
    expect(updated.tasks.map((task: { date: string }) => task.date)).toEqual(
      original.tasks.map((task) =>
        task.done ? task.date : dateOffset(task.date, 7),
      ),
    );
  });
  it("rejects whitespace-only item names without calling save", async () => {
    const save = vi.fn(),
      user = userEvent.setup();
    render(
      <ItemForm kind="guest" close={() => {}} save={save} remove={() => {}} />,
    );
    const name = screen.getByPlaceholderText("e.g. Ananya Sharma");
    await user.type(name, "   ");
    await user.click(screen.getByRole("button", { name: "Add guest" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/name/i);
  });
  it("provides sign-in and explicit built-in planning for anonymous visitors", async () => {
    const { container } = render(
      <EventForm liveAI requiresSignIn close={() => {}} save={() => {}} />,
    );
    expect(
      screen
        .getByRole("link", { name: "Sign in with ChatGPT" })
        .getAttribute("target"),
    ).toBe("_top");
    expect(screen.queryByRole("checkbox", { name: /Personalize/ })).toBeNull();
    await checkAccessibility(container);
  });
  it("restores a selected backup and shows validation feedback", async () => {
    const restore = vi
      .fn()
      .mockReturnValue("Restored 1 event. Existing events were kept.");
    const { container } = render(
      <SettingsForm
        profile="Aanya"
        liveAI
        close={() => {}}
        save={() => {}}
        backup={() => {}}
        recovery={() => {}}
        restore={restore}
      />,
    );
    const file = new File(["backup-data"], "backup.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", { value: async () => "backup-data" });
    fireEvent.change(screen.getByLabelText("Restore a Gather backup"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(restore).toHaveBeenCalledWith("backup-data"));
    expect(screen.getByRole("status").textContent).toMatch(/Restored/);
    restore.mockImplementation(() => {
      throw new Error("Invalid Gather backup");
    });
    fireEvent.change(screen.getByLabelText("Restore a Gather backup"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Invalid Gather backup",
      ),
    );
    await checkAccessibility(container);
  });
});
describe("assistant requests", () => {
  it("sends an initial prompt once in Strict Mode without aborting the active reply", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const transport = vi
      .fn()
      .mockResolvedValue(
        Response.json({ text: "Your next step is ready.", source: "gemini" }),
      );
    vi.stubGlobal("fetch", transport);
    render(
      <StrictMode>
        <Assistant
          event={event()}
          prompt="What is next?"
          liveAI
          close={() => {}}
          addTask={() => {}}
        />
      </StrictMode>,
    );
    await screen.findByText("Your next step is ready.");
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0][1].signal.aborted).toBe(false);
  });
  it("renders validated built-in guidance and excludes private guest contacts", async () => {
    const user = userEvent.setup(),
      transport = vi
        .fn()
        .mockResolvedValue(
          Response.json({ text: "Confirm your venue.", source: "built-in" }),
        );
    vi.stubGlobal("fetch", transport);
    Element.prototype.scrollIntoView = vi.fn();
    const original = event();
    original.guests[0].email = "private-contact@example.com";
    const { container } = render(
      <Assistant
        event={original}
        prompt=""
        liveAI
        requiresSignIn
        close={() => {}}
        addTask={() => {}}
      />,
    );
    await user.type(
      screen.getByLabelText("Message your planning assistant"),
      "What next?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Confirm your venue.");
    const payload = JSON.parse(transport.mock.calls[0][1].body);
    expect(payload.mode).toBe("built-in");
    expect(payload.event.guests).toBeUndefined();
    expect(payload.event.vendors).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain(original.guests[0].email);
    await checkAccessibility(container);
  });
  it("cancels an in-progress request and allows another message", async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    render(
      <Assistant
        event={event()}
        prompt=""
        liveAI
        close={() => {}}
        addTask={() => {}}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /What should I do next/ }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel response" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/cancelled/i),
    );
    expect(
      (
        screen.getByLabelText(
          "Message your planning assistant",
        ) as HTMLInputElement
      ).disabled,
    ).toBe(false);
  });
});
describe("planning screens", () => {
  const noop = () => {};
  it.each([
    "Overview",
    "Budget",
    "Timeline",
    "Vendors",
    "Guests",
    "Inspiration",
  ])("has no structural accessibility violations in %s", async (name) => {
    const original = event();
    const views = {
      Overview: (
        <Overview
          event={original}
          go={noop}
          toggleTask={noop}
          openItem={noop}
          saveIdea={noop}
          openIdea={noop}
          ask={noop}
        />
      ),
      Budget: (
        <BudgetView event={original} update={noop} openItem={noop} ask={noop} />
      ),
      Timeline: (
        <TimelineView
          event={original}
          toggleTask={noop}
          openItem={noop}
          notify={noop}
        />
      ),
      Vendors: <VendorsView event={original} update={noop} openItem={noop} />,
      Guests: <GuestsView event={original} update={noop} openItem={noop} />,
      Inspiration: (
        <InspirationView
          event={original}
          savedOnly={false}
          setSavedOnly={noop}
          saveIdea={noop}
          openIdea={noop}
          ask={noop}
        />
      ),
    };
    const { container } = render(views[name as keyof typeof views]);
    await checkAccessibility(container);
  });
});
