"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types";
import {
  Shield,
  GraduationCap,
  UserCheck,
  KeyRound,
  MailCheck,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

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
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  const handleQuickDemoLogin = async (
    demoRole: UserRole,
    demoEmail: string,
    demoPass: string,
  ) => {
    setRoleTab(demoRole);
    setAuthMode("login");
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with portal backend
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: demoEmail,
          password: demoPass,
          expectedRole: demoRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // 2. Trigger Better-Auth client session synchronization
      try {
        await authClient.signIn.email({
          email: demoEmail,
          password: demoPass,
        });
      } catch {
        // Better-auth graceful client fallback
      }

      localStorage.setItem(
        "logix_portal_session",
        JSON.stringify({
          ...data.user,
          loginTime: Date.now(),
        }),
      );
      if (data.token) {
        localStorage.setItem("logix_portal_token", data.token);
      }
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

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
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setAuthMode("verify");
          if (data.demoCode) setDemoCodeHint(data.demoCode);
          setInfoMessage(
            "Your account requires email verification. Enter the 6-digit code below.",
          );
          return;
        }
        throw new Error(data.error || "Invalid credentials");
      }

      // Sync Better-Auth client session
      try {
        await authClient.signIn.email({
          email,
          password,
        });
      } catch {
        // Better-auth graceful client fallback
      }

      localStorage.setItem(
        "logix_portal_session",
        JSON.stringify({
          ...data.user,
          loginTime: Date.now(),
        }),
      );
      if (data.token) {
        localStorage.setItem("logix_portal_token", data.token);
      }
      router.push("/portal");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Register with Better-Auth
      try {
        await authClient.signUp.email({
          name,
          email,
          password,
        });
      } catch {
        // Better-auth graceful fallback
      }

      setInfoMessage(data.message);
      if (data.demoVerificationCode) {
        setDemoCodeHint(data.demoVerificationCode);
        setVerificationCode(data.demoVerificationCode);
      }
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      localStorage.setItem(
        "logix_portal_session",
        JSON.stringify({
          ...data.user,
          loginTime: Date.now(),
        }),
      );
      if (data.token) {
        localStorage.setItem("logix_portal_token", data.token);
      }
      router.push("/portal");
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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Reset request failed");

        setInfoMessage(data.message);
        if (data.demoResetCode) {
          setDemoCodeHint(data.demoResetCode);
          setResetCode(data.demoResetCode);
        }
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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Password reset failed");

        setInfoMessage("Password reset complete! Please sign in with your new password.");
        setAuthMode("login");
        setResetStep("request");
        setDemoCodeHint(null);
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
      <main className="flex-1 bg-muted py-12 sm:py-16">
        <div className="container-x max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
            {/* Left Column: Role Login / Registration / Verification Card */}
            <Card className="p-6 sm:p-8 shadow-lg border-border bg-card">
              <div className="flex items-center justify-between gap-2 mb-5">
                <span className="eyebrow">ROLE-BASED ACCESS PORTAL</span>
                <Badge variant="brand" dot>
                  Encrypted Session
                </Badge>
              </div>

              {/* Separate Role Login Tabs (Req 3.1: Admin login separate from Intern login) */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted border border-border mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setRoleTab("intern");
                    setAuthMode("login");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    roleTab === "intern"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="size-4" />
                  <span>Intern Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleTab("mentor");
                    setAuthMode("login");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    roleTab === "mentor"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserCheck className="size-4" />
                  <span>Mentor Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleTab("admin");
                    setAuthMode("login");
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    roleTab === "admin"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="size-4" />
                  <span>Admin Login</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                {authMode === "register"
                  ? "Intern Account Registration"
                  : authMode === "verify"
                    ? "Verify Your Email Address"
                    : authMode === "reset"
                      ? "Reset Portal Password"
                      : roleTab === "admin"
                        ? "Administrator Sign In"
                        : roleTab === "mentor"
                          ? "Supervisor / Mentor Sign In"
                          : "Intern Student Sign In"}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                {roleTab === "admin"
                  ? "Dedicated administrative access for intern records, cohorts, evaluations, and certificate issuance."
                  : roleTab === "mentor"
                    ? "Assign tasks, review intern submissions, and complete performance evaluations."
                    : "Track your application status, submit mentorship tasks, mark attendance, and download verified certificates."}
              </p>

              {error && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive">
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="mt-4 rounded-lg border border-brand/40 bg-accent/50 p-3 text-xs sm:text-sm text-brand-strong">
                  {infoMessage}
                  {demoCodeHint && (
                    <div className="mt-1.5 font-mono text-xs bg-background/80 px-2.5 py-1 rounded border border-brand/30 inline-block">
                      Verification / Reset Code: <strong>{demoCodeHint}</strong>
                    </div>
                  )}
                </div>
              )}

              {authMode === "login" && (
                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      {roleTab.toUpperCase()} EMAIL ADDRESS
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      required
                      placeholder={
                        roleTab === "admin"
                          ? "admin@logix.dev"
                          : roleTab === "mentor"
                            ? "mentor@logix.dev"
                            : "hamza.ahmed@student.edu.pk"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="text-xs font-semibold uppercase tracking-wider text-primary"
                      >
                        PASSWORD
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("reset");
                          setResetStep("request");
                          setError(null);
                        }}
                        className="text-xs font-medium text-brand-strong hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    disabled={loading}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    {loading
                      ? "Signing in..."
                      : `Sign In as ${roleTab.charAt(0).toUpperCase() + roleTab.slice(1)} →`}
                  </Button>

                  {roleTab === "intern" && (
                    <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>New intern applicant?</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("register");
                            setError(null);
                          }}
                          className="font-semibold text-brand-strong hover:underline cursor-pointer"
                        >
                          Create Account (with Email Verification)
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {authMode === "register" && (
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="reg-name"
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      Full Name
                    </label>
                    <Input
                      id="reg-name"
                      required
                      placeholder="e.g. Hamza Ahmed"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="reg-email"
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
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
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      Create Password (min 6 characters)
                    </label>
                    <Input
                      id="reg-pass"
                      type="password"
                      required
                      minLength={6}
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
                    onClick={() => setAuthMode("login")}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-2 cursor-pointer"
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
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      6-Digit Email Verification Code
                    </label>
                    <Input
                      id="ver-code"
                      required
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
                    onClick={() => setAuthMode("login")}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-2 cursor-pointer"
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
                      className="text-xs font-semibold uppercase tracking-wider text-primary"
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
                          className="text-xs font-semibold uppercase tracking-wider text-primary"
                        >
                          6-Digit Reset Code
                        </label>
                        <Input
                          id="rst-code"
                          required
                          placeholder="123456"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="rst-new-pass"
                          className="text-xs font-semibold uppercase tracking-wider text-primary"
                        >
                          New Password
                        </label>
                        <Input
                          id="rst-new-pass"
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    disabled={loading}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    <KeyRound className="size-4" />
                    {resetStep === "request"
                      ? "Send Password Reset Code"
                      : "Confirm & Update Password"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground pt-2 cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}
            </Card>

            {/* Right Column: Instant 1-Click Role Demo Access */}
            <div className="space-y-4">
              <Card inverted className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="size-4" />
                  <span>Instant Role Evaluation Access</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  1-Click Demo Sign In
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-white/75 leading-relaxed">
                  Test every user role immediately with pre-seeded 2026 cohort
                  records, tasks, evaluations, and QR certificates:
                </p>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemoLogin("admin", "admin@logix.dev", "Admin@123")
                    }
                    className="w-full text-left rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Admin Portal (Full Control)
                        </span>
                        <Badge variant="brand">Admin</Badge>
                      </div>
                      <p className="text-xs text-white/65 mt-0.5 font-mono">
                        admin@logix.dev · Admin@123
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-brand group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemoLogin(
                        "mentor",
                        "mentor@logix.dev",
                        "Mentor@123",
                      )
                    }
                    className="w-full text-left rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Supervisor / Mentor Portal
                        </span>
                        <Badge variant="secondary">Mentor</Badge>
                      </div>
                      <p className="text-xs text-white/65 mt-0.5 font-mono">
                        mentor@logix.dev · Mentor@123
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-brand group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemoLogin(
                        "intern",
                        "hamza.ahmed@student.edu.pk",
                        "Intern@123",
                      )
                    }
                    className="w-full text-left rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Hamza Ahmed (Completed · Certified)
                        </span>
                        <Badge variant="brand">Intern</Badge>
                      </div>
                      <p className="text-xs text-white/65 mt-0.5 font-mono">
                        hamza.ahmed@student.edu.pk · Intern@123
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-brand group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickDemoLogin(
                        "intern",
                        "ayesha.khan@nust.edu.pk",
                        "Intern@123",
                      )
                    }
                    className="w-full text-left rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Ayesha Khan (Active AI/ML Intern)
                        </span>
                        <Badge variant="secondary">Intern</Badge>
                      </div>
                      <p className="text-xs text-white/65 mt-0.5 font-mono">
                        ayesha.khan@nust.edu.pk · Intern@123
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-brand group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </Card>

              <Card className="p-5 bg-card border-border">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">
                      Security & Session Governance
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Passwords are hashed with cryptographic{" "}
                      <code className="font-mono text-foreground">scrypt</code>{" "}
                      salts. Sessions enforce automatic inactivity timeout, role
                      isolation, and comprehensive audit logging.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
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

