import { MAX_REQUEST_BYTES } from "../request-limits.ts";
export { MAX_REQUEST_BYTES } from "../request-limits.ts";
export const REQUEST_READ_TIMEOUT_MS = 10_000;
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
    this.name = "HttpError";
  }
}
export function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

/** Bound both bytes and wall-clock time, including chunked requests. */
export async function readJson(
  request: Request,
  maximum = MAX_REQUEST_BYTES,
  timeoutMs = REQUEST_READ_TIMEOUT_MS,
): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength))
      throw new HttpError(
        400,
        "Your request has an invalid content length.",
        "INVALID_CONTENT_LENGTH",
      );
    if (Number(declaredLength) > maximum)
      throw new HttpError(
        413,
        "Please shorten your request.",
        "BODY_TOO_LARGE",
      );
  }
  if (request.signal.aborted) {
    // Cancellation is best effort: an underlying source can return a promise
    // that never settles. It must not prevent a prompt HTTP response.
    void request.body?.cancel().catch(() => {});
    throw new HttpError(
      408,
      "Your request was cancelled. Please try again.",
      "REQUEST_ABORTED",
    );
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Your event details are missing.");
  let interrupted: HttpError | undefined;
  let rejectRead!: (error: HttpError) => void;
  const interruption = new Promise<never>((_resolve, reject) => {
    rejectRead = reject;
  });
  function interrupt(error: HttpError) {
    if (interrupted) return;
    interrupted = error;
    rejectRead(error);
  }
  const onAbort = () =>
    interrupt(
      new HttpError(
        408,
        "Your request was cancelled. Please try again.",
        "REQUEST_ABORTED",
      ),
    );
  request.signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(
    () =>
      interrupt(
        new HttpError(
          408,
          "Your request took too long to arrive. Please try again.",
          "REQUEST_TIMEOUT",
        ),
      ),
    timeoutMs,
  );
  const readBytes = async () => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const chunk = await reader.read();
      if (interrupted) throw interrupted;
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum)
        throw new HttpError(
          413,
          "Please shorten your request.",
          "BODY_TOO_LARGE",
        );
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  };
  let bytes: Uint8Array;
  try {
    if (request.signal.aborted) onAbort();
    bytes = await Promise.race([readBytes(), interruption]);
  } catch (error) {
    void reader.cancel(error).catch(() => {});
    if (error instanceof HttpError) throw error;
    if (interrupted) throw interrupted;
    throw new HttpError(
      400,
      "Your event details could not be read. Please try again.",
      "INVALID_REQUEST_BODY",
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, "Your request must contain valid JSON.");
  }
}

export function validateOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(
      403,
      "This request must come from your Gather workspace.",
      "ORIGIN_NOT_ALLOWED",
    );
}
