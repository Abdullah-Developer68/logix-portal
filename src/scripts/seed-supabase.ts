import { db } from "../db";
import * as schema from "../../drizzle/schema";

async function seed() {
  console.log("🌱 Starting Supabase PostgreSQL seeding via Drizzle ORM...");

  const url = process.env.DATABASE_URL || "";
  if (!url || url.includes("[YOUR-PASSWORD]")) {
    console.error("❌ Please provide your real Supabase password in DATABASE_URL in .env before running db:seed.");
    process.exit(1);
  }

  try {
    // 1. Seed Departments
    console.log("Creating departments...");
    await db.insert(schema.departments).values([
      { id: "fld-web", code: "web-dev", name: "Web Development", description: "Full-stack React, Next.js, Node.js, TypeScript", seats: 35, active: true },
      { id: "fld-app", code: "app-dev", name: "App Development", description: "React Native, Flutter, iOS & Android architectures", seats: 25, active: true },
      { id: "fld-ai", code: "ai-ml", name: "AI / Machine Learning", description: "PyTorch, LLM agents, RAG, Computer Vision pipelines", seats: 20, active: true },
      { id: "fld-uiux", code: "ui-ux", name: "UI/UX & Product Design", description: "Figma design systems, UX research, typography, wireframing", seats: 15, active: true },
      { id: "fld-qa", code: "software-testing", name: "Software Testing & QA", description: "Cypress, Playwright, automated regression, API test suites", seats: 15, active: true },
      { id: "fld-devops", code: "cloud-devops", name: "Cloud & DevOps Engineering", description: "Docker, Kubernetes, AWS, CI/CD pipelines, Terraform", seats: 15, active: true },
    ]).onConflictDoNothing();

    // 2. Seed Batches
    console.log("Creating batches...");
    await db.insert(schema.batches).values([
      { id: "bat-winter-26", name: "Winter 2026 Batch", startDate: "2026-11-01", endDate: "2027-02-01", active: true },
      { id: "bat-spring-26", name: "Spring 2026 Batch", startDate: "2026-03-01", endDate: "2026-06-01", active: true },
      { id: "bat-summer-26", name: "Summer 2026 Batch", startDate: "2026-07-01", endDate: "2026-10-01", active: true },
    ]).onConflictDoNothing();

    // 3. Seed Durations
    console.log("Creating durations...");
    await db.insert(schema.durations).values([
      { id: "dur-1m", months: 1, label: "1 Month (Fast-Track / Project Sprint)", active: true },
      { id: "dur-2m", months: 2, label: "2 Months (Standard Cohort)", active: true },
      { id: "dur-3m", months: 3, label: "3 Months (Recommended Degree Requirement)", active: true },
      { id: "dur-6m", months: 6, label: "6 Months (Extended Professional Fellowship)", active: true },
    ]).onConflictDoNothing();

    console.log("✅ Supabase database seed completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
