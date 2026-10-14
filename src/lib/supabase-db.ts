import { db } from "@/db";
import * as schema from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Checks whether Supabase PostgreSQL is reachable with valid credentials
 */
export function isSupabaseConnected(): boolean {
  const url = process.env.DATABASE_URL || "";
  return Boolean(
    url &&
      !url.includes("[YOUR-PASSWORD]") &&
      !url.includes("dummy") &&
      url.startsWith("postgresql://"),
  );
}

/**
 * Supabase PostgreSQL Full-Lifecycle CRUD Operations via Drizzle ORM
 */
export const supabaseDb = {
  // 1. Interns CRUD
  async getInterns() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.interns).orderBy(desc(schema.interns.createdAt));
    } catch (e) {
      console.warn("[Supabase] Failed to fetch interns from Postgres:", e);
      return null;
    }
  },

  async getInternById(id: string) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.select().from(schema.interns).where(eq(schema.interns.id, id)).limit(1);
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async insertIntern(data: typeof schema.interns.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.interns).values(data).returning();
      return res[0] || null;
    } catch (e) {
      console.warn("[Supabase] Failed to insert intern:", e);
      return null;
    }
  },

  async updateIntern(id: string, data: Partial<typeof schema.interns.$inferInsert>) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db
        .update(schema.interns)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.interns.id, id))
        .returning();
      return res[0] || null;
    } catch (e) {
      console.warn("[Supabase] Failed to update intern:", e);
      return null;
    }
  },

  async deleteIntern(id: string) {
    if (!isSupabaseConnected()) return null;
    try {
      await db.delete(schema.interns).where(eq(schema.interns.id, id));
      return true;
    } catch (e) {
      console.warn("[Supabase] Failed to delete intern:", e);
      return false;
    }
  },

  // 2. Departments & Fields CRUD
  async getDepartments() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.departments);
    } catch {
      return null;
    }
  },

  async insertDepartment(data: typeof schema.departments.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.departments).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async updateDepartment(id: string, data: Partial<typeof schema.departments.$inferInsert>) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db
        .update(schema.departments)
        .set(data)
        .where(eq(schema.departments.id, id))
        .returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 3. Batches CRUD
  async getBatches() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.batches);
    } catch {
      return null;
    }
  },

  async insertBatch(data: typeof schema.batches.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.batches).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 4. Durations CRUD
  async getDurations() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.durations);
    } catch {
      return null;
    }
  },

  async insertDuration(data: typeof schema.durations.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.durations).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 5. Tasks & Submissions CRUD
  async getTasks() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt));
    } catch {
      return null;
    }
  },

  async insertTask(data: typeof schema.tasks.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.tasks).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async updateTask(id: string, data: Partial<typeof schema.tasks.$inferInsert>) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.update(schema.tasks).set(data).where(eq(schema.tasks.id, id)).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 6. Evaluations & Feedback CRUD
  async getEvaluations() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.evaluations);
    } catch {
      return null;
    }
  },

  async insertEvaluation(data: typeof schema.evaluations.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.evaluations).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async insertFeedback(data: typeof schema.internFeedback.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.internFeedback).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 7. Attendance & Leaves CRUD
  async getAttendance() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.attendance).orderBy(desc(schema.attendance.createdAt));
    } catch {
      return null;
    }
  },

  async insertAttendance(data: typeof schema.attendance.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db
        .insert(schema.attendance)
        .values(data)
        .onConflictDoUpdate({
          target: [schema.attendance.internId, schema.attendance.date],
          set: { status: data.status, notes: data.notes },
        })
        .returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async getLeaves() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.leaveRequests).orderBy(desc(schema.leaveRequests.createdAt));
    } catch {
      return null;
    }
  },

  async insertLeave(data: typeof schema.leaveRequests.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.leaveRequests).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async updateLeaveStatus(id: string, status: string, reviewedBy: string, reviewNotes?: string) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db
        .update(schema.leaveRequests)
        .set({ status, reviewedBy, reviewNotes })
        .where(eq(schema.leaveRequests.id, id))
        .returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 8. Certificates CRUD
  async getCertificates() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.certificates).orderBy(desc(schema.certificates.createdAt));
    } catch {
      return null;
    }
  },

  async getCertificate(id: string) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id)).limit(1);
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async insertCertificate(data: typeof schema.certificates.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.certificates).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  async revokeCertificate(id: string) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db
        .update(schema.certificates)
        .set({ status: "Revoked" })
        .where(eq(schema.certificates.id, id))
        .returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 9. Announcements CRUD
  async getAnnouncements() {
    if (!isSupabaseConnected()) return null;
    try {
      return await db.select().from(schema.announcements).orderBy(desc(schema.announcements.createdAt));
    } catch {
      return null;
    }
  },

  async insertAnnouncement(data: typeof schema.announcements.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.announcements).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // 10. Audit Logs CRUD
  async logAudit(actor: string, action: string, entity: string, entityId?: string, details?: string) {
    if (!isSupabaseConnected()) return null;
    try {
      await db.insert(schema.auditLogs).values({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor,
        action,
        entity,
        entityId: entityId || null,
        details: details || null,
      });
      return true;
    } catch {
      return false;
    }
  },

  // 11. Domain Entity Synchronizers (Upsert)
  async syncIntern(intern: import("./types").InternRecord) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.interns.$inferInsert = {
        id: intern.id,
        fullName: intern.fullName,
        fatherName: intern.fatherName || null,
        cnic: intern.cnicOrStudentId || null,
        email: intern.email,
        phone: intern.phone || null,
        city: intern.city || null,
        university: intern.university || null,
        degree: intern.degree || null,
        semester: intern.semester || null,
        cgpa: intern.cgpa || null,
        departmentId: intern.fieldId || null,
        departmentName: intern.fieldName || null,
        batchId: intern.batchId || null,
        batchName: intern.batchName || null,
        duration: `${intern.durationMonths} Months`,
        startDate: intern.startDate,
        endDate: intern.endDate,
        mentorId: intern.mentorId || null,
        mentorName: intern.mentorName || null,
        status: intern.internshipStatus || "Active",
        progress: intern.progressPercentage || 0,
        cvUrl: intern.cvFileName || null,
        githubUrl: intern.githubUrl || null,
        linkedinUrl: intern.linkedinUrl || null,
        portfolioUrl: intern.portfolioUrl || null,
        skills: Array.isArray(intern.skills) ? intern.skills.join(", ") : String(intern.skills || ""),
      };
      return await db
        .insert(schema.interns)
        .values(row)
        .onConflictDoUpdate({
          target: schema.interns.id,
          set: { ...row, updatedAt: new Date() },
        })
        .returning();
    } catch (e) {
      console.warn("[Supabase] Failed to sync intern:", e);
      return null;
    }
  },

  async syncTask(task: import("./types").TaskItem) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.tasks.$inferInsert = {
        id: task.id,
        title: task.title,
        description: task.description,
        internId: task.internRecordId,
        mentorName: task.assignedByName,
        deadline: task.deadline,
        attachmentUrl: task.attachmentName || null,
        status: task.status,
        submissionLink: task.submissionLink || task.submissionFileName || null,
        submissionNotes: task.submissionNotes || null,
        feedback: task.mentorComments || null,
      };
      return await db
        .insert(schema.tasks)
        .values(row)
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncEvaluation(ev: import("./types").EvaluationRecord) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.evaluations.$inferInsert = {
        id: ev.id,
        internId: ev.internRecordId,
        mentorId: ev.mentorId || null,
        mentorName: ev.mentorName,
        technicalScore: ev.technicalSkills,
        punctualityScore: ev.punctuality,
        communicationScore: ev.communication,
        teamworkScore: ev.teamwork,
        finalGrade: ev.grade,
        feedback: ev.remarks,
      };
      return await db
        .insert(schema.evaluations)
        .values(row)
        .onConflictDoUpdate({
          target: schema.evaluations.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncLeave(lv: import("./types").LeaveRequest) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.leaveRequests.$inferInsert = {
        id: lv.id,
        internId: lv.internRecordId,
        startDate: lv.startDate,
        endDate: lv.endDate,
        reason: lv.reason,
        status: lv.status,
        reviewedBy: lv.reviewedBy || null,
      };
      return await db
        .insert(schema.leaveRequests)
        .values(row)
        .onConflictDoUpdate({
          target: schema.leaveRequests.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncCertificate(c: import("./types").CertificateRecord) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.certificates.$inferInsert = {
        id: c.id,
        internId: c.internRecordId,
        internName: c.internName,
        field: c.fieldName,
        duration: `${c.durationMonths} Months`,
        startDate: c.startDate,
        endDate: c.endDate,
        issueDate: c.issueDate,
        issuedBy: c.signatoryName || "Logix Technologies",
        qrCodeData: c.certificateNumber,
        verificationUrl: `/verify?cert=${c.certificateNumber}`,
        grade: c.grade,
        status: c.status,
      };
      return await db
        .insert(schema.certificates)
        .values(row)
        .onConflictDoUpdate({
          target: schema.certificates.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncAnnouncement(ann: import("./types").AnnouncementItem) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.announcements.$inferInsert = {
        id: ann.id,
        title: ann.title,
        message: ann.content,
        targetField: ann.targetAudience,
        targetBatch: "All",
        author: ann.authorName,
        priority: ann.priority,
      };
      return await db
        .insert(schema.announcements)
        .values(row)
        .onConflictDoUpdate({
          target: schema.announcements.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncDepartment(dept: import("./types").FieldDepartment) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.departments.$inferInsert = {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        seats: dept.totalSeats,
        active: dept.active,
      };
      return await db
        .insert(schema.departments)
        .values(row)
        .onConflictDoUpdate({
          target: schema.departments.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncBatch(b: import("./types").BatchCohort) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.batches.$inferInsert = {
        id: b.id,
        name: b.name,
        startDate: b.startDate,
        endDate: b.endDate,
        active: b.status !== "Completed",
      };
      return await db
        .insert(schema.batches)
        .values(row)
        .onConflictDoUpdate({
          target: schema.batches.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },

  async syncDuration(d: import("./types").DurationOption) {
    if (!isSupabaseConnected()) return null;
    try {
      const row: typeof schema.durations.$inferInsert = {
        id: d.id,
        months: d.months,
        label: d.label,
        active: d.active,
      };
      return await db
        .insert(schema.durations)
        .values(row)
        .onConflictDoUpdate({
          target: schema.durations.id,
          set: row,
        })
        .returning();
    } catch {
      return null;
    }
  },
};
