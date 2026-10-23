import { describe, expect, it, vi } from "vitest";
import { createPlannerApi } from "../lib/server/planner-api";
import { createGemini, ProviderError } from "../lib/server/gemini";
import { MemoryRateLimiter } from "../lib/server/rate-limit";
import { readJson } from "../lib/server/http";
import { dateOffset, todayISO } from "../lib/format";
import { seedStore } from "../lib/seed";
import { eventSchema } from "../lib/model";

const event = () => ({
  ...seedStore().events[0],
  date: dateOffset(todayISO(), 30),
});
const plan = () => ({ action: "plan", event: event() });
const chat = () => ({
  action: "chat",
  event: event(),
  spending: 100,
  messages: [{ role: "user", text: "What should I do next?" }],
});
async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}
function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://gather.example/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(headers)),
    },
    body: JSON.stringify(body),
  });
}
const allowed = () => ({
  consume: vi.fn().mockResolvedValue({ allowed: true, retryAfter: 0 }),
});
function setup(live = false) {
  const generate = vi
    .fn()
    .mockResolvedValue("Choose a venue and confirm your guest count.");
  const limiter = allowed(),
    paidLimiter = allowed();
  const configuration = () => ({
    key: live ? "test-key" : undefined,
    model: "gemini-test",
  });
  return {
    generate,
    limiter,
    paidLimiter,
    configuration,
    api: createPlannerApi({ generate, limiter, paidLimiter, configuration }),
  };
}
describe("planning API security and contracts", () => {
  it("reports provider status without credentials and disables response caching", async () => {
    const { api } = setup(true);
    const response = api.GET(new Request("https://gather.example/api/plan"));
    expect(await bodyOf(response)).toEqual({
      configured: true,
      provider: "gemini",
      requiresSignIn: true,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it.each<Record<string, string>>([
    { origin: "https://evil.example" },
    { "sec-fetch-site": "cross-site" },
  ])("blocks cross-origin requests before provider calls", async (headers) => {
    const { api, generate } = setup(true);
    expect((await api.POST(request(plan(), headers))).status).toBe(403);
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects anonymous paid calls but permits explicitly chosen built-in plans", async () => {
    const { api, generate, paidLimiter } = setup(true);
    const rejected = await api.POST(request(plan()));
    expect(rejected.status).toBe(401);
    expect((await bodyOf(rejected)).code).toBe("SIGN_IN_REQUIRED");
    const response = await api.POST(request({ ...plan(), mode: "built-in" }));
    expect(response.status).toBe(200);
    expect(eventSchema.safeParse((await bodyOf(response)).event).success).toBe(
      true,
    );
    expect(generate).not.toHaveBeenCalled();
    expect(paidLimiter.consume).not.toHaveBeenCalled();
  });
  it("fails closed for paid hosting if durable quotas are unavailable", async () => {
    const deps = setup(true);
    const api = createPlannerApi({ ...deps, paidLimiter: undefined });
    expect(
      (
        await api.POST(
          request(chat(), { "oai-authenticated-user-id": "visitor" }),
        )
      ).status,
    ).toBe(503);
    expect(deps.generate).not.toHaveBeenCalled();
  });
  it("permits local development only with the explicit development flag", async () => {
    const deps = setup(true);
    const req = () =>
      new Request("http://localhost:5173/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chat()),
      });
    expect(
      (
        await createPlannerApi({
          ...deps,
          paidLimiter: undefined,
          development: true,
        }).POST(req())
      ).status,
    ).toBe(200);
    expect(
      (await createPlannerApi({ ...deps, development: false }).POST(req()))
        .status,
    ).toBe(401);
  });
  it("enforces persistent quotas before calling Gemini and includes Retry-After", async () => {
    const deps = setup(true);
    deps.paidLimiter.consume.mockResolvedValue({
      allowed: false,
      retryAfter: 123,
    });
    const response = await deps.api.POST(
      request(chat(), { "oai-authenticated-user-id": "visitor" }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("123");
    expect(deps.paidLimiter.consume).toHaveBeenCalledWith("visitor");
    expect(deps.generate).not.toHaveBeenCalled();
  });
  it("rejects unsupported media, malformed JSON, invalid dates and stale events", async () => {
    const { api } = setup();
    expect(
      (await api.POST(request(plan(), { "Content-Type": "text/plain" })))
        .status,
    ).toBe(415);
    expect(
      (
        await api.POST(
          new Request("https://gather.example/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await api.POST(
          request({ ...plan(), event: { ...event(), date: "2026-02-30" } }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await api.POST(
          request({ ...plan(), event: { ...event(), date: "2000-01-01" } }),
        )
      ).status,
    ).toBe(400);
  });
  it("bounds body reads even without Content-Length", async () => {
    const { api } = setup();
    expect((await api.POST(request({ extra: "x".repeat(25000) }))).status).toBe(
      413,
    );
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(25000)));
        controller.close();
      },
    });
    const streamed = new Request("https://gather.example/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readJson(streamed)).rejects.toMatchObject({ status: 413 });
    const invalidUTF8 = new Request("https://gather.example/api/plan", {
      method: "POST",
      body: new Uint8Array([0xff]),
    });
    await expect(readJson(invalidUTF8)).rejects.toMatchObject({ status: 400 });
    await expect(
      readJson(
        new Request("https://gather.example/api/plan", { method: "POST" }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejects oversized history and assistant-ended conversations", async () => {
    const { api } = setup();
    expect(
      (
        await api.POST(
          request({
            ...chat(),
            messages: [{ role: "user", text: "x".repeat(2001) }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await api.POST(
          request({
            ...chat(),
            messages: [{ role: "assistant", text: "hello" }],
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("returns exact budget context with built-in and live guidance", async () => {
    const { api } = setup();
    const response = await api.POST(
      request({
        ...chat(),
        spending: 900000,
        messages: [{ role: "user", text: "Help with my budget" }],
      }),
    );
    expect((await bodyOf(response)).text).toMatch(/over budget/i);
    const live = setup(true),
      result = await live.api.POST(
        request(chat(), { "oai-authenticated-user-id": "visitor" }),
      );
    expect((await bodyOf(result)).source).toBe("gemini");
    expect(live.generate).toHaveBeenCalledOnce();
  });
  it("validates generated plans and clamps overdue suggested tasks to today", async () => {
    const { api, generate } = setup(true);
    const output = {
      summary: "A welcoming celebration",
      tasks: Array.from({ length: 8 }, (_, i) => ({
        title: `Task ${i}`,
        category: "Other",
        daysBefore: 365,
      })),
      ideas: Array.from({ length: 3 }, (_, i) => ({
        title: `Idea ${i}`,
        description: "A thoughtful personal touch",
        tag: "Personal",
      })),
      vendors: [
        { name: "Venue partner", category: "Venue" },
        { name: "Food partner", category: "Food & drinks" },
        { name: "Decor partner", category: "Decor & flowers" },
      ],
    };
    generate.mockResolvedValue(JSON.stringify(output));
    const response = await api.POST(
      request(plan(), { "oai-authenticated-user-id": "visitor" }),
    );
    const body = await bodyOf(response);
    expect(response.status).toBe(200);
    expect(eventSchema.safeParse(body.event).success).toBe(true);
    expect(
      eventSchema
        .parse(body.event)
        .tasks.every((task) => task.date === todayISO()),
    ).toBe(true);
    generate.mockResolvedValue(
      JSON.stringify({ ...output, tasks: [{ title: "bad" }] }),
    );
    expect(
      (
        await api.POST(
          request(plan(), { "oai-authenticated-user-id": "visitor" }),
        )
      ).status,
    ).toBe(502);
  });
  it.each([
    [401, 502],
    [403, 502],
    [404, 502],
    [429, 503],
    [503, 503],
  ])("maps provider %s to safe status %s", async (provider, status) => {
    const { api, generate } = setup(true);
    generate.mockRejectedValue(new ProviderError(provider));
    const response = await api.POST(
      request(chat(), { "oai-authenticated-user-id": "visitor" }),
    );
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("test-key");
  });
  it("masks raw exception messages and handles timeouts", async () => {
    const { api, generate } = setup(true);
    generate.mockRejectedValue(new Error("private provider details"));
    const response = await api.POST(
      request(chat(), { "oai-authenticated-user-id": "visitor" }),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private provider");
    generate.mockRejectedValue(new DOMException("Timeout", "TimeoutError"));
    expect(
      (
        await api.POST(
          request(chat(), { "oai-authenticated-user-id": "visitor" }),
        )
      ).status,
    ).toBe(504);
  });
});
describe("Gemini transport", () => {
  it("keeps credentials in a header, forwards cancellation and strips thought text", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { text: "private thought", thought: true },
                { text: "A practical idea" },
              ],
            },
          },
        ],
      }),
    );
    const generate = createGemini(
        () => ({ key: "test-key", model: "gemini-test" }),
        transport,
      ),
      controller = new AbortController();
    expect(
      await generate(
        "system",
        [{ role: "user", parts: [{ text: "Hello" }] }],
        true,
        controller.signal,
      ),
    ).toBe("A practical idea");
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).not.toContain("test-key");
    expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("test-key");
    expect(
      JSON.parse(String(init?.body)).generationConfig.responseFormat.text
        .schema,
    ).toBeDefined();
    controller.abort();
    expect(init?.signal?.aborted).toBe(true);
  });
  it.each([
    { candidates: [] },
    {
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    },
    { candidates: [{ content: { parts: [{ text: "" }] } }] },
    {},
  ])("rejects empty or truncated provider output", async (body) => {
    const generate = createGemini(
      () => ({ key: "test-key", model: "gemini-test" }),
      vi.fn().mockResolvedValue(Response.json(body)),
    );
    await expect(generate("", [])).rejects.toBeInstanceOf(ProviderError);
  });
  it("rejects invalid model paths before sending any credential", async () => {
    const transport = vi.fn();
    const generate = createGemini(
      () => ({ key: "test-key", model: "../../evil" }),
      transport,
    );
    await expect(generate("", [])).rejects.toBeInstanceOf(ProviderError);
    expect(transport).not.toHaveBeenCalled();
  });
});
describe("in-memory quotas", () => {
  it("enforces a rolling window, expires counters and bounds memory", async () => {
    const limiter = new MemoryRateLimiter(1);
    for (let i = 0; i < 25; i++)
      expect((await limiter.consume("one", 0)).allowed).toBe(true);
    expect(await limiter.consume("one", 1000)).toEqual({
      allowed: false,
      retryAfter: 599,
    });
    expect((await limiter.consume("two", 1000)).allowed).toBe(false);
    expect((await limiter.consume("two", 600001)).allowed).toBe(true);
  });
});
