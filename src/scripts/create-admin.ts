import crypto from "node:crypto";
import fs from "node:fs";
import { getSql } from "../db/client";
import { appendAuditLog, hashPassword, mutatePortal } from "../lib/db";
import type { UserAccount } from "../lib/types";

if (fs.existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "").trim();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !EMAIL_RE.test(email)) {
    console.error("Error: ADMIN_EMAIL must be set to a valid email address.");
    process.exit(1);
  }
  if (!name || name.length > 120) {
    console.error("Error: ADMIN_NAME must be set (1-120 characters).");
    process.exit(1);
  }
  if (password.length < 12 || password.length > 128) {
    console.error(
      "Error: ADMIN_PASSWORD must be between 12 and 128 characters.",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const action = await mutatePortal(async (db) => {
    const existing = db.users.find((u) => u.email.toLowerCase() === email);
    const nowIso = new Date().toISOString();

    if (existing) {
      existing.role = "admin";
      existing.name = name;
      existing.passwordHash = passwordHash;
      existing.emailVerified = true;
      existing.disabled = false;
      existing.mustChangePassword = false;
      existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;

      appendAuditLog(db, {
        actorName: "Bootstrap Script",
        actorEmail: email,
        actorRole: "system",
        action: "BOOTSTRAP_ADMIN_UPDATED",
        entityType: "Auth",
        entityId: existing.id,
        details: `Updated admin account for ${email}.`,
      });
      return "updated";
    }

    const newAdmin: UserAccount = {
      id: `usr-${crypto.randomUUID()}`,
      email,
      passwordHash,
      role: "admin",
      name,
      emailVerified: true,
      disabled: false,
      mustChangePassword: false,
      tokenVersion: 0,
      createdAt: nowIso,
    };
    db.users.push(newAdmin);

    appendAuditLog(db, {
      actorName: "Bootstrap Script",
      actorEmail: email,
      actorRole: "system",
      action: "BOOTSTRAP_ADMIN_CREATED",
      entityType: "Auth",
      entityId: newAdmin.id,
      details: `Created initial admin account for ${email}.`,
    });
    return "created";
  });

  console.log(`Admin account ${action} for ${email}.`);
}

main()
  .catch((err) => {
    console.error("Failed to bootstrap admin account:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getSql().end({ timeout: 5 });
    } catch {
      // Ignore if SQL client was never initialized
    }
  });
