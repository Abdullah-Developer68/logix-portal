import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb, internshipApplications } from "@/db";
import {
  clearSessionCookie,
  createPortalToken,
  hasPermission,
  resolveAuthenticatedUser,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import {
  addPortalNotification,
  appendAuditLog,
  calculateEndDate,
  calculateGrade,
  createPortalBackup,
  generateCertificateNumber,
  generateNextInternId,
  hashPassword,
  mutatePortal,
  readPortal,
  sanitizeText,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/db";
import { escapeHtml, isEmailEnabled } from "@/lib/mailer";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import {
  optDate,
  optString,
  optUrl,
  reqDate,
  reqEmail,
  reqEnum,
  reqInt,
  reqPassword,
  reqString,
  reqUuid,
  ValidationError,
} from "@/lib/server/validation";
import {
  toWebsiteApplication,
  WEBSITE_APPLICATION_STATUSES,
} from "@/lib/server/website-applications";
import type {
  ApplicationStatus,
  AttendanceStatus,
  InternRecord,
  InternshipStatus,
  LeaveStatus,
  PortalState,
  PublicUser,
  TaskStatus,
  UserAccount,
  UserRole,
  WebsiteApplication,
} from "@/lib/types";

const MAX_DEFAULT_BODY_BYTES = 256 * 1024;
const MAX_BULK_BODY_BYTES = 1024 * 1024;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
};

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
];
const INTERNSHIP_STATUSES: readonly InternshipStatus[] = [
  "Applied",
  "Active",
  "Completed",
  "Terminated",
  "Dropped",
];
const TASK_STATUSES: readonly TaskStatus[] = [
  "Assigned",
  "Submitted",
  "Approved",
  "Needs Revision",
  "Rejected",
];
const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "Present",
  "Absent",
  "Late",
  "Leave",
];
const LEAVE_STATUSES: readonly LeaveStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
];
const ANNOUNCEMENT_PRIORITIES = ["Normal", "Important", "Urgent"] as const;
const BATCH_STATUSES = ["Upcoming", "Active", "Completed"] as const;
const USER_ROLES: readonly UserRole[] = ["admin", "mentor", "intern"];
const STAFF_ROLES = ["mentor", "admin"] as const;

interface ActionOutcome {
  status?: number;
  body: Record<string, unknown>;
  sessionToken?: string;
  clearCookie?: boolean;
}

function generateTempPassword(): string {
  // 12 random bytes -> 16 base64url chars
  return crypto.randomBytes(12).toString("base64url");
}

function makeAvatarInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "LG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isAllowedOrigin(request: NextRequest): boolean {
  const rawOrigin =
    request.headers.get("origin") || request.headers.get("referer");
  if (!rawOrigin) {
    return false;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(rawOrigin);
  } catch {
    return false;
  }

  const originHost = parsedOrigin.host.toLowerCase();
  const originHostname = parsedOrigin.hostname.toLowerCase();

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const directHost = request.headers.get("host")?.trim().toLowerCase();

  if (forwardedHost && originHost === forwardedHost) return true;
  if (directHost && originHost === directHost) return true;

  const publicUrl = process.env.PORTAL_PUBLIC_URL?.trim();
  if (publicUrl) {
    try {
      const publicHost = new URL(publicUrl).host.toLowerCase();
      if (originHost === publicHost) return true;
    } catch {
      // Ignore malformed env URL
    }
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (originHostname === "localhost" || originHostname === "127.0.0.1")
  ) {
    return true;
  }

  return false;
}

function jsonOutcome(outcome: ActionOutcome): NextResponse {
  const res = NextResponse.json(outcome.body, {
    status: outcome.status ?? 200,
    headers: PRIVATE_HEADERS,
  });
  if (outcome.sessionToken) {
    setSessionCookie(res, outcome.sessionToken);
  } else if (outcome.clearCookie) {
    clearSessionCookie(res);
  }
  return res;
}

