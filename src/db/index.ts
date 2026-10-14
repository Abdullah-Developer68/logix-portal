import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";

const connectionString = process.env.DATABASE_URL || "";

// Maintain a global connection in development to avoid exhausting connection pools
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client =
  globalForDb.conn ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle(client, { schema });
export * from "../../drizzle/schema";

