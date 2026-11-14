import fs from "node:fs";
import { defineConfig } from "drizzle-kit";

if (fs.existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  migrations: {
    table: "__drizzle_migrations_portal",
    schema: "drizzle",
  },
  tablesFilter: ["portal_*"],
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
