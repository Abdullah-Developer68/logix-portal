import crypto from "node:crypto";
import { promisify } from "node:util";
import type postgres from "postgres";
import { getSql } from "@/db/client";
import { sendPortalEmail, type EmailPayload } from "./mailer";

type DbQuery = postgres.Sql | postgres.TransactionSql;
import type {
  AuditLogEntry,
  BackupSnapshot,
  BatchCohort,
  DurationOption,
  EvaluationRecord,
  FieldDepartment,
  InternRecord,
  PortalDatabase,
  UserRole,
} from "./types";

const scryptAsync = promisify<
  string | Buffer,
  string | Buffer,
  number,
  crypto.ScryptOptions,
  Buffer
>(crypto.scrypt);

const SCRYPT_OPTIONS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };
const SCRYPT_KEYLEN = 32;

export const DUMMY_PASSWORD_HASH =
  "scrypt:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";

export async function hashPassword(
  password: string,
  customSalt?: string,
): Promise<string> {
  if (!password || password.length > 128) {
    throw new Error("Password length out of bounds.");
  }
  const salt = customSalt || crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!password || !storedHash || password.length > 128) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function verifyDummyPassword(password: string): Promise<void> {
  await verifyPassword(password.slice(0, 128) || "dummy", DUMMY_PASSWORD_HASH);
}

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›"))
    .trim();
}

export function calculateEndDate(
  startDate: string,
  durationMonths: number,
): string {
  if (!startDate) return "";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + Number(durationMonths || 3));
  return d.toISOString().split("T")[0];
}

export function calculateGrade(
  totalMarks: number,
): EvaluationRecord["grade"] {
  if (totalMarks >= 90) return "A+";
  if (totalMarks >= 80) return "A";
  if (totalMarks >= 70) return "B+";
  if (totalMarks >= 60) return "B";
  if (totalMarks >= 50) return "C";
  return "F";
}

function createReferenceSeed(): {
  fields: FieldDepartment[];
  durations: DurationOption[];
  batches: BatchCohort[];
} {
  return {
    fields: [
      {
        id: "fld-web",
        name: "Web Development",
        code: "WEB",
        podName: "Web Platform Pod",
        description:
          "Full-stack modern web engineering using Next.js App Router, React 19, TypeScript, Tailwind CSS, and scalable APIs.",
        totalSeats: 25,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js"],
      },
      {
        id: "fld-app",
        name: "App Development",
        code: "APP",
        podName: "Mobile Engineering Pod",
        description:
          "Cross-platform mobile engineering with React Native, Flutter, offline-first storage, and native device integrations.",
        totalSeats: 15,
        filledSeats: 0,
        active: true,
        defaultSkills: ["React Native", "Flutter", "TypeScript", "REST APIs"],
      },
      {
        id: "fld-ai",
        name: "AI / Machine Learning",
        code: "AIML",
        podName: "AI & Automation Pod",
        description:
          "Applied LLM orchestration, RAG pipelines, Python model evaluation, and intelligent workflow automation.",
        totalSeats: 15,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Python", "PyTorch", "RAG / LLMs", "FastAPI"],
      },
      {
        id: "fld-uiux",
        name: "UI/UX Design",
        code: "UIUX",
        podName: "Design Systems Pod",
        description:
          "Tokenized design systems in Figma, interactive prototyping, accessibility (WCAG AA), and user research.",
        totalSeats: 12,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Figma", "Design Systems", "Prototyping", "UX Research"],
      },
      {
        id: "fld-qa",
        name: "Software Testing & QA",
        code: "QA",
        podName: "Quality Engineering Pod",
        description:
          "End-to-end automated testing with Playwright, API contract validation, performance benchmarking, and CI/CD gates.",
        totalSeats: 10,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Playwright", "Cypress", "API Testing", "GitHub Actions"],
      },
      {
        id: "fld-dm",
        name: "Digital Marketing & Growth",
        code: "DM",
        podName: "Growth & Brand Pod",
        description:
          "Technical SEO, product positioning, developer advocacy, conversion analytics, and content campaigns.",
        totalSeats: 10,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Technical SEO", "Analytics", "Content Strategy", "Copywriting"],
      },
      {
        id: "fld-cloud",
        name: "Cloud & DevOps",
        code: "CLOUD",
        podName: "Infrastructure Pod",
        description:
          "Docker containerization, Kubernetes, Terraform IaC, observability stacks, and zero-downtime cloud deployments.",
        totalSeats: 10,
        filledSeats: 0,
        active: true,
        defaultSkills: ["Docker", "AWS / GCP", "CI/CD", "Linux"],
      },
    ],
    durations: [
      {
        id: "dur-1",
        months: 1,
        label: "1 Month (Intensive Bootcamp)",
        weeks: 4,
        active: true,
        description: "Fast-paced 4-week sprint ideal for semester breaks.",
      },
      {
        id: "dur-2",
        months: 2,
        label: "2 Months (Summer/Winter Track)",
        weeks: 8,
        active: true,
        description: "8-week structured project track with mid-term and final evaluations.",
      },
      {
        id: "dur-3",
        months: 3,
        label: "3 Months (Standard Cohort)",
        weeks: 12,
        active: true,
        description: "Core 12-week engineering internship with production pod rotation.",
      },
      {
        id: "dur-6",
        months: 6,
        label: "6 Months (Industrial Placement)",
        weeks: 24,
        active: true,
        description: "Deep 24-week industrial fellowship with pathway to full-time offer.",
      },
    ],
    batches: [
      {
        id: "bat-summer-26",
        name: "Summer 2026 Batch",
        code: "SUM-2026",
        startDate: "2026-07-01",
        endDate: "2026-10-01",
        status: "Completed",
        description: "Summer 2026 remote engineering & design fellowship cohort.",
      },
      {
        id: "bat-autumn-26",
        name: "Autumn 2026 Batch",
        code: "AUT-2026",
        startDate: "2026-09-01",
        endDate: "2026-12-01",
        status: "Active",
        description:
          "Fall semester cohort focused on Next.js 16, AI agents, and design systems.",
      },
      {
        id: "bat-winter-26",
        name: "Winter 2026 Batch",
        code: "WIN-2026",
        startDate: "2026-11-01",
        endDate: "2027-01-31",
        status: "Upcoming",
        description: "Winter 2026 cohort currently accepting student applications.",
      },
    ],
  };
}

