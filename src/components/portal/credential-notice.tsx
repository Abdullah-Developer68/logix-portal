"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Copy, KeyRound, X } from "lucide-react";

export function CredentialNotice({
  title = "Portal Login Credentials Created",
  loginEmail,
  temporaryPassword,
  emailEnabled,
  extraInfo,
  onDismiss,
}: {
  title?: string;
  loginEmail: string;
  temporaryPassword: string;
  emailEnabled: boolean;
  extraInfo?: string;
  onDismiss?: () => void;
}) {
  const [copiedField, setCopiedField] = useState<"all" | "password" | null>(null);

  const handleCopy = async (text: string, field: "all" | "password") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const fullText = `Login Email: ${loginEmail}\nTemporary Password: ${temporaryPassword}`;

  return (
    <div
      role="region"
      aria-label={title}
      className="rounded-xl border-2 border-brand/50 bg-accent/60 p-4 space-y-3 text-xs sm:text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-primary">
          <KeyRound className="size-4 text-brand-strong shrink-0" />
          <span>{title}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss credential notice"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {extraInfo && (
        <p className="text-xs text-foreground font-medium">{extraInfo}</p>
      )}

      <div className="rounded-lg border border-border bg-card p-3 space-y-2 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Login Email:</span>
          <span className="font-semibold text-foreground break-all">
            {loginEmail}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">Temporary Password:</span>
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-0.5 font-bold text-brand-strong select-all break-all">
              {temporaryPassword}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(temporaryPassword, "password")}
              className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] font-sans font-semibold text-foreground hover:bg-muted cursor-pointer"
              aria-label="Copy temporary password"
            >
              {copiedField === "password" ? (
                <>
                  <Check className="size-3 text-brand-strong" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            <strong>Shown only once:</strong> Copy or save this password now —
            it cannot be retrieved later.{" "}
            {!emailEnabled &&
              "Email delivery is not configured (SMTP disabled), so you must share these credentials manually."}
          </span>
        </div>
        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={() => handleCopy(fullText, "all")}
          className="shrink-0 cursor-pointer font-semibold"
        >
          {copiedField === "all" ? (
            <>
              <Check className="size-3.5" />
              Copied All
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy Credentials
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
