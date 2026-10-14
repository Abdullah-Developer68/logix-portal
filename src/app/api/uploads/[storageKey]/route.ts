import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/lib/auth";
import { readDb } from "@/lib/db";

const CONTENT_TYPES: Record<string, string> = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".zip": "application/zip",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storageKey: string }> },
) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { storageKey } = await params;
  const safeKey = path.basename(storageKey);
  if (!safeKey || safeKey !== storageKey || safeKey.includes("..")) {
    return NextResponse.json({ error: "Invalid storage key." }, { status: 400 });
  }

  const db = readDb();
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
  const mentorsTask =
    !!task && user.role === "mentor" && task.assignedByMentorId === user.mentorId;
  if (!isAdmin && !ownsInternRecord && !mentorsTask) {
    return NextResponse.json({ error: "You cannot access this file." }, { status: 403 });
  }

  const uploadPath = path.join(process.cwd(), "data", "uploads", safeKey);
  try {
    const contents = await readFile(uploadPath);
    const extension = path.extname(safeKey).toLowerCase();
    return new NextResponse(contents, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeKey.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
