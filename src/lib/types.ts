export type UserRole = "admin" | "mentor" | "intern";

export type ApplicationStatus = "Pending" | "Approved" | "Rejected";

export type InternshipStatus =
  | "Applied"
  | "Active"
  | "Completed"
  | "Terminated"
  | "Dropped";

export type TaskStatus =
  | "Assigned"
  | "Submitted"
  | "Approved"
  | "Needs Revision"
  | "Rejected";

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type CertificateStatus = "Valid" | "Revoked" | "Re-issued";

export interface UserAccount {
  id: string;
  email: string;
  username?: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  emailVerified: boolean;
  verificationCode?: string;
  resetCode?: string;
  internRecordId?: string;
  mentorId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface FieldDepartment {
  id: string;
  name: string;
  code: string;
  podName: string;
  description: string;
  totalSeats: number;
  filledSeats: number;
  active: boolean;
  defaultSkills: string[];
}

export interface DurationOption {
  id: string;
  months: number;
  label: string;
  weeks: number;
  active: boolean;
  description: string;
}

export interface BatchCohort {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: "Upcoming" | "Active" | "Completed";
  description: string;
}

export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  department: string;
  avatarInitials: string;
  bio: string;
}

export interface InternRecord {
  id: string;
  internId: string; // e.g., LGX-INT-2026-001
  userId?: string;
  // Personal Details
  fullName: string;
  fatherName: string;
  cnicOrStudentId: string;
  email: string;
  phone: string;
  city: string;
  photoUrl?: string;
  // Education Details
  university: string;
  degree: string;
  semester: string;
  cgpa: string;
  // Internship Placement Details
  fieldId: string;
  fieldName: string;
  durationMonths: number;
  startPreference: string;
  startDate: string;
  endDate: string; // Auto-calculated from startDate + durationMonths
  batchId: string;
  batchName: string;
  mentorId: string;
  mentorName: string;
  // Uploads & Links
  cvFileName: string;
  cvFileSize: number;
  cvStorageKey?: string;
  coverLetter?: string;
  skills: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  // Status & Lifecycle
  applicationStatus: ApplicationStatus;
  internshipStatus: InternshipStatus;
  archived: boolean;
  // Calculated Metrics
  progressPercentage: number;
  attendancePercentage: number;
  appliedAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  internRecordId: string;
  internId: string;
  internName: string;
  fieldName: string;
  assignedByMentorId: string;
  assignedByName: string;
  deadline: string;
  priority: "Low" | "Medium" | "High";
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentStorageKey?: string;
  status: TaskStatus;
  submissionLink?: string;
  submissionFileName?: string;
  submissionStorageKey?: string;
  submissionNotes?: string;
  submittedAt?: string;
  mentorComments?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  internRecordId: string;
  internId: string;
  internName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  internRecordId: string;
  internId: string;
  internName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface EvaluationRecord {
  id: string;
  internRecordId: string;
  internId: string;
  internName: string;
  fieldName: string;
  mentorId: string;
  mentorName: string;
  technicalSkills: number; // out of 25
  punctuality: number; // out of 25
  communication: number; // out of 25
  teamwork: number; // out of 25
  totalMarks: number; // out of 100
  grade: "A+" | "A" | "B+" | "B" | "C" | "F";
  remarks: string;
  completed: boolean;
  evaluatedAt: string;
  // Intern feedback about the internship
  internFeedbackRating?: number; // 1-5
  internFeedbackComments?: string;
  internFeedbackSubmittedAt?: string;
}

export interface CertificateHistoryEntry {
  action: "Issued" | "Revoked" | "Re-issued" | "Verified";
  timestamp: string;
  actor: string;
  note?: string;
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string; // e.g., LGX-CERT-2026-8401
  internRecordId: string;
  internId: string;
  internName: string;
  fatherName: string;
  fieldName: string;
  durationMonths: number;
  batchName: string;
  startDate: string;
  endDate: string;
  issueDate: string;
  grade: string;
  totalMarks: number;
  mentorName: string;
  signatoryName: string;
  signatoryTitle: string;
  status: CertificateStatus;
  revokedReason?: string;
  history: CertificateHistoryEntry[];
}

export interface NotificationItem {
  id: string;
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
  read: boolean;
  emailDispatched: boolean;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetAudience: string; // "All Interns", or specific field/batch name
  priority: "Normal" | "Important" | "Urgent";
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole | "system" | "applicant";
  action: string;
  entityType:
    | "Auth"
    | "Application"
    | "InternRecord"
    | "Field"
    | "Duration"
    | "Batch"
    | "Task"
    | "Attendance"
    | "Leave"
    | "Evaluation"
    | "Certificate"
    | "Announcement"
    | "Backup";
  entityId: string;
  details: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  label: string;
  recordCount: number;
  sizeBytes: number;
  createdBy: string;
}

export interface PortalDatabase {
  users: UserAccount[];
  fields: FieldDepartment[];
  durations: DurationOption[];
  batches: BatchCohort[];
  mentors: MentorProfile[];
  interns: InternRecord[];
  tasks: TaskItem[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  evaluations: EvaluationRecord[];
  certificates: CertificateRecord[];
  notifications: NotificationItem[];
  announcements: AnnouncementItem[];
  auditLogs: AuditLogEntry[];
  backups: BackupSnapshot[];
}