function createEmptyDatabase(): PortalDatabase {
  return {
    users: [],
    fields: [],
    durations: [],
    batches: [],
    mentors: [],
    interns: [],
    tasks: [],
    attendance: [],
    leaves: [],
    evaluations: [],
    certificates: [],
    notifications: [],
    announcements: [],
    auditLogs: [],
    backups: [],
  };
}

const PORTAL_COLLECTIONS = [
  "users",
  "fields",
  "durations",
  "batches",
  "mentors",
  "interns",
  "tasks",
  "attendance",
  "leaves",
  "evaluations",
  "certificates",
  "notifications",
  "announcements",
  "auditLogs",
] as const;

type PortalCollectionKey = (typeof PORTAL_COLLECTIONS)[number];

const PORTAL_COLLECTION_SET = new Set<string>(PORTAL_COLLECTIONS);
const PORTAL_MUTATION_LOCK_ID = 72638491023481;

const snapshotStore = new WeakMap<PortalDatabase, Map<string, string>>();

function makeSnapshotKey(collection: string, id: string): string {
  return `${collection}\0${id}`;
}

function extractRecordCreatedAt(record: Record<string, unknown>): string {
  const candidates = [
    record.timestamp,
    record.createdAt,
    record.appliedAt,
    record.evaluatedAt,
    record.issueDate,
    record.date,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.trim()) {
      const parsed = new Date(val);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

export function recalculateMetrics(db: PortalDatabase): PortalDatabase {
  for (const field of db.fields) {
    field.filledSeats = db.interns.filter(
      (i) =>
        !i.archived &&
        (i.fieldId === field.id || i.fieldName === field.name) &&
        (i.internshipStatus === "Active" || i.internshipStatus === "Completed"),
    ).length;
  }

  for (const intern of db.interns) {
    const internTasks = db.tasks.filter(
      (t) => t.internRecordId === intern.id || t.internId === intern.internId,
    );
    if (internTasks.length > 0) {
      const approvedCount = internTasks.filter(
        (t) => t.status === "Approved",
      ).length;
      const submittedCount = internTasks.filter(
        (t) => t.status === "Submitted",
      ).length;
      const weighted = approvedCount + submittedCount * 0.5;
      intern.progressPercentage = Math.min(
        100,
        Math.round((weighted / internTasks.length) * 100),
      );
    } else if (intern.internshipStatus === "Completed") {
      intern.progressPercentage = 100;
    }

    const internAtt = db.attendance.filter(
      (a) => a.internRecordId === intern.id || a.internId === intern.internId,
    );
    if (internAtt.length > 0) {
      const presentOrLate = internAtt.filter(
        (a) => a.status === "Present" || a.status === "Late",
      ).length;
      intern.attendancePercentage = Math.round(
        (presentOrLate / internAtt.length) * 100,
      );
    }
  }

  return db;
}

export async function loadPortal(tx?: DbQuery): Promise<PortalDatabase> {
  const conn = tx ?? getSql();

  const [recordRows, backupRows] = await Promise.all([
    conn<{ collection: string; id: string; data: Record<string, unknown> }[]>`
      SELECT collection, id, data FROM (
        SELECT collection, id, data, created_at
        FROM portal_records
        WHERE collection NOT IN ('auditLogs', 'notifications')
        ORDER BY created_at DESC
      ) base
      UNION ALL
      SELECT collection, id, data FROM (
        SELECT collection, id, data, created_at
        FROM portal_records
        WHERE collection = 'auditLogs'
        ORDER BY created_at DESC
        LIMIT 300
      ) aud
      UNION ALL
      SELECT collection, id, data FROM (
        SELECT collection, id, data, created_at
        FROM portal_records
        WHERE collection = 'notifications'
        ORDER BY created_at DESC
        LIMIT 200
      ) ntf
    `,
    conn<{
      id: string;
      created_at: Date | string;
      label: string | null;
      created_by: string | null;
      record_count: number | null;
      size_bytes: number | null;
    }[]>`
      SELECT id, created_at, label, created_by, record_count, size_bytes
      FROM portal_backups
      ORDER BY created_at DESC
    `,
  ]);

  const db = createEmptyDatabase();
  const snapshotMap = new Map<string, string>();

  for (const row of recordRows) {
    if (!PORTAL_COLLECTION_SET.has(row.collection)) continue;
    const col = row.collection as PortalCollectionKey;
    const data =
      typeof row.data === "string"
        ? (JSON.parse(row.data) as Record<string, unknown>)
        : row.data;
    (db[col] as unknown[]).push(data);
    snapshotMap.set(makeSnapshotKey(col, row.id), JSON.stringify(data));
  }

  db.durations.sort((a, b) => a.months - b.months);

  db.backups = backupRows.map((b) => ({
    id: b.id,
    timestamp:
      b.created_at instanceof Date
        ? b.created_at.toISOString()
        : new Date(b.created_at).toISOString(),
    label: b.label ?? "",
    recordCount: b.record_count ?? 0,
    sizeBytes: b.size_bytes ?? 0,
    createdBy: b.created_by ?? "system",
  }));

  snapshotStore.set(db, snapshotMap);
  return recalculateMetrics(db);
}

export async function savePortal(
  tx: DbQuery,
  db: PortalDatabase,
): Promise<void> {
  const prevSnapshot =
    snapshotStore.get(db) ?? new Map<string, string>();
  const nextSnapshot = new Map<string, string>();

  const toInsert: {
    collection: string;
    id: string;
    data: Record<string, unknown>;
    created_at: string;
  }[] = [];
  const toUpdate: {
    collection: string;
    id: string;
    data: Record<string, unknown>;
  }[] = [];
  const toDelete: { collection: string; id: string }[] = [];

  for (const collection of PORTAL_COLLECTIONS) {
    const records = db[collection] as unknown as Array<
      Record<string, unknown> & { id: string }
    >;
    for (const record of records) {
      if (!record || typeof record.id !== "string" || !record.id) continue;
      const key = makeSnapshotKey(collection, record.id);
      const serialized = JSON.stringify(record);
      nextSnapshot.set(key, serialized);

      const prevSerialized = prevSnapshot.get(key);
      if (prevSerialized === undefined) {
        toInsert.push({
          collection,
          id: record.id,
          data: record,
          created_at: extractRecordCreatedAt(record),
        });
      } else if (prevSerialized !== serialized) {
        toUpdate.push({
          collection,
          id: record.id,
          data: record,
        });
      }
    }
  }

  for (const key of prevSnapshot.keys()) {
    if (!nextSnapshot.has(key)) {
      const sepIdx = key.indexOf("\0");
      if (sepIdx !== -1) {
        toDelete.push({
          collection: key.slice(0, sepIdx),
          id: key.slice(sepIdx + 1),
        });
      }
    }
  }

  if (toInsert.length > 0) {
    const payload = JSON.stringify(toInsert);
    await tx`
      INSERT INTO portal_records (collection, id, data, created_at, updated_at)
      SELECT r.collection, r.id, r.data, r.created_at, now()
      FROM jsonb_to_recordset(${payload}::text::jsonb)
        AS r(collection text, id text, data jsonb, created_at timestamptz)
      ON CONFLICT (collection, id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = now()
    `;
  }

  if (toUpdate.length > 0) {
    const payload = JSON.stringify(toUpdate);
    await tx`
      UPDATE portal_records AS p
      SET data = r.data,
          updated_at = now()
      FROM jsonb_to_recordset(${payload}::text::jsonb)
        AS r(collection text, id text, data jsonb)
      WHERE p.collection = r.collection
        AND p.id = r.id
    `;
  }

  if (toDelete.length > 0) {
    const payload = JSON.stringify(toDelete);
    await tx`
      DELETE FROM portal_records AS p
      USING jsonb_to_recordset(${payload}::text::jsonb)
        AS r(collection text, id text)
      WHERE p.collection = r.collection
        AND p.id = r.id
    `;
  }

  snapshotStore.set(db, nextSnapshot);
}

export interface MutateContext {
  outbox: EmailPayload[];
  tx: postgres.TransactionSql;
}

export async function readPortal(): Promise<PortalDatabase> {
  const db = await loadPortal();
  if (db.fields.length === 0) {
    const seed = createReferenceSeed();
    db.fields = seed.fields;
    if (db.durations.length === 0) db.durations = seed.durations;
    if (db.batches.length === 0) db.batches = seed.batches;
  }
  return recalculateMetrics(db);
}

export async function mutatePortal<T>(
  fn: (db: PortalDatabase, ctx: MutateContext) => Promise<T> | T,
): Promise<T> {
  const sql = getSql();
  const outbox: EmailPayload[] = [];

  const result = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${PORTAL_MUTATION_LOCK_ID})`;
    const db = await loadPortal(tx);

    if (db.fields.length === 0) {
      const seed = createReferenceSeed();
      db.fields = seed.fields;
      if (db.durations.length === 0) db.durations = seed.durations;
      if (db.batches.length === 0) db.batches = seed.batches;
    }

    const res = await fn(db, { outbox, tx });
    recalculateMetrics(db);
    await savePortal(tx, db);
    return res;
  });

  for (const email of outbox) {
    try {
      await sendPortalEmail(email);
    } catch (err) {
      console.error("[OUTBOX EMAIL ERROR]", err);
    }
  }

  return result;
}

export async function createPortalBackup(
  tx: DbQuery,
  db: PortalDatabase,
  label: string,
  createdBy: string,
): Promise<BackupSnapshot> {
  const id = `bkp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const timestamp = new Date().toISOString();

  const snapshotObj: Record<string, unknown> = {};
  for (const col of PORTAL_COLLECTIONS) {
    snapshotObj[col] = db[col];
  }
  const serialized = JSON.stringify(snapshotObj);
  const sizeBytes = Buffer.byteLength(serialized, "utf8");
  const recordCount =
    db.users.length +
    db.interns.length +
    db.tasks.length +
    db.attendance.length +
    db.evaluations.length +
    db.certificates.length;
  const finalLabel = label || `Manual Backup (${timestamp.slice(0, 10)})`;

  await tx`
    INSERT INTO portal_backups (id, created_at, label, created_by, record_count, size_bytes, snapshot)
    VALUES (${id}, ${timestamp}::timestamptz, ${finalLabel}, ${createdBy}, ${recordCount}, ${sizeBytes}, ${serialized}::text::jsonb)
  `;

  const meta: BackupSnapshot = {
    id,
    timestamp,
    label: finalLabel,
    recordCount,
    sizeBytes,
    createdBy,
  };
  db.backups.unshift(meta);
  return meta;
}

export function appendAuditLog(
  db: PortalDatabase,
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
) {
  db.auditLogs.unshift({
    id: `aud-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

export function generateNextInternId(db: PortalDatabase): string {
  const year = new Date().getFullYear();
  const re = new RegExp(`^LGX-INT-${year}-(\\d+)$`);
  const maxNum = db.interns.reduce((max, item) => {
    const match = item.internId.match(re);
    if (match) {
      const n = parseInt(match[1], 10);
      return n > max ? n : max;
    }
    return max;
  }, 0);
  const next = String(maxNum + 1).padStart(3, "0");
  return `LGX-INT-${year}-${next}`;
}

export function generateCertificateNumber(db: PortalDatabase): string {
  const year = new Date().getFullYear();
  const re = new RegExp(`^LGX-CERT-${year}-(\\d+)$`);
  const maxNum = db.certificates.reduce((max, cert) => {
    const match = cert.certificateNumber.match(re);
    if (match) {
      const n = parseInt(match[1], 10);
      return n > max ? n : max;
    }
    return max;
  }, 8400);
  return `LGX-CERT-${year}-${maxNum + 1}`;
}

export function addPortalNotification(
  db: PortalDatabase,
  params: {
    recipientRole: UserRole | "all";
    recipientEmail?: string;
    recipientInternRecordId?: string;
    title: string;
    message: string;
    category:
      | "application"
      | "status"
      | "task"
      | "evaluation"
      | "certificate"
      | "announcement"
      | "attendance";
    emailDispatched?: boolean;
  },
) {
  db.notifications.unshift({
    id: `ntf-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    recipientRole: params.recipientRole,
    recipientEmail: params.recipientEmail,
    recipientInternRecordId: params.recipientInternRecordId,
    title: params.title,
    message: params.message,
    category: params.category,
    read: false,
    emailDispatched: params.emailDispatched ?? true,
    createdAt: new Date().toISOString(),
  });
}

export type { InternRecord };
