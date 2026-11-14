"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CredentialNotice } from "@/components/portal/credential-notice";
import type {
  WebsiteApplication,
  FieldDepartment,
  DurationOption,
  BatchCohort,
  MentorProfile,
  InternRecord,
} from "@/lib/types";
import { CheckCircle2, UserPlus, X } from "lucide-react";

function getNextMondayDate(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function findBestMatchingFieldId(
  role: string,
  fields: FieldDepartment[],
): string {
  const pool = fields.filter((f) => f.active);
  const candidates = pool.length > 0 ? pool : fields;
  if (candidates.length === 0) return "";

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const stopWords = new Set(["intern", "internship", "track", "and", "the", "of", "in"]);
  const roleNorm = normalize(role);
  const roleTokens = roleNorm
    .split(" ")
    .filter((t) => t.length > 1 && !stopWords.has(t));

  let bestId = candidates[0].id;
  let bestScore = -1;

  for (const field of candidates) {
    const fieldText = normalize(`${field.name} ${field.podName} ${field.code}`);
    let score = 0;
    if (roleNorm && fieldText.includes(roleNorm)) score += 10;
    if (normalize(field.name) && roleNorm.includes(normalize(field.name))) {
      score += 10;
    }
    for (const token of roleTokens) {
      if (fieldText.includes(token)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = field.id;
    }
  }

  return bestId;
}

export function ConvertApplicationDialog(props: {
  application: WebsiteApplication | null;
  fields: FieldDepartment[];
  durations: DurationOption[];
  batches: BatchCohort[];
  mentors: MentorProfile[];
  emailEnabled: boolean;
  onClose: () => void;
  onMutateResult: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: Record<string, unknown> | null }>;
  onViewInternRecord?: (internId: string) => void;
}) {
  if (!props.application) return null;
  return (
    <ConvertApplicationDialogInner
      key={props.application.id}
      {...props}
      application={props.application}
    />
  );
}

function ConvertApplicationDialogInner({
  application,
  fields,
  durations,
  batches,
  mentors,
  emailEnabled,
  onClose,
  onMutateResult,
  onViewInternRecord,
}: {
  application: WebsiteApplication;
  fields: FieldDepartment[];
  durations: DurationOption[];
  batches: BatchCohort[];
  mentors: MentorProfile[];
  emailEnabled: boolean;
  onClose: () => void;
  onMutateResult: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: Record<string, unknown> | null }>;
  onViewInternRecord?: (internId: string) => void;
}) {
  const activeDurations = useMemo(() => {
    const active = durations.filter((d) => d.active);
    return active.length > 0 ? active : durations;
  }, [durations]);

  const activeFields = useMemo(() => {
    const active = fields.filter((f) => f.active);
    return active.length > 0 ? active : fields;
  }, [fields]);

  const [fieldId, setFieldId] = useState(() =>
    findBestMatchingFieldId(application.role, fields),
  );
  const [durationMonths, setDurationMonths] = useState<number>(
    () =>
      activeDurations.find((d) => d.months === 3)?.months ??
      activeDurations[0]?.months ??
      3,
  );
  const [startDate, setStartDate] = useState<string>(getNextMondayDate);
  const [batchId, setBatchId] = useState<string>("");
  const [mentorId, setMentorId] = useState<string>("");
  const [createLogin, setCreateLogin] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedResult, setConvertedResult] = useState<{
    intern: InternRecord;
    temporaryPassword?: string;
    loginEmail?: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onClose]);

  const calculatedEndDate = (() => {
    if (!startDate) return "";
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + Number(durationMonths || 3));
    return d.toISOString().split("T")[0];
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldId) {
      setError("Please select an internship department/field.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        action: "convert_website_application",
        applicationId: application.id,
        fieldId,
        durationMonths,
        startDate,
        createLogin,
      };
      if (batchId) payload.batchId = batchId;
      if (mentorId) payload.mentorId = mentorId;

      const res = await onMutateResult(payload);
      if (!res.ok) {
        const msg =
          res.data && typeof res.data.error === "string"
            ? res.data.error
            : "Could not convert application to intern.";
        setError(msg);
        return;
      }

      const intern = res.data?.intern as InternRecord | undefined;
      if (intern) {
        setConvertedResult({
          intern,
          temporaryPassword:
            typeof res.data?.temporaryPassword === "string"
              ? res.data.temporaryPassword
              : undefined,
          loginEmail:
            typeof res.data?.loginEmail === "string"
              ? res.data.loginEmail
              : undefined,
        });
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="min-w-0">
            <span className="eyebrow">WEBSITE APPLICATION CONVERSION</span>
            <h3
              id="convert-dialog-title"
              className="text-lg sm:text-xl font-bold text-primary mt-0.5 break-words"
            >
              {convertedResult
                ? "Intern Record Created"
                : `Convert ${application.fullName} to Intern`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">
              Applied track: <strong className="text-foreground">{application.role}</strong> ·{" "}
              {application.email}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close convert dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {convertedResult ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand/40 bg-accent/50 p-4 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-brand-strong shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm min-w-0">
                <div className="font-bold text-primary">
                  {convertedResult.intern.fullName} is now registered as an intern!
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Intern ID:</span>
                  <Badge variant="brand" className="font-mono font-bold">
                    {convertedResult.intern.internId}
                  </Badge>
                  <span>· {convertedResult.intern.fieldName}</span>
                  <span>
                    ({convertedResult.intern.startDate} → {convertedResult.intern.endDate})
                  </span>
                </div>
              </div>
            </div>

            {convertedResult.temporaryPassword && convertedResult.loginEmail && (
              <CredentialNotice
                title="Intern Portal Login Credentials"
                loginEmail={convertedResult.loginEmail}
                temporaryPassword={convertedResult.temporaryPassword}
                emailEnabled={emailEnabled}
              />
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-border">
              {onViewInternRecord && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onViewInternRecord(convertedResult.intern.internId);
                    onClose();
                  }}
                  className="cursor-pointer"
                >
                  View Intern Record →
                </Button>
              )}
              <Button
                type="button"
                variant="brand"
                onClick={onClose}
                className="font-semibold cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="conv-field"
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Department / Field *
                </label>
                <select
                  id="conv-field"
                  required
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {activeFields.length === 0 && (
                    <option value="">No departments available</option>
                  )}
                  {activeFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.podName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="conv-duration"
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Duration *
                </label>
                <select
                  id="conv-duration"
                  required
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {activeDurations.length > 0 ? (
                    activeDurations.map((d) => (
                      <option key={d.id} value={d.months}>
                        {d.label} ({d.months} {d.months === 1 ? "Month" : "Months"})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1}>1 Month</option>
                      <option value={2}>2 Months</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="conv-start"
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Start Date *
                </label>
                <Input
                  id="conv-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                {calculatedEndDate && (
                  <p className="text-[11px] text-brand-strong font-medium">
                    End Date: <strong>{calculatedEndDate}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="conv-batch"
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Cohort Batch (Optional)
                </label>
                <select
                  id="conv-batch"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">None / Unassigned</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label
                  htmlFor="conv-mentor"
                  className="text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Assigned Mentor (Optional)
                </label>
                <select
                  id="conv-mentor"
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">None / Unassigned</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--brand-strong)]"
              />
              <span className="text-xs sm:text-sm">
                <strong className="text-primary block">
                  Create a portal login for this intern
                </strong>
                <span className="text-muted-foreground text-xs">
                  Generates a temporary password for {application.email} so they
                  can access tasks, attendance, and certificates.
                </span>
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onClose}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={submitting || !fieldId}
                className="font-semibold cursor-pointer"
              >
                <UserPlus className="size-4" />
                {submitting ? "Converting..." : "Confirm & Convert to Intern"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
