import { describe, expect, it, vi } from "vitest";
import { seedStore } from "../lib/seed";
import { eventSchema, LIMITS } from "../lib/model";
import { buildChatBody } from "../lib/chat-request";
import { createPlannerApi } from "../lib/server/planner-api";
import { chatReplySchema } from "../lib/api-client";

function setup() {
  const consume = vi.fn(async () => ({ allowed: true, retryAfter: 0 }));
  const api = createPlannerApi({
    configuration: () => ({ model: "unused" }),
    generate: vi.fn(),
    limiter: { consume },
  });
  return { api, consume };
}
function request(body: string) {
  return new Request("https://gather.example/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
const question = [{ role: "user" as const, text: "How much money is left?" }];

describe("currency contract across ledger and assistant", () => {
  it.each([100_000_000, 99_999_999.99])(
    "accepts every valid ledger up to its aggregate amount limit, including %s",
    async (lastAmount) => {
      const event = seedStore().events[0];
      event.expenses = Array.from({ length: LIMITS.expenses }, (_, index) => ({
        id: `expense-${index}`,
        name: `Recorded expense ${index}`,
        category: "Other" as const,
        amount: index === LIMITS.expenses - 1 ? lastAmount : 100_000_000,
        paid: false,
      }));
      expect(eventSchema.safeParse(event).success).toBe(true);
      const { api } = setup();
      const response = await api.POST(
        request(buildChatBody(event, question, "built-in")),
      );
      expect(response.status).toBe(200);
      expect(chatReplySchema.parse(await response.json()).text).toContain(
        "Over budget:",
      );
    },
  );

  it.each([0.001, 1234.561])(
    "rejects fractional-paise spending %s before consuming quota",
    async (spending) => {
      const { api, consume } = setup();
      const body = JSON.parse(
        buildChatBody(seedStore().events[0], question, "built-in"),
      );
      body.spending = spending;
      expect((await api.POST(request(JSON.stringify(body)))).status).toBe(400);
      expect(consume).not.toHaveBeenCalled();
    },
  );

  it("rejects spending larger than any valid workspace could contain", async () => {
    const { api, consume } = setup();
    const body = JSON.parse(
      buildChatBody(seedStore().events[0], question, "built-in"),
    );
    body.spending = LIMITS.expenses * 100_000_000 + 0.01;
    expect((await api.POST(request(JSON.stringify(body)))).status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
  });

  it("does not display a zero-rupee overrun caused by floating-point residue", async () => {
    const { api } = setup();
    const event = { ...seedStore().events[0], budget: 100 };
    const body = JSON.parse(buildChatBody(event, question, "built-in"));
    body.spending = 100.00000000000001;
    const response = await api.POST(request(JSON.stringify(body)));
    expect(response.status).toBe(200);
    const reply = chatReplySchema.parse(await response.json()).text;
    expect(reply).toContain("Available: ₹0");
    expect(reply).not.toContain("Over budget:");
  });
});
