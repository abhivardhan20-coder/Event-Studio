// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Field, Modal, useDialog } from "../components/ui";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("modal focus containment", () => {
  it("skips hidden, CSS-hidden, disabled and negative-tabindex controls", async () => {
    const user = userEvent.setup();
    render(
      <Modal title="Accessible details" close={() => {}}>
        <input type="hidden" aria-label="Hidden data" />
        <div style={{ display: "none" }}>
          <input aria-label="Collapsed field" />
        </div>
        <input style={{ visibility: "hidden" }} aria-label="Invisible field" />
        <fieldset disabled>
          <input aria-label="Disabled field" />
        </fieldset>
        <input tabIndex={-1} aria-label="Programmatic field" />
        <input aria-label="Visible field" />
        <button tabIndex={-1}>Programmatic action</button>
        <button>Save details</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Visible field"));
    screen.getByRole("button", { name: "Save details" }).focus();
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close dialog" }),
    );
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Save details" }),
    );
  });

  it("isolates arbitrary outside content, contains programmatic focus and restores the trigger", async () => {
    const launcher = document.createElement("button");
    launcher.textContent = "Original trigger";
    document.body.appendChild(launcher);
    launcher.focus();
    const { unmount } = render(
      <>
        <a href="#outside">Background link</a>
        <Modal title="Settings" close={() => {}}>
          <input aria-label="Workspace name" />
        </Modal>
        <div>
          <button>Unrelated toast action</button>
        </div>
      </>,
    );
    const field = screen.getByLabelText("Workspace name");
    const background = screen.getByRole("link", { name: "Background link" });
    expect(background.inert).toBe(true);
    background.focus();
    expect(document.activeElement).toBe(field);
    const dynamic = document.createElement("button");
    dynamic.textContent = "Added outside";
    document.body.appendChild(dynamic);
    await waitFor(() => expect(dynamic.inert).toBe(true));
    dynamic.focus();
    expect(document.activeElement).toBe(field);
    unmount();
    expect(launcher.inert).toBe(false);
    expect(document.activeElement).toBe(launcher);
  });

  it("preserves pre-existing isolation and body styles", () => {
    const background = document.createElement("div");
    background.inert = true;
    document.body.appendChild(background);
    document.body.style.overflow = "scroll";
    const { unmount } = render(
      <Modal title="Details" close={() => {}}>
        <button>Done</button>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(background.inert).toBe(true);
    expect(document.body.style.overflow).toBe("scroll");
    document.body.style.overflow = "";
  });

  it("keeps only the top modal active and restores the underlying dialog", async () => {
    function LayeredDialogs() {
      const [inner, setInner] = useState(false);
      return (
        <>
          <Modal title="Outer" close={() => {}}>
            <button onClick={() => setInner(true)}>Open inner dialog</button>
          </Modal>
          {inner && (
            <Modal title="Inner" close={() => setInner(false)}>
              <input aria-label="Inner name" />
            </Modal>
          )}
        </>
      );
    }
    const user = userEvent.setup();
    render(<LayeredDialogs />);
    const open = screen.getByRole("button", { name: "Open inner dialog" });
    await user.click(open);
    expect(document.activeElement).toBe(screen.getByLabelText("Inner name"));
    open.focus();
    expect(document.activeElement).toBe(screen.getByLabelText("Inner name"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull();
    expect(document.activeElement).toBe(open);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("supports conditional drawers with an explicit initial control", async () => {
    const close = vi.fn();
    function Drawer({ enabled }: { enabled: boolean }) {
      const dialog = useRef<HTMLElement>(null),
        initial = useRef<HTMLButtonElement>(null);
      useDialog(dialog, close, { enabled, initialFocus: initial });
      return (
        <section ref={dialog} role="dialog" aria-label="Navigation">
          <a href="#planning">Planning</a>
          <button ref={initial}>Close navigation</button>
        </section>
      );
    }
    const user = userEvent.setup();
    const { rerender } = render(<Drawer enabled={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");
    rerender(<Drawer enabled />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close navigation" }),
    );
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
    rerender(<Drawer enabled={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("field errors", () => {
  it("associates hints and errors and clears invalid state when corrected", () => {
    const { rerender } = render(
      <Field
        label="Guest email"
        hint="Optional contact"
        error="Enter a valid email"
      >
        <input />
      </Field>,
    );
    const field = screen.getByLabelText("Guest email");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")?.split(" ")).toEqual([
      screen.getByText("Optional contact").id,
      screen.getByText("Enter a valid email").id,
    ]);
    rerender(
      <Field label="Guest email" hint="Optional contact">
        <input />
      </Field>,
    );
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByText("Enter a valid email")).toBeNull();
  });
});

describe("small status text contrast", () => {
  const styles = [
    "gather.css",
    "responsive.css",
    "polish.css",
    "accessibility.css",
  ]
    .map((file) => readFileSync(resolve("app", file), "utf8"))
    .join("\n");
  function colorFor(selector: string, property: "color" | "background") {
    const style = document.createElement("style");
    const sample = document.createElement("span");
    style.textContent = styles;
    sample.className = selector.split(".").filter(Boolean).join(" ");
    document.head.appendChild(style);
    document.body.appendChild(sample);
    try {
      const computed = getComputedStyle(sample);
      const value =
        property === "color" ? computed.color : computed.backgroundColor;
      const channels = value.match(/\d+/g)?.slice(0, 3);
      if (!channels || channels.length !== 3)
        throw new Error(`Missing ${property} for ${selector}`);
      return channels
        .map((channel) => Number(channel).toString(16).padStart(2, "0"))
        .join("");
    } finally {
      sample.remove();
      style.remove();
    }
  }
  function luminance(hex: string) {
    return [0, 2, 4]
      .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (total, channel, index) =>
          total + channel * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  }
  it.each([
    ".nav-count",
    ".avatar",
    ".due-tag.due-today",
    ".guest-avatar",
    ".rsvp-select.declined",
  ])("keeps %s at least 4.5:1 against its declared background", (selector) => {
    const [dark, light] = [
      luminance(colorFor(selector, "color")),
      luminance(colorFor(selector, "background")),
    ].sort((a, b) => a - b);
    expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
