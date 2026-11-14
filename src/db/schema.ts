import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const portalRecords = pgTable(
  "portal_records",
  {
    collection: text("collection").notNull(),
    id: text("id").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collection, table.id] }),
    index("portal_records_collection_created_at_idx").on(
      table.collection,
      table.createdAt.desc(),
    ),
  ],
).enableRLS();

export const portalBackups = pgTable("portal_backups", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  label: text("label"),
  createdBy: text("created_by"),
  recordCount: integer("record_count"),
  sizeBytes: integer("size_bytes"),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
}).enableRLS();

export const portalRateLimits = pgTable("portal_rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
}).enableRLS();
