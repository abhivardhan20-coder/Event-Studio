import { expect, it } from "vitest";
import { readApiResponse } from "../lib/api-client";
import { seedStore } from "../lib/seed";
import { removeItem, saveItem } from "../lib/state";
import { builtInGuidance } from "../lib/server/guidance";

it("handles non-JSON responses and masks unrecognized error payloads", async () => {
  await expect(
    readApiResponse(new Response("<h1>Bad gateway</h1>", { status: 502 })),
  ).rejects.toThrow(/read the server response/);
  await expect(
    readApiResponse(
      Response.json({ debug: "internal details" }, { status: 500 }),
    ),
  ).rejects.toThrow("The request could not be completed. Please try again.");
  await expect(
    readApiResponse(
      Response.json(
        { error: "Please sign in.", code: "SIGN_IN_REQUIRED" },
        { status: 401 },
      ),
    ),
  ).rejects.toThrow("Please sign in.");
});
it("edits and removes expenses, vendor quotes and guests without changing other records", () => {
  const original = seedStore().events[0];
  const expense = { ...original.expenses[0], amount: 1.01 };
  const vendor = { ...original.vendors[0], quote: 2345.67 };
  const guest = { ...original.guests[0], rsvp: "Declined" as const };
  const edited = saveItem(
    saveItem(saveItem(original, "expense", expense), "vendor", vendor),
    "guest",
    guest,
  );
  expect(edited.expenses[0].amount).toBe(1.01);
  expect(edited.vendors[0].quote).toBe(2345.67);
  expect(edited.guests[0].rsvp).toBe("Declined");
  expect(original.expenses[0].amount).not.toBe(1.01);
  const removed = removeItem(
    removeItem(removeItem(edited, "expense", expense.id), "vendor", vendor.id),
    "guest",
    guest.id,
  );
  expect(removed.expenses).toHaveLength(original.expenses.length - 1);
  expect(removed.vendors).toHaveLength(original.vendors.length - 1);
  expect(removed.guests).toHaveLength(original.guests.length - 1);
  expect(removed.tasks).toEqual(original.tasks);
});
it("provides task-specific, vendor-specific and style-specific built-in guidance", () => {
  const event = seedStore().events[0];
  const input = {
    action: "chat" as const,
    mode: "built-in" as const,
    event,
    spending: 0,
    tasks: [{ title: "Call our venue", date: event.date }],
    messages: [{ role: "user" as const, text: "What is next?" }],
  };
  expect(builtInGuidance(input)).toContain("Call our venue");
  expect(
    builtInGuidance({
      ...input,
      messages: [{ role: "user", text: "What should I ask a vendor?" }],
    }),
  ).toContain("deposit and cancellation");
  expect(
    builtInGuidance({
      ...input,
      messages: [{ role: "user", text: "Give me style ideas" }],
    }),
  ).toContain("built-in guidance");
});
