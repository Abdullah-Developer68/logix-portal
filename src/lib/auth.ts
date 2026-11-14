import crypto from "node:crypto";
import { type NextRequest, type NextResponse } from "next/server";
import type {
  PortalDatabase,
  PublicUser,
  UserAccount,
  UserRole,
} from "./types";

export type { UserRole };

export const SESSION_COOKIE_NAME = "portal_session";
export const SESSION_TTL_SECONDS = 12 * 3600;

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

export function hasPermission(
  role: UserRole | string | undefined,
  permission: string,
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  const perms = ROLE_PERMISSIONS[role as UserRole] || [];
  return perms.includes(permission);
}

const globalForAuth = globalThis as unknown as {
  __portalDevSessionSecret?: string;
};

function getSessionSecret(): string {
  const configured = process.env.PORTAL_SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!configured || configured.length < 32) {
      throw new Error(
        "PORTAL_SESSION_SECRET must be set and at least 32 characters long in production.",
      );
    }
    return configured;
  }

  if (configured && configured.length >= 32) {
    return configured;
  }

  if (!globalForAuth.__portalDevSessionSecret) {
    globalForAuth.__portalDevSessionSecret = crypto
      .randomBytes(32)
      .toString("hex");
  }
  return globalForAuth.__portalDevSessionSecret;
}

export interface SessionTokenPayload {
  uid: string;
  tv: number;
  exp: number;
}

export function createPortalToken(
  payload: { uid: string; tv?: number },
  expiresInSeconds = SESSION_TTL_SECONDS,
): string {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: SessionTokenPayload = {
    uid: payload.uid,
    tv: payload.tv ?? 0,
    exp,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url",
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyPortalToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8"),
    ) as Partial<SessionTokenPayload>;

    if (
      typeof parsed.uid !== "string" ||
      !parsed.uid ||
      typeof parsed.tv !== "number" ||
      !Number.isInteger(parsed.tv) ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      uid: parsed.uid,
      tv: parsed.tv,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function toPublicUser(user: UserAccount): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    mustChangePassword: user.mustChangePassword,
    internRecordId: user.internRecordId,
    mentorId: user.mentorId,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function resolveAuthenticatedUser(
  request: NextRequest,
  db: PortalDatabase,
): PublicUser | null {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieToken) return null;

  const payload = verifyPortalToken(cookieToken);
  if (!payload) return null;

  const user = db.users.find((u) => u.id === payload.uid);
  if (!user) return null;
  if (user.disabled) return null;
  if ((user.tokenVersion ?? 0) !== payload.tv) return null;

  return toPublicUser(user);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.delete("portal_token");
}
