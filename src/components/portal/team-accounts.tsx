"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CredentialNotice } from "@/components/portal/credential-notice";
import { RoleBadge, StatusBadge } from "@/components/portal/status-badge";
import type { PublicUser, UserRole } from "@/lib/types";
import {
  UserPlus,
  Users,
  Search,
  KeyRound,
  Ban,
  CheckCircle2,
  Shield,
  UserCheck,
  GraduationCap,
} from "lucide-react";

function formatDateTime(iso?: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TeamAccountsTab({
  users,
  currentUser,
  emailEnabled,
  onMutateResult,
}: {
  users: PublicUser[];
  currentUser: PublicUser;
  emailEnabled: boolean;
  onMutateResult: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; data: Record<string, unknown> | null }>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  // Create staff account form
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"mentor" | "admin">("mentor");
  const [staffTitle, setStaffTitle] = useState("");
  const [staffDept, setStaffDept] = useState("");
  const [creating, setCreating] = useState(false);

  // Per-user confirm & in-flight state
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    type: "reset" | "toggle_disable";
  } | null>(null);

  // One-time temporary password banner
  const [issuedCredential, setIssuedCredential] = useState<{
    title: string;
    loginEmail: string;
    temporaryPassword: string;
    extraInfo?: string;
  } | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...users]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((u) => {
        if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        );
      });
  }, [users, searchQuery, roleFilter]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim()) return;
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create_staff_account",
        name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
      };
      if (staffRole === "mentor") {
        if (staffTitle.trim()) payload.title = staffTitle.trim();
        if (staffDept.trim()) payload.department = staffDept.trim();
      }
      const res = await onMutateResult(payload);
      if (res.ok && res.data) {
        const temporaryPassword =
          typeof res.data.temporaryPassword === "string"
            ? res.data.temporaryPassword
            : "";
        const loginEmail =
          typeof res.data.loginEmail === "string"
            ? res.data.loginEmail
            : staffEmail.trim();
        if (temporaryPassword) {
          setIssuedCredential({
            title: `${staffRole === "admin" ? "Admin" : "Mentor"} Account Created (${staffName.trim()})`,
            loginEmail,
            temporaryPassword,
          });
        }
        setStaffName("");
        setStaffEmail("");
        setStaffTitle("");
        setStaffDept("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (user: PublicUser) => {
    setPendingActionUserId(user.id);
    try {
      const res = await onMutateResult({
        action: "reset_account_password",
        userId: user.id,
      });
      if (res.ok && res.data) {
        const temporaryPassword =
          typeof res.data.temporaryPassword === "string"
            ? res.data.temporaryPassword
            : "";
        const loginEmail =
          typeof res.data.loginEmail === "string"
            ? res.data.loginEmail
            : user.email;
        if (temporaryPassword) {
          setIssuedCredential({
            title: `Temporary Password Issued for ${user.name}`,
            loginEmail,
            temporaryPassword,
            extraInfo:
              "User will be prompted to set a new password upon next sign-in.",
          });
        }
      }
    } finally {
      setPendingActionUserId(null);
      setConfirmAction(null);
    }
  };

  const handleToggleDisable = async (user: PublicUser) => {
    if (user.id === currentUser.id) return;
    setPendingActionUserId(user.id);
    try {
      await onMutateResult({
        action: "set_account_disabled",
        userId: user.id,
        disabled: !user.disabled,
      });
    } finally {
      setPendingActionUserId(null);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {issuedCredential && (
        <CredentialNotice
          title={issuedCredential.title}
          loginEmail={issuedCredential.loginEmail}
          temporaryPassword={issuedCredential.temporaryPassword}
          emailEnabled={emailEnabled}
          extraInfo={issuedCredential.extraInfo}
          onDismiss={() => setIssuedCredential(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Create Mentor / Admin Account Form */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-brand-strong" />
            <h3 className="text-base font-semibold text-primary">
              Create Staff Account
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-5">
            Provision a mentor or administrator account with an auto-generated
            temporary password.
          </p>

          <form onSubmit={handleCreateStaff} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="staff-role"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Account Role *
              </label>
              <Select
                id="staff-role"
                value={staffRole}
                onChange={(e) =>
                  setStaffRole(e.target.value as "mentor" | "admin")
                }
              >
                <option value="mentor">Mentor / Supervisor</option>
                <option value="admin">Administrator</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="staff-name"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Full Name *
              </label>
              <Input
                id="staff-name"
                required
                placeholder="e.g. Sara Mahmood"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="staff-email"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Work Email *
              </label>
              <Input
                id="staff-email"
                type="email"
                required
                placeholder="sara@logix.dev"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
            </div>

            {staffRole === "mentor" && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="staff-title"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Job Title (Optional)
                  </label>
                  <Input
                    id="staff-title"
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={staffTitle}
                    onChange={(e) => setStaffTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="staff-dept"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Department (Optional)
                  </label>
                  <Input
                    id="staff-dept"
                    placeholder="e.g. Web & App Development"
                    value={staffDept}
                    onChange={(e) => setStaffDept(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="brand"
              disabled={creating}
              className="w-full justify-center font-semibold cursor-pointer"
            >
              <UserPlus className="size-4" />
              {creating
                ? "Creating Account..."
                : `Create ${staffRole === "admin" ? "Admin" : "Mentor"} Account`}
            </Button>
          </form>
        </Card>

        {/* User Directory */}
        <Card className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-strong" />
              <h3 className="text-base sm:text-lg font-semibold text-primary">
                Portal User Accounts ({users.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "admin", "mentor", "intern"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-medium capitalize cursor-pointer transition-colors ${
                    roleFilter === r
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "border border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "ALL" ? "All Roles" : r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts by name, email, or role..."
              aria-label="Search portal user accounts"
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-8 text-center space-y-2">
              <Users className="size-7 mx-auto text-muted-foreground opacity-60" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                No portal user accounts match your filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUser.id;
                const isPending = pendingActionUserId === user.id;
                const isConfirmingReset =
                  confirmAction?.userId === user.id &&
                  confirmAction.type === "reset";
                const isConfirmingDisable =
                  confirmAction?.userId === user.id &&
                  confirmAction.type === "toggle_disable";

                const roleIcon =
                  user.role === "admin" ? (
                    <Shield className="size-3" />
                  ) : user.role === "mentor" ? (
                    <UserCheck className="size-3" />
                  ) : (
                    <GraduationCap className="size-3" />
                  );

                return (
                  <div
                    key={user.id}
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      user.disabled
                        ? "border-destructive/30 bg-destructive/5 opacity-85"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-primary break-words">
                          {user.name}
                        </strong>
                        {isSelf && <Badge variant="outline">You</Badge>}
                        <RoleBadge role={user.role} icon={roleIcon} />
                        <StatusBadge
                          status={user.disabled ? "Disabled" : "Active"}
                          tone={user.disabled ? "danger" : "brand"}
                        />
                        {user.mustChangePassword && (
                          <StatusBadge status="Temp Password" tone="warning" />
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground break-all">
                        {user.email}
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        Last login:{" "}
                        <span className="font-medium text-foreground">
                          {formatDateTime(user.lastLoginAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isConfirmingReset ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-brand/40 bg-accent/50 px-2.5 py-1">
                          <span className="text-[11px] font-semibold text-foreground">
                            Reset password?
                          </span>
                          <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            disabled={isPending}
                            onClick={() => void handleResetPassword(user)}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setConfirmAction(null)}
                            className="h-8 px-2.5 text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            setConfirmAction({
                              userId: user.id,
                              type: "reset",
                            })
                          }
                          className="h-9 px-3 cursor-pointer"
                        >
                          <KeyRound className="size-3.5" />
                          Reset Password
                        </Button>
                      )}

                      {!isSelf &&
                        (isConfirmingDisable ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1">
                            <span className="text-[11px] font-semibold text-destructive">
                              {user.disabled ? "Enable account?" : "Disable account?"}
                            </span>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              disabled={isPending}
                              onClick={() => void handleToggleDisable(user)}
                              className="h-8 px-2.5 text-xs cursor-pointer"
                            >
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => setConfirmAction(null)}
                              className="h-8 px-2.5 text-xs cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              setConfirmAction({
                                userId: user.id,
                                type: "toggle_disable",
                              })
                            }
                            className={`h-9 px-3 cursor-pointer ${
                              user.disabled
                                ? "text-brand-strong"
                                : "text-destructive hover:bg-destructive/10"
                            }`}
                          >
                            {user.disabled ? (
                              <>
                                <CheckCircle2 className="size-3.5" />
                                Enable
                              </>
                            ) : (
                              <>
                                <Ban className="size-3.5" />
                                Disable
                              </>
                            )}
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
