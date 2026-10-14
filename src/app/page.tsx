"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { AdminDashboard } from "@/components/portal/admin-dashboard";
import { MentorDashboard } from "@/components/portal/mentor-dashboard";
import { InternDashboard } from "@/components/portal/intern-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PortalDatabase, UserRole } from "@/lib/types";
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

interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  internRecordId?: string;
  mentorId?: string;
  loginTime?: number;
}

const SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes inactivity timeout

export default function PortalWorkspacePage() {
  const router = useRouter();
  const [db, setDb] = useState<PortalDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionUser>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("logix_portal_session");
        if (stored) {
          const parsed = JSON.parse(stored) as SessionUser;
          if (parsed && parsed.role) return parsed;
        }
      } catch {}
    }
    return {
      id: "usr-admin-1",
      email: "admin@logix.dev",
      role: "admin",
      name: "Areeba Siddiqui (Program Director)",
    };
  });
  const [selectedInternId, setSelectedInternId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("logix_portal_session");
        if (stored) {
          const parsed = JSON.parse(stored) as SessionUser;
          if (parsed && parsed.internRecordId) return parsed.internRecordId;
        }
      } catch {}
    }
    return "int-1";
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_TIMEOUT_SECONDS);

  const fetchPortalState = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("logix_portal_token") || ""
          : "";
      const res = await fetch("/api/portal", {
        cache: "no-store",
        headers: token ? { "x-portal-token": token } : {},
      });
      const data = await res.json();
      if (!res.ok || data.authenticated === false) {
        localStorage.removeItem("logix_portal_session");
        localStorage.removeItem("logix_portal_token");
        router.push("/login");
        return;
      }
      setDb(data);
      if (data.currentUser) {
        setSession({
          id: data.currentUser.id,
          email: data.currentUser.email,
          role: data.currentUser.role,
          name: data.currentUser.name,
          internRecordId: data.currentUser.internRecordId,
          mentorId: data.currentUser.mentorId,
        });
        if (data.currentUser.internRecordId) {
          setSelectedInternId(data.currentUser.internRecordId);
        }
      }
    } catch (e) {
      console.error("Failed to fetch portal state", e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      const stored = localStorage.getItem("logix_portal_session");
      const token = localStorage.getItem("logix_portal_token");
      if (!stored && !token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("/api/portal", {
          cache: "no-store",
          headers: token ? { "x-portal-token": token } : {},
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || data.authenticated === false) {
          localStorage.removeItem("logix_portal_session");
          localStorage.removeItem("logix_portal_token");
          router.push("/login");
          return;
        }
        setDb(data);
        if (data.currentUser) {
          setSession({
            id: data.currentUser.id,
            email: data.currentUser.email,
            role: data.currentUser.role,
            name: data.currentUser.name,
            internRecordId: data.currentUser.internRecordId,
            mentorId: data.currentUser.mentorId,
          });
          if (data.currentUser.internRecordId) {
            setSelectedInternId(data.currentUser.internRecordId);
          }
        }
      } catch (e) {
        console.error("Failed to init portal state", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    init();
    return () => {
      ignore = true;
    };
  }, [router]);

  // Session Timeout Monitor (Req 3.1: Logout and session timeout)
  useEffect(() => {
    const resetTimer = () => setSecondsLeft(SESSION_TIMEOUT_SECONDS);
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("logix_portal_session");
          localStorage.removeItem("logix_portal_token");
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearInterval(interval);
    };
  }, [router]);

  const handleMutate = async (
    payload: Record<string, unknown>,
  ): Promise<boolean> => {
    setToast(null);
    try {
      const token = localStorage.getItem("logix_portal_token") || "";
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-portal-token": token } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({
          type: "error",
          text: data.error || "Action could not be completed.",
        });
        return false;
      }
      setToast({
        type: "success",
        text: "Portal updated & recorded successfully.",
      });
      await fetchPortalState();
      setTimeout(() => setToast(null), 4000);
      return true;
    } catch {
      setToast({
        type: "error",
        text: "Network error while communicating with portal server.",
      });
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
    localStorage.removeItem("logix_portal_session");
    localStorage.removeItem("logix_portal_token");
    router.push("/login");
  };

  if (loading || !db) {
    return (
      <div className="flex min-h-screen flex-col">
        <PortalHeader />
        <main className="flex-1 flex items-center justify-center bg-muted">
          <div className="text-center space-y-2">
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

  const unreadNotifs = db.notifications.filter((n) => !n.read).length;
  const activeInternRecord =
    db.interns.find(
      (i) => i.id === selectedInternId || i.id === session.internRecordId,
    ) || db.interns[0];

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
          {/* Active Authenticated Role & Identity (SEC-04: Enforce genuine auth session) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role:
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  session.role === "admin"
                    ? "bg-brand text-brand-foreground shadow-xs"
                    : session.role === "mentor"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-emerald-600 text-white shadow-xs"
                }`}
              >
                {session.role === "admin" && <Shield className="size-3.5" />}
                {session.role === "mentor" && <UserCheck className="size-3.5" />}
                {session.role === "intern" && <GraduationCap className="size-3.5" />}
                {session.role}
              </span>
            </div>

            <div className="text-xs text-foreground font-medium flex items-center gap-1.5 border-l border-border pl-3">
              <span className="font-semibold">{session.name}</span>
              <span className="text-muted-foreground">({session.email})</span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-xs text-brand-strong hover:underline font-medium ml-1 cursor-pointer"
            >
              Switch Account
            </button>

            {session.role === "intern" && db.interns.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground border-l border-border pl-3">
                Intern ID:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {activeInternRecord?.internId || session.internRecordId || "N/A"}
                </span>
              </span>
            )}
          </div>

          {/* Right Controls: Session Timer, Notification Bell, Logout */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
              <Clock className="size-3.5 text-brand-strong" />
              <span>Session Timeout:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatTimer(secondsLeft)}
              </span>
            </div>

            {/* Notification Center Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      In-Portal & Email Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleMutate({ action: "mark_notifications_read" })
                      }
                      className="text-[11px] font-semibold text-brand-strong hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {db.notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-lg border p-2.5 text-xs ${
                          n.read
                            ? "border-border bg-muted/20"
                            : "border-brand/40 bg-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-foreground">{n.title}</strong>
                          <Badge variant="outline" className="text-[10px]">
                            {n.category}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Role Workspace */}
      <main className="flex-1 bg-muted py-8 sm:py-10">
        <div className="container-x space-y-6">
          {toast && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs sm:text-sm flex items-center justify-between shadow-sm ${
                toast.type === "success"
                  ? "border-brand/50 bg-accent text-brand-strong"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {toast.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {session.role === "admin" && (
            <AdminDashboard
              db={db}
              adminName={session.name}
              adminEmail={session.email}
              onMutate={handleMutate}
            />
          )}

          {session.role === "mentor" && (
            <MentorDashboard
              db={db}
              mentorName={session.name}
              mentorEmail={session.email}
              onMutate={handleMutate}
            />
          )}

          {session.role === "intern" && activeInternRecord && (
            <InternDashboard
              db={db}
              intern={activeInternRecord}
              onMutate={handleMutate}
            />
          )}
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
