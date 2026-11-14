"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PortalState, TaskStatus } from "@/lib/types";
import {
  Users,
  ClipboardCheck,
  PlusCircle,
  Award,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function getDefaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 86400000);
  return d.toISOString().split("T")[0];
}

export function MentorDashboard({
  db,
  mentorName,
  mentorEmail,
  onMutate,
}: {
  db: PortalState;
  mentorName: string;
  mentorEmail: string;
  onMutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const activeInterns = useMemo(
    () => db.interns.filter((i) => !i.archived),
    [db.interns],
  );

  // New Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskInternId, setTaskInternId] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(getDefaultDeadline);
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High">(
    "High",
  );
  const [taskAttachment, setTaskAttachment] = useState("");
  const [taskAttachmentStorageKey, setTaskAttachmentStorageKey] = useState("");
  const [taskAttachmentUploading, setTaskAttachmentUploading] = useState(false);
  const [taskUploadError, setTaskUploadError] = useState<string | null>(null);
  const [assigningTask, setAssigningTask] = useState(false);

  // Task Review State
  const [reviewComments, setReviewComments] = useState<Record<string, string>>(
    {},
  );
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);

  // Evaluation Form State
  const [evalInternId, setEvalInternId] = useState("");
  const [techScore, setTechScore] = useState(23);
  const [puncScore, setPuncScore] = useState(24);
  const [commScore, setCommScore] = useState(22);
  const [teamScore, setTeamScore] = useState(24);
  const [evalRemarks, setEvalRemarks] = useState(
    "Consistently delivered clean, well-tested code and collaborated effectively during sprint reviews.",
  );
  const [submittingEval, setSubmittingEval] = useState(false);

  const effectiveTaskInternId = activeInterns.some((i) => i.id === taskInternId)
    ? taskInternId
    : activeInterns[0]?.id || "";

  const effectiveEvalInternId = activeInterns.some((i) => i.id === evalInternId)
    ? evalInternId
    : activeInterns[0]?.id || "";

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !effectiveTaskInternId) return;
    setAssigningTask(true);
    try {
      const ok = await onMutate({
        action: "assign_task",
        title: taskTitle,
        description: taskDesc,
        internRecordId: effectiveTaskInternId,
        deadline: taskDeadline,
        priority: taskPriority,
        attachmentName: taskAttachment,
        attachmentStorageKey: taskAttachmentStorageKey,
        actorName: mentorName,
        actorEmail: mentorEmail,
        actorRole: "mentor",
      });
      if (ok) {
        setTaskTitle("");
        setTaskDesc("");
        setTaskAttachment("");
        setTaskAttachmentStorageKey("");
        setTaskUploadError(null);
      }
    } finally {
      setAssigningTask(false);
    }
  };

  const handleTaskAttachment = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setTaskUploadError("Attachment size cannot exceed 4MB.");
      return;
    }
    setTaskUploadError(null);
    setTaskAttachmentUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "task_attachment");
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        storageKey?: string;
        error?: string;
      };
      if (!response.ok || !result.storageKey) {
        throw new Error(result.error || "Attachment upload failed.");
      }
      setTaskAttachment(file.name);
      setTaskAttachmentStorageKey(result.storageKey);
    } catch (error) {
      setTaskUploadError(
        error instanceof Error ? error.message : "Attachment upload failed.",
      );
    } finally {
      setTaskAttachmentUploading(false);
    }
  };

  const handleReviewTask = async (taskId: string, status: TaskStatus) => {
    setReviewingTaskId(taskId);
    try {
      await onMutate({
        action: "review_task",
        taskId,
        status,
        mentorComments:
          reviewComments[taskId] ||
          (status === "Approved"
            ? "Deliverable verified and approved."
            : "Please address the requested revisions."),
        actorName: mentorName,
        actorEmail: mentorEmail,
        actorRole: "mentor",
      });
    } finally {
      setReviewingTaskId(null);
    }
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveEvalInternId) return;
    setSubmittingEval(true);
    try {
      await onMutate({
        action: "submit_evaluation",
        internRecordId: effectiveEvalInternId,
        technicalSkills: techScore,
        punctuality: puncScore,
        communication: commScore,
        teamwork: teamScore,
        remarks: evalRemarks,
        actorName: mentorName,
        actorEmail: mentorEmail,
        actorRole: "mentor",
      });
    } finally {
      setSubmittingEval(false);
    }
  };

  const pendingReviews = useMemo(
    () => db.tasks.filter((t) => t.status === "Submitted"),
    [db.tasks],
  );

  return (
    <div className="space-y-8">
      {/* Mentor KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card inverted className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-white/70">
              Assigned Cohort Interns
            </span>
            <Users className="size-4 text-brand" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {activeInterns.length}
          </div>
          <p className="text-xs text-white/60 mt-1">
            Supervised by {mentorName}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Pending Task Reviews
            </span>
            <ClipboardCheck className="size-4 text-brand-strong" />
          </div>
          <div className="text-3xl font-bold text-primary mt-2">
            {pendingReviews.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Submissions awaiting approval or revision feedback
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Completed Evaluations
            </span>
            <Award className="size-4 text-brand-strong" />
          </div>
          <div className="text-3xl font-bold text-primary mt-2">
            {db.evaluations.filter((e) => e.completed).length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Required prior to certificate issuance
          </p>
        </Card>
      </div>

      {/* Section 1: Pending Task Submissions & All Tasks Review */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="eyebrow">TASK & PROGRESS TRACKING</span>
            <h3 className="text-lg font-bold text-primary mt-0.5">
              Review Intern Submissions & Deliverables
            </h3>
          </div>
          <Badge variant="brand">
            {pendingReviews.length} Pending Review
          </Badge>
        </div>

        {db.tasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-xs sm:text-sm text-muted-foreground">
            No tasks assigned yet. Use the form below to assign a task once
            interns are active.
          </div>
        ) : (
          <div className="space-y-4">
            {db.tasks.map((task) => {
              const isReviewing = reviewingTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          task.status === "Approved"
                            ? "brand"
                            : task.status === "Submitted"
                              ? "default"
                              : "secondary"
                        }
                        dot
                      >
                        {task.status}
                      </Badge>
                      <span className="text-xs font-bold text-primary">
                        {task.internName} ({task.internId})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · Due {task.deadline}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-primary break-words">
                      {task.title}
                    </h4>
                    <p className="text-xs text-muted-foreground break-words">
                      {task.description}
                    </p>
                    {task.submissionLink && (
                      <div className="text-xs text-brand-strong font-medium pt-1 break-all">
                        Submitted Work:{" "}
                        <a
                          href={task.submissionLink}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {task.submissionLink}
                        </a>{" "}
                        {task.submissionNotes && `— "${task.submissionNotes}"`}
                      </div>
                    )}
                    {task.submissionFileName && (
                      <div className="text-xs text-muted-foreground">
                        Submitted File: <strong>{task.submissionFileName}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <Input
                      placeholder="Mentor review comment..."
                      value={
                        reviewComments[task.id] ?? task.mentorComments ?? ""
                      }
                      onChange={(e) =>
                        setReviewComments((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      className="h-9 text-xs sm:w-52"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="brand"
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => void handleReviewTask(task.id, "Approved")}
                        className="cursor-pointer font-semibold"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReviewing}
                        onClick={() =>
                          void handleReviewTask(task.id, "Needs Revision")
                        }
                        className="cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        Revision
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => void handleReviewTask(task.id, "Rejected")}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Section 2: Assign Task + Performance Evaluation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign New Task */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="size-4 text-brand-strong" />
            <h3 className="text-lg font-bold text-primary">
              Assign New Mentorship Task
            </h3>
          </div>
          <form onSubmit={handleAssignTask} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Target Intern *
              </label>
              <select
                value={effectiveTaskInternId}
                onChange={(e) => setTaskInternId(e.target.value)}
                disabled={activeInterns.length === 0}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                {activeInterns.length === 0 && (
                  <option value="">No active interns available</option>
                )}
                {activeInterns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName} ({i.internId} · {i.fieldName})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Task Title *
              </label>
              <Input
                required
                placeholder="e.g. Implement Role-Based Middleware & Unit Tests"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Deadline *
                </label>
                <Input
                  type="date"
                  required
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) =>
                    setTaskPriority(
                      e.target.value as "Low" | "Medium" | "High",
                    )
                  }
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Reference File (Optional · Max 4MB)
              </label>
              <Input
                type="file"
                accept=".pdf,.zip,.txt,.jpg,.jpeg,.png"
                onChange={(e) => void handleTaskAttachment(e.target.files?.[0])}
              />
              {taskAttachmentUploading && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}
              {taskAttachment && !taskAttachmentUploading && (
                <p className="text-xs text-brand-strong">{taskAttachment}</p>
              )}
              {taskUploadError && (
                <p className="text-xs text-destructive">{taskUploadError}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Detailed Instructions *
              </label>
              <Textarea
                rows={3}
                required
                placeholder="Describe acceptance criteria, tech stack conventions, and deliverable format..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="brand"
              disabled={
                assigningTask ||
                taskAttachmentUploading ||
                !effectiveTaskInternId
              }
              className="w-full justify-center font-semibold cursor-pointer"
            >
              {assigningTask
                ? "Assigning Task..."
                : "Assign Task & Send Notification →"}
            </Button>
          </form>
        </Card>

        {/* Mentor Performance Evaluation Form (Req 3.7) */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-brand-strong" />
              <h3 className="text-lg font-bold text-primary">
                Mentor Performance Evaluation
              </h3>
            </div>
            <Badge variant="brand">
              Score: {techScore + puncScore + commScore + teamScore}/100
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Evaluate intern across 4 core competencies (25 points each). Must be
            completed before an official certificate can be issued.
          </p>

          <form onSubmit={handleEvaluationSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Select Intern to Evaluate
              </label>
              <select
                value={effectiveEvalInternId}
                onChange={(e) => setEvalInternId(e.target.value)}
                disabled={activeInterns.length === 0}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                {activeInterns.length === 0 && (
                  <option value="">No active interns available</option>
                )}
                {activeInterns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName} ({i.internId} · {i.internshipStatus})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Technical Skills ({techScore}/25)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={techScore}
                  onChange={(e) => setTechScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Punctuality ({puncScore}/25)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={puncScore}
                  onChange={(e) => setPuncScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Communication ({commScore}/25)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={commScore}
                  onChange={(e) => setCommScore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-primary">
                  Teamwork ({teamScore}/25)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={teamScore}
                  onChange={(e) => setTeamScore(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-primary">
                Final Mentor Remarks & Recommendation
              </label>
              <Textarea
                rows={3}
                required
                value={evalRemarks}
                onChange={(e) => setEvalRemarks(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={submittingEval || !effectiveEvalInternId}
              className="w-full justify-center font-semibold cursor-pointer"
            >
              {submittingEval
                ? "Submitting Evaluation..."
                : "Submit Final Performance Evaluation →"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
