import { afterEach, describe, expect, it, vi } from "vitest";
import { readJson, REQUEST_READ_TIMEOUT_MS } from "../lib/server/http";
import { createPlannerApi } from "../lib/server/planner-api";
import { createPlan } from "../lib/templates";
import { eventSchema, type EventInput } from "../lib/model";

afterEach(() => {
  vi.useRealTimers();
});

function streamedRequest(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
) {
  return new Request("https://gather.example/api/plan", {
    method: "POST",
    body,
    signal,
    headers: { "Content-Type": "application/json", ...headers },
    duplex: "half",
  } as RequestInit);
}

describe("request body read budget", () => {
  it("times out a stalled stream without awaiting its never-ending cancellation", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<never>(() => {}));
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const request = streamedRequest(stream);
    const remove = vi.spyOn(request.signal, "removeEventListener");
    const rejection = expect(
      readJson(request, 24000, 50),
    ).rejects.toMatchObject({ status: 408, code: "REQUEST_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels an in-progress read immediately when the request is aborted", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<never>(() => {}));
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const controller = new AbortController();
    const request = streamedRequest(stream, controller.signal);
    const remove = vi.spyOn(request.signal, "removeEventListener");
    const rejection = expect(readJson(request)).rejects.toMatchObject({
      status: 408,
      code: "REQUEST_ABORTED",
    });
    controller.abort();
    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects an already-aborted request without scheduling a timeout", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort();
    const cancel = vi.fn(() => new Promise<never>(() => {}));
    const stream = new ReadableStream<Uint8Array>({ cancel });
    await expect(
      readJson(streamedRequest(stream, controller.signal)),
    ).rejects.toMatchObject({ status: 408, code: "REQUEST_ABORTED" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up after a successful read and does not later cancel a completed body", async () => {
    vi.useFakeTimers();
    const request = new Request("https://gather.example/api/plan", {
      method: "POST",
      body: '{"ok":true}',
      headers: { "Content-Length": "00011" },
    });
    const remove = vi.spyOn(request.signal, "removeEventListener");
    await expect(readJson(request)).resolves.toEqual({ ok: true });
    expect(request.body?.locked).toBe(false);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(REQUEST_READ_TIMEOUT_MS);
    expect(request.body?.locked).toBe(false);
  });
  it("rejects excess streamed bytes even when cancellation never settles", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<never>(() => {}));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12345"));
      },
      cancel,
    });
    await expect(readJson(streamedRequest(stream), 4)).rejects.toMatchObject({
      status: 413,
      code: "BODY_TOO_LARGE",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("converts input transport failures to a client error and cleans up", async () => {
    vi.useFakeTimers();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("private transport detail"));
      },
    });
    await expect(readJson(streamedRequest(stream))).rejects.toMatchObject({
      status: 400,
      code: "INVALID_REQUEST_BODY",
    });
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["-1", "NaN", "1.5", "1e3", "2, 3", "", "+2"])(
    "rejects malformed Content-Length %j before reading",
    async (length) => {
      const request = new Request("https://gather.example/api/plan", {
        method: "POST",
        body: "{}",
        headers: { "Content-Length": length },
      });
      const reader = vi.spyOn(request.body!, "getReader");
      await expect(readJson(request)).rejects.toMatchObject({
        status: 400,
        code: "INVALID_CONTENT_LENGTH",
      });
      expect(reader).not.toHaveBeenCalled();
    },
  );
  it("rejects an enormous declared body before reading", async () => {
    const request = new Request("https://gather.example/api/plan", {
      method: "POST",
      body: "{}",
      headers: { "Content-Length": "99999999999999999999999" },
    });
    await expect(readJson(request)).rejects.toMatchObject({
      status: 413,
      code: "BODY_TOO_LARGE",
    });
    expect(request.body?.locked).toBe(false);
  });
  it("returns a structured HTTP408 without spending provider quota", async () => {
    vi.useFakeTimers();
    const generate = vi.fn(),
      consume = vi.fn();
    const api = createPlannerApi({
      configuration: () => ({ key: "test-key", model: "gemini-test" }),
      generate,
      limiter: { consume },
    });
    const stream = new ReadableStream<Uint8Array>({
      cancel: () => new Promise<never>(() => {}),
    });
    const result = api.POST(streamedRequest(stream));
    await vi.advanceTimersByTimeAsync(REQUEST_READ_TIMEOUT_MS);
    const response = await result;
    expect(response.status).toBe(408);
    expect(await response.json()).toMatchObject({
      code: "REQUEST_TIMEOUT",
      error: expect.any(String),
    });
    expect(consume).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    expect(stream.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("a single planning calendar snapshot", () => {
  const event: EventInput = {
    name: "Calendar fixture",
    type: "Wedding",
    date: "2000-01-01",
    location: "Bengaluru",
    budget: 50000,
    guestCount: 25,
    vibe: "Welcoming",
  };
  it("clamps a built-in plan against its injected day rather than the execution host clock", () => {
    const plan = createPlan(event, "2000-01-01");
    expect(eventSchema.safeParse(plan).success).toBe(true);
    expect(plan.tasks.every((task) => task.date === "2000-01-01")).toBe(true);
  });
  it("uses the API's one clock snapshot for generated built-in task dates", async () => {
    const today = vi.fn().mockReturnValue("2000-01-01");
    const generate = vi.fn();
    const api = createPlannerApi({
      configuration: () => ({ model: "gemini-test" }),
      generate,
      limiter: { consume: async () => ({ allowed: true, retryAfter: 0 }) },
      today,
    });
    const response = await api.POST(
      new Request("https://gather.example/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", event }),
      }),
    );
    const body = (await response.json()) as { event: unknown };
    expect(response.status).toBe(200);
    expect(
      eventSchema
        .parse(body.event)
        .tasks.every((task) => task.date === "2000-01-01"),
    ).toBe(true);
    expect(today).toHaveBeenCalledOnce();
    expect(generate).not.toHaveBeenCalled();
  });
});
