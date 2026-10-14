import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "../../drizzle/schema";

export type UserRole = "admin" | "mentor" | "intern";

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "logix-internship-portal-secret-super-secure-2026-auth-token-32char",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "intern",
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "intern",
      adminRoles: ["admin"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Access Control Matrix for Role-Based Access Control (RBAC)
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    "manage_interns",
    "delete_interns",
    "manage_departments",
    "manage_batches",
    "manage_durations",
    "assign_tasks",
    "review_tasks",
    "manage_attendance",
    "review_leaves",
    "view_evaluations",
    "issue_certificates",
    "revoke_certificates",
    "view_audit_logs",
    "post_announcements",
    "export_reports",
  ],
  mentor: [
    "view_assigned_interns",
    "assign_tasks",
    "review_tasks",
    "submit_evaluation",
    "view_evaluations",
    "mark_attendance",
    "view_attendance",
  ],
  intern: [
    "view_own_profile",
    "view_tasks",
    "submit_task",
    "mark_attendance",
    "request_leave",
    "submit_feedback",
    "view_evaluation",
    "download_certificate",
  ],
};

export function hasPermission(role: UserRole | string | undefined, permission: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  const perms = ROLE_PERMISSIONS[role as UserRole] || [];
  return perms.includes(permission);
}
