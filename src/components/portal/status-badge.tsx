import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export type StatusTone = "brand" | "info" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  brand: "border-brand/30 bg-accent text-brand-strong",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-secondary text-secondary-foreground",
};

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // Brand / Positive
  active: "brand",
  approved: "brand",
  accepted: "brand",
  completed: "brand",
  confirmed: "brand",
  issued: "brand",
  present: "brand",
  verified: "brand",
  valid: "brand",
  converted: "brand",
  // Info
  interviewing: "info",
  shortlisted: "info",
  scheduled: "info",
  reviewed: "info",
  "in progress": "info",
  in_progress: "info",
  // Warning
  pending: "warning",
  applied: "warning",
  submitted: "warning",
  "under review": "warning",
  under_review: "warning",
  late: "warning",
  excused: "warning",
  "revision requested": "warning",
  revision_requested: "warning",
  // Danger
  rejected: "danger",
  dropped: "danger",
  revoked: "danger",
  absent: "danger",
  overdue: "danger",
  expired: "danger",
  inactive: "danger",
  disabled: "danger",
};

export function resolveStatusTone(status: string, explicitTone?: StatusTone): StatusTone {
  if (explicitTone) return explicitTone;
  const normalized = status.trim().toLowerCase();
  return STATUS_TONE_MAP[normalized] ?? "neutral";
}

export function StatusBadge({
  status,
  tone,
  dot = false,
  className,
  children,
}: {
  status: string;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const resolved = resolveStatusTone(status, tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize",
        TONE_CLASSES[resolved],
        className,
      )}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {children ?? status.replace(/_/g, " ")}
    </span>
  );
}

const ROLE_TONE_CLASSES: Record<UserRole, string> = {
  admin: "border-brand/30 bg-accent text-brand-strong",
  mentor: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  intern: "border-border bg-secondary text-secondary-foreground",
};

export function RoleBadge({
  role,
  icon,
  className,
}: {
  role: UserRole;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        ROLE_TONE_CLASSES[role],
        className,
      )}
    >
      {icon}
      <span>{role}</span>
    </span>
  );
}
