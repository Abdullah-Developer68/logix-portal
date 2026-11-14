"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, type StatusTone } from "@/components/portal/status-badge";
import type {
  WebsiteApplication,
  WebsiteApplicationStatus,
  FieldDepartment,
  DurationOption,
  BatchCohort,
  MentorProfile,
  InternRecord,
} from "@/lib/types";
import {
  Search,
  Mail,
  Phone,
  MessageCircle,
  Download,
  UserPlus,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  ExternalLink,
  Inbox,
} from "lucide-react";

const ConvertApplicationDialog = dynamic(
  () =>
    import("@/components/portal/convert-application-dialog").then(
      (mod) => mod.ConvertApplicationDialog,
    ),
  { ssr: false },
);

const STATUS_OPTIONS: Array<{
  value: WebsiteApplicationStatus;
  label: string;
}> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

const WEBSITE_STATUS_TONES: Record<WebsiteApplicationStatus, StatusTone> = {
  new: "brand",
  contacted: "info",
  reviewing: "warning",
  shortlisted: "info",
  rejected: "danger",
  hired: "brand",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeAndAbsolute(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  let relative = "just now";
  if (diffMin >= 1 && diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffMin >= 60 && diffMin < 1440) {
    const hrs = Math.floor(diffMin / 60);
    relative = `${hrs}h ago`;
  } else if (diffMin >= 1440) {
    const days = Math.floor(diffMin / 1440);
    relative = `${days}d ago`;
  }

  const absolute = date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${relative} · ${absolute}`;
}

export function WebsiteApplicationsTab({
  applications,
  fields,
  durations,
  batches,
  mentors,
  interns,
  emailEnabled,
  onMutateResult,
  onViewInternRecord,
}: {
  applications: WebsiteApplication[];
  fields: FieldDepartment[];
  durations: DurationOption[];
  batches: BatchCohort[];
  mentors: MentorProfile[];
  interns: InternRecord[];
  emailEnabled: boolean;
  onMutateResult: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: Record<string, unknown> | null }>;
  onViewInternRecord?: (internId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<
    WebsiteApplicationStatus | "ALL"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [convertingApp, setConvertingApp] = useState<WebsiteApplication | null>(
    null,
  );

  const internById = useMemo(() => {
    const map = new Map<string, InternRecord>();
    for (const intern of interns) {
      map.set(intern.id, intern);
    }
    return map;
  }, [interns]);

  const statusCounts = useMemo(() => {
    const counts: Record<WebsiteApplicationStatus, number> = {
      new: 0,
      contacted: 0,
      reviewing: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
    };
    for (const app of applications) {
      if (app.status in counts) {
        counts[app.status] += 1;
      }
    }
    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...applications]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((app) => {
        if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
        if (!q) return true;
        return (
          app.fullName.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          (app.phone || "").toLowerCase().includes(q) ||
          app.role.toLowerCase().includes(q)
        );
      });
  }, [applications, statusFilter, searchQuery]);

  const setPending = (id: string, active: boolean) => {
    setPendingIds((prev) => ({ ...prev, [id]: active }));
  };

  const handleStatusChange = async (
    appId: string,
    status: WebsiteApplicationStatus,
  ) => {
    setPending(appId, true);
    try {
      await onMutateResult({
        action: "update_website_application",
        applicationId: appId,
        status,
      });
    } finally {
      setPending(appId, false);
    }
  };

  const handleSaveNotes = async (app: WebsiteApplication) => {
    const draft = noteDrafts[app.id] ?? app.adminNotes ?? "";
    setPending(app.id, true);
    try {
      const res = await onMutateResult({
        action: "update_website_application",
        applicationId: app.id,
        adminNotes: draft,
      });
      if (res.ok) {
        setNoteDrafts((prev) => {
          const next = { ...prev };
          delete next[app.id];
          return next;
        });
      }
    } finally {
      setPending(app.id, false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Summary Status Filter Chips + Search */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="eyebrow">LOGIXOFFICIAL.SITE INTAKE</span>
            <h3 className="text-base sm:text-lg font-semibold text-primary mt-0.5">
              Website Internship Applications ({applications.length})
            </h3>
          </div>
          {statusCounts.new > 0 && (
            <Badge variant="brand" dot>
              {statusCounts.new} New Application{statusCounts.new === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {/* Summary Filter Chips */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter applications by status"
        >
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            aria-pressed={statusFilter === "ALL"}
            className={`min-h-9 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-brand text-brand-foreground font-semibold"
                : "border border-border bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All</span>
            <span className="font-mono opacity-80">({applications.length})</span>
          </button>

          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setStatusFilter((prev) =>
                    prev === opt.value ? "ALL" : opt.value,
                  )
                }
                aria-pressed={active}
                className={`min-h-9 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-brand text-brand-foreground font-semibold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                <span className="font-mono opacity-80">
                  ({statusCounts[opt.value]})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, email, phone, or applied track..."
            aria-label="Search website applications"
            className="pl-9"
          />
        </div>
      </Card>

      {/* Empty States */}
      {applications.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center space-y-2.5">
          <Inbox className="size-8 mx-auto text-brand-strong opacity-80" />
          <h4 className="text-base font-semibold text-primary">
            No Website Applications Yet
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Applications submitted through logixofficial.site will appear here
            automatically so you can review resumes, contact candidates, and
            convert them to interns.
          </p>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No applications match your current filter or search query.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
            className="h-9 px-3 cursor-pointer"
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const isInFlight = Boolean(pendingIds[app.id]);
            const phoneDigits = (app.phone || "").replace(/\D/g, "");
            const hasWhatsApp = phoneDigits.length >= 10;
            const currentNotes = noteDrafts[app.id] ?? app.adminNotes ?? "";
            const notesDirty =
              noteDrafts[app.id] !== undefined &&
              noteDrafts[app.id] !== (app.adminNotes ?? "");
            const linkedIntern = app.internRecordId
              ? internById.get(app.internRecordId)
              : undefined;
            const noteText = app.note?.trim() || "";
            const isLongNote =
              noteText.length > 160 || noteText.includes("\n");
            const isNoteExpanded = Boolean(expandedNotes[app.id]);

            return (
              <Card key={app.id} className="p-5 sm:p-6 space-y-4">
                {/* Top Row: Candidate Info + Status & Quick Actions */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base sm:text-lg font-semibold text-primary break-words">
                        {app.fullName}
                      </h4>
                      <StatusBadge
                        status={app.status}
                        tone={WEBSITE_STATUS_TONES[app.status]}
                      />
                      <Badge variant="outline">{app.role}</Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0 text-brand-strong" />
                      <span>Submitted {formatRelativeAndAbsolute(app.createdAt)}</span>
                    </div>

                    {/* Contact Links + Resume */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`mailto:${app.email}?subject=${encodeURIComponent(
                          "Your Logix internship application",
                        )}`}
                        className="min-h-9 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted break-all"
                      >
                        <Mail className="size-3.5 text-brand-strong shrink-0" />
                        <span className="break-all">{app.email}</span>
                      </a>

                      {app.phone && (
                        <a
                          href={`tel:${app.phone.replace(/[^\d+]/g, "")}`}
                          className="min-h-9 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Phone className="size-3.5 text-brand-strong shrink-0" />
                          <span>{app.phone}</span>
                        </a>
                      )}

                      {hasWhatsApp && (
                        <a
                          href={`https://wa.me/${phoneDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-9 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-accent/60 px-3 py-1.5 text-xs font-semibold text-brand-strong hover:bg-accent"
                        >
                          <MessageCircle className="size-3.5 shrink-0" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {app.hasResume && (
                        <a
                          href={`/api/website-applications/${encodeURIComponent(app.id)}/resume`}
                          download={app.resumeFileName || undefined}
                          className="min-h-9 inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-accent/60 px-3 py-1.5 text-xs font-semibold text-brand-strong hover:bg-accent"
                        >
                          <Download className="size-3.5 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[260px]">
                            {app.resumeFileName || "Download Resume"}
                          </span>
                          {app.resumeSizeBytes ? (
                            <span className="opacity-75 font-mono">
                              ({formatFileSize(app.resumeSizeBytes)})
                            </span>
                          ) : null}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <label className="sr-only" htmlFor={`status-${app.id}`}>
                      Application status for {app.fullName}
                    </label>
                    <Select
                      id={`status-${app.id}`}
                      disabled={isInFlight}
                      value={app.status}
                      onChange={(e) =>
                        void handleStatusChange(
                          app.id,
                          e.target.value as WebsiteApplicationStatus,
                        )
                      }
                      aria-label={`Change status for ${app.fullName}`}
                      className="w-auto min-w-[155px] text-xs font-medium"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Status: {opt.label}
                        </option>
                      ))}
                    </Select>

                    {app.status === "new" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        disabled={isInFlight}
                        onClick={() =>
                          void handleStatusChange(app.id, "contacted")
                        }
                        className="text-xs cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5 text-brand-strong" />
                        Mark Contacted
                      </Button>
                    )}

                    {app.status === "hired" || app.internRecordId ? (
                      <div className="h-10 inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-accent/60 px-3 text-xs font-semibold text-brand-strong">
                        <span>
                          Intern:{" "}
                          <span className="font-mono">
                            {linkedIntern?.internId || app.internRecordId}
                          </span>
                        </span>
                        {onViewInternRecord && linkedIntern && (
                          <button
                            type="button"
                            onClick={() =>
                              onViewInternRecord(linkedIntern.internId)
                            }
                            className="inline-flex items-center gap-1 underline hover:opacity-80 cursor-pointer"
                          >
                            View
                            <ExternalLink className="size-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="brand"
                        size="default"
                        disabled={isInFlight}
                        onClick={() => setConvertingApp(app)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <UserPlus className="size-3.5" />
                        Convert to Intern
                      </Button>
                    )}
                  </div>
                </div>

                {/* Candidate Note (Expandable) */}
                {noteText && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs space-y-1.5">
                    <div className="font-medium uppercase tracking-wider text-[11px] text-muted-foreground">
                      Applicant Note
                    </div>
                    <p
                      className={`text-foreground whitespace-pre-wrap break-words leading-relaxed ${
                        isLongNote && !isNoteExpanded ? "line-clamp-2" : ""
                      }`}
                    >
                      {noteText}
                    </p>
                    {isLongNote && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotes((prev) => ({
                            ...prev,
                            [app.id]: !isNoteExpanded,
                          }))
                        }
                        aria-expanded={isNoteExpanded}
                        className="min-h-8 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline cursor-pointer"
                      >
                        {isNoteExpanded ? (
                          <>
                            Show less <ChevronUp className="size-3.5" />
                          </>
                        ) : (
                          <>
                            Read full note <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Admin Notes + Reviewer Metadata */}
                <div className="pt-3 border-t border-border grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`notes-${app.id}`}
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block"
                    >
                      Admin Notes
                    </label>
                    <Textarea
                      id={`notes-${app.id}`}
                      rows={2}
                      maxLength={4000}
                      disabled={isInFlight}
                      placeholder="Add screening notes, interview feedback, or follow-up details..."
                      value={currentNotes}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [app.id]: e.target.value,
                        }))
                      }
                      className="min-h-[64px] text-xs"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-2">
                    <Button
                      type="button"
                      variant={notesDirty ? "brand" : "outline"}
                      size="default"
                      disabled={isInFlight || !notesDirty}
                      onClick={() => void handleSaveNotes(app)}
                      className="text-xs cursor-pointer font-semibold"
                    >
                      <Save className="size-3.5" />
                      {isInFlight ? "Saving..." : "Save Notes"}
                    </Button>

                    {(app.contactedAt || app.reviewedAt || app.reviewedBy) && (
                      <div className="text-[11px] text-muted-foreground text-left lg:text-right space-y-0.5">
                        {app.contactedAt && (
                          <div>
                            Contacted: {formatRelativeAndAbsolute(app.contactedAt)}
                          </div>
                        )}
                        {(app.reviewedAt || app.reviewedBy) && (
                          <div>
                            Reviewed
                            {app.reviewedBy ? ` by ${app.reviewedBy}` : ""}
                            {app.reviewedAt
                              ? ` · ${formatRelativeAndAbsolute(app.reviewedAt)}`
                              : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {convertingApp && (
        <ConvertApplicationDialog
          application={convertingApp}
          fields={fields}
          durations={durations}
          batches={batches}
          mentors={mentors}
          emailEnabled={emailEnabled}
          onClose={() => setConvertingApp(null)}
          onMutateResult={onMutateResult}
          onViewInternRecord={onViewInternRecord}
        />
      )}
    </div>
  );
}
