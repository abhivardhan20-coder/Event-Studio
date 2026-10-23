const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 25;
export interface QuotaResult {
  allowed: boolean;
  retryAfter: number;
}
export interface RateLimiter {
  consume(identity: string, now?: number): Promise<QuotaResult>;
}

/** Durable atomic upserts prevent bypassing a quota by hitting another Worker isolate. */
export class DatabaseRateLimiter implements RateLimiter {
  constructor(private database: D1Database) {}
  async consume(identity: string, now = Date.now()): Promise<QuotaResult> {
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(identity),
    );
    const hash = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    const results = await this.database.batch([
      this.database
        .prepare(
          "INSERT INTO ai_request_limits (bucket, requests, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET requests = requests + 1 WHERE requests < ? RETURNING requests",
        )
        .bind(`${hash}:${windowStart}`, windowStart + WINDOW_MS, MAX_REQUESTS),
      this.database
        .prepare(
          "DELETE FROM ai_request_limits WHERE rowid IN (SELECT rowid FROM ai_request_limits WHERE expires_at < ? LIMIT 100)",
        )
        .bind(now),
    ]);
    return {
      allowed: results[0].results.length > 0,
      retryAfter: Math.max(
        1,
        Math.ceil((windowStart + WINDOW_MS - now) / 1000),
      ),
    };
  }
}

/** Used for local development and free built-in mode; paid hosted requests require D1. */
export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; expires: number }>();
  constructor(private capacity = 10000) {}
  async consume(identity: string, now = Date.now()): Promise<QuotaResult> {
    for (const [key, bucket] of this.buckets)
      if (bucket.expires <= now) this.buckets.delete(key);
    const entry = this.buckets.get(identity);
    if (entry) {
      if (entry.count >= MAX_REQUESTS)
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil((entry.expires - now) / 1000)),
        };
      entry.count += 1;
    } else {
      if (this.buckets.size >= this.capacity)
        return { allowed: false, retryAfter: 60 };
      this.buckets.set(identity, { count: 1, expires: now + WINDOW_MS });
    }
    return { allowed: true, retryAfter: 0 };
  }
}
