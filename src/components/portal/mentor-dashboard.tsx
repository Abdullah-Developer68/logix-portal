"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PortalDatabase, TaskStatus } from "@/lib/types";
import {
  Users,
  ClipboardCheck,
  PlusCircle,
  Award,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";

export function MentorDashboard({
  db,
  mentorName,
  mentorEmail,
  onMutate,
}: {
  db: PortalDatabase;
  mentorName: string;
  mentorEmail: string;
  onMutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const activeInterns = db.interns.filter((i) => !i.archived);

  // New Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskInternId, setTaskInternId] = useState(activeInterns[0]?.id || "");
  const [taskDeadline, setTaskDeadline] = useState("2026-10-28");
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High">(
    "High",
  );
  const [taskAttachment, setTaskAttachment] = useState("");
  const [taskAttachmentStorageKey, setTaskAttachmentStorageKey] = useState("");
  const [taskAttachmentUploading, setTaskAttachmentUploading] = useState(false);

  // Task Review State
  const [reviewComments, setReviewComments] = useState<Record<string, string>>(
    {},
  );

  // Evaluation Form State
  const [evalInternId, setEvalInternId] = useState(activeInterns[0]?.id || "");
  const [techScore, setTechScore] = useState(23);
  const [puncScore, setPuncScore] = useState(24);
  const [commScore, setCommScore] = useState(22);
  const [teamScore, setTeamScore] = useState(24);
  const [evalRemarks, setEvalRemarks] = useState(
    "Consistently delivered clean, well-tested code and collaborated effectively during sprint reviews.",
  );

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskInternId) return;
    const ok = await onMutate({
      action: "assign_task",
      title: taskTitle,
      description: taskDesc,
      internRecordId: taskInternId,
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
    }
  };

  const handleTaskAttachment = async (file: File | undefined) => {
    if (!file) return;
    setTaskAttachmentUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "task_attachment");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = (await response.json()) as { storageKey?: string; error?: string };
      if (!response.ok || !result.storageKey) {
        throw new Error(result.error || "Attachment upload failed.");
      }
      setTaskAttachment(file.name);
      setTaskAttachmentStorageKey(result.storageKey);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Attachment upload failed.");
    } finally {
      setTaskAttachmentUploading(false);
    }
  };

  const handleReviewTask = async (taskId: string, status: TaskStatus) => {
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
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalInternId) return;
    await onMutate({
      action: "submit_evaluation",
      internRecordId: evalInternId,
      technicalSkills: techScore,
      punctuality: puncScore,
      communication: commScore,
      teamwork: teamScore,
      remarks: evalRemarks,
      actorName: mentorName,
      actorEmail: mentorEmail,
      actorRole: "mentor",
    });
  };

  const pendingReviews = db.tasks.filter((t) => t.status === "Submitted");

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
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
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

        <div className="space-y-4">
          {db.tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
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
                <h4 className="text-sm sm:text-base font-bold text-primary">
                  {task.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {task.description}
                </p>
                {task.submissionLink && (
                  <div className="text-xs text-brand-strong font-medium pt-1">
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
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() => handleReviewTask(task.id, "Approved")}
                    className="cursor-pointer font-semibold"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewTask(task.id, "Needs Revision")}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    Revision
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReviewTask(task.id, "Rejected")}
                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <XCircle className="size-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 2: Assign Task + Performance Evaluation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign New Task */}
        <Card className="p-6 space-y-4">
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
                value={taskInternId}
                onChange={(e) => setTaskInternId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
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
            <div className="grid grid-cols-2 gap-3">
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
                Reference File (Optional)
              </label>
              <Input
                  type="file"
                  accept=".pdf,.zip,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => void handleTaskAttachment(e.target.files?.[0])}
              />
                {taskAttachment && (
                  <p className="text-xs text-muted-foreground">
                    {taskAttachmentUploading ? "Uploading..." : taskAttachment}
                  </p>
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
              className="w-full justify-center font-semibold cursor-pointer"
            >
              Assign Task & Send Notification →
            </Button>
          </form>
        </Card>

        {/* Mentor Performance Evaluation Form (Req 3.7) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
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
                value={evalInternId}
                onChange={(e) => setEvalInternId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
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
              className="w-full justify-center font-semibold cursor-pointer"
            >
              Submit Final Performance Evaluation →
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
