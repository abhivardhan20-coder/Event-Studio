import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Hashed identities and expiring counters only. Event and contact records stay on device. */
export const aiRequestLimits = sqliteTable(
  "ai_request_limits",
  {
    bucket: text("bucket").primaryKey(),
    requests: integer("requests").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("ai_request_limits_expiry").on(table.expiresAt)],
);
