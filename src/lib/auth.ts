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

import crypto from "crypto";
import { type NextRequest } from "next/server";

export interface SessionPayload {
  id: string;
  userId?: string;
  email: string;
  role: UserRole;
  name: string;
  internRecordId?: string;
  mentorId?: string;
  exp: number;
}

export function createPortalToken(
  payload: Omit<SessionPayload, "exp" | "id"> & { id?: string; userId?: string },
  expiresInSeconds = 24 * 3600,
): string {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    "logix-internship-portal-secret-super-secure-2026-auth-token-32char";
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: SessionPayload = {
    ...payload,
    id: payload.id || payload.userId || "",
    userId: payload.userId || payload.id || "",
    exp,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyPortalToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    "logix-internship-portal-secret-super-secure-2026-auth-token-32char";
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload: SessionPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function resolveAuthenticatedUser(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: UserRole;
  name: string;
  internRecordId?: string;
  mentorId?: string;
} | null> {
  // 1. Better-Auth server session
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        role: (session.user.role as UserRole) || "intern",
        name: session.user.name,
      };
    }
  } catch {
    // Better-auth graceful fallback
  }

  // 2. Cookie: portal_token
  const cookieToken = request.cookies.get("portal_token")?.value;
  if (cookieToken) {
    const payload = verifyPortalToken(cookieToken);
    if (payload) {
      return {
        id: payload.id || payload.userId || "",
        email: payload.email,
        role: payload.role,
        name: payload.name,
        internRecordId: payload.internRecordId,
        mentorId: payload.mentorId,
      };
    }
  }

  // 3. Authorization or x-portal-token header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : request.headers.get("x-portal-token");
  if (token) {
    const payload = verifyPortalToken(token);
    if (payload) {
      return {
        id: payload.id || payload.userId || "",
        email: payload.email,
        role: payload.role,
        name: payload.name,
        internRecordId: payload.internRecordId,
        mentorId: payload.mentorId,
      };
    }
  }

  return null;
}

