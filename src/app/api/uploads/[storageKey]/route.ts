import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/lib/auth";
import { readPortal } from "@/lib/db";
import { downloadObject } from "@/lib/server/storage";

const PORTAL_UPLOADS_BUCKET = "portal-uploads";

const STORAGE_KEY_RE =
  /^(application_cv|application_photo|task_attachment|task_submission)-[0-9a-f-]+\.(doc|docx|jpg|jpeg|pdf|png|txt|webp|zip)$/i;

const CONTENT_TYPES: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain; charset=utf-8",
  webp: "image/webp",
  zip: "application/zip",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storageKey: string }> },
) {
  try {
    const db = await readPortal();
    const user = resolveAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { storageKey } = await params;
    const match = storageKey.match(STORAGE_KEY_RE);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid storage key." },
        { status: 400 },
      );
    }

    const kind = match[1].toLowerCase();
    const ext = match[2].toLowerCase();
    const safeKey = storageKey;

    const intern = db.interns.find(
      (record) =>
        record.cvStorageKey === safeKey ||
        record.photoUrl === safeKey ||
        db.tasks.some(
          (task) =>
            task.internRecordId === record.id &&
            task.submissionStorageKey === safeKey,
        ),
    );
    const task = db.tasks.find(
      (record) =>
        record.submissionStorageKey === safeKey ||
        record.attachmentUrl === safeKey ||
        record.attachmentStorageKey === safeKey,
    );

    const isAdmin = user.role === "admin";
    const ownsInternRecord =
      !!intern &&
      (user.internRecordId === intern.id || user.id === intern.userId);
    const mentorsIntern =
      !!intern &&
      user.role === "mentor" &&
      !!user.mentorId &&
      intern.mentorId === user.mentorId;
    const mentorsTask =
      !!task &&
      user.role === "mentor" &&
      !!user.mentorId &&
      (task.assignedByMentorId === user.mentorId ||
        db.interns.some(
          (i) => i.id === task.internRecordId && i.mentorId === user.mentorId,
        ));

    if (!isAdmin && !ownsInternRecord && !mentorsIntern && !mentorsTask) {
      return NextResponse.json(
        { error: "You cannot access this file." },
        { status: 403 },
      );
    }

    const downloaded = await downloadObject(
      PORTAL_UPLOADS_BUCKET,
      `${kind}/${safeKey}`,
    );
    if (!downloaded) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const safeFileName = safeKey.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new NextResponse(new Uint8Array(downloaded.buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (err) {
    console.error("[API GET /api/uploads/[storageKey] ERROR]", err);
    return NextResponse.json(
      { error: "Failed to retrieve file." },
      { status: 500 },
    );
  }
}
