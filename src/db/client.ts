import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as portalSchema from "./schema";
import * as websiteSchema from "./website-schema";

export const fullSchema = {
  ...portalSchema,
  ...websiteSchema,
};

const globalForDb = globalThis as unknown as {
  __portalSql: postgres.Sql | undefined;
  __portalDb: PostgresJsDatabase<typeof fullSchema> | undefined;
};

export function getSql(): postgres.Sql {
  if (globalForDb.__portalSql) {
    return globalForDb.__portalSql;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is missing. Please configure it in .env.local or your deployment environment.",
    );
  }

  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase's transaction pooler hangs on pipelined parameterized
    // queries, so send one query at a time on the connection.
    max_pipeline: 1,
  });

  globalForDb.__portalSql = sql;
  return sql;
}

export function getDb(): PostgresJsDatabase<typeof fullSchema> {
  if (globalForDb.__portalDb) {
    return globalForDb.__portalDb;
  }

  const db = drizzle(getSql(), { schema: fullSchema });
  globalForDb.__portalDb = db;
  return db;
}

export * from "./schema";
export * from "./website-schema";
