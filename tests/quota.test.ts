import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { DatabaseRateLimiter } from "../lib/server/rate-limit";

it("durable SQL atomically enforces quotas across limiter instances and expires old buckets", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../drizzle/0000_regular_speed.sql", import.meta.url),
      "utf8",
    ).replaceAll("--> statement-breakpoint", ""),
  );
  interface Statement {
    sql: string;
    args: unknown[];
    bind(...args: unknown[]): Statement;
  }
  const database = {
    prepare(sql: string): Statement {
      return {
        sql,
        args: [],
        bind(...args: unknown[]) {
          return { ...this, args };
        },
      };
    },
    async batch(statements: Statement[]) {
      return statements.map((statement) => ({
        results: sqlite
          .prepare(statement.sql)
          .all(...(statement.args as (string | number)[])),
      }));
    },
  } as unknown as D1Database;
  try {
    const one = new DatabaseRateLimiter(database),
      two = new DatabaseRateLimiter(database);
    const responses = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        (i % 2 ? one : two).consume("private-user-id", 1000),
      ),
    );
    expect(responses.filter((response) => response.allowed)).toHaveLength(25);
    const row = sqlite
      .prepare("SELECT bucket, requests FROM ai_request_limits")
      .get();
    expect(row?.requests).toBe(25);
    expect(String(row?.bucket)).not.toContain("private-user-id");
    expect((await two.consume("another-user", 1000)).allowed).toBe(true);
    expect((await one.consume("private-user-id", 600001)).allowed).toBe(true);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM ai_request_limits").get()
        ?.count,
    ).toBe(1);
  } finally {
    sqlite.close();
  }
});
