import { NextRequest, NextResponse } from "next/server";
import {
  readDb,
  writeDb,
  hashPassword,
  verifyPassword,
  sanitizeText,
  calculateEndDate,
  calculateGrade,
  appendAuditLog,
  createDatabaseBackup,
  generateNextInternId,
  generateCertificateNumber,
  addPortalNotification,
} from "@/lib/db";
import { sendPortalEmail } from "@/lib/mailer";
import type {
  ApplicationStatus,
  InternshipStatus,
  TaskStatus,
  AttendanceStatus,
  LeaveStatus,
  UserRole,
} from "@/lib/types";
import {
  hasPermission,
  resolveAuthenticatedUser,
  createPortalToken,
} from "@/lib/auth";
import { supabaseDb } from "@/lib/supabase-db";

export async function GET(request: NextRequest) {
  try {
    const db = readDb();
    const { searchParams } = new URL(request.url);
    const verifyCode = searchParams.get("verify")?.trim();

    // Public Certificate Verification (Req 3.8)
    if (verifyCode) {
      const cert = db.certificates.find(
        (c) =>
          c.certificateNumber.toLowerCase() === verifyCode.toLowerCase() ||
          c.internId.toLowerCase() === verifyCode.toLowerCase(),
      );
      if (!cert) {
        return NextResponse.json(
          { verified: false, error: "No certificate found matching that number or Intern ID." },
          { status: 404 },
        );
      }
      const intern = db.interns.find((i) => i.id === cert.internRecordId);
      const evaluation = db.evaluations.find(
        (e) => e.internRecordId === cert.internRecordId,
      );
      return NextResponse.json({
        verified: cert.status !== "Revoked",
        certificate: cert,
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

    // Resolve Authenticated User via Better-Auth / Session Token
    const authUser = await resolveAuthenticatedUser(request);
    if (!authUser) {
      if (searchParams.get("meta") === "public") {
        return NextResponse.json({
          authenticated: false,
          fields: db.fields.filter((f) => f.active),
          durations: db.durations.filter((d) => d.active),
          batches: db.batches,
        });
      }
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 },
      );
    }

    // Strip password hashes before sending
    const safeUsers = db.users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
      emailVerified: u.emailVerified,
      internRecordId: u.internRecordId,
      mentorId: u.mentorId,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    // Admin sees complete portal state (Req 3.9 Admin Dashboard)
    if (authUser.role === "admin") {
      return NextResponse.json({
        authenticated: true,
        currentUser: authUser,
        ...db,
        users: safeUsers,
      });
    }

    // Mentor sees assigned interns, tasks, and evaluations (Req 3.9 Mentor Dashboard)
    if (authUser.role === "mentor") {
      const assignedInterns = db.interns.filter(
        (i) => i.mentorId === authUser.mentorId || i.mentorName === authUser.name,
      );
      const assignedInternIds = new Set(assignedInterns.map((i) => i.id));
      return NextResponse.json({
        authenticated: true,
        currentUser: authUser,
        fields: db.fields,
        durations: db.durations,
        batches: db.batches,
        mentors: db.mentors,
        interns: assignedInterns,
        tasks: db.tasks.filter(
          (t) => assignedInternIds.has(t.internId) || t.assignedByName === authUser.name,
        ),
        evaluations: db.evaluations.filter(
          (e) => assignedInternIds.has(e.internRecordId) || e.mentorName === authUser.name,
        ),
        attendance: db.attendance.filter((a) => assignedInternIds.has(a.internId)),
        leaves: db.leaves.filter((l) => assignedInternIds.has(l.internId)),
        certificates: db.certificates.filter((c) => assignedInternIds.has(c.internRecordId)),
        announcements: db.announcements,
        notifications: db.notifications.filter(
          (n) => n.recipientRole === "mentor" || n.recipientRole === "all",
        ),
        auditLogs: db.auditLogs.filter((a) => a.actorEmail === authUser.email),
        users: safeUsers.filter((u) => u.role === "mentor" || u.role === "admin"),
      });
    }

    // Intern (Student) sees strictly their own profile, tasks, attendance, and certificates (Req 3.9 Intern Dashboard, SEC-03)
    const myIntern = db.interns.find(
      (i) =>
        i.id === authUser.internRecordId ||
        i.email.toLowerCase() === authUser.email.toLowerCase(),
    );
    const myInternId = myIntern?.id;
    return NextResponse.json({
      authenticated: true,
      currentUser: authUser,
      fields: db.fields.filter((f) => f.active),
      durations: db.durations.filter((d) => d.active),
      batches: db.batches,
      mentors: db.mentors,
      interns: myIntern ? [myIntern] : [],
      tasks: myInternId ? db.tasks.filter((t) => t.internId === myInternId) : [],
      evaluations: myInternId
        ? db.evaluations.filter((e) => e.internRecordId === myInternId)
        : [],
      attendance: myInternId
        ? db.attendance.filter((a) => a.internId === myInternId)
        : [],
      leaves: myInternId
        ? db.leaves.filter((l) => l.internId === myInternId)
        : [],
      certificates: myInternId
        ? db.certificates.filter((c) => c.internRecordId === myInternId)
        : [],
      announcements: db.announcements.filter(
        (a) => !a.targetAudience || a.targetAudience === "All Interns" || a.targetAudience === "All",
      ),
      notifications: db.notifications.filter(
        (n) =>
          (myInternId && n.recipientInternRecordId === myInternId) ||
          n.recipientRole === "intern" ||
          n.recipientRole === "all",
      ),
      auditLogs: [],
      users: [],
    });
  } catch (err) {
    console.error("[API GET /api/portal ERROR]", err);
    return NextResponse.json(
      { error: "Failed to load portal data." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;
    const db = readDb();

    // 1. Resolve Session and Verified Identity (SEC-01: Prevent role spoofing)
    const PUBLIC_ACTIONS = new Set([
      "login",
      "logout",
      "register_intern",
      "verify_email",
      "request_password_reset",
      "reset_password",
      "submit_application",
    ]);

    const authUser = await resolveAuthenticatedUser(request);

    // If protected action, require authentication
    if (!PUBLIC_ACTIONS.has(action)) {
      if (!authUser) {
        return NextResponse.json(
          { error: "Authentication required (401 Unauthorized). Please sign in." },
          { status: 401 },
        );
      }
    }

    const actorRole: UserRole = authUser ? authUser.role : "intern";
    const actorEmail: string = authUser ? authUser.email : "";
    const actorName: string = authUser ? authUser.name : "System User";

    // Server-Side RBAC Enforcement Helper
    const requirePerm = (permission: string) => {
      if (!hasPermission(actorRole, permission)) {
        return NextResponse.json(
          {
            error: `Access Denied (403 Forbidden): Role '${actorRole}' is not authorized to perform action requiring '${permission}' permission.`,
          },
          { status: 403 },
        );
      }
      return null;
    };


    switch (action) {
      // ==========================================================
      // 3.1 AUTHENTICATION & ACCESS
      // ==========================================================
      case "login": {
        const email = sanitizeText(body.email).toLowerCase();
        const password = String(body.password || "");
        const expectedRole = body.expectedRole as UserRole | undefined;

        const user = db.users.find((u) => u.email.toLowerCase() === email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return NextResponse.json(
            { error: "Invalid email or password. Please check your credentials." },
            { status: 401 },
          );
        }

        if (expectedRole && user.role !== expectedRole) {
          return NextResponse.json(
            {
              error: `Access denied: This login portal is restricted to ${expectedRole.toUpperCase()} accounts.`,
            },
            { status: 403 },
          );
        }

        if (!user.emailVerified) {
          return NextResponse.json(
            {
              error: "Please verify your email address before logging in.",
              requiresVerification: true,
              email: user.email,
              demoCode: user.verificationCode,
            },
            { status: 403 },
          );
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
        supabaseDb.logAudit(
          user.name,
          "USER_LOGIN",
          "Auth",
          user.id,
          `${user.name} (${user.role}) signed in.`,
        );
        writeDb(db);

        const token = createPortalToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          internRecordId: user.internRecordId,
          mentorId: user.mentorId,
        });

        const response = NextResponse.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            emailVerified: user.emailVerified,
            internRecordId: user.internRecordId,
            mentorId: user.mentorId,
          },
        });

        response.cookies.set("portal_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 3600,
        });

        return response;
      }

      case "logout": {
        const response = NextResponse.json({
          success: true,
          message: "Signed out successfully.",
        });
        response.cookies.delete("portal_token");
        return response;
      }

      case "register_intern": {
        const name = sanitizeText(body.name);
        const email = sanitizeText(body.email).toLowerCase();
        const password = String(body.password || "");

        if (!name || !email || password.length < 6) {
          return NextResponse.json(
            { error: "Name, valid email, and password (min 6 chars) are required." },
            { status: 400 },
          );
        }

        const existing = db.users.find((u) => u.email.toLowerCase() === email);
        if (existing) {
          return NextResponse.json(
            { error: "An account with this email already exists." },
            { status: 400 },
          );
        }

        const verificationCode = String(
          Math.floor(100000 + Math.random() * 900000),
        );
        const existingInternRecord = db.interns.find(
          (i) => i.email.toLowerCase() === email,
        );

        const newUser = {
          id: `usr-${Date.now()}`,
          email,
          passwordHash: hashPassword(password),
          role: "intern" as const,
          name,
          emailVerified: false,
          verificationCode,
          internRecordId: existingInternRecord?.id,
          createdAt: new Date().toISOString(),
        };

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
        writeDb(db);

        await sendPortalEmail({
          to: email,
          subject: "Verify your Logix Internship Portal Account",
          heading: "Email Verification Required",
          subHeading: "Complete your Intern Account Registration",
          bodyText: `Hello ${name}, your verification code is: ${verificationCode}`,
          bodyHtml: `<p>Hello <strong>${name}</strong>,</p><p>Thank you for registering on the Logix Internship Management Portal. Please enter the 6-digit verification code below to activate your account:</p><div style="margin:20px 0;padding:16px;background:#e6f9f5;border:1px solid #1fc8aa;border-radius:8px;text-align:center;font-size:24px;font-weight:700;letter-spacing:0.25em;color:#0b1f3a;">${verificationCode}</div>`,
        });

        return NextResponse.json({
          success: true,
          message: "Account created! Please enter the 6-digit verification code sent to your email.",
          email,
          demoVerificationCode: verificationCode,
        });
      }

      case "verify_email": {
        const email = sanitizeText(body.email).toLowerCase();
        const code = sanitizeText(body.code);
        const user = db.users.find((u) => u.email.toLowerCase() === email);

        if (!user) {
          return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }
        if (!user.verificationCode || user.verificationCode !== code) {
          return NextResponse.json(
            { error: "Invalid verification code." },
            { status: 400 },
          );
        }

        user.emailVerified = true;
        user.verificationCode = undefined;
        appendAuditLog(db, {
          actorName: user.name,
          actorEmail: user.email,
          actorRole: user.role,
          action: "EMAIL_VERIFIED",
          entityType: "Auth",
          entityId: user.id,
          details: `Verified email address for ${user.email}.`,
        });
        writeDb(db);

        const token = createPortalToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          internRecordId: user.internRecordId,
        });

        const response = NextResponse.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            emailVerified: true,
            internRecordId: user.internRecordId,
          },
        });

        response.cookies.set("portal_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 3600,
        });

        return response;
      }

      case "request_password_reset": {
        const email = sanitizeText(body.email).toLowerCase();
        const user = db.users.find((u) => u.email.toLowerCase() === email);
        if (!user) {
          return NextResponse.json(
            { error: "No account found with that email address." },
            { status: 404 },
          );
        }
        const resetCode = String(Math.floor(100000 + Math.random() * 900000));
        user.resetCode = resetCode;
        writeDb(db);

        await sendPortalEmail({
          to: email,
          subject: "Logix Portal Password Reset Code",
          heading: "Password Reset Request",
          bodyText: `Your password reset code is: ${resetCode}`,
          bodyHtml: `<p>Hello <strong>${user.name}</strong>,</p><p>Use the following 6-digit security code to reset your password:</p><div style="margin:16px 0;padding:14px;background:#f4f6fa;border-radius:8px;font-size:22px;font-weight:700;text-align:center;letter-spacing:0.2em;">${resetCode}</div>`,
        });

        return NextResponse.json({
          success: true,
          message: "Password reset code sent to your email.",
          demoResetCode: resetCode,
        });
      }

      case "reset_password": {
        const email = sanitizeText(body.email).toLowerCase();
        const code = sanitizeText(body.code);
        const newPassword = String(body.newPassword || "");

        const user = db.users.find((u) => u.email.toLowerCase() === email);
        if (!user) {
          return NextResponse.json({ error: "User not found." }, { status: 404 });
        }
        if (!user.resetCode || user.resetCode !== code) {
          return NextResponse.json({ error: "Invalid reset code." }, { status: 400 });
        }
        if (newPassword.length < 6) {
          return NextResponse.json(
            { error: "New password must be at least 6 characters." },
            { status: 400 },
          );
        }

        user.passwordHash = hashPassword(newPassword);
        user.resetCode = undefined;
        appendAuditLog(db, {
          actorName: user.name,
          actorEmail: user.email,
          actorRole: user.role,
          action: "PASSWORD_RESET",
          entityType: "Auth",
          entityId: user.id,
          details: `Password reset completed for ${user.email}.`,
        });
        writeDb(db);

        return NextResponse.json({
          success: true,
          message: "Password updated! You may now sign in.",
        });
      }

      // ==========================================================
      // 3.2 INTERN REGISTRATION / APPLICATION
      // ==========================================================
      case "submit_application": {
        const fullName = sanitizeText(body.fullName);
        const fatherName = sanitizeText(body.fatherName);
        const cnicOrStudentId = sanitizeText(body.cnicOrStudentId);
        const email = sanitizeText(body.email).toLowerCase();
        const phone = sanitizeText(body.phone);
        const city = sanitizeText(body.city);
        const photoUrl = sanitizeText(body.photoUrl);
        const university = sanitizeText(body.university);
        const degree = sanitizeText(body.degree);
        const semester = sanitizeText(body.semester);
        const cgpa = sanitizeText(body.cgpa);
        const fieldId = sanitizeText(body.fieldId) || "fld-web";
        const durationMonths = Number(body.durationMonths) || 3;
        const startPreference =
          sanitizeText(body.startPreference) || "2026-11-01";
        const batchId = sanitizeText(body.batchId) || "bat-winter-26";
        const cvFileName = sanitizeText(body.cvFileName) || "Applicant_Resume.pdf";
        const cvFileSize = Number(body.cvFileSize) || 350000;
        const coverLetter = sanitizeText(body.coverLetter);
        const skills = Array.isArray(body.skills)
          ? body.skills.map((s: unknown) => sanitizeText(s)).filter(Boolean)
          : String(body.skills || "")
              .split(",")
              .map((s) => sanitizeText(s))
              .filter(Boolean);
        const githubUrl = sanitizeText(body.githubUrl);
        const linkedinUrl = sanitizeText(body.linkedinUrl);
        const portfolioUrl = sanitizeText(body.portfolioUrl);
        const password = body.password ? String(body.password) : "";

        if (!fullName || !email || !cnicOrStudentId || !university) {
          return NextResponse.json(
            {
              error:
                "Full Name, Email, CNIC/Student ID, and University are required.",
            },
            { status: 400 },
          );
        }

        const fieldObj =
          db.fields.find((f) => f.id === fieldId) || db.fields[0];
        const batchObj =
          db.batches.find((b) => b.id === batchId) || db.batches[2] || db.batches[0];
        const defaultMentor =
          db.mentors.find((m) => m.department === fieldObj.name) || db.mentors[0];

        const internId = generateNextInternId(db);
        const recordId = `int-${Date.now()}`;
        const startDate = startPreference;
        const endDate = calculateEndDate(startDate, durationMonths);

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
          batchId: batchObj.id,
          batchName: batchObj.name,
          mentorId: defaultMentor.id,
          mentorName: defaultMentor.name,
          cvFileName,
          cvFileSize,
          coverLetter,
          skills: skills.length > 0 ? skills : fieldObj.defaultSkills,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
          applicationStatus: "Pending",
          internshipStatus: "Applied",
          archived: false,
          progressPercentage: 0,
          attendancePercentage: 0,
          appliedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Link or create user account for intern login
        let userAccount = db.users.find(
          (u) => u.email.toLowerCase() === email,
        );
        if (!userAccount) {
          userAccount = {
            id: `usr-${Date.now()}`,
            email,
            passwordHash: hashPassword(password || "Intern@123"),
            role: "intern",
            name: fullName,
            emailVerified: true,
            internRecordId: recordId,
            createdAt: new Date().toISOString(),
          };
          db.users.push(userAccount);
        } else {
          userAccount.internRecordId = recordId;
        }
        newIntern.userId = userAccount.id;

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
          details: `Application submitted for ${fieldObj.name} (${durationMonths} months, ${batchObj.name}).`,
        });

        writeDb(db);

        // Supabase Postgres Persistence
        try {
          await supabaseDb.syncIntern(newIntern);
          await supabaseDb.logAudit(
            fullName,
            "SUBMITTED_APPLICATION",
            "Application",
            internId,
            `Application submitted for ${fieldObj.name}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        await sendPortalEmail({
          to: email,
          subject: `[Logix Portal] Application Received — ${internId}`,
          heading: "Application Received",
          subHeading: `Tracking ID: ${internId}`,
          bodyText: `Dear ${fullName}, your application for the ${fieldObj.name} Internship (${durationMonths} months) at Logix has been received. Current Status: Pending.`,
          bodyHtml: `<p>Dear <strong>${fullName}</strong>,</p><p>Thank you for applying to the <strong>Logix ${fieldObj.name} Internship</strong> (${durationMonths} months · ${batchObj.name}).</p><ul><li><strong>Intern Tracking ID:</strong> ${internId}</li><li><strong>Application Status:</strong> Pending Review</li><li><strong>Expected Start:</strong> ${startDate} to ${endDate}</li></ul><p>We will notify you by email as soon as your application status changes.</p>`,
        });

        return NextResponse.json({
          success: true,
          intern: newIntern,
        });
      }

      case "update_application_status": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const applicationStatus = body.applicationStatus as ApplicationStatus;
        const mentorId = sanitizeText(body.mentorId);
        const batchId = sanitizeText(body.batchId);

        const intern = db.interns.find((i) => i.id === id || i.internId === id);
        if (!intern) {
          return NextResponse.json(
            { error: "Intern record not found." },
            { status: 404 },
          );
        }

        intern.applicationStatus = applicationStatus;
        if (applicationStatus === "Approved") {
          intern.internshipStatus = "Active";
        } else if (applicationStatus === "Rejected") {
          intern.internshipStatus = "Terminated";
        }

        if (mentorId) {
          const m = db.mentors.find((x) => x.id === mentorId);
          if (m) {
            intern.mentorId = m.id;
            intern.mentorName = m.name;
          }
        }
        if (batchId) {
          const b = db.batches.find((x) => x.id === batchId);
          if (b) {
            intern.batchId = b.id;
            intern.batchName = b.name;
          }
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

        writeDb(db);

        // Supabase Postgres Persistence
        try {
          await supabaseDb.syncIntern(intern);
          await supabaseDb.logAudit(
            actorName,
            `APPLICATION_${applicationStatus.toUpperCase()}`,
            "Application",
            intern.internId,
            `Updated status for ${intern.fullName} to ${applicationStatus}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        await sendPortalEmail({
          to: intern.email,
          subject: `[Logix Portal] Application ${applicationStatus} — ${intern.internId}`,
          heading: `Your Application is ${applicationStatus}`,
          subHeading: `${intern.fieldName} · ${intern.batchName}`,
          bodyText: `Hello ${intern.fullName}, your internship application (${intern.internId}) status has been updated to: ${applicationStatus}.`,
          bodyHtml: `<p>Dear <strong>${intern.fullName}</strong>,</p><p>Your application for the <strong>${intern.fieldName}</strong> internship at Logix has been updated to: <strong style="color:${applicationStatus === "Approved" ? "#0e9983" : "#e5484d"}">${applicationStatus}</strong>.</p>${applicationStatus === "Approved" ? `<p>Your assigned mentor is <strong>${intern.mentorName}</strong>. You can now sign in to your Intern Dashboard to download your Offer Letter and view assigned tasks.</p>` : ""}`,
        });

        return NextResponse.json({ success: true, intern });
      }

      // ==========================================================
      // 3.3 INTERN RECORD MANAGEMENT (ADMIN)
      // ==========================================================
      case "save_intern_record": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const fullName = sanitizeText(body.fullName);
        const fatherName = sanitizeText(body.fatherName);
        const cnicOrStudentId = sanitizeText(body.cnicOrStudentId);
        const email = sanitizeText(body.email).toLowerCase();
        const phone = sanitizeText(body.phone);
        const city = sanitizeText(body.city);
        const university = sanitizeText(body.university);
        const degree = sanitizeText(body.degree);
        const semester = sanitizeText(body.semester);
        const cgpa = sanitizeText(body.cgpa);
        const fieldId = sanitizeText(body.fieldId);
        const durationMonths = Number(body.durationMonths) || 3;
        const startDate =
          sanitizeText(body.startDate) || new Date().toISOString().split("T")[0];
        const endDate = calculateEndDate(startDate, durationMonths);
        const batchId = sanitizeText(body.batchId);
        const mentorId = sanitizeText(body.mentorId);
        const internshipStatus =
          (body.internshipStatus as InternshipStatus) || "Active";
        const applicationStatus =
          (body.applicationStatus as ApplicationStatus) || "Approved";
        const skills = Array.isArray(body.skills)
          ? body.skills.map((s: unknown) => sanitizeText(s)).filter(Boolean)
          : String(body.skills || "")
              .split(",")
              .map((s) => sanitizeText(s))
              .filter(Boolean);

        const fieldObj =
          db.fields.find((f) => f.id === fieldId || f.name === body.fieldName) ||
          db.fields[0];
        const batchObj =
          db.batches.find((b) => b.id === batchId || b.name === body.batchName) ||
          db.batches[1] ||
          db.batches[0];
        const mentorObj =
          db.mentors.find((m) => m.id === mentorId || m.name === body.mentorName) ||
          db.mentors[0];

        const existing = db.interns.find((i) => i.id === id);

        if (existing) {
          const prevStatus = existing.internshipStatus;
          existing.fullName = fullName || existing.fullName;
          existing.fatherName = fatherName || existing.fatherName;
          existing.cnicOrStudentId = cnicOrStudentId || existing.cnicOrStudentId;
          existing.email = email || existing.email;
          existing.phone = phone || existing.phone;
          existing.city = city || existing.city;
          existing.university = university || existing.university;
          existing.degree = degree || existing.degree;
          existing.semester = semester || existing.semester;
          existing.cgpa = cgpa || existing.cgpa;
          existing.fieldId = fieldObj.id;
          existing.fieldName = fieldObj.name;
          existing.durationMonths = durationMonths;
          existing.startDate = startDate;
          existing.endDate = endDate;
          existing.batchId = batchObj.id;
          existing.batchName = batchObj.name;
          existing.mentorId = mentorObj.id;
          existing.mentorName = mentorObj.name;
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

            await sendPortalEmail({
              to: existing.email,
              subject: `[Logix Portal] Internship Status Update: ${internshipStatus}`,
              heading: `Internship Status: ${internshipStatus}`,
              bodyText: `Dear ${existing.fullName}, your internship status (${existing.internId}) is now ${internshipStatus}.`,
              bodyHtml: `<p>Dear <strong>${existing.fullName}</strong>,</p><p>Your internship record (<strong>${existing.internId}</strong>) status has been updated from <em>${prevStatus}</em> to <strong>${internshipStatus}</strong>.</p>`,
            });
          }

          writeDb(db);

          // Supabase Postgres Persistence
          // Supabase Postgres Persistence
          try {
            await supabaseDb.syncIntern(existing);
            await supabaseDb.logAudit(
              actorName,
              "UPDATED_INTERN_RECORD",
              "InternRecord",
              existing.internId,
              `Updated record for ${existing.fullName} (${existing.internId})`,
            );
          } catch {
            // Non-blocking postgres fallback
          }

          return NextResponse.json({ success: true, intern: existing });
        } else {
          const internId = generateNextInternId(db);
          const recordId = `int-${Date.now()}`;
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
            batchId: batchObj.id,
            batchName: batchObj.name,
            mentorId: mentorObj.id,
            mentorName: mentorObj.name,
            cvFileName: sanitizeText(body.cvFileName) || "Admin_Uploaded_CV.pdf",
            cvFileSize: 320000,
            skills: skills.length > 0 ? skills : fieldObj.defaultSkills,
            applicationStatus,
            internshipStatus,
            archived: false,
            progressPercentage: internshipStatus === "Completed" ? 100 : 0,
            attendancePercentage: internshipStatus === "Completed" ? 95 : 100,
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
          writeDb(db);

          // Supabase Postgres Persistence
          try {
            await supabaseDb.syncIntern(created);
            await supabaseDb.logAudit(
              actorName,
              "CREATED_INTERN_RECORD",
              "InternRecord",
              internId,
              `Added new intern record ${internId} for ${fullName}`,
            );
          } catch {
            // Non-blocking postgres fallback
          }

          return NextResponse.json({ success: true, intern: created });
        }
      }

      case "archive_intern_record": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const intern = db.interns.find((i) => i.id === id);
        if (!intern) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
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
        writeDb(db);

        try {
          await supabaseDb.syncIntern(intern);
          await supabaseDb.logAudit(
            actorName,
            intern.archived ? "ARCHIVED_INTERN" : "RESTORED_INTERN",
            "InternRecord",
            intern.internId,
            `${intern.archived ? "Archived" : "Restored"} intern record ${intern.internId}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, intern });
      }

      case "delete_intern_record": {
        const permErr = requirePerm("delete_interns");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const idx = db.interns.findIndex((i) => i.id === id);
        if (idx === -1) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
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
        writeDb(db);

        try {
          await supabaseDb.deleteIntern(removed.id);
          await supabaseDb.logAudit(
            actorName,
            "DELETED_INTERN_RECORD",
            "InternRecord",
            removed.internId,
            `Permanently deleted intern record ${removed.internId}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true });
      }

      case "bulk_import_interns": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (rows.length === 0) {
          return NextResponse.json(
            { error: "No valid rows found in CSV import." },
            { status: 400 },
          );
        }

        let importedCount = 0;
        for (const row of rows) {
          const fullName = sanitizeText(row.fullName || row.name);
          const email = sanitizeText(row.email).toLowerCase();
          if (!fullName || !email) continue;

          const fieldName = sanitizeText(row.field || "Web Development");
          const fieldObj =
            db.fields.find(
              (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
            ) || db.fields[0];
          const durationMonths = Number(row.durationMonths || row.duration) || 3;
          const startDate =
            sanitizeText(row.startDate) || "2026-11-01";
          const endDate = calculateEndDate(startDate, durationMonths);
          const batchObj = db.batches[1] || db.batches[0];
          const mentorObj = db.mentors[0];
          const internId = generateNextInternId(db);

          db.interns.push({
            id: `int-${Date.now()}-${importedCount}`,
            internId,
            fullName,
            fatherName: sanitizeText(row.fatherName || "N/A"),
            cnicOrStudentId: sanitizeText(row.cnic || row.studentId || "N/A"),
            email,
            phone: sanitizeText(row.phone || "N/A"),
            city: sanitizeText(row.city || "Remote"),
            university: sanitizeText(row.university || "Partner University"),
            degree: sanitizeText(row.degree || "BS CS"),
            semester: sanitizeText(row.semester || "6th"),
            cgpa: sanitizeText(row.cgpa || "3.5"),
            fieldId: fieldObj.id,
            fieldName: fieldObj.name,
            durationMonths,
            startPreference: startDate,
            startDate,
            endDate,
            batchId: batchObj.id,
            batchName: batchObj.name,
            mentorId: mentorObj.id,
            mentorName: mentorObj.name,
            cvFileName: "Bulk_Imported_CV.pdf",
            cvFileSize: 250000,
            skills: fieldObj.defaultSkills,
            applicationStatus: "Approved",
            internshipStatus:
              (sanitizeText(row.status) as InternshipStatus) || "Active",
            archived: false,
            progressPercentage: 0,
            attendancePercentage: 100,
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
        writeDb(db);
        return NextResponse.json({ success: true, importedCount });
      }

      // ==========================================================
      // 3.4 FIELD, DURATION & BATCH MANAGEMENT
      // ==========================================================
      case "save_field": {
        const permErr = requirePerm("manage_departments");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const name = sanitizeText(body.name);
        const code = sanitizeText(body.code).toUpperCase();
        const podName = sanitizeText(body.podName);
        const description = sanitizeText(body.description);
        const totalSeats = Number(body.totalSeats) || 15;
        const defaultSkills = String(body.defaultSkills || "")
          .split(",")
          .map((s) => sanitizeText(s))
          .filter(Boolean);

        const existing = db.fields.find((f) => f.id === id);
        if (existing) {
          existing.name = name || existing.name;
          existing.code = code || existing.code;
          existing.podName = podName || existing.podName;
          existing.description = description || existing.description;
          existing.totalSeats = totalSeats;
          if (defaultSkills.length > 0) existing.defaultSkills = defaultSkills;
        } else {
          db.fields.push({
            id: `fld-${Date.now()}`,
            name,
            code: code || name.slice(0, 4).toUpperCase(),
            podName: podName || `${name} Pod`,
            description: description || `Specialized internship track in ${name}.`,
            totalSeats,
            filledSeats: 0,
            active: true,
            defaultSkills: defaultSkills.length > 0 ? defaultSkills : [name],
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
        writeDb(db);

        try {
          const targetDept = existing || db.fields[db.fields.length - 1];
          if (targetDept) {
            await supabaseDb.syncDepartment(targetDept);
          }
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true });
      }

      case "toggle_field": {
        const permErr = requirePerm("manage_departments");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const field = db.fields.find((f) => f.id === id);
        if (field) {
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
          writeDb(db);

          try {
            await supabaseDb.syncDepartment(field);
          } catch {
            // Non-blocking postgres fallback
          }
        }
        return NextResponse.json({ success: true });
      }

      case "save_duration": {
        const permErr = requirePerm("manage_durations");
        if (permErr) return permErr;

        const months = Number(body.months);
        const label = sanitizeText(body.label) || `${months} Months Track`;
        const description = sanitizeText(body.description);
        if (!months || months < 1) {
          return NextResponse.json(
            { error: "Valid duration in months is required." },
            { status: 400 },
          );
        }
        const existing = db.durations.find((d) => d.months === months);
        if (existing) {
          existing.label = label;
          existing.description = description || existing.description;
          existing.active = true;
        } else {
          db.durations.push({
            id: `dur-${Date.now()}`,
            months,
            label,
            weeks: months * 4,
            active: true,
            description:
              description || `${months * 4}-week structured internship program.`,
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
        writeDb(db);

        try {
          const targetDur = existing || db.durations.find((d) => d.months === months);
          if (targetDur) {
            await supabaseDb.syncDuration(targetDur);
          }
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true });
      }

      case "toggle_duration": {
        const permErr = requirePerm("manage_durations");
        if (permErr) return permErr;

        const id = sanitizeText(body.id);
        const dur = db.durations.find((d) => d.id === id);
        if (dur) {
          dur.active = !dur.active;
          writeDb(db);
        }
        return NextResponse.json({ success: true });
      }

      case "save_batch": {
        const permErr = requirePerm("manage_batches");
        if (permErr) return permErr;

        const name = sanitizeText(body.name);
        const code = sanitizeText(body.code).toUpperCase();
        const startDate = sanitizeText(body.startDate);
        const endDate = sanitizeText(body.endDate);
        const status =
          (body.status as "Upcoming" | "Active" | "Completed") || "Upcoming";
        const description = sanitizeText(body.description);

        if (!name || !startDate) {
          return NextResponse.json(
            { error: "Batch name and start date are required." },
            { status: 400 },
          );
        }

        const newBatch = {
          id: `bat-${Date.now()}`,
          name,
          code: code || name.slice(0, 3).toUpperCase() + "-2026",
          startDate,
          endDate: endDate || calculateEndDate(startDate, 3),
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
          details: `Created cohort batch '${name}' (${startDate} to ${endDate}).`,
        });
        writeDb(db);

        try {
          await supabaseDb.syncBatch(newBatch);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true });
      }

      // ==========================================================
      // 3.5 TASK AND PROGRESS TRACKING
      // ==========================================================
      case "assign_task": {
        const permErr = requirePerm("assign_tasks");
        if (permErr) return permErr;

        const title = sanitizeText(body.title);
        const description = sanitizeText(body.description);
        const internRecordId = sanitizeText(body.internRecordId);
        const deadline = sanitizeText(body.deadline);
        const priority =
          (body.priority as "Low" | "Medium" | "High") || "Medium";
        const attachmentName = sanitizeText(body.attachmentName);

        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!title || !intern || !deadline) {
          return NextResponse.json(
            { error: "Task title, assigned intern, and deadline are required." },
            { status: 400 },
          );
        }

        const newTask = {
          id: `tsk-${Date.now()}`,
          title,
          description,
          internRecordId: intern.id,
          internId: intern.internId,
          internName: intern.fullName,
          fieldName: intern.fieldName,
          assignedByMentorId: intern.mentorId,
          assignedByName: actorName || intern.mentorName,
          deadline,
          priority,
          attachmentName: attachmentName || undefined,
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

        writeDb(db);

        try {
          await supabaseDb.syncTask(newTask);
          await supabaseDb.logAudit(
            actorName,
            "ASSIGNED_TASK",
            "Task",
            newTask.id,
            `Assigned task '${title}' to ${intern.fullName}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        await sendPortalEmail({
          to: intern.email,
          subject: `[Logix Portal] New Task Assigned: ${title}`,
          heading: "New Mentorship Task Assigned",
          subHeading: `Due Date: ${deadline} · Priority: ${priority}`,
          bodyText: `Hello ${intern.fullName}, a new task '${title}' has been assigned to you by ${newTask.assignedByName}. Deadline: ${deadline}.`,
          bodyHtml: `<p>Hello <strong>${intern.fullName}</strong>,</p><p>Your mentor <strong>${newTask.assignedByName}</strong> has assigned a new task:</p><div style="padding:14px;background:#f4f6fa;border-radius:8px;margin:12px 0;"><strong>${title}</strong><p style="margin:6px 0 0 0;font-size:13px;">${description}</p></div><p><strong>Deadline:</strong> ${deadline}</p>`,
        });

        return NextResponse.json({ success: true, task: newTask });
      }

      case "submit_task": {
        const permErr = requirePerm("submit_task");
        if (permErr) return permErr;

        const taskId = sanitizeText(body.taskId);
        const submissionLink = sanitizeText(body.submissionLink);
        const submissionFileName = sanitizeText(body.submissionFileName);
        const submissionNotes = sanitizeText(body.submissionNotes);

        const task = db.tasks.find((t) => t.id === taskId);
        if (!task) {
          return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        task.submissionLink = submissionLink;
        task.submissionFileName = submissionFileName;
        task.submissionNotes = submissionNotes;
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
          actorRole: "intern",
          action: "SUBMITTED_TASK",
          entityType: "Task",
          entityId: task.id,
          details: `${task.internName} (${task.internId}) submitted work for '${task.title}'.`,
        });

        writeDb(db);

        try {
          await supabaseDb.syncTask(task);
          await supabaseDb.logAudit(
            task.internName,
            "SUBMITTED_TASK",
            "Task",
            task.id,
            `Submitted work for '${task.title}'`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, task });
      }

      case "review_task": {
        const permErr = requirePerm("review_tasks");
        if (permErr) return permErr;

        const taskId = sanitizeText(body.taskId);
        const status = body.status as TaskStatus;
        const mentorComments = sanitizeText(body.mentorComments);

        const task = db.tasks.find((t) => t.id === taskId);
        if (!task) {
          return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        task.status = status;
        task.mentorComments = mentorComments;
        task.reviewedAt = new Date().toISOString();

        const intern = db.interns.find((i) => i.id === task.internRecordId);

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

        writeDb(db);

        try {
          await supabaseDb.syncTask(task);
          await supabaseDb.logAudit(
            actorName,
            `REVIEWED_TASK_${status.toUpperCase()}`,
            "Task",
            task.id,
            `Marked task '${task.title}' as ${status}`,
          );
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, task });
      }

      // ==========================================================
      // 3.6 ATTENDANCE & LEAVE MANAGEMENT
      // ==========================================================
      case "mark_attendance": {
        const permErr = requirePerm("mark_attendance");
        if (permErr) return permErr;

        const internRecordId = sanitizeText(body.internRecordId);
        const date =
          sanitizeText(body.date) || new Date().toISOString().split("T")[0];
        const status = (body.status as AttendanceStatus) || "Present";
        const notes = sanitizeText(body.notes);

        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!intern) {
          return NextResponse.json({ error: "Intern not found." }, { status: 404 });
        }

        const existing = db.attendance.find(
          (a) => a.internRecordId === intern.id && a.date === date,
        );
        const nowTime = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const recordId = existing ? existing.id : `att-${Date.now()}`;
        if (existing) {
          existing.status = status;
          existing.notes = notes || existing.notes;
        } else {
          db.attendance.unshift({
            id: recordId,
            internRecordId: intern.id,
            internId: intern.internId,
            internName: intern.fullName,
            date,
            status,
            checkInTime: nowTime,
            notes,
          });
        }

        writeDb(db);

        try {
          supabaseDb.insertAttendance({
            id: recordId,
            internId: intern.id,
            date,
            status,
            notes,
          });
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true });
      }

      case "request_leave": {
        const permErr = requirePerm("request_leave");
        if (permErr) return permErr;

        const internRecordId = sanitizeText(body.internRecordId);
        const startDate = sanitizeText(body.startDate);
        const endDate = sanitizeText(body.endDate) || startDate;
        const reason = sanitizeText(body.reason);

        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!intern || !startDate || !reason) {
          return NextResponse.json(
            { error: "Dates and reason are required for leave requests." },
            { status: 400 },
          );
        }

        const leave = {
          id: `lv-${Date.now()}`,
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

        writeDb(db);

        try {
          await supabaseDb.syncLeave(leave);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, leave });
      }

      case "review_leave": {
        const permErr = requirePerm("review_leaves");
        if (permErr) return permErr;

        const leaveId = sanitizeText(body.leaveId);
        const status = body.status as LeaveStatus;
        const leave = db.leaves.find((l) => l.id === leaveId);
        if (!leave) {
          return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
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

        writeDb(db);

        try {
          await supabaseDb.syncLeave(leave);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, leave });
      }

      // ==========================================================
      // 3.7 EVALUATION AND FEEDBACK
      // ==========================================================
      case "submit_evaluation": {
        const permErr = requirePerm("submit_evaluation");
        if (permErr) return permErr;

        const internRecordId = sanitizeText(body.internRecordId);
        const technicalSkills = Math.min(25, Math.max(0, Number(body.technicalSkills) || 0));
        const punctuality = Math.min(25, Math.max(0, Number(body.punctuality) || 0));
        const communication = Math.min(25, Math.max(0, Number(body.communication) || 0));
        const teamwork = Math.min(25, Math.max(0, Number(body.teamwork) || 0));
        const remarks = sanitizeText(body.remarks);

        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!intern) {
          return NextResponse.json({ error: "Intern not found." }, { status: 404 });
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
            id: `evl-${Date.now()}`,
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

        writeDb(db);

        try {
          await supabaseDb.syncEvaluation(evalRecord);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, evaluation: evalRecord });
      }

      case "submit_intern_feedback": {
        const permErr = requirePerm("submit_feedback");
        if (permErr) return permErr;

        const internRecordId = sanitizeText(body.internRecordId);
        const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
        const comments = sanitizeText(body.comments);

        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!intern) {
          return NextResponse.json({ error: "Intern not found." }, { status: 404 });
        }

        let evalRecord = db.evaluations.find(
          (e) => e.internRecordId === intern.id,
        );
        if (!evalRecord) {
          evalRecord = {
            id: `evl-${Date.now()}`,
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

        writeDb(db);

        try {
          await supabaseDb.insertFeedback({
            id: `fb-${Date.now()}`,
            internId: intern.id,
            rating,
            mentorHelpfulness: rating,
            projectRelevance: rating,
            comments,
          });
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, evaluation: evalRecord });
      }

      // ==========================================================
      // 3.8 CERTIFICATE MANAGEMENT
      // ==========================================================
      case "issue_certificate": {
        const permErr = requirePerm("issue_certificates");
        if (permErr) return permErr;

        const internRecordId = sanitizeText(body.internRecordId);
        const intern = db.interns.find((i) => i.id === internRecordId);
        if (!intern) {
          return NextResponse.json(
            { error: "Intern record not found." },
            { status: 404 },
          );
        }

        // Requirement 3.8: Admin can issue a certificate ONLY for interns with status "Completed"
        if (intern.internshipStatus !== "Completed") {
          return NextResponse.json(
            {
              error: `Cannot issue certificate: Intern status must be "Completed" (currently "${intern.internshipStatus}").`,
            },
            { status: 400 },
          );
        }

        // Requirement 3.7: Evaluation must be completed before a certificate can be issued
        const evaluation = db.evaluations.find(
          (e) => e.internRecordId === intern.id && e.completed,
        );
        if (!evaluation) {
          return NextResponse.json(
            {
              error:
                "Cannot issue certificate: Mentor Performance Evaluation must be completed before a certificate can be issued.",
            },
            { status: 400 },
          );
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

          writeDb(db);
          return NextResponse.json({
            success: true,
            certificate: existingCert,
          });
        }

        const certificateNumber = generateCertificateNumber(db);
        const newCert = {
          id: `crt-${Date.now()}`,
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
          signatoryName: "Areeba Siddiqui",
          signatoryTitle: "Director of Engineering & Talent, Logix Technologies",
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

        writeDb(db);

        try {
          await supabaseDb.syncCertificate(newCert);
        } catch {
          // Non-blocking postgres fallback
        }

        await sendPortalEmail({
          to: intern.email,
          subject: `[Logix Portal] Your Internship Certificate (${certificateNumber}) is Ready!`,
          heading: "Official Certificate of Completion Issued",
          subHeading: `Certificate No: ${certificateNumber}`,
          bodyText: `Congratulations ${intern.fullName}! Your Logix Internship Certificate (${certificateNumber}) has been issued. Sign in to download your PDF or verify at /verify?cert=${certificateNumber}`,
          bodyHtml: `<p>Congratulations <strong>${intern.fullName}</strong>!</p><p>Your official <strong>Logix Internship Certificate of Completion</strong> has been issued:</p><ul><li><strong>Certificate Number:</strong> ${certificateNumber}</li><li><strong>Field:</strong> ${intern.fieldName} (${intern.durationMonths} Months)</li><li><strong>Final Grade:</strong> ${evaluation.grade} (${evaluation.totalMarks}/100)</li></ul><p>Log in to your Intern Dashboard to download the high-resolution PDF with QR code verification.</p>`,
        });

        return NextResponse.json({ success: true, certificate: newCert });
      }

      case "revoke_certificate": {
        const permErr = requirePerm("revoke_certificates");
        if (permErr) return permErr;

        const certificateId = sanitizeText(body.certificateId);
        const reason =
          sanitizeText(body.reason) || "Revoked by administrative action.";
        const cert = db.certificates.find(
          (c) => c.id === certificateId || c.certificateNumber === certificateId,
        );
        if (!cert) {
          return NextResponse.json(
            { error: "Certificate not found." },
            { status: 404 },
          );
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

        writeDb(db);

        try {
          await supabaseDb.syncCertificate(cert);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, certificate: cert });
      }

      // ==========================================================
      // 3.10 & 3.12 NOTIFICATIONS & ANNOUNCEMENTS
      // ==========================================================
      case "mark_notifications_read": {
        for (const n of db.notifications) {
          n.read = true;
        }
        writeDb(db);
        return NextResponse.json({ success: true });
      }

      case "post_announcement": {
        const permErr = requirePerm("post_announcements");
        if (permErr) return permErr;

        const title = sanitizeText(body.title);
        const content = sanitizeText(body.content);
        const targetAudience =
          sanitizeText(body.targetAudience) || "All Interns";
        const priority =
          (body.priority as "Normal" | "Important" | "Urgent") || "Normal";

        if (!title || !content) {
          return NextResponse.json(
            { error: "Announcement title and content are required." },
            { status: 400 },
          );
        }

        const ann = {
          id: `ann-${Date.now()}`,
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

        writeDb(db);

        try {
          await supabaseDb.syncAnnouncement(ann);
        } catch {
          // Non-blocking postgres fallback
        }

        return NextResponse.json({ success: true, announcement: ann });
      }

      // ==========================================================
      // 4. DATABASE BACKUP
      // ==========================================================
      case "create_backup": {
        const permErr = requirePerm("manage_interns");
        if (permErr) return permErr;

        const label = sanitizeText(body.label);
        const snapshot = createDatabaseBackup(db, label, actorName);
        appendAuditLog(db, {
          actorName,
          actorEmail,
          actorRole,
          action: "CREATED_DB_BACKUP",
          entityType: "Backup",
          entityId: snapshot.id,
          details: `Created database backup '${snapshot.label}' (${snapshot.sizeBytes} bytes).`,
        });
        writeDb(db);
        return NextResponse.json({ success: true, backup: snapshot });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("[API POST /api/portal ERROR]", err);
    return NextResponse.json(
      { error: "An internal error occurred while processing the request." },
      { status: 500 },
    );
  }
}
