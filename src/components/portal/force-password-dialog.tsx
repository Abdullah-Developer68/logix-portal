"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, LogOut, ShieldAlert } from "lucide-react";

export function ForcePasswordDialog({
  userEmail,
  onMutateResult,
  onLogout,
}: {
  userEmail: string;
  onMutateResult: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: Record<string, unknown> | null }>;
  onLogout: () => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("New password must be between 8 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your temporary password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onMutateResult({
        action: "change_password",
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        const msg =
          result.data && typeof result.data.error === "string"
            ? result.data.error
            : "Could not update password. Please check your current password.";
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-pw-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-2xl space-y-5 my-auto">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-strong">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h2
              id="force-pw-title"
              className="text-lg sm:text-xl font-bold text-primary"
            >
              Set a New Password
            </h2>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              Your account (<strong className="text-foreground">{userEmail}</strong>)
              uses a temporary password. You must set a new password before
              continuing.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="force-current-pw"
              className="text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Current / Temporary Password
            </label>
            <Input
              id="force-current-pw"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="force-new-pw"
              className="text-xs font-semibold uppercase tracking-wider text-primary"
            >
              New Password (8–128 characters)
            </label>
            <Input
              id="force-new-pw"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a strong password"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="force-confirm-pw"
              className="text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Confirm New Password
            </label>
            <Input
              id="force-confirm-pw"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="submit"
              variant="brand"
              disabled={submitting}
              className="flex-1 justify-center font-semibold cursor-pointer"
            >
              <KeyRound className="size-4" />
              {submitting ? "Updating Password..." : "Update Password & Continue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void onLogout()}
              className="justify-center cursor-pointer"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
