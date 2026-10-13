"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldDepartment, BatchCohort, UserRole } from "@/lib/types";
import {
  Shield,
  UserCheck,
  GraduationCap,
  Award,
  Search,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  QrCode,
  Sparkles,
} from "lucide-react";

export default function PortalHomePage() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDepartment[]>([]);
  const [batches, setBatches] = useState<BatchCohort[]>([]);
  const [verifyInput, setVerifyInput] = useState("LGX-CERT-2026-8401");

  useEffect(() => {
    fetch("/api/portal")
      .then((r) => r.json())
      .then((data) => {
        if (data.fields) setFields(data.fields);
        if (data.batches) setBatches(data.batches);
      })
      .catch(console.error);
  }, []);

  const launchRoleDashboard = (role: UserRole) => {
    const session =
      role === "admin"
        ? {
            id: "usr-admin-1",
            email: "admin@logix.dev",
            role: "admin",
            name: "Areeba Siddiqui (Program Director)",
            loginTime: Date.now(),
          }
        : role === "mentor"
          ? {
              id: "usr-mentor-1",
              email: "mentor@logix.dev",
              role: "mentor",
              name: "Zainab Tariq (Principal Mentor)",
              mentorId: "mnt-1",
              loginTime: Date.now(),
            }
          : {
              id: "usr-intern-1",
              email: "hamza.ahmed@student.edu.pk",
              role: "intern",
              name: "Hamza Ahmed (Intern)",
              internRecordId: "int-1",
              loginTime: Date.now(),
            };
    localStorage.setItem("logix_portal_session", JSON.stringify(session));
    router.push("/portal");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />
      <main className="flex-1">
        {/* Hero Section matching Logix Design System v1.0 */}
        <PageHero
          eyebrow="LOGIX INTERNSHIP MANAGEMENT PORTAL · VERSION 1.0"
          badgeText="Full Lifecycle Platform · Oct 2026"
          badgeDot
          title={
            <>
              Manage the complete internship lifecycle from{" "}
              <span className="text-brand-strong">
                application to QR-verified certification.
              </span>
            </>
          }
          description="Built on the Logix Design System v1.0. Empower Administrators, Engineering Mentors, and Student Interns with streamlined onboarding, task tracking, attendance, 360° evaluations, and tamper-evident digital certificates."
        >
          <ButtonLink
            href="/apply"
            variant="brand"
            size="lg"
            className="w-full sm:w-auto justify-center font-semibold"
          >
            Apply as an Intern →
          </ButtonLink>
          <ButtonLink
            href="/portal"
            variant="default"
            size="lg"
            className="w-full sm:w-auto justify-center"
          >
            Open Role Dashboards
          </ButtonLink>
          <ButtonLink
            href="/verify"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto justify-center"
          >
            Verify Certificate QR
          </ButtonLink>
        </PageHero>

        {/* Quick Certificate Verification Banner */}
        <section className="border-b border-border bg-muted/60 py-8">
          <div className="container-x">
            <Card inverted className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] items-center gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
                    <QrCode className="size-4" />
                    <span>Public Authenticity Verification (Section 3.8)</span>
                  </div>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                    Verify an Internship Certificate Instantly
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-white/75">
                    Enter a unique Certificate Number (e.g.,{" "}
                    <code className="text-brand font-mono">
                      LGX-CERT-2026-8401
                    </code>
                    ) or Intern ID to confirm completion status, evaluation
                    grade, and signatory authenticity.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    router.push(
                      `/verify?cert=${encodeURIComponent(verifyInput.trim())}`,
                    );
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <Input
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="LGX-CERT-2026-8401"
                    className="bg-white text-[#0b1f3a] font-mono h-11"
                  />
                  <Button
                    type="submit"
                    variant="brand"
                    size="lg"
                    className="h-11 shrink-0 font-semibold cursor-pointer"
                  >
                    <Search className="size-4" />
                    Verify Now
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </section>

        {/* Role-Based Access Launchpad (Section 2 & 3.9) */}
        <section className="py-16 sm:py-20 border-b border-border bg-background">
          <div className="container-x">
            <SectionHeader
              eyebrow="ROLE-BASED PORTAL WORKSPACES"
              title="Dedicated dashboards for every stakeholder."
              description="Each user role experiences a tailored workspace with strict role-based access control, audit logging, and real-time notifications."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Admin Role Card */}
              <Card className="p-6 sm:p-7 flex flex-col justify-between gap-6 border-2 border-primary/15 hover:border-brand transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Shield className="size-5 text-brand" />
                    </span>
                    <Badge variant="brand" dot>
                      Full System Control
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-primary">
                    1. Admin Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Complete command over intern records, application approvals,
                    departments, durations, cohort batches, attendance,
                    certificates, CSV bulk import, and PDF/Excel reports.
                  </p>
                  <ul className="space-y-1.5 text-xs text-foreground pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        CRUD Intern Records + Bulk CSV Import & PDF/Excel Export
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Manage Fields, Seat Limits, Durations & Cohort Batches
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Issue, Revoke & Re-issue QR-Verified PDF Certificates
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => launchRoleDashboard("admin")}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    Launch Admin Dashboard <ArrowRight className="size-4" />
                  </Button>
                  <ButtonLink
                    href="/login?role=admin"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                  >
                    Admin Sign In Page
                  </ButtonLink>
                </div>
              </Card>

              {/* Mentor Role Card */}
              <Card className="p-6 sm:p-7 flex flex-col justify-between gap-6 border-2 border-primary/15 hover:border-brand transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-brand-strong">
                      <UserCheck className="size-5" />
                    </span>
                    <Badge variant="secondary">Supervision & Review</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-primary">
                    2. Supervisor / Mentor Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Assign technical tasks with deadlines and specs, review
                    student pull requests and deliverables, and submit final
                    4-pillar performance evaluations.
                  </p>
                  <ul className="space-y-1.5 text-xs text-foreground pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Assign Tasks with Deadlines, Priority & Attachments
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Approve, Request Revision, or Reject Submissions
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Grade Technical, Punctuality, Communication & Teamwork
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => launchRoleDashboard("mentor")}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    Launch Mentor Dashboard <ArrowRight className="size-4" />
                  </Button>
                  <ButtonLink
                    href="/login?role=mentor"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                  >
                    Mentor Sign In Page
                  </ButtonLink>
                </div>
              </Card>

              {/* Intern Role Card */}
              <Card className="p-6 sm:p-7 flex flex-col justify-between gap-6 border-2 border-primary/15 hover:border-brand transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-brand-strong">
                      <GraduationCap className="size-5" />
                    </span>
                    <Badge variant="brand" dot>
                      Student Experience
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-primary">
                    3. Intern (Student) Portal
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Apply online, track application approval, submit task
                    deliverables, mark daily attendance, submit internship
                    feedback, and download official PDF certificates & letters.
                  </p>
                  <ul className="space-y-1.5 text-xs text-foreground pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Real-time Progress % Bar & Task Submission Center
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Daily Attendance Check-In & Leave Request Workflow
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                      <span>
                        Download Certificate, Offer, Completion & Experience
                        Letters
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => launchRoleDashboard("intern")}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    Launch Intern Dashboard <ArrowRight className="size-4" />
                  </Button>
                  <ButtonLink
                    href="/apply"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                  >
                    New Student Application Form
                  </ButtonLink>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Live Internship Departments & Seat Availability */}
        <section className="py-16 sm:py-20 bg-muted border-b border-border">
          <div className="container-x">
            <SectionHeader
              eyebrow="INTERNSHIP FIELDS & COHORTS"
              title="Active engineering & design tracks."
              description="Available in 1, 2, 3, or 6-month durations across Summer, Autumn, and Winter 2026 batches."
              action={
                <ButtonLink href="/apply" variant="brand" className="font-semibold">
                  Apply for Open Track →
                </ButtonLink>
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {fields
                .filter((f) => f.active)
                .map((field) => (
                  <Card
                    key={field.id}
                    className="p-6 flex flex-col justify-between gap-4 bg-card border-border"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="brand">{field.podName}</Badge>
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          {field.totalSeats - field.filledSeats} /{" "}
                          {field.totalSeats} seats available
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-primary">
                        {field.name}
                      </h3>
                      <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {field.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
                      {field.defaultSkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </Card>
                ))}
            </div>

            {/* Active Batches Banner */}
            {batches.length > 0 && (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {batches.map((b) => (
                  <Card
                    key={b.id}
                    className="p-5 flex items-center justify-between bg-card"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-brand-strong" />
                        <h4 className="font-bold text-primary text-sm">
                          {b.name}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {b.startDate} → {b.endDate}
                      </p>
                    </div>
                    <Badge
                      variant={b.status === "Active" ? "brand" : "secondary"}
                      dot={b.status === "Active"}
                    >
                      {b.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Enterprise Capabilities Summary */}
        <section className="py-16 bg-background">
          <div className="container-x">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 space-y-2">
                <Award className="size-6 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  Auto-Generated PDF Certificates & QR Codes
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Every completed intern receives a unique certificate number
                  with an embedded SVG QR code and Offer, Completion, and
                  Experience Letters.
                </p>
              </Card>
              <Card className="p-6 space-y-2">
                <FileSpreadsheet className="size-6 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  Bulk CSV Import & PDF/Excel Reporting
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Import hundreds of student records from Excel/CSV in one click
                  and export cohort, dropout, and certificate reports to PDF or
                  Excel.
                </p>
              </Card>
              <Card className="p-6 space-y-2">
                <Shield className="size-6 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  Audit Trail, Backups & Security
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Protected by scrypt password hashing, XSS input sanitization,
                  inactivity session timeouts, immutable audit logs, and JSON
                  database snapshots.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <PortalFooter />
    </div>
  );
}

