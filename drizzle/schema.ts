import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ==========================================
// 1. BETTER-AUTH CORE TABLES & RBAC
// ==========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role").default("intern"), // 'admin' | 'mentor' | 'intern'
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const users = user;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// 2. INTERNSHIP PORTAL DOMAIN ENTITIES (CRUD)
// ==========================================

export const departments = pgTable("departments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  seats: integer("seats").default(30),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const batches = pgTable("batches", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  startDate: varchar("start_date", { length: 32 }).notNull(),
  endDate: varchar("end_date", { length: 32 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const durations = pgTable("durations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  months: integer("months").notNull(),
  label: text("label").notNull(),
  active: boolean("active").default(true),
});

export const interns = pgTable(
  "interns",
  {
    id: varchar("id", { length: 64 }).primaryKey(), // e.g. "LGX-INT-2026-001"
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    fatherName: text("father_name"),
    cnic: varchar("cnic", { length: 64 }),
    email: text("email").notNull(),
    phone: varchar("phone", { length: 64 }),
    city: varchar("city", { length: 128 }),
    university: text("university"),
    degree: text("degree"),
    semester: varchar("semester", { length: 32 }),
    cgpa: varchar("cgpa", { length: 32 }),
    departmentId: varchar("department_id", { length: 64 }).references(
      () => departments.id,
      { onDelete: "set null" },
    ),
    departmentName: text("department_name"),
    batchId: varchar("batch_id", { length: 64 }).references(() => batches.id, {
      onDelete: "set null",
    }),
    batchName: text("batch_name"),
    duration: varchar("duration", { length: 64 }).notNull(),
    startDate: varchar("start_date", { length: 32 }).notNull(),
    endDate: varchar("end_date", { length: 32 }).notNull(),
    mentorId: text("mentor_id").references(() => user.id, { onDelete: "set null" }),
    mentorName: text("mentor_name"),
    status: varchar("status", { length: 32 }).notNull().default("Applied"), // 'Applied', 'Active', 'Completed', 'Terminated', 'Dropped'
    progress: integer("progress").default(0),
    cvUrl: text("cv_url"),
    githubUrl: text("github_url"),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    photoUrl: text("photo_url"),
    coverLetter: text("cover_letter"),
    skills: text("skills"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_interns_status").on(table.status),
    index("idx_interns_department").on(table.departmentId),
    index("idx_interns_email").on(table.email),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    departmentId: varchar("department_id", { length: 64 }).references(
      () => departments.id,
      { onDelete: "set null" },
    ),
    internId: varchar("intern_id", { length: 64 }).references(
      () => interns.id,
      { onDelete: "cascade" },
    ),
    mentorId: text("mentor_id").references(() => user.id, { onDelete: "set null" }),
    mentorName: text("mentor_name"),
    deadline: varchar("deadline", { length: 32 }).notNull(),
    attachmentUrl: text("attachment_url"),
    status: varchar("status", { length: 32 }).notNull().default("Assigned"), // 'Assigned' | 'Submitted' | 'Approved' | 'Needs Revision' | 'Rejected'
    submissionLink: text("submission_link"),
    submissionNotes: text("submission_notes"),
    submittedAt: timestamp("submitted_at"),
    feedback: text("feedback"),
    score: integer("score"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_tasks_intern").on(table.internId),
    index("idx_tasks_status").on(table.status),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    internId: varchar("intern_id", { length: 64 })
      .notNull()
      .references(() => interns.id, { onDelete: "cascade" }),
    mentorId: text("mentor_id").references(() => user.id, { onDelete: "set null" }),
    mentorName: text("mentor_name"),
    technicalScore: integer("technical_score").notNull().default(0),
    punctualityScore: integer("punctuality_score").notNull().default(0),
    communicationScore: integer("communication_score").notNull().default(0),
    teamworkScore: integer("teamwork_score").notNull().default(0),
    finalGrade: varchar("final_grade", { length: 16 }).notNull().default("A"),
    feedback: text("feedback"),
    recommendForCert: boolean("recommend_for_cert").default(true),
    completedAt: timestamp("completed_at").defaultNow(),
  },
  (table) => [index("idx_evaluations_intern").on(table.internId)],
);

export const internFeedback = pgTable("intern_feedback", {
  id: varchar("id", { length: 64 }).primaryKey(),
  internId: varchar("intern_id", { length: 64 })
    .notNull()
    .references(() => interns.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull().default(5),
  mentorHelpfulness: integer("mentor_helpfulness").notNull().default(5),
  projectRelevance: integer("project_relevance").notNull().default(5),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    internId: varchar("intern_id", { length: 64 })
      .notNull()
      .references(() => interns.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("Present"), // 'Present' | 'Late' | 'Absent' | 'Leave'
    checkInTime: varchar("check_in_time", { length: 32 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_attendance_intern_date").on(table.internId, table.date),
    index("idx_attendance_intern").on(table.internId),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    internId: varchar("intern_id", { length: 64 })
      .notNull()
      .references(() => interns.id, { onDelete: "cascade" }),
    startDate: varchar("start_date", { length: 32 }).notNull(),
    endDate: varchar("end_date", { length: 32 }).notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("Pending"), // 'Pending' | 'Approved' | 'Rejected'
    reviewedBy: text("reviewed_by"),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_leaves_intern").on(table.internId)],
);

export const certificates = pgTable(
  "certificates",
  {
    id: varchar("id", { length: 64 }).primaryKey(), // e.g. "LGX-CERT-2026-8401"
    internId: varchar("intern_id", { length: 64 })
      .notNull()
      .references(() => interns.id, { onDelete: "cascade" }),
    internName: text("intern_name").notNull(),
    field: text("field").notNull(),
    duration: text("duration").notNull(),
    startDate: varchar("start_date", { length: 32 }).notNull(),
    endDate: varchar("end_date", { length: 32 }).notNull(),
    issueDate: varchar("issue_date", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("Valid"), // 'Valid' | 'Revoked'
    issuedBy: text("issued_by").notNull(),
    qrCodeData: text("qr_code_data").notNull(),
    grade: varchar("grade", { length: 16 }),
    verificationUrl: text("verification_url").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_certificates_status").on(table.status),
    index("idx_certificates_intern").on(table.internId),
  ],
);

export const announcements = pgTable("announcements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetField: text("target_field").default("All"),
  targetBatch: text("target_batch").default("All"),
  author: text("author").notNull(),
  priority: varchar("priority", { length: 32 }).default("Normal"), // 'Normal' | 'Important' | 'Urgent'
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_audit_logs_created").on(table.createdAt)],
);
