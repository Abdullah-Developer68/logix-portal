import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./drizzle/schema";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

export async function getUsers() {
  return await db.select().from(users);
}

export { db, client, users };

