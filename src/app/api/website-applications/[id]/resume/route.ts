import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb, internshipApplications } from "@/db";
import { resolveAuthenticatedUser } from "@/lib/auth";
import { readPortal } from "@/lib/db";
import { downloadObject } from "@/lib/server/storage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_RESUME_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeDownloadFilename(name: string | null, fallbackId: string): string {
  const base = (name || `resume-${fallbackId}.pdf`)
    .replace(/[\r\n/\\"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim();
  return base || `resume-${fallbackId}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const portalDb = await readPortal();
    const user = resolveAuthenticatedUser(request, portalDb);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid application ID." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [application] = await db
      .select({
        id: internshipApplications.id,
        resumePath: internshipApplications.resumePath,
        resumeFileName: internshipApplications.resumeFileName,
        resumeMimeType: internshipApplications.resumeMimeType,
      })
      .from(internshipApplications)
      .where(eq(internshipApplications.id, id))
      .limit(1);

    if (!application || !application.resumePath) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const downloaded = await downloadObject("resumes", application.resumePath);
    if (!downloaded) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const contentType =
      application.resumeMimeType &&
      ALLOWED_RESUME_MIMES.has(application.resumeMimeType)
        ? application.resumeMimeType
        : "application/octet-stream";

    const safeFileName = sanitizeDownloadFilename(
      application.resumeFileName,
      application.id,
    );

    return new NextResponse(new Uint8Array(downloaded.buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (err) {
    console.error("[API GET /api/website-applications/[id]/resume ERROR]", err);
    return NextResponse.json(
      { error: "Failed to download resume." },
      { status: 500 },
    );
  }
}