class ConflictError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verifyCode = searchParams.get("verify")?.trim();

    if (verifyCode) {
      const ip = getClientIp(request);
      const rl = await checkRateLimit({
        key: `verify:ip:${ip}`,
        limit: 30,
        windowSeconds: 60,
      });
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

      const db = await readPortal();
      const cert = db.certificates.find(
        (c) =>
          c.certificateNumber.toLowerCase() === verifyCode.toLowerCase() ||
          c.internId.toLowerCase() === verifyCode.toLowerCase(),
      );
      if (!cert) {
        return NextResponse.json(
          {
            verified: false,
            error: "No certificate found matching that number or Intern ID.",
          },
          { status: 404 },
        );
      }

      const intern = db.interns.find((i) => i.id === cert.internRecordId);
      const evaluation = db.evaluations.find(
        (e) => e.internRecordId === cert.internRecordId,
      );

      return NextResponse.json({
        verified: cert.status !== "Revoked",
        certificate: {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          internRecordId: cert.internRecordId,
          internId: cert.internId,
          internName: cert.internName,
          fieldName: cert.fieldName,
          durationMonths: cert.durationMonths,
          batchName: cert.batchName,
          startDate: cert.startDate,
          endDate: cert.endDate,
          issueDate: cert.issueDate,
          grade: cert.grade,
          totalMarks: cert.totalMarks,
          mentorName: cert.mentorName,
          signatoryName: cert.signatoryName,
          signatoryTitle: cert.signatoryTitle,
          status: cert.status,
          revokedReason: cert.revokedReason,
          history: cert.history,
        },
        intern: intern
          ? {
              internId: intern.internId,
              fullName: intern.fullName,
              university: intern.university,
              degree: intern.degree,
              fieldName: intern.fieldName,
              durationMonths: intern.durationMonths,
              batchName: intern.batchName,
              startDate: intern.startDate,
              endDate: intern.endDate,
              skills: intern.skills,
            }
          : null,
        evaluation: evaluation
          ? {
              totalMarks: evaluation.totalMarks,
              grade: evaluation.grade,
              mentorName: evaluation.mentorName,
            }
          : null,
      });
    }

    const db = await readPortal();

    if (searchParams.get("meta") === "public") {
      return NextResponse.json({
        authenticated: false,
        fields: db.fields.filter((f) => f.active),
        durations: db.durations.filter((d) => d.active),
        batches: db.batches,
      });
    }

    const authUser = resolveAuthenticatedUser(request, db);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    }

    const rl = await checkRateLimit({
      key: `get:user:${authUser.id}`,
      limit: 120,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const safeUsers: PublicUser[] = db.users.map(toPublicUser);
    const emailEnabled = isEmailEnabled();

    if (authUser.role === "admin") {
      const ormDb = getDb();
      const rows = await ormDb
        .select()
        .from(internshipApplications)
        .orderBy(desc(internshipApplications.createdAt));

      const websiteApplications: WebsiteApplication[] = rows.map(
        toWebsiteApplication,
      );

      const state: PortalState = {
        authenticated: true,
        currentUser: authUser,
        fields: db.fields,
        durations: db.durations,
        batches: db.batches,
        mentors: db.mentors,
        interns: db.interns,
        tasks: db.tasks,
        attendance: db.attendance,
        leaves: db.leaves,
        evaluations: db.evaluations,
        certificates: db.certificates,
        notifications: db.notifications,
        announcements: db.announcements,
        auditLogs: db.auditLogs,
        backups: db.backups,
        users: safeUsers,
        websiteApplications,
        emailEnabled,
      };

      return NextResponse.json(state, { headers: PRIVATE_HEADERS });
    }

    if (authUser.role === "mentor") {
      const assignedInterns = db.interns.filter(
        (i) =>
          Boolean(authUser.mentorId) && i.mentorId === authUser.mentorId,
      );
      const assignedInternIds = new Set(assignedInterns.map((i) => i.id));

      const state: PortalState = {
        authenticated: true,
        currentUser: authUser,
        fields: db.fields,
        durations: db.durations,
        batches: db.batches,
        mentors: db.mentors,
        interns: assignedInterns,
        tasks: db.tasks.filter(
          (t) =>
            assignedInternIds.has(t.internRecordId) ||
            (authUser.mentorId && t.assignedByMentorId === authUser.mentorId),
        ),
        evaluations: db.evaluations.filter(
          (e) =>
            assignedInternIds.has(e.internRecordId) ||
            (authUser.mentorId && e.mentorId === authUser.mentorId),
        ),
        attendance: db.attendance.filter((a) =>
          assignedInternIds.has(a.internRecordId),
        ),
        leaves: db.leaves.filter((l) =>
          assignedInternIds.has(l.internRecordId),
        ),
        certificates: db.certificates.filter((c) =>
          assignedInternIds.has(c.internRecordId),
        ),
        announcements: db.announcements,
        notifications: db.notifications.filter(
          (n) => n.recipientRole === "mentor" || n.recipientRole === "all",
        ),
        auditLogs: db.auditLogs.filter(
          (a) => a.actorEmail === authUser.email,
        ),
        users: safeUsers.filter(
          (u) => u.role === "mentor" || u.role === "admin",
        ),
        backups: [],
        emailEnabled,
      };

      return NextResponse.json(state, { headers: PRIVATE_HEADERS });
    }

    // Intern: strictly scoped to own record
    const myIntern = db.interns.find(
      (i) =>
        (authUser.internRecordId && i.id === authUser.internRecordId) ||
        i.email.toLowerCase() === authUser.email.toLowerCase(),
    );
    const myInternId = myIntern?.id;

    const state: PortalState = {
      authenticated: true,
      currentUser: authUser,
      fields: db.fields.filter((f) => f.active),
      durations: db.durations.filter((d) => d.active),
      batches: db.batches,
      mentors: db.mentors,
      interns: myIntern ? [myIntern] : [],
      tasks: myInternId
        ? db.tasks.filter((t) => t.internRecordId === myInternId)
        : [],
      evaluations: myInternId
        ? db.evaluations.filter((e) => e.internRecordId === myInternId)
        : [],
      attendance: myInternId
        ? db.attendance.filter((a) => a.internRecordId === myInternId)
        : [],
      leaves: myInternId
        ? db.leaves.filter((l) => l.internRecordId === myInternId)
        : [],
      certificates: myInternId
        ? db.certificates.filter((c) => c.internRecordId === myInternId)
        : [],
      announcements: db.announcements.filter(
        (a) =>
          !a.targetAudience ||
          a.targetAudience === "All Interns" ||
          a.targetAudience === "All" ||
          (myIntern &&
            (a.targetAudience === myIntern.fieldName ||
              a.targetAudience === myIntern.batchName)),
      ),
      notifications: db.notifications.filter(
        (n) =>
          (myInternId && n.recipientInternRecordId === myInternId) ||
          (!n.recipientInternRecordId &&
            (n.recipientRole === "intern" || n.recipientRole === "all")),
      ),
      auditLogs: [],
      users: [],
      backups: [],
      emailEnabled,
    };

    return NextResponse.json(state, { headers: PRIVATE_HEADERS });
  } catch (err) {
    console.error("[API GET /api/portal ERROR]", err);
    return NextResponse.json(
      { error: "Failed to load portal data." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json(
        { error: "Forbidden: Invalid request origin." },
        { status: 403, headers: PRIVATE_HEADERS },
      );
    }

    const contentType =
      request.headers.get("content-type")?.toLowerCase() || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json." },
        { status: 415, headers: PRIVATE_HEADERS },
      );
    }

    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_BULK_BODY_BYTES
      ) {
        return NextResponse.json(
          { error: "Request payload too large." },
          { status: 413, headers: PRIVATE_HEADERS },
        );
      }
    }

    const rawText = await request.text();
    const actualBytes = Buffer.byteLength(rawText, "utf8");
    if (actualBytes > MAX_BULK_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request payload too large." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON request body." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    const body = parsedBody as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() : "";
    if (!action) {
      return NextResponse.json(
        { error: "Action is required." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    if (
      action !== "bulk_import_interns" &&
      actualBytes > MAX_DEFAULT_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: "Request payload exceeds 256 KB limit." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }

    const PUBLIC_ACTIONS = new Set([
      "login",
      "logout",
      "register_intern",
      "verify_email",
      "request_password_reset",
      "reset_password",
      "submit_application",
    ]);

    const ip = getClientIp(request);

    if (action === "logout") {
      return jsonOutcome({
        body: { success: true, message: "Signed out successfully." },
        clearCookie: true,
      });
    }

    let authUser: PublicUser | null = null;
    if (!PUBLIC_ACTIONS.has(action)) {
      const portalDb = await readPortal();
      authUser = resolveAuthenticatedUser(request, portalDb);
      if (!authUser) {
        return NextResponse.json(
          { error: "Authentication required (401 Unauthorized). Please sign in." },
          { status: 401, headers: PRIVATE_HEADERS },
        );
      }

      const rl = await checkRateLimit({
        key: `mut:user:${authUser.id}`,
        limit: 120,
        windowSeconds: 60,
      });
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
    }

    const actorRole: UserRole = authUser ? authUser.role : "intern";
    const actorEmail: string = authUser ? authUser.email : "";
    const actorName: string = authUser ? authUser.name : "System User";

    const requirePerm = (permission: string): NextResponse | null => {
      if (!hasPermission(actorRole, permission)) {
        return NextResponse.json(
          {
            error: `Access Denied (403 Forbidden): Role '${actorRole}' is not authorized to perform this action.`,
          },
          { status: 403, headers: PRIVATE_HEADERS },
        );
      }
      return null;
    };

    const requireAdmin = (): NextResponse | null => {
      if (actorRole !== "admin") {
        return NextResponse.json(
          { error: "Access Denied (403 Forbidden): Administrator role required." },
          { status: 403, headers: PRIVATE_HEADERS },
        );
      }
      return null;
    };

    switch (action) {
      // ==========================================================
      // 3.1 AUTHENTICATION & ACCESS
      // ==========================================================
      case "login": {
        const identifier = reqString(
          body.email ?? body.username,
          "Email or username",
          { min: 1, max: 254 },
        ).toLowerCase();
        const password =
          typeof body.password === "string" ? body.password : "";
        if (!password || password.length > 128) {
          return NextResponse.json(
            { error: "Invalid email/username or password." },
            { status: 401, headers: PRIVATE_HEADERS },
          );
        }

        const expectedRole = body.expectedRole
          ? reqEnum(body.expectedRole, "Expected role", USER_ROLES)
          : undefined;

        const ipRl = await checkRateLimit({
          key: `login:ip:${ip}`,
          limit: 10,
          windowSeconds: 15 * 60,
          failClosed: true,
        });
        if (!ipRl.allowed) return rateLimitResponse(ipRl.retryAfter);

        const idRl = await checkRateLimit({
          key: `login:id:${identifier}`,
          limit: 5,
          windowSeconds: 15 * 60,
          failClosed: true,
        });
        if (!idRl.allowed) return rateLimitResponse(idRl.retryAfter);

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const user = db.users.find(
            (u) =>
              u.email.toLowerCase() === identifier ||
              (u.username && u.username.toLowerCase() === identifier),
          );

          if (!user) {
            await verifyDummyPassword(password);
            return {
              status: 401,
              body: { error: "Invalid email/username or password." },
            };
          }

          const validPassword = await verifyPassword(
            password,
            user.passwordHash,
          );
          if (!validPassword) {
            return {
              status: 401,
              body: { error: "Invalid email/username or password." },
            };
          }

          if (user.disabled) {
            return {
              status: 403,
              body: {
                error:
                  "This account has been disabled. Please contact an administrator.",
              },
            };
          }

          if (expectedRole && user.role !== expectedRole) {
            return {
              status: 403,
              body: {
                error: `Access denied: This login portal is restricted to ${expectedRole.toUpperCase()} accounts.`,
              },
            };
          }

          if (!user.emailVerified) {
            return {
              status: 403,
              body: {
                error: "Please verify your email address before logging in.",
                requiresVerification: true,
                email: user.email,
              },
            };
          }

          user.lastLoginAt = new Date().toISOString();
          appendAuditLog(db, {
            actorName: user.name,
            actorEmail: user.email,
            actorRole: user.role,
            action: "USER_LOGIN",
            entityType: "Auth",
            entityId: user.id,
            details: `${user.name} (${user.role}) signed in to the portal.`,
          });

          const token = createPortalToken({
            uid: user.id,
            tv: user.tokenVersion ?? 0,
          });

          return {
            body: {
              success: true,
              user: toPublicUser(user),
            },
            sessionToken: token,
          };
        });

        return jsonOutcome(outcome);
      }

      case "register_intern": {
        const rl = await checkRateLimit({
          key: `register:ip:${ip}`,
          limit: 5,
          windowSeconds: 3600,
        });
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

        if (!isEmailEnabled()) {
          return NextResponse.json(
            {
              error:
                "Email verification is not configured. Please ask the Logix administrator to create an account for you.",
            },
            { status: 503, headers: PRIVATE_HEADERS },
          );
        }

        const name = reqString(body.name, "Name", { min: 1, max: 120 });
        const email = reqEmail(body.email);
        const password = reqPassword(body.password);

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const existing = db.users.find(
            (u) => u.email.toLowerCase() === email,
          );
          if (existing) {
            return {
              status: 400,
              body: { error: "An account with this email already exists." },
            };
          }

          const verificationCode = String(crypto.randomInt(100000, 1000000));
          const verificationCodeHash = await hashPassword(verificationCode);
          const verificationExpiresAt = new Date(
            Date.now() + 15 * 60 * 1000,
          ).toISOString();

          const existingInternRecord = db.interns.find(
            (i) => i.email.toLowerCase() === email,
          );

          const newUser: UserAccount = {
            id: `usr-${crypto.randomUUID()}`,
            email,
            passwordHash: await hashPassword(password),
            role: "intern",
            name,
            emailVerified: false,
            verificationCodeHash,
            verificationExpiresAt,
            codeAttempts: 0,
            tokenVersion: 0,
            internRecordId: existingInternRecord?.id,
            createdAt: new Date().toISOString(),
          };

          if (existingInternRecord && !existingInternRecord.userId) {
            existingInternRecord.userId = newUser.id;
          }

          db.users.push(newUser);
          appendAuditLog(db, {
            actorName: name,
            actorEmail: email,
            actorRole: "intern",
            action: "INTERN_REGISTERED",
            entityType: "Auth",
            entityId: newUser.id,
            details: `Intern account registered for ${email}. Verification code dispatched.`,
          });

          ctx.outbox.push({
            to: email,
            subject: "Verify your Logix Internship Portal Account",
            heading: "Email Verification Required",
            subHeading: "Complete your Intern Account Registration",
            bodyText: `Hello ${name}, your verification code is: ${verificationCode} (expires in 15 minutes).`,
            bodyHtml: `<p>Hello <strong>${escapeHtml(name)}</strong>,</p><p>Thank you for registering on the Logix Internship Management Portal. Please enter the 6-digit verification code below within 15 minutes to activate your account:</p><div style="margin:20px 0;padding:16px;background:#e6f9f5;border:1px solid #1fc8aa;border-radius:8px;text-align:center;font-size:24px;font-weight:700;letter-spacing:0.25em;color:#0b1f3a;">${escapeHtml(verificationCode)}</div>`,
          });

          return {
            body: {
              success: true,
              message:
                "Account created! Please enter the 6-digit verification code sent to your email.",
              email,
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "verify_email": {
        const rl = await checkRateLimit({
          key: `verify_email:ip:${ip}`,
          limit: 10,
          windowSeconds: 15 * 60,
        });
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

        const email = reqEmail(body.email);
        const code = reqString(body.code, "Verification code", {
          min: 6,
          max: 6,
          sanitize: false,
        });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const user = db.users.find((u) => u.email.toLowerCase() === email);
          if (!user || user.disabled) {
            return {
              status: 400,
              body: { error: "Invalid or expired verification code." },
            };
          }

          if (
            !user.verificationCodeHash ||
            !user.verificationExpiresAt ||
            new Date(user.verificationExpiresAt).getTime() < Date.now()
          ) {
            return {
              status: 400,
              body: { error: "Invalid or expired verification code." },
            };
          }

          if ((user.codeAttempts ?? 0) >= 5) {
            user.verificationCodeHash = undefined;
            user.verificationExpiresAt = undefined;
            return {
              status: 400,
              body: {
                error:
                  "Too many invalid attempts. Verification code has been invalidated.",
              },
            };
          }

          const matches = await verifyPassword(code, user.verificationCodeHash);
          if (!matches) {
            user.codeAttempts = (user.codeAttempts ?? 0) + 1;
            if (user.codeAttempts >= 5) {
              user.verificationCodeHash = undefined;
              user.verificationExpiresAt = undefined;
            }
            return {
              status: 400,
              body: { error: "Invalid verification code." },
            };
          }

          user.emailVerified = true;
          user.verificationCodeHash = undefined;
          user.verificationExpiresAt = undefined;
          user.codeAttempts = 0;

          if (!user.internRecordId) {
            const matchingIntern = db.interns.find(
              (i) => i.email.toLowerCase() === user.email.toLowerCase(),
            );
            if (matchingIntern) {
              user.internRecordId = matchingIntern.id;
              if (!matchingIntern.userId) matchingIntern.userId = user.id;
            }
          }

          appendAuditLog(db, {
            actorName: user.name,
            actorEmail: user.email,
            actorRole: user.role,
            action: "EMAIL_VERIFIED",
            entityType: "Auth",
            entityId: user.id,
            details: `Verified email address for ${user.email}.`,
          });

          const token = createPortalToken({
            uid: user.id,
            tv: user.tokenVersion ?? 0,
          });

          return {
            body: {
              success: true,
              user: toPublicUser(user),
            },
            sessionToken: token,
          };
        });

        return jsonOutcome(outcome);
      }

      case "request_password_reset": {
        const ipRl = await checkRateLimit({
          key: `reset_req:ip:${ip}`,
          limit: 10,
          windowSeconds: 3600,
        });
        if (!ipRl.allowed) return rateLimitResponse(ipRl.retryAfter);

        const email = reqEmail(body.email);

        const emailRl = await checkRateLimit({
          key: `reset_req:email:${email}`,
          limit: 3,
          windowSeconds: 3600,
        });
        if (!emailRl.allowed) return rateLimitResponse(emailRl.retryAfter);

        const genericMessage =
          "If an account exists for that email, a password reset code has been sent.";

        if (!isEmailEnabled()) {
          return jsonOutcome({
            body: { success: true, message: genericMessage },
          });
        }

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const user = db.users.find((u) => u.email.toLowerCase() === email);
          if (user && !user.disabled) {
            const resetCode = String(crypto.randomInt(100000, 1000000));
            user.resetCodeHash = await hashPassword(resetCode);
            user.resetExpiresAt = new Date(
              Date.now() + 15 * 60 * 1000,
            ).toISOString();
            user.codeAttempts = 0;

            ctx.outbox.push({
              to: email,
              subject: "Logix Portal Password Reset Code",
              heading: "Password Reset Request",
              bodyText: `Your password reset code is: ${resetCode} (expires in 15 minutes).`,
              bodyHtml: `<p>Hello <strong>${escapeHtml(user.name)}</strong>,</p><p>Use the following 6-digit security code within 15 minutes to reset your password:</p><div style="margin:16px 0;padding:14px;background:#f4f6fa;border-radius:8px;font-size:22px;font-weight:700;text-align:center;letter-spacing:0.2em;">${escapeHtml(resetCode)}</div>`,
            });
          }

          return {
            body: {
              success: true,
              message: genericMessage,
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "reset_password": {
        const rl = await checkRateLimit({
          key: `reset_pwd:ip:${ip}`,
          limit: 10,
          windowSeconds: 15 * 60,
        });
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

        const email = reqEmail(body.email);
        const code = reqString(body.code, "Reset code", {
          min: 6,
          max: 6,
          sanitize: false,
        });
        const newPassword = reqPassword(body.newPassword, "New password");

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const user = db.users.find((u) => u.email.toLowerCase() === email);
          if (
            !user ||
            user.disabled ||
            !user.resetCodeHash ||
            !user.resetExpiresAt ||
            new Date(user.resetExpiresAt).getTime() < Date.now()
          ) {
            return {
              status: 400,
              body: { error: "Invalid or expired reset code." },
            };
          }

          if ((user.codeAttempts ?? 0) >= 5) {
            user.resetCodeHash = undefined;
            user.resetExpiresAt = undefined;
            return {
              status: 400,
              body: {
                error:
                  "Too many invalid attempts. Reset code has been invalidated.",
              },
            };
          }

          const matches = await verifyPassword(code, user.resetCodeHash);
          if (!matches) {
            user.codeAttempts = (user.codeAttempts ?? 0) + 1;
            if (user.codeAttempts >= 5) {
              user.resetCodeHash = undefined;
              user.resetExpiresAt = undefined;
            }
            return {
              status: 400,
              body: { error: "Invalid reset code." },
            };
          }

          user.passwordHash = await hashPassword(newPassword);
          user.resetCodeHash = undefined;
          user.resetExpiresAt = undefined;
          user.codeAttempts = 0;
          user.tokenVersion = (user.tokenVersion ?? 0) + 1;
          user.mustChangePassword = false;

          appendAuditLog(db, {
            actorName: user.name,
            actorEmail: user.email,
            actorRole: user.role,
            action: "PASSWORD_RESET",
            entityType: "Auth",
            entityId: user.id,
            details: `Password reset completed for ${user.email}.`,
          });

          return {
            body: {
              success: true,
              message: "Password updated! You may now sign in.",
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "change_password": {
        const currentPassword =
          typeof body.currentPassword === "string" ? body.currentPassword : "";
        if (!currentPassword || currentPassword.length > 128) {
          return NextResponse.json(
            { error: "Current password is required." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }
        const newPassword = reqPassword(body.newPassword, "New password");

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const user = db.users.find((u) => u.id === authUser!.id);
          if (!user || user.disabled) {
            return {
              status: 401,
              body: { error: "Account not available." },
            };
          }

          const valid = await verifyPassword(currentPassword, user.passwordHash);
          if (!valid) {
            return {
              status: 400,
              body: { error: "Current password is incorrect." },
            };
          }

          user.passwordHash = await hashPassword(newPassword);
          user.tokenVersion = (user.tokenVersion ?? 0) + 1;
          user.mustChangePassword = false;

          appendAuditLog(db, {
            actorName: user.name,
            actorEmail: user.email,
            actorRole: user.role,
            action: "PASSWORD_CHANGED",
            entityType: "Auth",
            entityId: user.id,
            details: `${user.name} changed their account password.`,
          });

          const token = createPortalToken({
            uid: user.id,
            tv: user.tokenVersion,
          });

          return {
            body: {
              success: true,
              message: "Password updated successfully.",
              user: toPublicUser(user),
            },
            sessionToken: token,
          };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.2 INTERN REGISTRATION / APPLICATION
      // ==========================================================
      case "submit_application": {
        const rl = await checkRateLimit({
          key: `apply:ip:${ip}`,
          limit: 5,
          windowSeconds: 600,
        });
        if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

        const fullName = reqString(body.fullName, "Full name", { max: 120 });
        const fatherName = optString(body.fatherName, "Father name", {
          max: 120,
        });
        const cnicOrStudentId = reqString(
          body.cnicOrStudentId,
          "CNIC or Student ID",
          { max: 60 },
        );
        const email = reqEmail(body.email);
        const phone = optString(body.phone, "Phone", { max: 40 });
        const city = optString(body.city, "City", { max: 80 });
        const photoUrl = optString(body.photoUrl, "Photo key", { max: 200 });
        const university = reqString(body.university, "University", {
          max: 160,
        });
        const degree = optString(body.degree, "Degree", { max: 120 });
        const semester = optString(body.semester, "Semester", { max: 60 });
        const cgpa = optString(body.cgpa, "CGPA", { max: 20 });
        const fieldId =
          optString(body.fieldId, "Field ID", { max: 80 }) || "fld-web";
        const durationMonths = reqInt(
          body.durationMonths ?? 3,
          "Duration months",
          { min: 1, max: 24 },
        );
        const startPreference =
          optDate(body.startPreference, "Start preference") ||
          new Date().toISOString().slice(0, 10);
        const batchId = optString(body.batchId, "Batch ID", { max: 80 });
        const cvFileName =
          optString(body.cvFileName, "CV file name", { max: 255 }) ||
          "Applicant_Resume.pdf";
        const cvFileSize =
          body.cvFileSize !== undefined
            ? reqInt(body.cvFileSize, "CV file size", {
                min: 0,
                max: 10 * 1024 * 1024,
              })
            : 0;
        const cvStorageKey = optString(body.cvStorageKey, "CV storage key", {
          max: 200,
        });
        const coverLetter = optString(body.coverLetter, "Cover letter", {
          max: 4000,
        });
        const skills = Array.isArray(body.skills)
          ? body.skills
              .slice(0, 30)
              .map((s) => sanitizeText(s).slice(0, 60))
              .filter(Boolean)
          : optString(body.skills, "Skills", { max: 500 })
              .split(",")
              .map((s) => sanitizeText(s).slice(0, 60))
              .filter(Boolean)
              .slice(0, 30);
        const githubUrl = optUrl(body.githubUrl, "GitHub URL");
        const linkedinUrl = optUrl(body.linkedinUrl, "LinkedIn URL");
        const portfolioUrl = optUrl(body.portfolioUrl, "Portfolio URL");

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const fieldObj =
            db.fields.find((f) => f.id === fieldId) || db.fields[0];
          if (!fieldObj) {
            return {
              status: 400,
              body: { error: "No internship department is configured." },
            };
          }

          const batchObj =
            (batchId ? db.batches.find((b) => b.id === batchId) : undefined) ||
            db.batches.find((b) => b.status === "Upcoming") ||
            db.batches.find((b) => b.status === "Active") ||
            db.batches[0];

          const defaultMentor =
            db.mentors.find((m) => m.department === fieldObj.name) ||
            db.mentors[0];

          const internId = generateNextInternId(db);
          const recordId = `int-${crypto.randomUUID()}`;
          const startDate = startPreference;
          const endDate = calculateEndDate(startDate, durationMonths);
          const nowIso = new Date().toISOString();

          const newIntern: typeof db.interns[number] = {
            id: recordId,
            internId,
            fullName,
            fatherName: fatherName || "Not Provided",
            cnicOrStudentId,
            email,
            phone: phone || "Not Provided",
            city: city || "Remote",
            photoUrl: photoUrl || undefined,
            university,
            degree: degree || "BS Computer Science",
            semester: semester || "6th Semester",
            cgpa: cgpa || "3.50",
            fieldId: fieldObj.id,
            fieldName: fieldObj.name,
            durationMonths,
            startPreference,
            startDate,
            endDate,
            batchId: batchObj?.id ?? "",
            batchName: batchObj?.name ?? "Unassigned",
            mentorId: defaultMentor?.id ?? "",
            mentorName: defaultMentor?.name ?? "Unassigned",
            cvFileName,
            cvFileSize,
            cvStorageKey: cvStorageKey || undefined,
            coverLetter,
            skills: skills.length > 0 ? skills : fieldObj.defaultSkills,
            githubUrl: githubUrl || undefined,
            linkedinUrl: linkedinUrl || undefined,
            portfolioUrl: portfolioUrl || undefined,
            applicationStatus: "Pending",
            internshipStatus: "Applied",
            archived: false,
            progressPercentage: 0,
            attendancePercentage: 0,
            appliedAt: nowIso,
            updatedAt: nowIso,
          };

          const existingUser = db.users.find(
            (u) => u.email.toLowerCase() === email && u.role === "intern",
          );
          if (existingUser) {
            newIntern.userId = existingUser.id;
            if (!existingUser.internRecordId) {
              existingUser.internRecordId = newIntern.id;
            }
          }

          db.interns.unshift(newIntern);

          addPortalNotification(db, {
            recipientRole: "admin",
            title: `New Application: ${fullName} (${fieldObj.name})`,
            message: `${fullName} from ${university} applied for ${fieldObj.name} (${durationMonths} months). ID: ${internId}`,
            category: "application",
          });

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: email,
            recipientInternRecordId: recordId,
            title: "Internship Application Received",
            message: `Your application (${internId}) for ${fieldObj.name} (${durationMonths} months) has been received and is Pending review.`,
            category: "application",
          });

          appendAuditLog(db, {
            actorName: fullName,
            actorEmail: email,
            actorRole: "applicant",
            action: "SUBMITTED_APPLICATION",
            entityType: "Application",
            entityId: internId,
            details: `Application submitted for ${fieldObj.name} (${durationMonths} months, ${newIntern.batchName}).`,
          });

          ctx.outbox.push({
            to: email,
            subject: `[Logix Portal] Application Received — ${internId}`,
            heading: "Application Received",
            subHeading: `Tracking ID: ${internId}`,
            bodyText: `Dear ${fullName}, your application for the ${fieldObj.name} Internship (${durationMonths} months) at Logix has been received. Current Status: Pending.`,
            bodyHtml: `<p>Dear <strong>${escapeHtml(fullName)}</strong>,</p><p>Thank you for applying to the <strong>Logix ${escapeHtml(fieldObj.name)} Internship</strong> (${durationMonths} months · ${escapeHtml(newIntern.batchName)}).</p><ul><li><strong>Intern Tracking ID:</strong> ${escapeHtml(internId)}</li><li><strong>Application Status:</strong> Pending Review</li><li><strong>Expected Start:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</li></ul><p>We will notify you by email as soon as your application status changes.</p>`,
          });

          return { body: { success: true, intern: newIntern } };
        });

        return jsonOutcome(outcome);
      }

      case "update_application_status": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = reqString(body.id, "Intern ID", { max: 100 });
        const applicationStatus = reqEnum(
          body.applicationStatus,
          "Application status",
          APPLICATION_STATUSES,
        );
        const mentorId = optString(body.mentorId, "Mentor ID", { max: 100 });
        const batchId = optString(body.batchId, "Batch ID", { max: 100 });

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const intern = db.interns.find(
            (i) => i.id === id || i.internId === id,
          );
          if (!intern) {
            return {
              status: 404,
              body: { error: "Intern record not found." },
            };
          }

          intern.applicationStatus = applicationStatus;
          if (applicationStatus === "Approved") {
            intern.internshipStatus = "Active";
          } else if (applicationStatus === "Rejected") {
            intern.internshipStatus = "Terminated";
          }

          if (mentorId) {
            const m = db.mentors.find((x) => x.id === mentorId);
            if (!m) {
              return { status: 400, body: { error: "Mentor not found." } };
            }
            intern.mentorId = m.id;
            intern.mentorName = m.name;
          }
          if (batchId) {
            const b = db.batches.find((x) => x.id === batchId);
            if (!b) {
              return { status: 400, body: { error: "Batch not found." } };
            }
            intern.batchId = b.id;
            intern.batchName = b.name;
          }

          intern.updatedAt = new Date().toISOString();

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: intern.email,
            recipientInternRecordId: intern.id,
            title: `Application Status Updated: ${applicationStatus}`,
            message: `Your application (${intern.internId}) for ${intern.fieldName} has been marked as ${applicationStatus}.`,
            category: "status",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: `APPLICATION_${applicationStatus.toUpperCase()}`,
            entityType: "Application",
            entityId: intern.internId,
            details: `Updated application status for ${intern.fullName} (${intern.internId}) to ${applicationStatus}.`,
          });

          ctx.outbox.push({
            to: intern.email,
            subject: `[Logix Portal] Application ${applicationStatus} — ${intern.internId}`,
            heading: `Your Application is ${applicationStatus}`,
            subHeading: `${intern.fieldName} · ${intern.batchName}`,
            bodyText: `Hello ${intern.fullName}, your internship application (${intern.internId}) status has been updated to: ${applicationStatus}.`,
            bodyHtml: `<p>Dear <strong>${escapeHtml(intern.fullName)}</strong>,</p><p>Your application for the <strong>${escapeHtml(intern.fieldName)}</strong> internship at Logix has been updated to: <strong style="color:${applicationStatus === "Approved" ? "#0e9983" : "#e5484d"}">${escapeHtml(applicationStatus)}</strong>.</p>${applicationStatus === "Approved" ? `<p>Your assigned mentor is <strong>${escapeHtml(intern.mentorName)}</strong>. You can now sign in to your Intern Dashboard to download your Offer Letter and view assigned tasks.</p>` : ""}`,
          });

          return { body: { success: true, intern } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.3 INTERN RECORD MANAGEMENT (ADMIN)
      // ==========================================================
      case "save_intern_record": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = optString(body.id, "ID", { max: 100 });
        const fullName = optString(body.fullName, "Full name", { max: 120 });
        const fatherName = optString(body.fatherName, "Father name", {
          max: 120,
        });
        const cnicOrStudentId = optString(
          body.cnicOrStudentId,
          "CNIC or Student ID",
          { max: 60 },
        );
        const email = body.email ? reqEmail(body.email) : "";
        const phone = optString(body.phone, "Phone", { max: 40 });
        const city = optString(body.city, "City", { max: 80 });
        const university = optString(body.university, "University", {
          max: 160,
        });
        const degree = optString(body.degree, "Degree", { max: 120 });
        const semester = optString(body.semester, "Semester", { max: 60 });
        const cgpa = optString(body.cgpa, "CGPA", { max: 20 });
        const fieldId = optString(body.fieldId, "Field ID", { max: 100 });
        const fieldNameInput = optString(body.fieldName, "Field name", {
          max: 120,
        });
        const durationMonths = reqInt(
          body.durationMonths ?? 3,
          "Duration months",
          { min: 1, max: 24 },
        );
        const startDate =
          optDate(body.startDate, "Start date") ||
          new Date().toISOString().split("T")[0];
        const endDate = calculateEndDate(startDate, durationMonths);
        const batchId = optString(body.batchId, "Batch ID", { max: 100 });
        const batchNameInput = optString(body.batchName, "Batch name", {
          max: 120,
        });
        const mentorId = optString(body.mentorId, "Mentor ID", { max: 100 });
        const mentorNameInput = optString(body.mentorName, "Mentor name", {
          max: 120,
        });
        const internshipStatus = body.internshipStatus
          ? reqEnum(
              body.internshipStatus,
              "Internship status",
              INTERNSHIP_STATUSES,
            )
          : "Active";
        const applicationStatus = body.applicationStatus
          ? reqEnum(
              body.applicationStatus,
              "Application status",
              APPLICATION_STATUSES,
            )
          : "Approved";
        const skills = Array.isArray(body.skills)
          ? body.skills
              .slice(0, 30)
              .map((s) => sanitizeText(s).slice(0, 60))
              .filter(Boolean)
          : optString(body.skills, "Skills", { max: 500 })
              .split(",")
              .map((s) => sanitizeText(s).slice(0, 60))
              .filter(Boolean)
              .slice(0, 30);

        if (!id && (!fullName || !email)) {
          return NextResponse.json(
            { error: "Full name and email are required to create an intern." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const fieldObj =
            db.fields.find(
              (f) => f.id === fieldId || f.name === fieldNameInput,
            ) || db.fields[0];
          const batchObj =
            db.batches.find(
              (b) => b.id === batchId || b.name === batchNameInput,
            ) ||
            db.batches.find((b) => b.status === "Active") ||
            db.batches[0];
          const mentorObj =
            db.mentors.find(
              (m) => m.id === mentorId || m.name === mentorNameInput,
            ) || db.mentors[0];

          const existing = id
            ? db.interns.find((i) => i.id === id)
            : undefined;

          if (existing) {
            const prevStatus = existing.internshipStatus;
            existing.fullName = fullName || existing.fullName;
            existing.fatherName = fatherName || existing.fatherName;
            existing.cnicOrStudentId =
              cnicOrStudentId || existing.cnicOrStudentId;
            existing.email = email || existing.email;
            existing.phone = phone || existing.phone;
            existing.city = city || existing.city;
            existing.university = university || existing.university;
            existing.degree = degree || existing.degree;
            existing.semester = semester || existing.semester;
            existing.cgpa = cgpa || existing.cgpa;
            if (fieldObj) {
              existing.fieldId = fieldObj.id;
              existing.fieldName = fieldObj.name;
            }
            existing.durationMonths = durationMonths;
            existing.startDate = startDate;
            existing.endDate = endDate;
            if (batchObj) {
              existing.batchId = batchObj.id;
              existing.batchName = batchObj.name;
            }
            if (mentorObj) {
              existing.mentorId = mentorObj.id;
              existing.mentorName = mentorObj.name;
            }
            existing.internshipStatus = internshipStatus;
            existing.applicationStatus = applicationStatus;
            if (skills.length > 0) existing.skills = skills;
            existing.updatedAt = new Date().toISOString();

            appendAuditLog(db, {
              actorName,
              actorEmail,
              actorRole,
              action: "UPDATED_INTERN_RECORD",
              entityType: "InternRecord",
              entityId: existing.internId,
              details: `Updated record for ${existing.fullName} (${existing.internId}). Status: ${existing.internshipStatus}, End Date: ${existing.endDate}.`,
            });

            if (prevStatus !== internshipStatus) {
              addPortalNotification(db, {
                recipientRole: "intern",
                recipientEmail: existing.email,
                recipientInternRecordId: existing.id,
                title: `Internship Status Changed to ${internshipStatus}`,
                message: `Your internship record (${existing.internId}) status is now ${internshipStatus}.`,
                category: "status",
              });

              ctx.outbox.push({
                to: existing.email,
                subject: `[Logix Portal] Internship Status Update: ${internshipStatus}`,
                heading: `Internship Status: ${internshipStatus}`,
                bodyText: `Dear ${existing.fullName}, your internship status (${existing.internId}) is now ${internshipStatus}.`,
                bodyHtml: `<p>Dear <strong>${escapeHtml(existing.fullName)}</strong>,</p><p>Your internship record (<strong>${escapeHtml(existing.internId)}</strong>) status has been updated from <em>${escapeHtml(prevStatus)}</em> to <strong>${escapeHtml(internshipStatus)}</strong>.</p>`,
              });
            }

            return { body: { success: true, intern: existing } };
          }

          if (!fieldObj) {
            return {
              status: 400,
              body: { error: "No department configured." },
            };
          }

          const internId = generateNextInternId(db);
          const recordId = `int-${crypto.randomUUID()}`;
          const nowIso = new Date().toISOString();
          const created = {
            id: recordId,
            internId,
            fullName,
            fatherName: fatherName || "Not Provided",
            cnicOrStudentId: cnicOrStudentId || "N/A",
            email,
            phone: phone || "Not Provided",
            city: city || "Remote",
            university: university || "University",
            degree: degree || "BS Computer Science",
            semester: semester || "6th Semester",
            cgpa: cgpa || "3.50",
            fieldId: fieldObj.id,
            fieldName: fieldObj.name,
            durationMonths,
            startPreference: startDate,
            startDate,
            endDate,
            batchId: batchObj?.id ?? "",
            batchName: batchObj?.name ?? "Unassigned",
            mentorId: mentorObj?.id ?? "",
            mentorName: mentorObj?.name ?? "Unassigned",
            cvFileName:
              optString(body.cvFileName, "CV file name", { max: 255 }) ||
              "Admin_Uploaded_CV.pdf",
            cvFileSize: 320000,
            skills: skills.length > 0 ? skills : fieldObj.defaultSkills,
            applicationStatus,
            internshipStatus,
            archived: false,
            progressPercentage: internshipStatus === "Completed" ? 100 : 0,
            attendancePercentage: internshipStatus === "Completed" ? 95 : 100,
            appliedAt: nowIso,
            updatedAt: nowIso,
          };

          db.interns.unshift(created);
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CREATED_INTERN_RECORD",
            entityType: "InternRecord",
            entityId: internId,
            details: `Added new intern record ${internId} for ${fullName} (${fieldObj.name}).`,
          });

          return { body: { success: true, intern: created } };
        });

        return jsonOutcome(outcome);
      }

      case "archive_intern_record": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = reqString(body.id, "Intern ID", { max: 100 });
        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const intern = db.interns.find((i) => i.id === id);
          if (!intern) {
            return { status: 404, body: { error: "Not found" } };
          }
          intern.archived = !intern.archived;
          intern.updatedAt = new Date().toISOString();
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: intern.archived ? "ARCHIVED_INTERN" : "RESTORED_INTERN",
            entityType: "InternRecord",
            entityId: intern.internId,
            details: `${intern.archived ? "Archived" : "Restored"} intern record ${intern.internId} (${intern.fullName}).`,
          });
          return { body: { success: true, intern } };
        });

        return jsonOutcome(outcome);
      }

      case "delete_intern_record": {
        const permErr = requirePerm("delete_interns");
        if (permErr) return permErr;

        const id = reqString(body.id, "Intern ID", { max: 100 });
        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const idx = db.interns.findIndex((i) => i.id === id);
          if (idx === -1) {
            return { status: 404, body: { error: "Not found" } };
          }
          const [removed] = db.interns.splice(idx, 1);
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "DELETED_INTERN_RECORD",
            entityType: "InternRecord",
            entityId: removed.internId,
            details: `Permanently deleted intern record ${removed.internId} (${removed.fullName}).`,
          });
          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "bulk_import_interns": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (rows.length === 0) {
          return NextResponse.json(
            { error: "No valid rows found in CSV import." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }
        if (rows.length > 500) {
          return NextResponse.json(
            { error: "Bulk import is limited to 500 rows per request." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          let importedCount = 0;
          const batchObj =
            db.batches.find((b) => b.status === "Active") || db.batches[0];
          const mentorObj = db.mentors[0];

          for (const rawRow of rows) {
            if (!rawRow || typeof rawRow !== "object") continue;
            const row = rawRow as Record<string, unknown>;
            const fullName = sanitizeText(row.fullName ?? row.name).slice(
              0,
              120,
            );
            const email = sanitizeText(row.email).toLowerCase().slice(0, 254);
            if (!fullName || !email || !email.includes("@")) continue;

            const fieldName =
              sanitizeText(row.field || "Web Development").slice(0, 120) ||
              "Web Development";
            const fieldObj =
              db.fields.find(
                (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
              ) || db.fields[0];
            if (!fieldObj) continue;

            const rawDur = Number(row.durationMonths ?? row.duration);
            const durationMonths =
              Number.isInteger(rawDur) && rawDur >= 1 && rawDur <= 24
                ? rawDur
                : 3;
            const rawDate = sanitizeText(row.startDate).slice(0, 10);
            const startDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
              ? rawDate
              : new Date().toISOString().slice(0, 10);
            const endDate = calculateEndDate(startDate, durationMonths);
            const internId = generateNextInternId(db);
            const rawStatus = sanitizeText(row.status);
            const status: InternshipStatus = INTERNSHIP_STATUSES.includes(
              rawStatus as InternshipStatus,
            )
              ? (rawStatus as InternshipStatus)
              : "Active";
            const nowIso = new Date().toISOString();

            db.interns.push({
              id: `int-${crypto.randomUUID()}`,
              internId,
              fullName,
              fatherName: sanitizeText(row.fatherName || "N/A").slice(0, 120),
              cnicOrStudentId: sanitizeText(
                row.cnic || row.studentId || "N/A",
              ).slice(0, 60),
              email,
              phone: sanitizeText(row.phone || "N/A").slice(0, 40),
              city: sanitizeText(row.city || "Remote").slice(0, 80),
              university: sanitizeText(
                row.university || "Partner University",
              ).slice(0, 160),
              degree: sanitizeText(row.degree || "BS CS").slice(0, 120),
              semester: sanitizeText(row.semester || "6th").slice(0, 60),
              cgpa: sanitizeText(row.cgpa || "3.5").slice(0, 20),
              fieldId: fieldObj.id,
              fieldName: fieldObj.name,
              durationMonths,
              startPreference: startDate,
              startDate,
              endDate,
              batchId: batchObj?.id ?? "",
              batchName: batchObj?.name ?? "Unassigned",
              mentorId: mentorObj?.id ?? "",
              mentorName: mentorObj?.name ?? "Unassigned",
              cvFileName: "Bulk_Imported_CV.pdf",
              cvFileSize: 250000,
              skills: fieldObj.defaultSkills,
              applicationStatus: "Approved",
              internshipStatus: status,
              archived: false,
              progressPercentage: 0,
              attendancePercentage: 100,
              appliedAt: nowIso,
              updatedAt: nowIso,
            });
            importedCount++;
          }

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "BULK_IMPORT_CSV",
            entityType: "InternRecord",
            entityId: `BULK-${importedCount}`,
            details: `Bulk imported ${importedCount} intern records from CSV/Excel.`,
          });

          return { body: { success: true, importedCount } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.4 FIELD, DURATION & BATCH MANAGEMENT
      // ==========================================================
      case "save_field": {
        const permErr = requirePerm("manage_departments");
        if (permErr) return permErr;

        const id = optString(body.id, "Field ID", { max: 100 });
        const name = reqString(body.name, "Department name", { max: 120 });
        const code = optString(body.code, "Code", { max: 20 }).toUpperCase();
        const podName = optString(body.podName, "Pod name", { max: 120 });
        const description = optString(body.description, "Description", {
          max: 1000,
        });
        const totalSeats = reqInt(body.totalSeats ?? 15, "Total seats", {
          min: 1,
          max: 1000,
        });
        const defaultSkills = optString(body.defaultSkills, "Default skills", {
          max: 500,
        })
          .split(",")
          .map((s) => sanitizeText(s).slice(0, 60))
          .filter(Boolean)
          .slice(0, 20);

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const existing = id ? db.fields.find((f) => f.id === id) : undefined;
          if (existing) {
            existing.name = name || existing.name;
            existing.code = code || existing.code;
            existing.podName = podName || existing.podName;
            existing.description = description || existing.description;
            existing.totalSeats = totalSeats;
            if (defaultSkills.length > 0) existing.defaultSkills = defaultSkills;
          } else {
            db.fields.push({
              id: `fld-${crypto.randomUUID().slice(0, 8)}`,
              name,
              code: code || name.slice(0, 4).toUpperCase(),
              podName: podName || `${name} Pod`,
              description:
                description || `Specialized internship track in ${name}.`,
              totalSeats,
              filledSeats: 0,
              active: true,
              defaultSkills:
                defaultSkills.length > 0 ? defaultSkills : [name],
            });
          }

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: existing ? "UPDATED_FIELD" : "CREATED_FIELD",
            entityType: "Field",
            entityId: name,
            details: `${existing ? "Updated" : "Created"} internship department '${name}' (${totalSeats} seats).`,
          });

          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "toggle_field": {
        const permErr = requirePerm("manage_departments");
        if (permErr) return permErr;

        const id = reqString(body.id, "Field ID", { max: 100 });
        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const field = db.fields.find((f) => f.id === id);
          if (!field) {
            return { status: 404, body: { error: "Department not found." } };
          }
          field.active = !field.active;
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: field.active ? "ENABLED_FIELD" : "DISABLED_FIELD",
            entityType: "Field",
            entityId: field.code,
            details: `${field.active ? "Enabled" : "Disabled"} field ${field.name}.`,
          });
          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "save_duration": {
        const permErr = requirePerm("manage_durations");
        if (permErr) return permErr;

        const months = reqInt(body.months, "Months", { min: 1, max: 36 });
        const label =
          optString(body.label, "Label", { max: 120 }) ||
          `${months} Months Track`;
        const description = optString(body.description, "Description", {
          max: 500,
        });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const existing = db.durations.find((d) => d.months === months);
          if (existing) {
            existing.label = label;
            existing.description = description || existing.description;
            existing.active = true;
          } else {
            db.durations.push({
              id: `dur-${months}-${crypto.randomUUID().slice(0, 6)}`,
              months,
              label,
              weeks: months * 4,
              active: true,
              description:
                description ||
                `${months * 4}-week structured internship program.`,
            });
            db.durations.sort((a, b) => a.months - b.months);
          }

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "SAVED_DURATION",
            entityType: "Duration",
            entityId: `${months}M`,
            details: `Configured ${months}-month internship duration option.`,
          });

          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "toggle_duration": {
        const permErr = requirePerm("manage_durations");
        if (permErr) return permErr;

        const id = reqString(body.id, "Duration ID", { max: 100 });
        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const dur = db.durations.find((d) => d.id === id);
          if (!dur) {
            return { status: 404, body: { error: "Duration not found." } };
          }
          dur.active = !dur.active;
          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "save_batch": {
        const permErr = requirePerm("manage_batches");
        if (permErr) return permErr;

        const name = reqString(body.name, "Batch name", { max: 120 });
        const code = optString(body.code, "Code", { max: 40 }).toUpperCase();
        const startDate = reqDate(body.startDate, "Start date");
        const endDate = optDate(body.endDate, "End date");
        const status = body.status
          ? reqEnum(body.status, "Batch status", BATCH_STATUSES)
          : "Upcoming";
        const description = optString(body.description, "Description", {
          max: 500,
        });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const resolvedEnd = endDate || calculateEndDate(startDate, 3);
          const newBatch = {
            id: `bat-${crypto.randomUUID().slice(0, 8)}`,
            name,
            code:
              code ||
              `${name.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}`,
            startDate,
            endDate: resolvedEnd,
            status,
            description: description || `${name} internship cohort.`,
          };
          db.batches.push(newBatch);

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CREATED_BATCH",
            entityType: "Batch",
            entityId: name,
            details: `Created cohort batch '${name}' (${startDate} to ${resolvedEnd}).`,
          });

          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.5 TASK AND PROGRESS TRACKING
      // ==========================================================
      case "assign_task": {
        const permErr = requirePerm("assign_tasks");
        if (permErr) return permErr;

        const title = reqString(body.title, "Task title", { max: 200 });
        const description = optString(body.description, "Description", {
          max: 4000,
        });
        const internRecordId = reqString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );
        const deadline = reqDate(body.deadline, "Deadline");
        const priority = body.priority
          ? reqEnum(body.priority, "Priority", TASK_PRIORITIES)
          : "Medium";
        const attachmentName = optString(
          body.attachmentName,
          "Attachment name",
          { max: 255 },
        );
        const attachmentStorageKey = optString(
          body.attachmentStorageKey,
          "Attachment storage key",
          { max: 200 },
        );

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const intern = db.interns.find((i) => i.id === internRecordId);
          if (!intern) {
            return {
              status: 404,
              body: { error: "Assigned intern not found." },
            };
          }

          if (
            actorRole === "mentor" &&
            (!authUser?.mentorId || intern.mentorId !== authUser.mentorId) &&
            intern.mentorName !== authUser?.name
          ) {
            return {
              status: 403,
              body: {
                error: "You may only assign tasks to interns assigned to you.",
              },
            };
          }

          const newTask = {
            id: `tsk-${crypto.randomUUID()}`,
            title,
            description,
            internRecordId: intern.id,
            internId: intern.internId,
            internName: intern.fullName,
            fieldName: intern.fieldName,
            assignedByMentorId: authUser?.mentorId || intern.mentorId,
            assignedByName: actorName || intern.mentorName,
            deadline,
            priority,
            attachmentName: attachmentName || undefined,
            attachmentStorageKey: attachmentStorageKey || undefined,
            status: "Assigned" as TaskStatus,
            createdAt: new Date().toISOString(),
          };

          db.tasks.unshift(newTask);

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: intern.email,
            recipientInternRecordId: intern.id,
            title: `New Task Assigned: ${title}`,
            message: `Due ${deadline} · Assigned by ${newTask.assignedByName}`,
            category: "task",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "ASSIGNED_TASK",
            entityType: "Task",
            entityId: newTask.id,
            details: `Assigned task '${title}' to ${intern.fullName} (${intern.internId}), due ${deadline}.`,
          });

          ctx.outbox.push({
            to: intern.email,
            subject: `[Logix Portal] New Task Assigned: ${title}`,
            heading: "New Mentorship Task Assigned",
            subHeading: `Due Date: ${deadline} · Priority: ${priority}`,
            bodyText: `Hello ${intern.fullName}, a new task '${title}' has been assigned to you by ${newTask.assignedByName}. Deadline: ${deadline}.`,
            bodyHtml: `<p>Hello <strong>${escapeHtml(intern.fullName)}</strong>,</p><p>Your mentor <strong>${escapeHtml(newTask.assignedByName)}</strong> has assigned a new task:</p><div style="padding:14px;background:#f4f6fa;border-radius:8px;margin:12px 0;"><strong>${escapeHtml(title)}</strong><p style="margin:6px 0 0 0;font-size:13px;">${escapeHtml(description)}</p></div><p><strong>Deadline:</strong> ${escapeHtml(deadline)}</p>`,
          });

          return { body: { success: true, task: newTask } };
        });

        return jsonOutcome(outcome);
      }

      case "submit_task": {
        const permErr = requirePerm("submit_task");
        if (permErr) return permErr;

        const taskId = reqString(body.taskId, "Task ID", { max: 100 });
        const submissionLink = optUrl(body.submissionLink, "Submission link");
        const submissionFileName = optString(
          body.submissionFileName,
          "Submission file name",
          { max: 255 },
        );
        const submissionStorageKey = optString(
          body.submissionStorageKey,
          "Submission storage key",
          { max: 200 },
        );
        const submissionNotes = optString(
          body.submissionNotes,
          "Submission notes",
          { max: 4000 },
        );

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const task = db.tasks.find((t) => t.id === taskId);
          if (!task) {
            return { status: 404, body: { error: "Task not found." } };
          }

          if (actorRole === "intern") {
            const myIntern = db.interns.find(
              (i) =>
                (authUser?.internRecordId && i.id === authUser.internRecordId) ||
                i.email.toLowerCase() === actorEmail.toLowerCase(),
            );
            if (!myIntern || task.internRecordId !== myIntern.id) {
              return {
                status: 403,
                body: { error: "You may only submit your own tasks." },
              };
            }
          }

          task.submissionLink = submissionLink || undefined;
          task.submissionFileName = submissionFileName || undefined;
          task.submissionStorageKey = submissionStorageKey || undefined;
          task.submissionNotes = submissionNotes || undefined;
          task.status = "Submitted";
          task.submittedAt = new Date().toISOString();

          addPortalNotification(db, {
            recipientRole: "mentor",
            title: `Task Submitted by ${task.internName}`,
            message: `${task.internName} submitted work for '${task.title}'.`,
            category: "task",
          });

          appendAuditLog(db, {
            actorName: task.internName,
            actorEmail,
            actorRole,
            action: "SUBMITTED_TASK",
            entityType: "Task",
            entityId: task.id,
            details: `${task.internName} (${task.internId}) submitted work for '${task.title}'.`,
          });

          return { body: { success: true, task } };
        });

        return jsonOutcome(outcome);
      }

      case "review_task": {
        const permErr = requirePerm("review_tasks");
        if (permErr) return permErr;

        const taskId = reqString(body.taskId, "Task ID", { max: 100 });
        const status = reqEnum(body.status, "Task status", TASK_STATUSES);
        const mentorComments = optString(
          body.mentorComments,
          "Mentor comments",
          { max: 2000 },
        );

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const task = db.tasks.find((t) => t.id === taskId);
          if (!task) {
            return { status: 404, body: { error: "Task not found." } };
          }

          const intern = db.interns.find((i) => i.id === task.internRecordId);

          if (actorRole === "mentor") {
            const ownsTask =
              (authUser?.mentorId &&
                task.assignedByMentorId === authUser.mentorId) ||
              (intern &&
                authUser?.mentorId &&
                intern.mentorId === authUser.mentorId);
            if (!ownsTask) {
              return {
                status: 403,
                body: {
                  error:
                    "You may only review tasks belonging to your assigned interns.",
                },
              };
            }
          }

          task.status = status;
          task.mentorComments = mentorComments;
          task.reviewedAt = new Date().toISOString();

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: intern?.email,
            recipientInternRecordId: task.internRecordId,
            title: `Task Reviewed: ${task.title} (${status})`,
            message: mentorComments || `Your submission was marked as ${status}.`,
            category: "task",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "REVIEWED_TASK",
            entityType: "Task",
            entityId: task.id,
            details: `Marked task '${task.title}' for ${task.internName} as ${status}.`,
          });

          return { body: { success: true, task } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.6 ATTENDANCE & LEAVE MANAGEMENT
      // ==========================================================
      case "mark_attendance": {
        const permErr = requirePerm("mark_attendance");
        if (permErr) return permErr;

        const internRecordId = optString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );
        const date =
          optDate(body.date, "Attendance date") ||
          new Date().toISOString().split("T")[0];
        const status = body.status
          ? reqEnum(body.status, "Attendance status", ATTENDANCE_STATUSES)
          : "Present";
        const notes = optString(body.notes, "Notes", { max: 500 });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          let intern = internRecordId
            ? db.interns.find((i) => i.id === internRecordId)
            : undefined;

          if (actorRole === "intern") {
            const myIntern = db.interns.find(
              (i) =>
                (authUser?.internRecordId && i.id === authUser.internRecordId) ||
                i.email.toLowerCase() === actorEmail.toLowerCase(),
            );
            if (!myIntern) {
              return { status: 404, body: { error: "Intern not found." } };
            }
            if (internRecordId && internRecordId !== myIntern.id) {
              return {
                status: 403,
                body: { error: "You may only mark your own attendance." },
              };
            }
            intern = myIntern;
          }

          if (!intern) {
            return { status: 404, body: { error: "Intern not found." } };
          }

          if (
            actorRole === "mentor" &&
            (!authUser?.mentorId || intern.mentorId !== authUser.mentorId) &&
            intern.mentorName !== authUser?.name
          ) {
            return {
              status: 403,
              body: {
                error:
                  "You may only mark attendance for interns assigned to you.",
              },
            };
          }

          const existing = db.attendance.find(
            (a) => a.internRecordId === intern.id && a.date === date,
          );
          const nowTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          if (existing) {
            existing.status = status;
            existing.notes = notes || existing.notes;
          } else {
            db.attendance.unshift({
              id: `att-${crypto.randomUUID()}`,
              internRecordId: intern.id,
              internId: intern.internId,
              internName: intern.fullName,
              date,
              status,
              checkInTime: nowTime,
              notes,
            });
          }

          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "request_leave": {
        const permErr = requirePerm("request_leave");
        if (permErr) return permErr;

        const internRecordId = optString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );
        const startDate = reqDate(body.startDate, "Start date");
        const endDate = optDate(body.endDate, "End date") || startDate;
        const reason = reqString(body.reason, "Leave reason", { max: 1000 });

        if (endDate < startDate) {
          return NextResponse.json(
            { error: "Leave end date cannot be before start date." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          let intern = internRecordId
            ? db.interns.find((i) => i.id === internRecordId)
            : undefined;

          if (actorRole === "intern") {
            const myIntern = db.interns.find(
              (i) =>
                (authUser?.internRecordId && i.id === authUser.internRecordId) ||
                i.email.toLowerCase() === actorEmail.toLowerCase(),
            );
            if (!myIntern) {
              return { status: 404, body: { error: "Intern not found." } };
            }
            if (internRecordId && internRecordId !== myIntern.id) {
              return {
                status: 403,
                body: { error: "You may only request leave for yourself." },
              };
            }
            intern = myIntern;
          }

          if (!intern) {
            return { status: 404, body: { error: "Intern not found." } };
          }

          const leave = {
            id: `lv-${crypto.randomUUID()}`,
            internRecordId: intern.id,
            internId: intern.internId,
            internName: intern.fullName,
            startDate,
            endDate,
            reason,
            status: "Pending" as LeaveStatus,
            createdAt: new Date().toISOString(),
          };
          db.leaves.unshift(leave);

          addPortalNotification(db, {
            recipientRole: "admin",
            title: `Leave Request: ${intern.fullName}`,
            message: `${intern.fullName} requested leave from ${startDate} to ${endDate}.`,
            category: "attendance",
          });

          return { body: { success: true, leave } };
        });

        return jsonOutcome(outcome);
      }

      case "review_leave": {
        const permErr = requirePerm("review_leaves");
        if (permErr) return permErr;

        const leaveId = reqString(body.leaveId, "Leave ID", { max: 100 });
        const status = reqEnum(body.status, "Leave status", LEAVE_STATUSES);

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const leave = db.leaves.find((l) => l.id === leaveId);
          if (!leave) {
            return {
              status: 404,
              body: { error: "Leave request not found." },
            };
          }
          leave.status = status;
          leave.reviewedBy = actorName;
          leave.reviewedAt = new Date().toISOString();

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientInternRecordId: leave.internRecordId,
            title: `Leave Request ${status}`,
            message: `Your leave request (${leave.startDate} to ${leave.endDate}) was ${status}.`,
            category: "attendance",
          });

          return { body: { success: true, leave } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.7 EVALUATION AND FEEDBACK
      // ==========================================================
      case "submit_evaluation": {
        const permErr = requirePerm("submit_evaluation");
        if (permErr) return permErr;

        const internRecordId = reqString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );
        const technicalSkills = reqInt(
          body.technicalSkills ?? 0,
          "Technical skills",
          { min: 0, max: 25 },
        );
        const punctuality = reqInt(body.punctuality ?? 0, "Punctuality", {
          min: 0,
          max: 25,
        });
        const communication = reqInt(
          body.communication ?? 0,
          "Communication",
          { min: 0, max: 25 },
        );
        const teamwork = reqInt(body.teamwork ?? 0, "Teamwork", {
          min: 0,
          max: 25,
        });
        const remarks = optString(body.remarks, "Remarks", { max: 2000 });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const intern = db.interns.find((i) => i.id === internRecordId);
          if (!intern) {
            return { status: 404, body: { error: "Intern not found." } };
          }

          if (
            actorRole === "mentor" &&
            (!authUser?.mentorId || intern.mentorId !== authUser.mentorId) &&
            intern.mentorName !== authUser?.name
          ) {
            return {
              status: 403,
              body: {
                error: "You may only evaluate interns assigned to you.",
              },
            };
          }

          const totalMarks =
            technicalSkills + punctuality + communication + teamwork;
          const grade = calculateGrade(totalMarks);

          let evalRecord = db.evaluations.find(
            (e) => e.internRecordId === intern.id,
          );

          if (evalRecord) {
            evalRecord.technicalSkills = technicalSkills;
            evalRecord.punctuality = punctuality;
            evalRecord.communication = communication;
            evalRecord.teamwork = teamwork;
            evalRecord.totalMarks = totalMarks;
            evalRecord.grade = grade;
            evalRecord.remarks = remarks;
            evalRecord.mentorName = actorName || intern.mentorName;
            evalRecord.completed = true;
            evalRecord.evaluatedAt = new Date().toISOString();
          } else {
            evalRecord = {
              id: `evl-${crypto.randomUUID()}`,
              internRecordId: intern.id,
              internId: intern.internId,
              internName: intern.fullName,
              fieldName: intern.fieldName,
              mentorId: intern.mentorId,
              mentorName: actorName || intern.mentorName,
              technicalSkills,
              punctuality,
              communication,
              teamwork,
              totalMarks,
              grade,
              remarks,
              completed: true,
              evaluatedAt: new Date().toISOString(),
            };
            db.evaluations.unshift(evalRecord);
          }

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: intern.email,
            recipientInternRecordId: intern.id,
            title: `Performance Evaluation Completed — Grade ${grade}`,
            message: `Your mentor ${evalRecord.mentorName} submitted your final evaluation (${totalMarks}/100 · Grade ${grade}).`,
            category: "evaluation",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "SUBMITTED_EVALUATION",
            entityType: "Evaluation",
            entityId: evalRecord.id,
            details: `Evaluated ${intern.fullName} (${intern.internId}): ${totalMarks}/100 (Grade ${grade}).`,
          });

          return { body: { success: true, evaluation: evalRecord } };
        });

        return jsonOutcome(outcome);
      }

      case "submit_intern_feedback": {
        const permErr = requirePerm("submit_feedback");
        if (permErr) return permErr;

        const internRecordId = optString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );
        const rating = reqInt(body.rating ?? 5, "Rating", { min: 1, max: 5 });
        const comments = optString(body.comments, "Feedback comments", {
          max: 2000,
        });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          let intern = internRecordId
            ? db.interns.find((i) => i.id === internRecordId)
            : undefined;

          if (actorRole === "intern") {
            const myIntern = db.interns.find(
              (i) =>
                (authUser?.internRecordId && i.id === authUser.internRecordId) ||
                i.email.toLowerCase() === actorEmail.toLowerCase(),
            );
            if (!myIntern) {
              return { status: 404, body: { error: "Intern not found." } };
            }
            if (internRecordId && internRecordId !== myIntern.id) {
              return {
                status: 403,
                body: { error: "You may only submit feedback for yourself." },
              };
            }
            intern = myIntern;
          }

          if (!intern) {
            return { status: 404, body: { error: "Intern not found." } };
          }

          let evalRecord = db.evaluations.find(
            (e) => e.internRecordId === intern.id,
          );
          if (!evalRecord) {
            evalRecord = {
              id: `evl-${crypto.randomUUID()}`,
              internRecordId: intern.id,
              internId: intern.internId,
              internName: intern.fullName,
              fieldName: intern.fieldName,
              mentorId: intern.mentorId,
              mentorName: intern.mentorName,
              technicalSkills: 0,
              punctuality: 0,
              communication: 0,
              teamwork: 0,
              totalMarks: 0,
              grade: "B",
              remarks: "Pending mentor evaluation.",
              completed: false,
              evaluatedAt: new Date().toISOString(),
            };
            db.evaluations.push(evalRecord);
          }

          evalRecord.internFeedbackRating = rating;
          evalRecord.internFeedbackComments = comments;
          evalRecord.internFeedbackSubmittedAt = new Date().toISOString();

          return { body: { success: true, evaluation: evalRecord } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.8 CERTIFICATE MANAGEMENT
      // ==========================================================
      case "issue_certificate": {
        const permErr = requirePerm("issue_certificates");
        if (permErr) return permErr;

        const internRecordId = reqString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );

        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const intern = db.interns.find((i) => i.id === internRecordId);
          if (!intern) {
            return {
              status: 404,
              body: { error: "Intern record not found." },
            };
          }

          if (intern.internshipStatus !== "Completed") {
            return {
              status: 400,
              body: {
                error: `Cannot issue certificate: Intern status must be "Completed" (currently "${intern.internshipStatus}").`,
              },
            };
          }

          const evaluation = db.evaluations.find(
            (e) => e.internRecordId === intern.id && e.completed,
          );
          if (!evaluation) {
            return {
              status: 400,
              body: {
                error:
                  "Cannot issue certificate: Mentor Performance Evaluation must be completed before a certificate can be issued.",
              },
            };
          }

          const existingCert = db.certificates.find(
            (c) => c.internRecordId === intern.id,
          );
          const issueDate = new Date().toISOString().split("T")[0];

          if (existingCert) {
            existingCert.status = "Re-issued";
            existingCert.issueDate = issueDate;
            existingCert.grade = evaluation.grade;
            existingCert.totalMarks = evaluation.totalMarks;
            existingCert.revokedReason = undefined;
            existingCert.history.unshift({
              action: "Re-issued",
              timestamp: new Date().toISOString(),
              actor: `${actorName} (${actorRole})`,
              note: "Certificate re-issued with updated evaluation verification.",
            });

            appendAuditLog(db, {
              actorName,
              actorEmail,
              actorRole,
              action: "REISSUED_CERTIFICATE",
              entityType: "Certificate",
              entityId: existingCert.certificateNumber,
              details: `Re-issued certificate ${existingCert.certificateNumber} for ${intern.fullName}.`,
            });

            return { body: { success: true, certificate: existingCert } };
          }

          const certificateNumber = generateCertificateNumber(db);
          const newCert = {
            id: `crt-${crypto.randomUUID()}`,
            certificateNumber,
            internRecordId: intern.id,
            internId: intern.internId,
            internName: intern.fullName,
            fatherName: intern.fatherName,
            fieldName: intern.fieldName,
            durationMonths: intern.durationMonths,
            batchName: intern.batchName,
            startDate: intern.startDate,
            endDate: intern.endDate,
            issueDate,
            grade: evaluation.grade,
            totalMarks: evaluation.totalMarks,
            mentorName: intern.mentorName,
            signatoryName: actorName || "Director of Engineering & Talent",
            signatoryTitle:
              "Director of Engineering & Talent, Logix Technologies",
            status: "Valid" as const,
            history: [
              {
                action: "Issued" as const,
                timestamp: new Date().toISOString(),
                actor: `${actorName} (${actorRole})`,
                note: `Issued upon internship completion with Grade ${evaluation.grade} (${evaluation.totalMarks}/100).`,
              },
            ],
          };

          db.certificates.unshift(newCert);

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: intern.email,
            recipientInternRecordId: intern.id,
            title: `Certificate Issued: ${certificateNumber}`,
            message: `Congratulations ${intern.fullName}! Your official QR-verified internship certificate (${certificateNumber}) has been issued.`,
            category: "certificate",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "ISSUED_CERTIFICATE",
            entityType: "Certificate",
            entityId: certificateNumber,
            details: `Issued certificate ${certificateNumber} to ${intern.fullName} (${intern.internId}).`,
          });

          ctx.outbox.push({
            to: intern.email,
            subject: `[Logix Portal] Your Internship Certificate (${certificateNumber}) is Ready!`,
            heading: "Official Certificate of Completion Issued",
            subHeading: `Certificate No: ${certificateNumber}`,
            bodyText: `Congratulations ${intern.fullName}! Your Logix Internship Certificate (${certificateNumber}) has been issued. Sign in to download your PDF or verify at /verify?cert=${certificateNumber}`,
            bodyHtml: `<p>Congratulations <strong>${escapeHtml(intern.fullName)}</strong>!</p><p>Your official <strong>Logix Internship Certificate of Completion</strong> has been issued:</p><ul><li><strong>Certificate Number:</strong> ${escapeHtml(certificateNumber)}</li><li><strong>Field:</strong> ${escapeHtml(intern.fieldName)} (${intern.durationMonths} Months)</li><li><strong>Final Grade:</strong> ${escapeHtml(evaluation.grade)} (${evaluation.totalMarks}/100)</li></ul><p>Log in to your Intern Dashboard to download the high-resolution PDF with QR code verification.</p>`,
          });

          return { body: { success: true, certificate: newCert } };
        });

        return jsonOutcome(outcome);
      }

      case "revoke_certificate": {
        const permErr = requirePerm("revoke_certificates");
        if (permErr) return permErr;

        const certificateId = reqString(body.certificateId, "Certificate ID", {
          max: 100,
        });
        const reason =
          optString(body.reason, "Revocation reason", { max: 500 }) ||
          "Revoked by administrative action.";

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const cert = db.certificates.find(
            (c) =>
              c.id === certificateId || c.certificateNumber === certificateId,
          );
          if (!cert) {
            return { status: 404, body: { error: "Certificate not found." } };
          }

          cert.status = "Revoked";
          cert.revokedReason = reason;
          cert.history.unshift({
            action: "Revoked",
            timestamp: new Date().toISOString(),
            actor: `${actorName} (${actorRole})`,
            note: reason,
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "REVOKED_CERTIFICATE",
            entityType: "Certificate",
            entityId: cert.certificateNumber,
            details: `Revoked certificate ${cert.certificateNumber} (${cert.internName}). Reason: ${reason}`,
          });

          return { body: { success: true, certificate: cert } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 3.10 & 3.12 NOTIFICATIONS & ANNOUNCEMENTS
      // ==========================================================
      case "mark_notifications_read": {
        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const myIntern =
            actorRole === "intern"
              ? db.interns.find(
                  (i) =>
                    (authUser?.internRecordId &&
                      i.id === authUser.internRecordId) ||
                    i.email.toLowerCase() === actorEmail.toLowerCase(),
                )
              : undefined;

          for (const n of db.notifications) {
            if (actorRole === "admin") {
              n.read = true;
            } else if (actorRole === "mentor") {
              if (n.recipientRole === "mentor" || n.recipientRole === "all") {
                n.read = true;
              }
            } else {
              const isMine =
                (myIntern && n.recipientInternRecordId === myIntern.id) ||
                (!n.recipientInternRecordId &&
                  (n.recipientRole === "intern" ||
                    n.recipientRole === "all"));
              if (isMine) n.read = true;
            }
          }

          return { body: { success: true } };
        });

        return jsonOutcome(outcome);
      }

      case "post_announcement": {
        const permErr = requirePerm("post_announcements");
        if (permErr) return permErr;

        const title = reqString(body.title, "Announcement title", {
          max: 200,
        });
        const content = reqString(body.content, "Announcement content", {
          max: 4000,
        });
        const targetAudience =
          optString(body.targetAudience, "Target audience", { max: 120 }) ||
          "All Interns";
        const priority = body.priority
          ? reqEnum(body.priority, "Priority", ANNOUNCEMENT_PRIORITIES)
          : "Normal";

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const ann = {
            id: `ann-${crypto.randomUUID()}`,
            title,
            content,
            targetAudience,
            priority,
            authorName: actorName,
            authorRole: actorRole,
            createdAt: new Date().toISOString(),
          };

          db.announcements.unshift(ann);

          addPortalNotification(db, {
            recipientRole: "all",
            title: `Announcement: ${title}`,
            message: `${content.slice(0, 120)}${content.length > 120 ? "..." : ""}`,
            category: "announcement",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "POSTED_ANNOUNCEMENT",
            entityType: "Announcement",
            entityId: ann.id,
            details: `Posted announcement '${title}' to ${targetAudience}.`,
          });

          return { body: { success: true, announcement: ann } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 4. DATABASE BACKUP
      // ==========================================================
      case "create_backup": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const label = optString(body.label, "Backup label", { max: 120 });
        const outcome = await mutatePortal<ActionOutcome>(async (db, ctx) => {
          const snapshot = await createPortalBackup(
            ctx.tx,
            db,
            label,
            actorName,
          );
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CREATED_DB_BACKUP",
            entityType: "Backup",
            entityId: snapshot.id,
            details: `Created database backup '${snapshot.label}' (${snapshot.sizeBytes} bytes).`,
          });
          return { body: { success: true, backup: snapshot } };
        });

        return jsonOutcome(outcome);
      }

      // ==========================================================
      // 5. WEBSITE APPLICATIONS (ADMIN ONLY)
      // ==========================================================
      case "update_website_application": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const applicationId = reqUuid(body.applicationId, "Application ID");
        const status =
          body.status !== undefined
            ? reqEnum(body.status, "Status", WEBSITE_APPLICATION_STATUSES)
            : undefined;
        const hasAdminNotes = body.adminNotes !== undefined;
        const adminNotes =
          hasAdminNotes && body.adminNotes !== null
            ? optString(body.adminNotes, "Admin notes", { max: 4000 })
            : hasAdminNotes
              ? null
              : undefined;

        const ormDb = getDb();
        const [existing] = await ormDb
          .select()
          .from(internshipApplications)
          .where(eq(internshipApplications.id, applicationId))
          .limit(1);

        if (!existing) {
          return NextResponse.json(
            { error: "Website application not found." },
            { status: 404, headers: PRIVATE_HEADERS },
          );
        }

        const now = new Date();
        const updates: Partial<typeof internshipApplications.$inferInsert> = {
          reviewedAt: now,
          reviewedBy: actorEmail,
          updatedAt: now,
        };
        if (status !== undefined) {
          updates.status = status;
          if (status === "contacted" && existing.contactedAt == null) {
            updates.contactedAt = now;
          }
        }
        if (adminNotes !== undefined) {
          updates.adminNotes = adminNotes;
        }

        const [updated] = await ormDb
          .update(internshipApplications)
          .set(updates)
          .where(eq(internshipApplications.id, applicationId))
          .returning();

        await mutatePortal(async (db) => {
          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "UPDATED_WEBSITE_APPLICATION",
            entityType: "Application",
            entityId: applicationId,
            details: `Updated website application for ${existing.fullName}${status ? ` (status: ${status})` : ""}.`,
          });
        });

        return NextResponse.json(
          {
            success: true,
            application: toWebsiteApplication(updated),
          },
          { headers: PRIVATE_HEADERS },
        );
      }

      case "convert_website_application": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const applicationId = reqUuid(body.applicationId, "Application ID");
        const fieldId = reqString(body.fieldId, "Field ID", { max: 100 });
        const durationMonths = reqInt(body.durationMonths, "Duration months", {
          min: 1,
          max: 24,
        });
        const startDate = reqDate(body.startDate, "Start date");
        const batchId = optString(body.batchId, "Batch ID", { max: 100 });
        const mentorId = optString(body.mentorId, "Mentor ID", { max: 100 });
        const createLogin = Boolean(body.createLogin);

        const ormDb = getDb();
        const [app] = await ormDb
          .select()
          .from(internshipApplications)
          .where(eq(internshipApplications.id, applicationId))
          .limit(1);

        if (!app) {
          return NextResponse.json(
            { error: "Website application not found." },
            { status: 404, headers: PRIVATE_HEADERS },
          );
        }

        if (app.internRecordId) {
          return NextResponse.json(
            {
              error:
                "This website application has already been linked to an intern record.",
            },
            { status: 409, headers: PRIVATE_HEADERS },
          );
        }

        const portalOutcome = await mutatePortal<
          | { ok: false; status: number; error: string }
          | {
              ok: true;
              intern: InternRecord;
              temporaryPassword?: string;
              loginEmail?: string;
            }
        >(async (db, ctx) => {
          if (
            db.interns.some((i) => i.websiteApplicationId === app.id)
          ) {
            return {
              ok: false,
              status: 409,
              error:
                "This website application has already been converted to an intern record.",
            };
          }

          const fieldObj = db.fields.find((f) => f.id === fieldId);
          if (!fieldObj) {
            return {
              ok: false,
              status: 400,
              error: "Selected department/field was not found.",
            };
          }

          const batchObj = batchId
            ? db.batches.find((b) => b.id === batchId)
            : db.batches.find((b) => b.status === "Active") || db.batches[0];
          if (batchId && !batchObj) {
            return {
              ok: false,
              status: 400,
              error: "Selected batch was not found.",
            };
          }

          const mentorObj = mentorId
            ? db.mentors.find((m) => m.id === mentorId)
            : undefined;
          if (mentorId && !mentorObj) {
            return {
              ok: false,
              status: 400,
              error: "Selected mentor was not found.",
            };
          }

          const internId = generateNextInternId(db);
          const recordId = `int-${crypto.randomUUID()}`;
          const nowIso = new Date().toISOString();
          const emailLower = app.email.trim().toLowerCase();
          const safeFullName = sanitizeText(app.fullName);

          const newIntern: typeof db.interns[number] = {
            id: recordId,
            internId,
            fullName: safeFullName,
            fatherName: "",
            cnicOrStudentId: "",
            email: emailLower,
            phone: app.phone ? sanitizeText(app.phone) : "",
            city: "",
            university: "",
            degree: "",
            semester: "",
            cgpa: "",
            fieldId: fieldObj.id,
            fieldName: fieldObj.name,
            durationMonths,
            startPreference: startDate,
            startDate,
            endDate: calculateEndDate(startDate, durationMonths),
            batchId: batchObj?.id ?? "",
            batchName: batchObj?.name ?? "Unassigned",
            mentorId: mentorObj?.id ?? "",
            mentorName: mentorObj?.name ?? "Unassigned",
            cvFileName: app.resumeFileName ?? "",
            cvFileSize: app.resumeSizeBytes ?? 0,
            skills: [],
            applicationStatus: "Approved",
            internshipStatus: "Active",
            websiteApplicationId: app.id,
            archived: false,
            progressPercentage: 0,
            attendancePercentage: 0,
            appliedAt: app.createdAt.toISOString(),
            updatedAt: nowIso,
          };

          let temporaryPassword: string | undefined;
          let loginEmail: string | undefined;

          if (createLogin) {
            const existingUser = db.users.find(
              (u) => u.email.toLowerCase() === emailLower,
            );
            if (!existingUser) {
              temporaryPassword = generateTempPassword();
              loginEmail = emailLower;
              const newUser: UserAccount = {
                id: `usr-${crypto.randomUUID()}`,
                email: emailLower,
                passwordHash: await hashPassword(temporaryPassword),
                role: "intern",
                name: safeFullName,
                emailVerified: true,
                mustChangePassword: true,
                tokenVersion: 0,
                internRecordId: newIntern.id,
                createdAt: nowIso,
              };
              db.users.push(newUser);
              newIntern.userId = newUser.id;
            } else {
              if (!existingUser.internRecordId) {
                existingUser.internRecordId = newIntern.id;
              }
              newIntern.userId = existingUser.id;
            }
          }

          db.interns.unshift(newIntern);

          // Mark the website application as hired in the same transaction,
          // only if nobody linked it concurrently.
          const linked = await ctx.tx`
            UPDATE internship_applications
            SET status = 'hired',
                intern_record_id = ${newIntern.id},
                reviewed_at = now(),
                reviewed_by = ${actorEmail},
                updated_at = now()
            WHERE id = ${app.id} AND intern_record_id IS NULL
            RETURNING id
          `;
          if (linked.length === 0) {
            throw new ConflictError(
              "This website application has already been linked to an intern record.",
            );
          }

          addPortalNotification(db, {
            recipientRole: "intern",
            recipientEmail: emailLower,
            recipientInternRecordId: newIntern.id,
            title: `Welcome to Logix Internship (${internId})`,
            message: `Your application has been approved for ${fieldObj.name} (${durationMonths} months).`,
            category: "application",
          });

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CONVERTED_WEBSITE_APPLICATION",
            entityType: "Application",
            entityId: newIntern.internId,
            details: `Converted website application ${app.id} (${safeFullName}) to intern ${internId} in ${fieldObj.name}.`,
          });

          ctx.outbox.push({
            to: emailLower,
            subject: `[Logix Portal] Welcome to the ${fieldObj.name} Internship — ${internId}`,
            heading: "Welcome to Logix Technologies",
            subHeading: `Intern ID: ${internId}`,
            bodyText: `Dear ${safeFullName}, congratulations! Your internship application has been accepted for ${fieldObj.name} (${durationMonths} months, starting ${startDate}).`,
            bodyHtml: `<p>Dear <strong>${escapeHtml(safeFullName)}</strong>,</p><p>Congratulations! Your application for the <strong>${escapeHtml(fieldObj.name)}</strong> internship at Logix has been approved.</p><ul><li><strong>Intern ID:</strong> ${escapeHtml(internId)}</li><li><strong>Start Date:</strong> ${escapeHtml(startDate)}</li><li><strong>End Date:</strong> ${escapeHtml(newIntern.endDate)}</li></ul>${temporaryPassword ? `<p>A portal account has been created for you with email <strong>${escapeHtml(emailLower)}</strong>. Your administrator will share your temporary password separately.</p>` : ""}`,
          });

          return {
            ok: true,
            intern: newIntern,
            temporaryPassword,
            loginEmail,
          };
        });

        if (!portalOutcome.ok) {
          return NextResponse.json(
            { error: portalOutcome.error },
            { status: portalOutcome.status, headers: PRIVATE_HEADERS },
          );
        }

        return NextResponse.json(
          {
            success: true,
            intern: portalOutcome.intern,
            ...(portalOutcome.temporaryPassword
              ? {
                  temporaryPassword: portalOutcome.temporaryPassword,
                  loginEmail: portalOutcome.loginEmail,
                }
              : {}),
          },
          { headers: PRIVATE_HEADERS },
        );
      }

      // ==========================================================
      // 6. STAFF & ACCOUNT MANAGEMENT (ADMIN ONLY)
      // ==========================================================
      case "create_staff_account": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const name = reqString(body.name, "Name", { max: 120 });
        const email = reqEmail(body.email);
        const role = reqEnum(body.role, "Role", STAFF_ROLES);
        const title = optString(body.title, "Title", { max: 120 });
        const department = optString(body.department, "Department", {
          max: 120,
        });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const existing = db.users.find(
            (u) => u.email.toLowerCase() === email,
          );
          if (existing) {
            return {
              status: 409,
              body: { error: "An account with this email already exists." },
            };
          }

          const temporaryPassword = generateTempPassword();
          const nowIso = new Date().toISOString();
          const userId = `usr-${crypto.randomUUID()}`;
          let mentorId: string | undefined;

          if (role === "mentor") {
            mentorId = `mnt-${crypto.randomUUID().slice(0, 8)}`;
            db.mentors.push({
              id: mentorId,
              userId,
              name,
              email,
              title: title || "Engineering Mentor",
              department: department || "Engineering",
              avatarInitials: makeAvatarInitials(name),
              bio: "",
            });
          }

          const newUser: UserAccount = {
            id: userId,
            email,
            passwordHash: await hashPassword(temporaryPassword),
            role,
            name,
            emailVerified: true,
            mustChangePassword: true,
            tokenVersion: 0,
            mentorId,
            createdAt: nowIso,
          };

          db.users.push(newUser);

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CREATED_STAFF_ACCOUNT",
            entityType: "Auth",
            entityId: newUser.id,
            details: `Created ${role} account for ${name} (${email}).`,
          });

          return {
            body: {
              success: true,
              user: toPublicUser(newUser),
              temporaryPassword,
              loginEmail: email,
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "create_intern_login": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const internRecordId = reqString(
          body.internRecordId,
          "Intern record ID",
          { max: 100 },
        );

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const intern = db.interns.find((i) => i.id === internRecordId);
          if (!intern) {
            return {
              status: 404,
              body: { error: "Intern record not found." },
            };
          }

          const email = intern.email.trim().toLowerCase();
          if (!email || !email.includes("@")) {
            return {
              status: 400,
              body: { error: "Intern record does not have a valid email." },
            };
          }

          const existing = db.users.find(
            (u) =>
              u.internRecordId === intern.id ||
              u.email.toLowerCase() === email,
          );
          if (existing) {
            return {
              status: 409,
              body: {
                error: "A login account already exists for this intern.",
              },
            };
          }

          const temporaryPassword = generateTempPassword();
          const newUser: UserAccount = {
            id: `usr-${crypto.randomUUID()}`,
            email,
            passwordHash: await hashPassword(temporaryPassword),
            role: "intern",
            name: intern.fullName,
            emailVerified: true,
            mustChangePassword: true,
            tokenVersion: 0,
            internRecordId: intern.id,
            createdAt: new Date().toISOString(),
          };

          db.users.push(newUser);
          intern.userId = newUser.id;

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "CREATED_INTERN_LOGIN",
            entityType: "Auth",
            entityId: newUser.id,
            details: `Provisioned portal login for intern ${intern.fullName} (${intern.internId}).`,
          });

          return {
            body: {
              success: true,
              user: toPublicUser(newUser),
              temporaryPassword,
              loginEmail: email,
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "set_account_disabled": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const userId = reqString(body.userId, "User ID", { max: 100 });
        if (typeof body.disabled !== "boolean") {
          return NextResponse.json(
            { error: "disabled must be a boolean." },
            { status: 400, headers: PRIVATE_HEADERS },
          );
        }
        const disabled = body.disabled;

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const target = db.users.find((u) => u.id === userId);
          if (!target) {
            return { status: 404, body: { error: "User not found." } };
          }

          if (target.id === authUser!.id && disabled) {
            return {
              status: 400,
              body: { error: "You cannot disable your own account." },
            };
          }

          if (target.role === "admin" && disabled) {
            const otherActiveAdmins = db.users.filter(
              (u) =>
                u.role === "admin" && !u.disabled && u.id !== target.id,
            );
            if (otherActiveAdmins.length === 0) {
              return {
                status: 400,
                body: { error: "Cannot disable the last active administrator." },
              };
            }
          }

          target.disabled = disabled;
          target.tokenVersion = (target.tokenVersion ?? 0) + 1;

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: disabled ? "ACCOUNT_DISABLED" : "ACCOUNT_ENABLED",
            entityType: "Auth",
            entityId: target.id,
            details: `${disabled ? "Disabled" : "Enabled"} account for ${target.email}.`,
          });

          return {
            body: {
              success: true,
              user: toPublicUser(target),
            },
          };
        });

        return jsonOutcome(outcome);
      }

      case "reset_account_password": {
        const adminErr = requireAdmin();
        if (adminErr) return adminErr;

        const userId = reqString(body.userId, "User ID", { max: 100 });

        const outcome = await mutatePortal<ActionOutcome>(async (db) => {
          const target = db.users.find((u) => u.id === userId);
          if (!target) {
            return { status: 404, body: { error: "User not found." } };
          }

          const temporaryPassword = generateTempPassword();
          target.passwordHash = await hashPassword(temporaryPassword);
          target.mustChangePassword = true;
          target.tokenVersion = (target.tokenVersion ?? 0) + 1;
          target.resetCodeHash = undefined;
          target.resetExpiresAt = undefined;

          appendAuditLog(db, {
            actorName,
            actorEmail,
            actorRole,
            action: "ADMIN_RESET_PASSWORD",
            entityType: "Auth",
            entityId: target.id,
            details: `Administrator reset password for ${target.email}.`,
          });

          return {
            body: {
              success: true,
              temporaryPassword,
              loginEmail: target.email,
            },
          };
        });

        return jsonOutcome(outcome);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400, headers: PRIVATE_HEADERS },
        );
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: err.message },
        { status: 409, headers: PRIVATE_HEADERS },
      );
    }
    console.error("[API POST /api/portal ERROR]", err);
    return NextResponse.json(
      { error: "An internal error occurred while processing the request." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
