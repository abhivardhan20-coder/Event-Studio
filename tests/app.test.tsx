// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import axe from "axe-core";
import PlannerApp from "../components/planner-app";
import { STORAGE_KEY } from "../lib/persistence";
import { storeSchema } from "../lib/model";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("navigates lazy screens, saves an expense, retains it after remount and updates a guest RSVP", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        configured: true,
        provider: "gemini",
        requiresSignIn: true,
      }),
    ),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(performance.now()), 0);
  });
  const user = userEvent.setup();
  const { unmount, container } = render(<PlannerApp />);
  await screen.findByRole("heading", { name: /Good things are coming/ });
  const accessibility = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Budget" }));
  await screen.findByText("Where it’s all going");
  await user.click(screen.getByRole("button", { name: "Add an expense" }));
  await user.type(
    screen.getByLabelText("What’s the expense?"),
    "Seasonal flowers",
  );
  await user.type(screen.getByLabelText("Amount (₹)"), "1234.56");
  await user.click(screen.getByRole("button", { name: "Add expense" }));
  await screen.findByText("Seasonal flowers");
  const stored = storeSchema.parse(JSON.parse(values.get(STORAGE_KEY)!));
  expect(stored.events[0].expenses.at(-1)?.amount).toBe(1234.56);
  unmount();
  render(<PlannerApp />);
  await user.click(screen.getByRole("button", { name: "Budget" }));
  await screen.findByText("Seasonal flowers");
  await user.click(screen.getByRole("button", { name: /Guest list/ }));
  const rsvp = await screen.findAllByRole("combobox", { name: /RSVP for/ });
  await user.selectOptions(rsvp[0], "Declined");
  await waitFor(() =>
    expect(
      storeSchema.parse(JSON.parse(values.get(STORAGE_KEY)!)).events[0]
        .guests[0].rsvp,
    ).toBe("Declined"),
  );
});
