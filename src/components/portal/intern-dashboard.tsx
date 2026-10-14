"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import {
  CertificateModal,
  type DocumentType,
} from "@/components/portal/certificate-modal";
import type {
  PortalDatabase,
  InternRecord,
  TaskItem,
} from "@/lib/types";
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  Send,
  Star,
  Sparkles,
  ExternalLink,
  Megaphone,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

export function InternDashboard({
  db,
  intern,
  onMutate,
}: {
  db: PortalDatabase;
  intern: InternRecord;
  onMutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "attendance" | "evaluation" | "certificates"
  >("overview");

  // Task submission state
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionFileName, setSubmissionFileName] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");

  // Leave request state
  const [leaveStart, setLeaveStart] = useState("2026-10-22");
  const [leaveEnd, setLeaveEnd] = useState("2026-10-23");
  const [leaveReason, setLeaveReason] = useState("");

  // Intern feedback state
  const existingEval = db.evaluations.find(
    (e) => e.internRecordId === intern.id || e.internId === intern.internId,
  );
  const [feedbackRating, setFeedbackRating] = useState(
    existingEval?.internFeedbackRating || 5,
  );
  const [feedbackComments, setFeedbackComments] = useState(
    existingEval?.internFeedbackComments || "",
  );

  // Document viewer modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalType, setDocModalType] = useState<DocumentType>("certificate");

  const myTasks = db.tasks.filter(
    (t) => t.internRecordId === intern.id || t.internId === intern.internId,
  );
  const myAttendance = db.attendance.filter(
    (a) => a.internRecordId === intern.id || a.internId === intern.internId,
  );
  const myLeaves = db.leaves.filter(
    (l) => l.internRecordId === intern.id || l.internId === intern.internId,
  );
  const myCertificate = db.certificates.find(
    (c) => c.internRecordId === intern.id || c.internId === intern.internId,
  );
  const relevantAnnouncements = db.announcements.filter(
    (a) =>
      a.targetAudience === "All Interns" ||
      a.targetAudience === intern.fieldName ||
      a.targetAudience === intern.batchName,
  );

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!submissionLink.trim() && !submissionFile) return;
    let submissionStorageKey = "";
    if (submissionFile) {
      const formData = new FormData();
      formData.append("file", submissionFile);
      formData.append("kind", "task_submission");
      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) return;
      submissionStorageKey = uploadData.storageKey;
    }
    const ok = await onMutate({
      action: "submit_task",
      taskId: selectedTask.id,
      submissionLink,
      submissionFileName: submissionFile?.name || submissionFileName,
      submissionStorageKey,
      submissionNotes,
      actorName: intern.fullName,
      actorEmail: intern.email,
      actorRole: "intern",
    });
    if (ok) {
      setSelectedTask(null);
      setSubmissionLink("");
      setSubmissionFileName("");
      setSubmissionFile(null);
      setSubmissionNotes("");
    }
  };

  const handleCheckInToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    await onMutate({
      action: "mark_attendance",
      internRecordId: intern.id,
      date: today,
      status: "Present",
      notes: "Checked in via Intern Portal Dashboard",
      actorName: intern.fullName,
      actorEmail: intern.email,
      actorRole: "intern",
    });
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;
    const ok = await onMutate({
      action: "request_leave",
      internRecordId: intern.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason,
      actorName: intern.fullName,
      actorEmail: intern.email,
      actorRole: "intern",
    });
    if (ok) setLeaveReason("");
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate({
      action: "submit_intern_feedback",
      internRecordId: intern.id,
      rating: feedbackRating,
      comments: feedbackComments,
      actorName: intern.fullName,
      actorEmail: intern.email,
      actorRole: "intern",
    });
  };

  const openDocument = (type: DocumentType) => {
    setDocModalType(type);
    setDocModalOpen(true);
  };

  const initials = intern.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Top Profile Banner */}
      <Card inverted className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar
              initials={initials}
              className="size-16 text-lg ring-2 ring-brand"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand bg-brand/15 px-2.5 py-0.5 rounded border border-brand/30">
                  {intern.internId}
                </span>
                <Badge variant="brand" dot>
                  Status: {intern.internshipStatus}
                </Badge>
                <Badge variant="secondary">
                  Application: {intern.applicationStatus}
                </Badge>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {intern.fullName}
              </h2>
              <p className="text-xs sm:text-sm text-white/75 mt-0.5">
                {intern.fieldName} Intern · {intern.batchName} ({intern.durationMonths}{" "}
                Months: {intern.startDate} → {intern.endDate})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                Task Progress
              </div>
              <div className="text-xl font-bold text-brand mt-0.5">
                {intern.progressPercentage}%
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${intern.progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                Attendance
              </div>
              <div className="text-xl font-bold text-white mt-0.5">
                {intern.attendancePercentage}%
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                Mentor: {intern.mentorName}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl bg-white/10 border border-white/15 px-4 py-3 flex flex-col justify-between">
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                Certificate Status
              </div>
              {myCertificate ? (
                <button
                  type="button"
                  onClick={() => openDocument("certificate")}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  <Award className="size-4" />
                  Download PDF →
                </button>
              ) : (
                <div className="text-xs font-semibold text-white/80 mt-1">
                  {intern.internshipStatus === "Completed"
                    ? "Ready for Admin Issue"
                    : "In Progress"}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "overview", label: "My Profile & Placement" },
          { id: "tasks", label: `My Tasks (${myTasks.length})` },
          { id: "attendance", label: "Attendance & Leave" },
          { id: "evaluation", label: "Evaluation & Feedback" },
          { id: "certificates", label: "Certificates & Letters" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setActiveTab(
                t.id as
                  | "overview"
                  | "tasks"
                  | "attendance"
                  | "evaluation"
                  | "certificates",
              )
            }
            className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-5">
            <h3 className="text-lg font-bold text-primary">
              Personal, Academic & Placement Record
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  Full Name & Father&apos;s Name
                </span>
                <div className="font-semibold text-foreground mt-0.5">
                  {intern.fullName} (S/D/O {intern.fatherName})
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  CNIC / Student ID
                </span>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  {intern.cnicOrStudentId}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  University & Degree
                </span>
                <div className="font-semibold text-foreground mt-0.5">
                  {intern.university} — {intern.degree}
                </div>
                <div className="text-xs text-muted-foreground">
                  {intern.semester} · CGPA: {intern.cgpa}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  Contact & City
                </span>
                <div className="font-semibold text-foreground mt-0.5">
                  {intern.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {intern.phone} · {intern.city}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  Assigned Supervisor / Mentor
                </span>
                <div className="font-semibold text-brand-strong mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="size-4" />
                  <span>{intern.mentorName}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <span className="text-[11px] uppercase text-muted-foreground font-semibold">
                  Tenure & Auto-Calculated End Date
                </span>
                <div className="font-semibold text-foreground mt-0.5">
                  {intern.startDate} → {intern.endDate} ({intern.durationMonths}{" "}
                  Months)
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Skills & Links
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {intern.skills.map((s) => (
                  <Badge key={s} variant="brand">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-brand-strong">
                {intern.githubUrl && (
                  <a
                    href={intern.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    GitHub <ExternalLink className="size-3" />
                  </a>
                )}
                {intern.linkedinUrl && (
                  <a
                    href={intern.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                LinkedIn <ExternalLink className="size-3" />
                  </a>
                )}
                {intern.portfolioUrl && (
                  <a
                    href={intern.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Portfolio <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* Announcements & Quick Actions */}
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-strong">
                <Megaphone className="size-4" />
                <span>Cohort Announcements</span>
              </div>
              {relevantAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-xl border border-border bg-muted/50 p-3.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-foreground">{ann.title}</strong>
                    <Badge variant="outline">{ann.targetAudience}</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </Card>

            <Card className="p-5 space-y-3">
              <h4 className="text-sm font-bold text-primary">
                Quick Portal Actions
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={handleCheckInToday}
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  Mark Today&apos;s Attendance (Present)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openDocument("offer_letter")}
                  className="w-full justify-center cursor-pointer"
                >
                  <FileText className="size-4" />
                  Download Offer Letter PDF
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS & SUBMISSIONS */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {myTasks.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No tasks assigned yet for your cohort.
            </Card>
          ) : (
            myTasks.map((task) => (
              <Card
                key={task.id}
                className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        task.status === "Approved"
                          ? "brand"
                          : task.status === "Needs Revision" ||
                              task.status === "Rejected"
                            ? "default"
                            : "secondary"
                      }
                      dot
                    >
                      {task.status}
                    </Badge>
                    <Badge variant="outline">Priority: {task.priority}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3.5" /> Due: {task.deadline}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-primary">
                    {task.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {task.description}
                  </p>

                  {task.submissionLink && (
                    <div className="text-xs text-brand-strong font-medium">
                      Submitted Link:{" "}
                      <a
                        href={task.submissionLink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {task.submissionLink}
                      </a>
                    </div>
                  )}

                  {task.mentorComments && (
                    <div className="rounded-lg border border-brand/30 bg-accent/50 p-3 text-xs text-foreground">
                      <strong>Mentor Review ({task.assignedByName}):</strong>{" "}
                      {task.mentorComments}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <Button
                    type="button"
                    variant={
                      task.status === "Approved" ? "outline" : "brand"
                    }
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setSubmissionLink(task.submissionLink || "");
                      setSubmissionNotes(task.submissionNotes || "");
                    }}
                    className="cursor-pointer font-semibold"
                  >
                    <Send className="size-3.5" />
                    {task.status === "Assigned"
                      ? "Submit Work"
                      : "Update Submission"}
                  </Button>
                </div>
              </Card>
            ))
          )}

          {selectedTask && (
            <Card className="p-6 border-2 border-brand bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-primary">
                  Submit Work: {selectedTask.title}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-primary">
                      GitHub PR / Deployment Link
                    </label>
                    <Input
                      placeholder="https://github.com/..."
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-primary">
                      Attachment (Optional)
                    </label>
                    <Input
                      type="file"
                      accept=".pdf,.zip,.txt,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSubmissionFile(file);
                        setSubmissionFileName(file?.name || "");
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-primary">
                    Implementation Notes
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Summarize what you built, test results, or questions for your mentor..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  className="cursor-pointer font-semibold"
                >
                  Submit Deliverable for Mentor Review →
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE & LEAVE */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">
                  Attendance Log ({intern.attendancePercentage}%)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Daily check-ins recorded for your internship cohort.
                </p>
              </div>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={handleCheckInToday}
                className="cursor-pointer font-semibold"
              >
                <CheckCircle2 className="size-3.5" />
                Check In Today
              </Button>
            </div>

            <div className="space-y-2">
              {myAttendance.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-foreground">
                      {a.date}
                    </span>
                    {a.checkInTime && (
                      <span className="ml-2 text-muted-foreground">
                        ({a.checkInTime})
                      </span>
                    )}
                    {a.notes && (
                      <p className="text-muted-foreground mt-0.5">{a.notes}</p>
                    )}
                  </div>
                  <Badge
                    variant={a.status === "Present" ? "brand" : "secondary"}
                  >
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-primary">
              Request Leave (Requires Admin Approval)
            </h3>
            <form onSubmit={handleLeaveSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-primary">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-primary">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Reason for Leave
                </label>
                <Textarea
                  rows={2}
                  required
                  placeholder="e.g. University final examination or medical appointment..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="cursor-pointer"
              >
                Submit Leave Request
              </Button>
            </form>

            <div className="pt-4 border-t border-border space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Leave Requests
              </h4>
              {myLeaves.map((lv) => (
                <div
                  key={lv.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {lv.startDate} → {lv.endDate}
                    </div>
                    <div className="text-muted-foreground">{lv.reason}</div>
                  </div>
                  <Badge
                    variant={
                      lv.status === "Approved"
                        ? "brand"
                        : lv.status === "Rejected"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {lv.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: EVALUATION & FEEDBACK */}
      {activeTab === "evaluation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                Mentor Performance Evaluation
              </h3>
              {existingEval?.completed ? (
                <Badge variant="brand" dot>
                  Grade {existingEval.grade} ({existingEval.totalMarks}/100)
                </Badge>
              ) : (
                <Badge variant="secondary">Pending Final Evaluation</Badge>
              )}
            </div>

            {existingEval?.completed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <span className="text-muted-foreground">
                      Technical Skills
                    </span>
                    <div className="text-lg font-bold text-primary mt-0.5">
                      {existingEval.technicalSkills} / 25
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <span className="text-muted-foreground">Punctuality</span>
                    <div className="text-lg font-bold text-primary mt-0.5">
                      {existingEval.punctuality} / 25
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <span className="text-muted-foreground">Communication</span>
                    <div className="text-lg font-bold text-primary mt-0.5">
                      {existingEval.communication} / 25
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <span className="text-muted-foreground">Teamwork</span>
                    <div className="text-lg font-bold text-primary mt-0.5">
                      {existingEval.teamwork} / 25
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-brand/30 bg-accent/40 p-4 text-xs sm:text-sm">
                  <div className="font-bold text-brand-strong mb-1">
                    Supervisor Remarks ({existingEval.mentorName}):
                  </div>
                  <p className="text-foreground">{existingEval.remarks}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/40 p-6 text-center text-xs sm:text-sm text-muted-foreground">
                <Clock className="size-6 mx-auto text-brand-strong mb-2" />
                Your mentor ({intern.mentorName}) will complete your final
                performance evaluation at the end of your cohort so your
                Completion Certificate can be issued.
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-primary">
              Intern Experience Feedback Form
            </h3>
            <p className="text-xs text-muted-foreground">
              Share your feedback about mentorship quality, project learning,
              and overall internship experience at Logix.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-primary">
                  Overall Rating (1 to 5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                        feedbackRating >= star
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <Star className="size-3.5 fill-current" />
                      {star}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-primary">
                  Your Internship Review & Suggestions
                </label>
                <Textarea
                  rows={4}
                  required
                  placeholder="How was your experience working with your mentor and engineering pod?"
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                className="cursor-pointer font-semibold"
              >
                <Sparkles className="size-4" />
                Save My Internship Feedback
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 5: CERTIFICATES & LETTERS */}
      {activeTab === "certificates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-6 flex flex-col justify-between gap-4 border-2 border-brand/40">
            <div>
              <Badge variant="brand" dot>
                {myCertificate
                  ? `Issued: ${myCertificate.certificateNumber}`
                  : "Requires Completed Status & Evaluation"}
              </Badge>
              <h3 className="mt-2 text-lg font-bold text-primary">
                Official Certificate of Completion (with QR Code)
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                High-resolution verifiable certificate containing your unique
                certificate number, mentor signature, grade, and public QR
                verification code.
              </p>
            </div>
            <Button
              type="button"
              variant="brand"
              disabled={!myCertificate && intern.internshipStatus !== "Completed"}
              onClick={() => openDocument("certificate")}
              className="w-full justify-center font-semibold cursor-pointer"
            >
              <Award className="size-4" />
              {myCertificate
                ? "View & Download Certificate PDF"
                : "Preview Certificate Template"}
            </Button>
          </Card>

          <Card className="p-6 flex flex-col justify-between gap-4">
            <div>
              <Badge variant="secondary">Official Onboarding Document</Badge>
              <h3 className="mt-2 text-lg font-bold text-primary">
                Internship Offer Letter
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Official offer letter detailing your department placement,
                assigned mentor, start/end dates, and remote work terms.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => openDocument("offer_letter")}
              className="w-full justify-center cursor-pointer"
            >
              <FileText className="size-4" />
              View & Download Offer Letter
            </Button>
          </Card>

          <Card className="p-6 flex flex-col justify-between gap-4">
            <div>
              <Badge variant="secondary">University Submission Ready</Badge>
              <h3 className="mt-2 text-lg font-bold text-primary">
                Internship Completion Letter
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Formal confirmation of completed internship hours, task
                completion rate, and attendance for university credit.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => openDocument("completion_letter")}
              className="w-full justify-center cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              View & Download Completion Letter
            </Button>
          </Card>

          <Card className="p-6 flex flex-col justify-between gap-4">
            <div>
              <Badge variant="secondary">Career & Portfolio Credential</Badge>
              <h3 className="mt-2 text-lg font-bold text-primary">
                Experience & Recommendation Letter
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Detailed recommendation letter highlighting your technical stack,
                evaluation grade, and engineering contributions.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => openDocument("experience_letter")}
              className="w-full justify-center cursor-pointer"
            >
              <ShieldCheck className="size-4" />
              View & Download Experience Letter
            </Button>
          </Card>
        </div>
      )}

      <CertificateModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        intern={intern}
        certificate={myCertificate}
        initialDocType={docModalType}
      />
    </div>
  );
}
