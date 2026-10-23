export const MAX_REQUEST_BYTES = 24_000;
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

/** Enforce the limit while reading, including requests without Content-Length. */
export async function readJson(
  request: Request,
  maximum = MAX_REQUEST_BYTES,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new HttpError(413, "Please shorten your request.", "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Your event details are missing.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new HttpError(
          413,
          "Please shorten your request.",
          "BODY_TOO_LARGE",
        );
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
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
