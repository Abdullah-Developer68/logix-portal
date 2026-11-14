import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/lib/auth";
import { readPortal } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/server/rate-limit";
import { uploadObject } from "@/lib/server/storage";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (Vercel body limit is 4.5 MB)
const MAX_CONTENT_LENGTH = 4 * 1024 * 1024 + 64 * 1024;
const PORTAL_UPLOADS_BUCKET = "portal-uploads";

const ALLOWED_MIMES: Record<string, Set<string>> = {
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

interface DetectedFileType {
  ext: string;
  mime: string;
}

function detectFileType(
  buf: Buffer,
  kind: string,
): DetectedFileType | null {
  if (buf.length === 0) return null;

  // PDF: %PDF-
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { ext: "pdf", mime: "application/pdf" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // DOC (OLE2 Compound File): D0 CF 11 E0
  if (
    buf.length >= 4 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0
  ) {
    return { ext: "doc", mime: "application/msword" };
  }

  // ZIP / DOCX: PK\x03\x04
  if (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  ) {
    if (kind === "application_cv") {
      if (
        buf.includes(Buffer.from("[Content_Types].xml")) &&
        buf.includes(Buffer.from("word/"))
      ) {
        return {
          ext: "docx",
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      }
      return null;
    }
    return { ext: "zip", mime: "application/zip" };
  }

  // text/plain: valid UTF-8 without NUL or binary control bytes
  if (ALLOWED_MIMES[kind]?.has("text/plain")) {
    if (buf.includes(0)) return null;
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) {
        return null;
      }
    }
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buf);
      return { ext: "txt", mime: "text/plain" };
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH) {
        return NextResponse.json(
          { error: "Uploaded payload exceeds the 4 MB size limit." },
          { status: 413 },
        );
      }
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid multipart form data." },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    const kind = String(formData.get("kind") || "").trim();

    if (!(file instanceof File) || !ALLOWED_MIMES[kind]) {
      return NextResponse.json(
        { error: "A valid upload type and file are required." },
        { status: 400 },
      );
    }

    const isPublicKind = kind.startsWith("application_");
    if (isPublicKind) {
      const ip = getClientIp(request);
      const rl = await checkRateLimit({
        key: `upload:public:ip:${ip}`,
        limit: 10,
        windowSeconds: 600,
      });
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
    } else {
      const db = await readPortal();
      const user = resolveAuthenticatedUser(request, db);
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 },
        );
      }
      const rl = await checkRateLimit({
        key: `upload:auth:user:${user.id}`,
        limit: 30,
        windowSeconds: 600,
      });
      if (!rl.allowed) return rateLimitResponse(rl.retryAfter);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Files must be between 1 byte and 4 MB." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Files must be between 1 byte and 4 MB." },
        { status: 400 },
      );
    }

    const detected = detectFileType(buffer, kind);
    if (!detected || !ALLOWED_MIMES[kind].has(detected.mime)) {
      return NextResponse.json(
        { error: "This file content does not match an allowed file type." },
        { status: 400 },
      );
    }

    const storageKey = `${kind}-${randomUUID()}.${detected.ext}`;
    const objectPath = `${kind}/${storageKey}`;

    await uploadObject(
      PORTAL_UPLOADS_BUCKET,
      objectPath,
      buffer,
      detected.mime,
    );

    return NextResponse.json(
      {
        success: true,
        fileName: file.name,
        fileSize: buffer.length,
        storageKey,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[API POST /api/uploads ERROR]", err);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
