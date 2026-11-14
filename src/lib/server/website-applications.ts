import "server-only";
import type { internshipApplications } from "@/db";
import type { WebsiteApplication, WebsiteApplicationStatus } from "@/lib/types";

type WebsiteApplicationRow = typeof internshipApplications.$inferSelect;

export const WEBSITE_APPLICATION_STATUSES: readonly WebsiteApplicationStatus[] = [
  "new",
  "contacted",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export function toWebsiteApplication(
  row: WebsiteApplicationRow,
): WebsiteApplication {
  const status = WEBSITE_APPLICATION_STATUSES.includes(
    row.status as WebsiteApplicationStatus,
  )
    ? (row.status as WebsiteApplicationStatus)
    : "new";

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    note: row.note,
    hasResume: row.resumePath != null,
    resumeFileName: row.resumeFileName,
    resumeMimeType: row.resumeMimeType,
    resumeSizeBytes: row.resumeSizeBytes,
    status,
    adminNotes: row.adminNotes,
    contactedAt: row.contactedAt ? row.contactedAt.toISOString() : null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewedBy: row.reviewedBy,
    internRecordId: row.internRecordId,
  };
}
