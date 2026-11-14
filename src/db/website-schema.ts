import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Read/update mirror of the website-owned `internship_applications` table.
 * NOT referenced by drizzle.config.ts — never migrated from this repository.
 */
export const internshipApplications = pgTable("internship_applications", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull(),
  note: text("note"),
  resumePath: text("resume_path"),
  resumeFileName: text("resume_file_name"),
  resumeMimeType: text("resume_mime_type"),
  resumeSizeBytes: integer("resume_size_bytes"),
  status: text("status").notNull(),
  emailSent: boolean("email_sent").notNull(),
  adminNotes: text("admin_notes"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  internRecordId: text("intern_record_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
