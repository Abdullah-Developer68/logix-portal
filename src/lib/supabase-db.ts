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
 * Supabase PostgreSQL CRUD Operations via Drizzle ORM
 */
export const supabaseDb = {
  // Interns CRUD
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

  // Tasks CRUD
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

  // Evaluations CRUD
  async insertEvaluation(data: typeof schema.evaluations.$inferInsert) {
    if (!isSupabaseConnected()) return null;
    try {
      const res = await db.insert(schema.evaluations).values(data).returning();
      return res[0] || null;
    } catch {
      return null;
    }
  },

  // Certificates CRUD
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

  // Audit Logs CRUD
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
};
