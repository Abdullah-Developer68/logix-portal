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
  const [session, setSession] = useState<SessionUser>({
    id: "usr-admin-1",
    email: "admin@logix.dev",
    role: "admin",
    name: "Areeba Siddiqui (Program Director)",
  });
  const [selectedInternId, setSelectedInternId] = useState<string>("int-1");
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_TIMEOUT_SECONDS);

  const fetchPortalState = useCallback(async () => {
    try {
      const res = await fetch("/api/portal", { cache: "no-store" });
      const data = await res.json();
      setDb(data);
    } catch (e) {
      console.error("Failed to fetch portal state", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/portal", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setDb(data);
        try {
          const stored = localStorage.getItem("logix_portal_session");
          if (stored) {
            const parsed = JSON.parse(stored) as SessionUser;
            if (parsed && parsed.role) {
              setSession(parsed);
              if (parsed.internRecordId) {
                setSelectedInternId(parsed.internRecordId);
              }
            }
          }
        } catch {
          // Fallback to default admin demo session
        }
      })
      .catch((e) => console.error("Failed to fetch portal state", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
      const enrichedPayload = {
        actorName: session.name,
        actorEmail: session.email,
        actorRole: session.role,
        ...payload,
      };

      const res = await fetch("/api/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-portal-role": session.role,
        },
        body: JSON.stringify(enrichedPayload),
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
        text: "Portal updated & email/audit notifications recorded.",
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

  const handleRoleSwitch = (newRole: UserRole) => {
    const nextSession: SessionUser =
      newRole === "admin"
        ? {
            id: "usr-admin-1",
            email: "admin@logix.dev",
            role: "admin",
            name: "Areeba Siddiqui (Admin)",
          }
        : newRole === "mentor"
          ? {
              id: "usr-mentor-1",
              email: "mentor@logix.dev",
              role: "mentor",
              name: "Zainab Tariq (Principal Mentor)",
              mentorId: "mnt-1",
            }
          : {
              id: "usr-intern-1",
              email: "hamza.ahmed@student.edu.pk",
              role: "intern",
              name: "Hamza Ahmed (Intern)",
              internRecordId: selectedInternId || "int-1",
            };
    setSession(nextSession);
    localStorage.setItem("logix_portal_session", JSON.stringify(nextSession));
  };

  const handleLogout = () => {
    localStorage.removeItem("logix_portal_session");
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
          {/* Active Role & Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Active Role View:
            </span>
            <button
              type="button"
              onClick={() => handleRoleSwitch("admin")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                session.role === "admin"
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="size-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("mentor")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                session.role === "mentor"
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="size-3.5" />
              Supervisor / Mentor
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch("intern")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                session.role === "intern"
                  ? "bg-brand text-brand-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5" />
              Intern (Student)
            </button>

            {session.role === "intern" && (
              <select
                value={activeInternRecord?.id || ""}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground ml-1"
                title="Switch Intern Profile"
              >
                {db.interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    Viewing as: {i.fullName} ({i.internshipStatus})
                  </option>
                ))}
              </select>
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
