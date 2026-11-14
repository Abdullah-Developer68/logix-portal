"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/lib/types";
import {
  Shield,
  GraduationCap,
  UserCheck,
  KeyRound,
  MailCheck,
} from "lucide-react";

function getRateLimitMessage(res: Response, fallback: string): string {
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) {
      return `Too many requests, try again in ${Math.ceil(seconds)} seconds.`;
    }
    return "Too many requests, try again in a few moments.";
  }
  return fallback;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as UserRole) || "intern";

  const [roleTab, setRoleTab] = useState<UserRole>(
    ["admin", "mentor", "intern"].includes(initialRole) ? initialRole : "intern",
  );
  const [authMode, setAuthMode] = useState<
    "login" | "register" | "verify" | "reset"
  >("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email,
          password,
          expectedRole: roleTab,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(getRateLimitMessage(res, "Too many requests."));
        }
        if (data.requiresVerification) {
          setAuthMode("verify");
          setInfoMessage(
            "Your account requires email verification. Enter the 6-digit code sent to your email below.",
          );
          return;
        }
        throw new Error(data.error || "Invalid credentials");
      }

      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_intern",
          name,
          email,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(getRateLimitMessage(res, "Too many requests."));
        }
        if (res.status === 503) {
          throw new Error(
            data.error ||
              data.message ||
              "Self-registration is currently unavailable because email delivery is not configured. Please ask an administrator to create your portal account.",
          );
        }
        throw new Error(data.error || "Registration failed");
      }

      setInfoMessage(
        data.message ||
          "Verification code sent! Please check your email and enter the 6-digit code below.",
      );
      setAuthMode("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_email",
          email,
          code: verificationCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(getRateLimitMessage(res, "Too many requests."));
        }
        throw new Error(data.error || "Verification failed");
      }

      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (resetStep === "request") {
        const res = await fetch("/api/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "request_password_reset",
            email,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(getRateLimitMessage(res, "Too many requests."));
          }
          throw new Error(data.error || "Reset request failed");
        }

        setInfoMessage(
          data.message ||
            "If an account with that email exists, a 6-digit password reset code has been sent.",
        );
        setResetStep("confirm");
      } else {
        const res = await fetch("/api/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset_password",
            email,
            code: resetCode,
            newPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(getRateLimitMessage(res, "Too many requests."));
          }
          throw new Error(data.error || "Password reset failed");
        }

        setInfoMessage(
          "Password reset complete! Please sign in with your new password.",
        );
        setAuthMode("login");
        setResetStep("request");
        setResetCode("");
        setNewPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />
      <main className="flex flex-1 items-center justify-center bg-muted/40 dark:bg-background px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">
          <Card className="p-6 sm:p-8 shadow-lg border-border bg-card">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="eyebrow">Logix Internship Portal</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {authMode === "login" ? `${roleTab.toUpperCase()} ACCESS` : authMode.toUpperCase()}
              </span>
            </div>

            {/* Segmented Role Switcher */}
            <div
              role="tablist"
              aria-label="Select portal role"
              className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted border border-border mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === "intern"}
                onClick={() => {
                  setRoleTab("intern");
                  setAuthMode("login");
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`min-h-10 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  roleTab === "intern"
                    ? "bg-brand text-brand-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="size-4 shrink-0" />
                <span>Intern</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === "mentor"}
                onClick={() => {
                  setRoleTab("mentor");
                  setAuthMode("login");
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`min-h-10 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  roleTab === "mentor"
                    ? "bg-brand text-brand-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="size-4 shrink-0" />
                <span>Mentor</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === "admin"}
                onClick={() => {
                  setRoleTab("admin");
                  setAuthMode("login");
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`min-h-10 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  roleTab === "admin"
                    ? "bg-brand text-brand-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="size-4 shrink-0" />
                <span>Admin</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight leading-tight">
              {authMode === "register" ? (
                <>
                  Intern <span className="text-brand-strong">Registration</span>
                </>
              ) : authMode === "verify" ? (
                <>
                  Verify Your <span className="text-brand-strong">Email</span>
                </>
              ) : authMode === "reset" ? (
                <>
                  Reset Portal <span className="text-brand-strong">Password</span>
                </>
              ) : roleTab === "admin" ? (
                <>
                  Administrator <span className="text-brand-strong">Sign In</span>
                </>
              ) : roleTab === "mentor" ? (
                <>
                  Mentor <span className="text-brand-strong">Sign In</span>
                </>
              ) : (
                <>
                  Intern <span className="text-brand-strong">Sign In</span>
                </>
              )}
            </h1>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {authMode === "register"
                ? "Create your intern account and verify your university or personal email to access the portal."
                : authMode === "verify"
                  ? "Enter the 6-digit verification code dispatched to your inbox."
                  : authMode === "reset"
                    ? "Request a one-time reset code to restore access to your portal account."
                    : roleTab === "admin"
                      ? "Manage applications, cohorts, evaluations, team accounts, and certificates."
                      : roleTab === "mentor"
                        ? "Assign mentorship tasks, review intern submissions, and submit evaluations."
                        : "Track your application status, submit tasks, mark attendance, and view certificates."}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs sm:text-sm text-destructive break-words"
              >
                {error}
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="mt-5 rounded-lg border border-brand/40 bg-accent/60 p-3.5 text-xs sm:text-sm text-brand-strong break-words"
              >
                {infoMessage}
              </div>
            )}

            {authMode === "login" && (
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {roleTab.toUpperCase()} USERNAME OR EMAIL
                  </label>
                  <Input
                    id="login-email"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("reset");
                        setResetStep("request");
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="min-h-8 inline-flex items-center text-xs font-medium text-brand-strong hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  {loading
                    ? "Signing in..."
                    : `Sign In as ${roleTab.charAt(0).toUpperCase() + roleTab.slice(1)} →`}
                </Button>

                {roleTab === "intern" && (
                  <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>New intern applicant?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="min-h-9 inline-flex items-center font-semibold text-brand-strong hover:underline cursor-pointer"
                    >
                      Create Account (with Email Verification)
                    </button>
                  </div>
                )}
              </form>
            )}

            {authMode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-name"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Full Name
                  </label>
                  <Input
                    id="reg-name"
                    required
                    placeholder="e.g. Ayesha Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-email"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Student / University Email
                  </label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="you@university.edu.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-pass"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Create Password (min 8 characters)
                  </label>
                  <Input
                    id="reg-pass"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  <MailCheck className="size-4" />
                  {loading
                    ? "Sending Verification Email..."
                    : "Register & Send Verification Code"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="min-h-10 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ← Back to Intern Sign In
                </button>
              </form>
            )}

            {authMode === "verify" && (
              <form onSubmit={handleVerifySubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ver-code"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    6-Digit Email Verification Code
                  </label>
                  <Input
                    id="ver-code"
                    required
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  {loading ? "Verifying..." : "Verify Email & Enter Portal →"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="min-h-10 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}

            {authMode === "reset" && (
              <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="rst-email"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Registered Email Address
                  </label>
                  <Input
                    id="rst-email"
                    type="email"
                    required
                    placeholder="you@logix.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {resetStep === "confirm" && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="rst-code"
                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        6-Digit Reset Code
                      </label>
                      <Input
                        id="rst-code"
                        required
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="rst-new-pass"
                        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        New Password (min 8 characters)
                      </label>
                      <Input
                        id="rst-new-pass"
                        type="password"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  <KeyRound className="size-4" />
                  {loading
                    ? "Processing..."
                    : resetStep === "request"
                      ? "Send Password Reset Code"
                      : "Confirm & Update Password"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="min-h-10 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}
          </Card>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
