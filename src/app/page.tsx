"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { AdminDashboard } from "@/components/portal/admin-dashboard";
import { MentorDashboard } from "@/components/portal/mentor-dashboard";
import { InternDashboard } from "@/components/portal/intern-dashboard";
import { ForcePasswordDialog } from "@/components/portal/force-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PortalState } from "@/lib/types";
import {
  Bell,
  LogOut,
  Shield,
  UserCheck,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes inactivity timeout

export default function PortalWorkspacePage() {
  const router = useRouter();
  const [db, setDb] = useState<PortalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_TIMEOUT_SECONDS);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);
  const loggingOutRef = useRef(false);

  const showToast = useCallback(
    (nextToast: { type: "success" | "error"; text: string } | null) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToast(nextToast);
      if (nextToast?.type === "success") {
        toastTimerRef.current = setTimeout(() => {
          setToast(null);
          toastTimerRef.current = null;
        }, 4000);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const clearLocalHintAndRedirect = useCallback(() => {
    try {
      localStorage.removeItem("logix_portal_session");
    } catch {}
    router.push("/login");
  }, [router]);

  const handleLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
    clearLocalHintAndRedirect();
  }, [clearLocalHintAndRedirect]);

  const applyPortalResponse = useCallback(
    async (res: Response): Promise<boolean> => {
      const rawData = (await res.json().catch(() => null)) as
        | (Omit<PortalState, "authenticated"> & {
            authenticated?: boolean;
            error?: string;
          })
        | null;

      if (
        res.status === 401 ||
        !rawData ||
        rawData.authenticated === false ||
        !rawData.currentUser
      ) {
        clearLocalHintAndRedirect();
        return false;
      }

      if (!res.ok) {
        setLoadError(
          typeof rawData.error === "string"
            ? rawData.error
            : "Unable to load workspace state.",
        );
        return false;
      }

      setLoadError(null);
      setDb({ ...rawData, authenticated: true });
      return true;
    },
    [clearLocalHintAndRedirect],
  );

  const fetchPortalState = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/portal", {
        cache: "no-store",
      });
      await applyPortalResponse(res);
    } catch (e) {
      console.error("Failed to fetch portal state", e);
      setLoadError("Network error while loading portal state.");
    } finally {
      setLoading(false);
    }
  }, [applyPortalResponse]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const res = await fetch("/api/portal", {
          cache: "no-store",
        });
        if (cancelled) return;
        await applyPortalResponse(res);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch portal state", e);
          setLoadError("Network error while loading portal state.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [applyPortalResponse]);

  const isAuthenticated = Boolean(db?.currentUser);

  // Session Timeout Monitor (30 minutes inactivity -> call logout to clear cookie, then redirect)
  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      setSecondsLeft(SESSION_TIMEOUT_SECONDS);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - lastActivityRef.current) / 1000,
      );
      const remaining = Math.max(0, SESSION_TIMEOUT_SECONDS - elapsedSeconds);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        void handleLogout();
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      clearInterval(interval);
    };
  }, [isAuthenticated, handleLogout]);

  const handleMutateResult = useCallback(
    async (
      payload: Record<string, unknown>,
    ): Promise<{ ok: boolean; data: Record<string, unknown> | null }> => {
      showToast(null);
      try {
        const res = await fetch("/api/portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;

        if (res.status === 401) {
          clearLocalHintAndRedirect();
          return { ok: false, data };
        }

        if (res.status === 429) {
          const retryRaw = res.headers.get("Retry-After");
          const retrySeconds = retryRaw ? parseInt(retryRaw, 10) : NaN;
          const waitText =
            Number.isFinite(retrySeconds) && retrySeconds > 0
              ? `Too many requests, try again in ${retrySeconds} seconds.`
              : "Too many requests, please try again shortly.";
          showToast({ type: "error", text: waitText });
          return { ok: false, data };
        }

        if (!res.ok) {
          const errorMessage =
            data && typeof data.error === "string"
              ? data.error
              : "Action could not be completed.";
          showToast({ type: "error", text: errorMessage });
          return { ok: false, data };
        }

        showToast({
          type: "success",
          text: "Portal updated & recorded successfully.",
        });
        await fetchPortalState();
        return { ok: true, data };
      } catch {
        showToast({
          type: "error",
          text: "Network error while communicating with portal server.",
        });
        return { ok: false, data: null };
      }
    },
    [clearLocalHintAndRedirect, fetchPortalState, showToast],
  );

  const handleMutate = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      const result = await handleMutateResult(payload);
      return result.ok;
    },
    [handleMutateResult],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PortalHeader />
        <main className="flex-1 flex items-center justify-center bg-muted">
          <div className="text-center space-y-2 px-4">
            <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Loading Logix Internship Management Portal...
            </p>
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (loadError && !db) {
    return (
      <div className="flex min-h-screen flex-col">
        <PortalHeader />
        <main className="flex-1 flex items-center justify-center bg-muted px-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center space-y-4 shadow-sm">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h1 className="text-lg font-bold text-primary">
              Could Not Load Portal
            </h1>
            <p className="text-xs text-muted-foreground">{loadError}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="brand"
                onClick={() => void fetchPortalState()}
                className="cursor-pointer"
              >
                Retry
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login")}
                className="cursor-pointer"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (!db || !db.currentUser) {
    return null;
  }

  const currentUser = db.currentUser;
  const unreadNotifs = db.notifications.filter((n) => !n.read).length;
  const activeInternRecord =
    currentUser.role === "intern"
      ? db.interns.find(
          (i) =>
            (currentUser.internRecordId && i.id === currentUser.internRecordId) ||
            i.userId === currentUser.id ||
            i.email.toLowerCase() === currentUser.email.toLowerCase(),
        )
      : undefined;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />

      {/* Workspace Control Subheader */}
      <div className="no-print border-b border-border bg-card">
        <div className="container-x py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Active Authenticated Role & Identity */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role:
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  currentUser.role === "admin"
                    ? "bg-brand text-brand-foreground shadow-xs"
                    : currentUser.role === "mentor"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-emerald-600 text-white shadow-xs"
                }`}
              >
                {currentUser.role === "admin" && <Shield className="size-3.5" />}
                {currentUser.role === "mentor" && (
                  <UserCheck className="size-3.5" />
                )}
                {currentUser.role === "intern" && (
                  <GraduationCap className="size-3.5" />
                )}
                {currentUser.role}
              </span>
            </div>

            <div className="text-xs text-foreground font-medium flex flex-wrap items-center gap-1.5 sm:border-l sm:border-border sm:pl-3 min-w-0">
              <span className="font-semibold break-words">{currentUser.name}</span>
              <span className="text-muted-foreground break-all">
                ({currentUser.email})
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-xs text-brand-strong hover:underline font-medium cursor-pointer"
            >
              Switch Account
            </button>

            {currentUser.role === "intern" && (
              <span className="text-xs font-medium text-muted-foreground sm:border-l sm:border-border sm:pl-3">
                Intern ID:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {activeInternRecord?.internId ||
                    currentUser.internRecordId ||
                    "Unassigned"}
                </span>
              </span>
            )}
          </div>

          {/* Right Controls: Session Timer, Notification Bell, Logout */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
              <Clock className="size-3.5 text-brand-strong shrink-0" />
              <span className="hidden sm:inline">Session Timeout:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatTimer(secondsLeft)}
              </span>
            </div>

            {/* Notification Center Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-expanded={notifOpen}
                className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                <Bell className="size-3.5 text-brand-strong" />
                <span>Notifications</span>
                {unreadNotifs > 0 && (
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-2rem),24rem)] rounded-xl border border-border bg-card shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Notifications
                    </span>
                    <div className="flex items-center gap-2">
                      {db.notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleMutate({
                              action: "mark_notifications_read",
                            })
                          }
                          className="text-[11px] font-semibold text-brand-strong hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        aria-label="Close notifications"
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {db.notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No notifications yet.
                      </p>
                    ) : (
                      db.notifications.slice(0, 15).map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-lg border p-2.5 text-xs ${
                            n.read
                              ? "border-border bg-muted/20"
                              : "border-brand/40 bg-accent/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-foreground break-words">
                              {n.title}
                            </strong>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {n.category}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 break-words">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              className="cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Role Workspace */}
      <main className="flex-1 bg-muted py-6 sm:py-10">
        <div className="container-x space-y-6">
          {toast && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm ${
                toast.type === "success"
                  ? "border-brand/50 bg-accent text-brand-strong"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-medium min-w-0">
                {toast.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span className="break-words">{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => showToast(null)}
                aria-label="Dismiss notification"
                className="text-xs font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {currentUser.mustChangePassword ? (
            <ForcePasswordDialog
              userEmail={currentUser.email}
              onMutateResult={handleMutateResult}
              onLogout={handleLogout}
            />
          ) : (
            <>
              {currentUser.role === "admin" && (
                <AdminDashboard
                  db={db}
                  adminName={currentUser.name}
                  adminEmail={currentUser.email}
                  onMutate={handleMutate}
                  onMutateResult={handleMutateResult}
                />
              )}

              {currentUser.role === "mentor" && (
                <MentorDashboard
                  db={db}
                  mentorName={currentUser.name}
                  mentorEmail={currentUser.email}
                  onMutate={handleMutate}
                />
              )}

              {currentUser.role === "intern" && activeInternRecord && (
                <InternDashboard
                  db={db}
                  intern={activeInternRecord}
                  onMutate={handleMutate}
                />
              )}

              {currentUser.role === "intern" && !activeInternRecord && (
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-3 max-w-lg mx-auto">
                  <AlertCircle className="size-8 text-amber-500 mx-auto" />
                  <h2 className="text-lg font-bold text-primary">
                    Intern Profile Not Linked
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Your account ({currentUser.email}) does not have an assigned
                    internship record yet. Please contact an administrator to
                    link your intern profile.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleLogout()}
                    className="cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
