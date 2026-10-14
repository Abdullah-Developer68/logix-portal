import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, Set<string>> = {
  application_cv: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  application_photo: new Set(["image/jpeg", "image/png", "image/webp"]),
  task_attachment: new Set([
    "application/pdf",
    "application/zip",
    "text/plain",
    "image/jpeg",
    "image/png",
  ]),
  task_submission: new Set([
    "application/pdf",
    "application/zip",
    "text/plain",
    "image/jpeg",
    "image/png",
  ]),
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") || "");

  if (!(file instanceof File) || !ALLOWED_TYPES[kind]) {
    return NextResponse.json({ error: "A valid upload type and file are required." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be between 1 byte and 10MB." }, { status: 400 });
  }
  if (!ALLOWED_TYPES[kind].has(file.type)) {
    return NextResponse.json({ error: "This file type is not allowed." }, { status: 400 });
  }

  const user = await resolveAuthenticatedUser(request);
  if (!kind.startsWith("application_") && !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const extension = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const uploadId = `${kind}-${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, uploadId), Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    fileSize: file.size,
    storageKey: uploadId,
  });
}
