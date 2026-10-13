"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CertificateModal,
  type DocumentType,
} from "@/components/portal/certificate-modal";
import { MentorDashboard } from "@/components/portal/mentor-dashboard";
import {
  exportToExcelCsv,
  downloadSampleImportCsv,
  parseCsvText,
  exportReportToPdf,
} from "@/lib/export-utils";
import type {
  PortalDatabase,
  InternRecord,
  InternshipStatus,
  ApplicationStatus,
  AttendanceStatus,
} from "@/lib/types";
import {
  Users,
  UserCheck,
  Award,
  Clock,
  Search,
  Plus,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Edit3,
  Archive,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Megaphone,
  Database,
  ShieldCheck,
  Layers,
  Calendar,
} from "lucide-react";

export function AdminDashboard({
  db,
  adminName,
  adminEmail,
  onMutate,
}: {
  db: PortalDatabase;
  adminName: string;
  adminEmail: string;
  onMutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "records"
    | "fields"
    | "tasks_eval"
    | "attendance"
    | "certificates"
    | "reports_system"
  >("overview");

  // Search & Filter states for Intern Records (Req 3.3)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterField, setFilterField] = useState("ALL");
  const [filterDuration, setFilterDuration] = useState("ALL");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Add / Edit Intern Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<InternRecord | null>(null);
  const [formFullName, setFormFullName] = useState("");
  const [formFatherName, setFormFatherName] = useState("");
  const [formCnic, setFormCnic] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formUni, setFormUni] = useState("");
  const [formDegree, setFormDegree] = useState("");
  const [formSemester, setFormSemester] = useState("");
  const [formCgpa, setFormCgpa] = useState("");
  const [formFieldId, setFormFieldId] = useState("fld-web");
  const [formDuration, setFormDuration] = useState(3);
  const [formStartDate, setFormStartDate] = useState("2026-09-01");
  const [formBatchId, setFormBatchId] = useState("bat-autumn-26");
  const [formMentorId, setFormMentorId] = useState("mnt-1");
  const [formStatus, setFormStatus] = useState<InternshipStatus>("Active");
  const [formAppStatus, setFormAppStatus] =
    useState<ApplicationStatus>("Approved");
  const [formSkills, setFormSkills] = useState("Next.js, React, TypeScript");

  // Field / Duration / Batch creation states (Req 3.4)
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldCode, setNewFieldCode] = useState("");
  const [newFieldPod, setNewFieldPod] = useState("");
  const [newFieldSeats, setNewFieldSeats] = useState(15);
  const [newFieldDesc, setNewFieldDesc] = useState("");
  const [newFieldSkills, setNewFieldSkills] = useState("");

  const [newDurMonths, setNewDurMonths] = useState(4);
  const [newDurLabel, setNewDurLabel] = useState("4 Months (Extended Track)");

  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchStart, setNewBatchStart] = useState("2027-02-01");
  const [newBatchEnd, setNewBatchEnd] = useState("2027-05-01");

  // Attendance quick mark state (Req 3.6)
  const [attInternId, setAttInternId] = useState(db.interns[0]?.id || "");
  const [attDate, setAttDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [attStatus, setAttStatus] = useState<AttendanceStatus>("Present");
  const [attNotes, setAttNotes] = useState("");

  // Announcement state (Req 3.12)
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annAudience, setAnnAudience] = useState("All Interns");
  const [annPriority, setAnnPriority] = useState<
    "Normal" | "Important" | "Urgent"
  >("Important");

  // Certificate & Letter viewer modal state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certModalIntern, setCertModalIntern] = useState<InternRecord | null>(
    null,
  );
  const [certModalType, setCertModalType] =
    useState<DocumentType>("certificate");

  const csvInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated end date in the Add/Edit modal
  const calculatedEndDate = (() => {
    if (!formStartDate) return "";
    const d = new Date(formStartDate);
    if (Number.isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + Number(formDuration || 3));
    return d.toISOString().split("T")[0];
  })();

  const openAddInternModal = () => {
    setEditingIntern(null);
    setFormFullName("");
    setFormFatherName("");
    setFormCnic("");
    setFormEmail("");
    setFormPhone("");
    setFormCity("Lahore");
    setFormUni("FAST-NUCES");
    setFormDegree("BS Computer Science");
    setFormSemester("7th Semester");
    setFormCgpa("3.70");
    setFormFieldId(db.fields[0]?.id || "fld-web");
    setFormDuration(3);
    setFormStartDate("2026-11-01");
    setFormBatchId(db.batches[2]?.id || db.batches[0]?.id || "");
    setFormMentorId(db.mentors[0]?.id || "");
    setFormStatus("Active");
    setFormAppStatus("Approved");
    setFormSkills("Next.js, React, TypeScript");
    setRecordModalOpen(true);
  };

  const openEditInternModal = (intern: InternRecord) => {
    setEditingIntern(intern);
    setFormFullName(intern.fullName);
    setFormFatherName(intern.fatherName);
    setFormCnic(intern.cnicOrStudentId);
    setFormEmail(intern.email);
    setFormPhone(intern.phone);
    setFormCity(intern.city);
    setFormUni(intern.university);
    setFormDegree(intern.degree);
    setFormSemester(intern.semester);
    setFormCgpa(intern.cgpa);
    setFormFieldId(intern.fieldId);
    setFormDuration(intern.durationMonths);
    setFormStartDate(intern.startDate);
    setFormBatchId(intern.batchId);
    setFormMentorId(intern.mentorId);
    setFormStatus(intern.internshipStatus);
    setFormAppStatus(intern.applicationStatus);
    setFormSkills(intern.skills.join(", "));
    setRecordModalOpen(true);
  };

  const handleSaveInternRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onMutate({
      action: "save_intern_record",
      id: editingIntern?.id,
      fullName: formFullName,
      fatherName: formFatherName,
      cnicOrStudentId: formCnic,
      email: formEmail,
      phone: formPhone,
      city: formCity,
      university: formUni,
      degree: formDegree,
      semester: formSemester,
      cgpa: formCgpa,
      fieldId: formFieldId,
      durationMonths: formDuration,
      startDate: formStartDate,
      batchId: formBatchId,
      mentorId: formMentorId,
      internshipStatus: formStatus,
      applicationStatus: formAppStatus,
      skills: formSkills,
      actorName: adminName,
      actorEmail: adminEmail,
      actorRole: "admin",
    });
    if (ok) setRecordModalOpen(false);
  };

  const handleCsvFileImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsvText(text);
    if (rows.length > 0) {
      await onMutate({
        action: "bulk_import_interns",
        rows,
        actorName: adminName,
        actorEmail: adminEmail,
        actorRole: "admin",
      });
    }
    e.target.value = "";
  };

  // Filtered Intern Records
  const filteredInterns = db.interns.filter((i) => {
    if (!showArchived && i.archived) return false;
    if (showArchived && !i.archived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        i.fullName.toLowerCase().includes(q) ||
        i.internId.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.fieldName.toLowerCase().includes(q) ||
        i.internshipStatus.toLowerCase().includes(q) ||
        i.university.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (
      filterField !== "ALL" &&
      i.fieldId !== filterField &&
      i.fieldName !== filterField
    ) {
      return false;
    }
    if (
      filterDuration !== "ALL" &&
      String(i.durationMonths) !== filterDuration
    ) {
      return false;
    }
    if (
      filterBatch !== "ALL" &&
      i.batchId !== filterBatch &&
      i.batchName !== filterBatch
    ) {
      return false;
    }
    if (filterStatus !== "ALL" && i.internshipStatus !== filterStatus) {
      return false;
    }
    if (dateFrom && i.startDate < dateFrom) return false;
    if (dateTo && i.startDate > dateTo) return false;

    return true;
  });

  // KPI Metrics (Req 3.9)
  const nonArchived = db.interns.filter((i) => !i.archived);
  const totalInterns = nonArchived.length;
  const activeCount = nonArchived.filter(
    (i) => i.internshipStatus === "Active",
  ).length;
  const completedCount = nonArchived.filter(
    (i) => i.internshipStatus === "Completed",
  ).length;
  const pendingApps = nonArchived.filter(
    (i) => i.applicationStatus === "Pending",
  );
  const droppedOrTerminated = nonArchived.filter(
    (i) =>
      i.internshipStatus === "Dropped" || i.internshipStatus === "Terminated",
  ).length;
  const issuedCertificatesCount = db.certificates.filter(
    (c) => c.status !== "Revoked",
  ).length;

  const handleExportFilteredExcel = () => {
    exportToExcelCsv(
      `logix_intern_records_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Intern ID",
        "Full Name",
        "Father Name",
        "CNIC / Student ID",
        "Email",
        "Phone",
        "University",
        "Degree",
        "Field",
        "Duration (Months)",
        "Start Date",
        "End Date",
        "Batch",
        "Mentor",
        "Application Status",
        "Internship Status",
        "Progress %",
        "Attendance %",
      ],
      filteredInterns.map((i) => [
        i.internId,
        i.fullName,
        i.fatherName,
        i.cnicOrStudentId,
        i.email,
        i.phone,
        i.university,
        i.degree,
        i.fieldName,
        i.durationMonths,
        i.startDate,
        i.endDate,
        i.batchName,
        i.mentorName,
        i.applicationStatus,
        i.internshipStatus,
        i.progressPercentage,
        i.attendancePercentage,
      ]),
    );
  };

  const handleExportFilteredPdf = () => {
    exportReportToPdf({
      title: "Logix Intern Roster & Lifecycle Report",
      subtitle: `Filtered Records (${filteredInterns.length} Interns) · Generated by ${adminName}`,
      summaryMetrics: [
        { label: "Total Interns", value: totalInterns },
        { label: "Active Cohort", value: activeCount },
        { label: "Completed", value: completedCount },
        { label: "Certificates Issued", value: issuedCertificatesCount },
      ],
      headers: [
        "Intern ID",
        "Full Name",
        "University",
        "Department",
        "Duration",
        "Start → End",
        "Mentor",
        "Status",
        "Progress",
      ],
      rows: filteredInterns.map((i) => [
        i.internId,
        i.fullName,
        i.university,
        i.fieldName,
        `${i.durationMonths}M`,
        `${i.startDate} → ${i.endDate}`,
        i.mentorName,
        i.internshipStatus,
        `${i.progressPercentage}%`,
      ]),
    });
  };

  const handleDownloadJsonBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logix_portal_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "overview", label: "Admin Dashboard" },
          {
            id: "records",
            label: `Intern Records & Applications (${nonArchived.length})`,
          },
          { id: "fields", label: "Fields, Durations & Batches" },
          { id: "tasks_eval", label: "Tasks & Evaluations" },
          { id: "attendance", label: "Attendance & Leaves" },
          {
            id: "certificates",
            label: `Certificates (${db.certificates.length})`,
          },
          { id: "reports_system", label: "Reports, Announcements & Audit" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              setActiveTab(
                tab.id as
                  | "overview"
                  | "records"
                  | "fields"
                  | "tasks_eval"
                  | "attendance"
                  | "certificates"
                  | "reports_system",
              )
            }
            className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================
          TAB 1: ADMIN DASHBOARD OVERVIEW (Req 3.9)
         ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card inverted className="p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/70">
                <span>Total Interns</span>
                <Users className="size-4 text-brand" />
              </div>
              <div className="text-3xl font-bold text-white mt-2">
                {totalInterns}
              </div>
              <p className="text-xs text-white/60 mt-1">
                Across {db.batches.length} cohort batches
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Active Interns</span>
                <UserCheck className="size-4 text-brand-strong" />
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {activeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently in pod mentorship
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Completed</span>
                <CheckCircle2 className="size-4 text-brand-strong" />
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {completedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Graduated cohorts
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Pending Applications</span>
                <Clock className="size-4 text-brand-strong" />
              </div>
              <div className="text-3xl font-bold text-brand-strong mt-2">
                {pendingApps.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting selection decision
              </p>
            </Card>

            <Card className="col-span-2 lg:col-span-1 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Certificates Issued</span>
                <Award className="size-4 text-brand-strong" />
              </div>
              <div className="text-3xl font-bold text-primary mt-2">
                {issuedCertificatesCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                QR-verifiable credentials
              </p>
            </Card>
          </div>

          {/* Analytics Breakdown: Interns by Field & Interns by Duration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-primary">
                  Interns by Field / Department
                </h3>
                <Badge variant="brand">{db.fields.length} Departments</Badge>
              </div>
              <div className="space-y-3">
                {db.fields.map((field) => {
                  const count = nonArchived.filter(
                    (i) =>
                      i.fieldId === field.id || i.fieldName === field.name,
                  ).length;
                  const pct = Math.min(
                    100,
                    Math.round((count / Math.max(1, field.totalSeats)) * 100),
                  );
                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {field.name}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({field.podName})
                          </span>
                        </span>
                        <span className="font-mono font-semibold text-brand-strong">
                          {count} / {field.totalSeats} seats
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-base font-bold text-primary">
                  Interns by Duration & Cohort Status
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 6].map((m) => {
                    const c = nonArchived.filter(
                      (i) => i.durationMonths === m,
                    ).length;
                    return (
                      <div
                        key={m}
                        className="rounded-xl border border-border bg-muted/40 p-3.5 text-center"
                      >
                        <div className="text-2xl font-bold text-primary">
                          {c}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                          {m} {m === 1 ? "Month" : "Months"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Pending Applications Quick Approval Queue */}
              <Card className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-primary">
                    Pending Applications Queue
                  </h3>
                  <Badge variant="brand">{pendingApps.length} Pending</Badge>
                </div>
                {pendingApps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All submitted applications have been reviewed!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingApps.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-xl border border-border bg-muted/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-primary">
                              {app.fullName}
                            </strong>
                            <span className="font-mono text-xs text-brand-strong">
                              {app.internId}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {app.university} (CGPA {app.cgpa}) · {app.fieldName}{" "}
                            ({app.durationMonths}M)
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            onClick={() =>
                              onMutate({
                                action: "update_application_status",
                                id: app.id,
                                applicationStatus: "Approved",
                                actorName: adminName,
                                actorEmail: adminEmail,
                                actorRole: "admin",
                              })
                            }
                            className="cursor-pointer font-semibold"
                          >
                            Approve & Notify
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onMutate({
                                action: "update_application_status",
                                id: app.id,
                                applicationStatus: "Rejected",
                                actorName: adminName,
                                actorEmail: adminEmail,
                                actorRole: "admin",
                              })
                            }
                            className="text-destructive cursor-pointer"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: INTERN RECORD MANAGEMENT (Req 3.3)
         ============================================================ */}
      {activeTab === "records" && (
        <div className="space-y-5">
          {/* Toolbar: Search, Filters, Add, Bulk Import, Export Excel/PDF */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="size-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Intern Name, Unique ID (LGX-INT-...), Field, University, or Status..."
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={openAddInternModal}
                  className="cursor-pointer font-semibold"
                >
                  <Plus className="size-4" />
                  Add Intern Record
                </Button>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvFileImport}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => csvInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  Bulk Import CSV
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={downloadSampleImportCsv}
                  className="cursor-pointer text-xs"
                >
                  CSV Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportFilteredExcel}
                  className="cursor-pointer"
                >
                  <FileSpreadsheet className="size-3.5 text-brand-strong" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleExportFilteredPdf}
                  className="cursor-pointer"
                >
                  <Download className="size-3.5" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Multi-Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border">
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
              >
                <option value="ALL">All Departments</option>
                {db.fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
              >
                <option value="ALL">All Durations</option>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
              </select>

              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
              >
                <option value="ALL">All Batches</option>
                {db.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
              >
                <option value="ALL">All Lifecycle Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Dropped">Dropped</option>
                <option value="Terminated">Terminated</option>
              </select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-xs"
                title="Start Date From"
              />

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-xs"
                  title="Start Date To"
                />
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`shrink-0 rounded-lg border px-2.5 py-2 text-xs font-medium cursor-pointer ${
                    showArchived
                      ? "border-brand bg-accent text-brand-strong"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {showArchived ? "Archived" : "Active"}
                </button>
              </div>
            </div>
          </Card>

          {/* Responsive Intern Records Table */}
          <Card className="p-0 overflow-hidden">
            <div className="table-wrapper">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground border-b border-border">
                    <th className="py-3.5 px-4 font-semibold">Intern ID & Name</th>
                    <th className="py-3.5 px-4 font-semibold">Education</th>
                    <th className="py-3.5 px-4 font-semibold">
                      Department & Batch
                    </th>
                    <th className="py-3.5 px-4 font-semibold">
                      Duration & Dates
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Mentor</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInterns.map((intern) => (
                    <tr
                      key={intern.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-brand-strong">
                          {intern.internId}
                        </div>
                        <div className="font-bold text-primary">
                          {intern.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {intern.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">
                          {intern.university}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {intern.degree} · CGPA {intern.cgpa}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="brand">{intern.fieldName}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {intern.batchName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">
                          {intern.durationMonths} Months
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {intern.startDate} → {intern.endDate}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">
                          {intern.mentorName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Progress: {intern.progressPercentage}%
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            intern.internshipStatus === "Completed" ||
                            intern.internshipStatus === "Active"
                              ? "brand"
                              : intern.internshipStatus === "Applied"
                                ? "secondary"
                                : "default"
                          }
                          dot
                        >
                          {intern.internshipStatus}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditInternModal(intern)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCertModalIntern(intern);
                              setCertModalType("offer_letter");
                              setCertModalOpen(true);
                            }}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-brand-strong hover:bg-muted cursor-pointer"
                            title="Letters & Certificate"
                          >
                            <FileText className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onMutate({
                                action: "archive_intern_record",
                                id: intern.id,
                                actorName: adminName,
                                actorEmail: adminEmail,
                                actorRole: "admin",
                              })
                            }
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title={intern.archived ? "Restore" : "Archive"}
                          >
                            <Archive className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onMutate({
                                action: "delete_intern_record",
                                id: intern.id,
                                actorName: adminName,
                                actorEmail: adminEmail,
                                actorRole: "admin",
                              })
                            }
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 3: FIELDS, DURATIONS & BATCHES (Req 3.4)
         ============================================================ */}
      {activeTab === "fields" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fields / Departments Column */}
          <Card className="lg:col-span-2 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-brand-strong" />
                <h3 className="text-lg font-bold text-primary">
                  Internship Fields & Seat Capacity
                </h3>
              </div>
              <Badge variant="brand">{db.fields.length} Tracks</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {db.fields.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    f.active
                      ? "border-border bg-muted/30"
                      : "border-dashed border-border bg-muted/10 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary text-sm">
                        {f.name}
                      </span>
                      <Badge variant={f.active ? "brand" : "secondary"}>
                        {f.active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {f.podName} · Seats: {f.filledSeats}/{f.totalSeats}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Code: {f.code}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onMutate({
                          action: "toggle_field",
                          id: f.id,
                          actorName: adminName,
                          actorEmail: adminEmail,
                          actorRole: "admin",
                        })
                      }
                      className="text-xs font-semibold text-brand-strong hover:underline cursor-pointer"
                    >
                      {f.active ? "Disable Track" : "Enable Track"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newFieldName.trim()) return;
                const ok = await onMutate({
                  action: "save_field",
                  name: newFieldName,
                  code: newFieldCode,
                  podName: newFieldPod,
                  totalSeats: newFieldSeats,
                  description: newFieldDesc,
                  defaultSkills: newFieldSkills,
                  actorName: adminName,
                  actorEmail: adminEmail,
                  actorRole: "admin",
                });
                if (ok) {
                  setNewFieldName("");
                  setNewFieldCode("");
                  setNewFieldPod("");
                  setNewFieldDesc("");
                  setNewFieldSkills("");
                }
              }}
              className="pt-4 border-t border-border space-y-3"
            >
              <h4 className="text-sm font-bold text-primary">
                Add New Internship Field / Department
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  required
                  placeholder="Field Name (e.g. Cybersecurity)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                />
                <Input
                  placeholder="Pod Name (e.g. SecOps Pod)"
                  value={newFieldPod}
                  onChange={(e) => setNewFieldPod(e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Seats (e.g. 15)"
                  value={newFieldSeats}
                  onChange={(e) => setNewFieldSeats(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Default Skills (comma separated)"
                  value={newFieldSkills}
                  onChange={(e) => setNewFieldSkills(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="brand"
                  className="cursor-pointer font-semibold"
                >
                  <Plus className="size-4" />
                  Create Department Track
                </Button>
              </div>
            </form>
          </Card>

          {/* Durations & Cohort Batches Column */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-primary">
                Available Durations
              </h3>
              <div className="space-y-2">
                {db.durations.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                  >
                    <div>
                      <strong className="text-foreground">{d.label}</strong>
                      <div className="text-muted-foreground">{d.weeks} weeks</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onMutate({
                          action: "toggle_duration",
                          id: d.id,
                          actorName: adminName,
                        })
                      }
                      className="text-brand-strong font-semibold hover:underline cursor-pointer"
                    >
                      {d.active ? "Active" : "Disabled"}
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onMutate({
                    action: "save_duration",
                    months: newDurMonths,
                    label: newDurLabel,
                    actorName: adminName,
                    actorEmail: adminEmail,
                    actorRole: "admin",
                  });
                }}
                className="pt-3 border-t border-border space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newDurMonths}
                    onChange={(e) => setNewDurMonths(Number(e.target.value))}
                  />
                  <Input
                    value={newDurLabel}
                    onChange={(e) => setNewDurLabel(e.target.value)}
                    placeholder="Label"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center cursor-pointer"
                >
                  Add Duration Option
                </Button>
              </form>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  Cohort Batches
                </h3>
              </div>
              <div className="space-y-2">
                {db.batches.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-border p-3 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-foreground">{b.name}</div>
                      <div className="text-muted-foreground">
                        {b.startDate} → {b.endDate}
                      </div>
                    </div>
                    <Badge variant="brand">{b.status}</Badge>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newBatchName.trim()) return;
                  const ok = await onMutate({
                    action: "save_batch",
                    name: newBatchName,
                    startDate: newBatchStart,
                    endDate: newBatchEnd,
                    status: "Upcoming",
                    actorName: adminName,
                    actorEmail: adminEmail,
                    actorRole: "admin",
                  });
                  if (ok) setNewBatchName("");
                }}
                className="pt-3 border-t border-border space-y-2"
              >
                <Input
                  required
                  placeholder='e.g. "Spring 2027 Batch"'
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={newBatchStart}
                    onChange={(e) => setNewBatchStart(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={newBatchEnd}
                    onChange={(e) => setNewBatchEnd(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  className="w-full justify-center cursor-pointer font-semibold"
                >
                  Create Cohort Batch
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: TASKS & PERFORMANCE EVALUATIONS (Req 3.5 & 3.7)
         ============================================================ */}
      {activeTab === "tasks_eval" && (
        <MentorDashboard
          db={db}
          mentorName={adminName}
          mentorEmail={adminEmail}
          onMutate={onMutate}
        />
      )}

      {/* ============================================================
          TAB 5: ATTENDANCE & LEAVE APPROVALS (Req 3.6)
         ============================================================ */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-primary">
              Mark Daily / Weekly Attendance
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onMutate({
                  action: "mark_attendance",
                  internRecordId: attInternId,
                  date: attDate,
                  status: attStatus,
                  notes: attNotes,
                  actorName: adminName,
                  actorEmail: adminEmail,
                  actorRole: "admin",
                });
                setAttNotes("");
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={attInternId}
                  onChange={(e) => setAttInternId(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {nonArchived.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.fullName} ({i.attendancePercentage}%)
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["Present", "Late", "Absent", "Leave"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAttStatus(st)}
                    className={`h-9 rounded-lg border text-xs font-semibold cursor-pointer ${
                      attStatus === st
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Notes (e.g. Daily standup attended)"
                value={attNotes}
                onChange={(e) => setAttNotes(e.target.value)}
              />
              <Button
                type="submit"
                variant="brand"
                className="w-full justify-center font-semibold cursor-pointer"
              >
                Save Attendance Entry
              </Button>
            </form>

            <div className="pt-4 border-t border-border space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Recent Attendance Records
              </h4>
              {db.attendance.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                >
                  <div>
                    <strong className="text-foreground">{a.internName}</strong>{" "}
                    <span className="font-mono text-muted-foreground">
                      ({a.date})
                    </span>
                  </div>
                  <Badge
                    variant={a.status === "Present" ? "brand" : "secondary"}
                  >
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-primary">
              Student Leave Requests Approval
            </h3>
            <div className="space-y-3">
              {db.leaves.map((lv) => (
                <div
                  key={lv.id}
                  className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-primary">
                        {lv.internName}
                      </strong>
                      <Badge
                        variant={
                          lv.status === "Approved"
                            ? "brand"
                            : lv.status === "Rejected"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {lv.status}
                      </Badge>
                    </div>
                    <div className="font-mono text-foreground">
                      {lv.startDate} → {lv.endDate}
                    </div>
                    <p className="text-muted-foreground">{lv.reason}</p>
                  </div>
                  {lv.status === "Pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="brand"
                        size="sm"
                        onClick={() =>
                          onMutate({
                            action: "review_leave",
                            leaveId: lv.id,
                            status: "Approved",
                            actorName: adminName,
                          })
                        }
                        className="cursor-pointer"
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onMutate({
                            action: "review_leave",
                            leaveId: lv.id,
                            status: "Rejected",
                            actorName: adminName,
                          })
                        }
                        className="text-destructive cursor-pointer"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 6: CERTIFICATE MANAGEMENT (Req 3.8)
         ============================================================ */}
      {activeTab === "certificates" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="eyebrow">
                  ELIGIBILITY & CREDENTIAL ISSUANCE
                </span>
                <h3 className="text-lg font-bold text-primary">
                  Issue Official QR-Verified Certificates
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rule enforced: Certificates can only be issued for interns
                  with status <strong>Completed</strong> AND a completed{" "}
                  <strong>Mentor Performance Evaluation</strong>.
                </p>
              </div>
              <Badge variant="brand">
                {db.certificates.length} Total Certificates
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nonArchived.map((intern) => {
                const evalRec = db.evaluations.find(
                  (e) => e.internRecordId === intern.id && e.completed,
                );
                const certRec = db.certificates.find(
                  (c) => c.internRecordId === intern.id,
                );
                const isEligible =
                  intern.internshipStatus === "Completed" && Boolean(evalRec);

                return (
                  <div
                    key={intern.id}
                    className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-brand-strong">
                          {intern.internId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              intern.internshipStatus === "Completed"
                                ? "brand"
                                : "secondary"
                            }
                          >
                            {intern.internshipStatus}
                          </Badge>
                          <Badge
                            variant={evalRec ? "brand" : "outline"}
                          >
                            {evalRec
                              ? `Eval: ${evalRec.grade} (${evalRec.totalMarks}%)`
                              : "Eval Pending"}
                          </Badge>
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-primary mt-1.5">
                        {intern.fullName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {intern.fieldName} · {intern.durationMonths} Months (
                        {intern.startDate} → {intern.endDate})
                      </p>
                      {certRec && (
                        <div className="mt-2 rounded-lg bg-accent/60 border border-brand/30 px-3 py-1.5 text-xs flex items-center justify-between">
                          <span className="font-mono font-bold text-brand-strong">
                            {certRec.certificateNumber}
                          </span>
                          <span className="font-semibold">
                            Status: {certRec.status}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      {!certRec ? (
                        <Button
                          type="button"
                          variant={isEligible ? "brand" : "outline"}
                          size="sm"
                          disabled={!isEligible}
                          onClick={() =>
                            onMutate({
                              action: "issue_certificate",
                              internRecordId: intern.id,
                              actorName: adminName,
                              actorEmail: adminEmail,
                              actorRole: "admin",
                            })
                          }
                          className="cursor-pointer font-semibold"
                        >
                          <Award className="size-3.5" />
                          {isEligible
                            ? "Issue QR Certificate"
                            : "Requires Completed + Evaluation"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            onClick={() => {
                              setCertModalIntern(intern);
                              setCertModalType("certificate");
                              setCertModalOpen(true);
                            }}
                            className="cursor-pointer font-semibold"
                          >
                            <Award className="size-3.5" />
                            View / Print PDF
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onMutate({
                                action: "issue_certificate",
                                internRecordId: intern.id,
                                actorName: adminName,
                                actorEmail: adminEmail,
                                actorRole: "admin",
                              })
                            }
                            className="cursor-pointer"
                          >
                            <RotateCcw className="size-3.5" />
                            Re-Issue
                          </Button>
                          {certRec.status !== "Revoked" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onMutate({
                                  action: "revoke_certificate",
                                  certificateId: certRec.id,
                                  reason:
                                    "Administrative compliance verification.",
                                  actorName: adminName,
                                  actorEmail: adminEmail,
                                  actorRole: "admin",
                                })
                              }
                              className="text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <XCircle className="size-3.5" />
                              Revoke
                            </Button>
                          )}
                        </>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCertModalIntern(intern);
                          setCertModalType("offer_letter");
                          setCertModalOpen(true);
                        }}
                        className="cursor-pointer text-xs"
                      >
                        Letters
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 7: REPORTS, ANNOUNCEMENTS, AUDIT LOG & BACKUPS
         ============================================================ */}
      {activeTab === "reports_system" && (
        <div className="space-y-6">
          {/* Reports Center (Req 3.11) */}
          <Card className="p-6 space-y-4">
            <span className="eyebrow">EXECUTIVE ANALYTICS & EXPORT REPORTS</span>
            <h3 className="text-lg font-bold text-primary">
              Generate Official Portal Reports (PDF & Excel)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Report 1 */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    1. Intern Report by Field, Duration & Batch
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comprehensive breakdown of all {totalInterns} interns
                    grouped by department, cohort batch, duration, and status.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={handleExportFilteredPdf}
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportFilteredExcel}
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export Excel
                  </Button>
                </div>
              </div>

              {/* Report 2 */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    2. Completion & Dropout Analysis Report
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tracks cohort retention: {completedCount} Completed,{" "}
                    {activeCount} Active, and {droppedOrTerminated} Dropped /
                    Terminated.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() =>
                      exportReportToPdf({
                        title: "Completion & Dropout Retention Report",
                        subtitle:
                          "Cohort Completion vs. Attrition Analysis — Logix Portal",
                        summaryMetrics: [
                          { label: "Completed", value: completedCount },
                          { label: "Active", value: activeCount },
                          {
                            label: "Dropped / Terminated",
                            value: droppedOrTerminated,
                          },
                        ],
                        headers: [
                          "Intern ID",
                          "Name",
                          "Field",
                          "Batch",
                          "Status",
                          "Task Progress",
                          "Attendance",
                        ],
                        rows: nonArchived.map((i) => [
                          i.internId,
                          i.fullName,
                          i.fieldName,
                          i.batchName,
                          i.internshipStatus,
                          `${i.progressPercentage}%`,
                          `${i.attendancePercentage}%`,
                        ]),
                      })
                    }
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToExcelCsv(
                        "logix_completion_dropout_report.csv",
                        [
                          "Intern ID",
                          "Name",
                          "Field",
                          "Batch",
                          "Status",
                          "Progress %",
                          "Attendance %",
                        ],
                        nonArchived.map((i) => [
                          i.internId,
                          i.fullName,
                          i.fieldName,
                          i.batchName,
                          i.internshipStatus,
                          i.progressPercentage,
                          i.attendancePercentage,
                        ]),
                      )
                    }
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export Excel
                  </Button>
                </div>
              </div>

              {/* Report 3 */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-primary text-sm">
                    3. Certificate Issuance Registry Report
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Audit report of all {db.certificates.length} issued
                    certificates, verification codes, grades, and validity
                    status.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() =>
                      exportReportToPdf({
                        title: "Certificate Issuance & Verification Registry",
                        subtitle:
                          "Official Logix Credential Audit Log",
                        headers: [
                          "Certificate No",
                          "Intern ID",
                          "Intern Name",
                          "Department",
                          "Duration",
                          "Grade",
                          "Issue Date",
                          "Status",
                        ],
                        rows: db.certificates.map((c) => [
                          c.certificateNumber,
                          c.internId,
                          c.internName,
                          c.fieldName,
                          `${c.durationMonths}M`,
                          `${c.grade} (${c.totalMarks}%)`,
                          c.issueDate,
                          c.status,
                        ]),
                      })
                    }
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToExcelCsv(
                        "logix_certificate_issuance_report.csv",
                        [
                          "Certificate No",
                          "Intern ID",
                          "Intern Name",
                          "Department",
                          "Duration Months",
                          "Grade",
                          "Total Marks",
                          "Issue Date",
                          "Status",
                        ],
                        db.certificates.map((c) => [
                          c.certificateNumber,
                          c.internId,
                          c.internName,
                          c.fieldName,
                          c.durationMonths,
                          c.grade,
                          c.totalMarks,
                          c.issueDate,
                          c.status,
                        ]),
                      )
                    }
                    className="flex-1 justify-center cursor-pointer"
                  >
                    Export Excel
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Announcements + Database Backups Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Post Announcement (Req 3.12) */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  Broadcast Cohort Announcement
                </h3>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!annTitle.trim() || !annContent.trim()) return;
                  const ok = await onMutate({
                    action: "post_announcement",
                    title: annTitle,
                    content: annContent,
                    targetAudience: annAudience,
                    priority: annPriority,
                    actorName: adminName,
                    actorEmail: adminEmail,
                    actorRole: "admin",
                  });
                  if (ok) {
                    setAnnTitle("");
                    setAnnContent("");
                  }
                }}
                className="space-y-3"
              >
                <Input
                  required
                  placeholder="Announcement Title"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                  >
                    <option value="All Interns">All Interns</option>
                    {db.batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        Batch: {b.name}
                      </option>
                    ))}
                    {db.fields.map((f) => (
                      <option key={f.id} value={f.name}>
                        Field: {f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={annPriority}
                    onChange={(e) =>
                      setAnnPriority(
                        e.target.value as "Normal" | "Important" | "Urgent",
                      )
                    }
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                  >
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
                <Textarea
                  rows={3}
                  required
                  placeholder="Write announcement message..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full justify-center font-semibold cursor-pointer"
                >
                  Publish Announcement
                </Button>
              </form>
            </Card>

            {/* Database Backups (Req 4) */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-brand-strong" />
                  <h3 className="text-base font-bold text-primary">
                    Database Backup Snapshots
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() =>
                      onMutate({
                        action: "create_backup",
                        label: `Admin Snapshot (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
                        actorName: adminName,
                        actorEmail: adminEmail,
                        actorRole: "admin",
                      })
                    }
                    className="cursor-pointer font-semibold"
                  >
                    Create Snapshot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadJsonBackup}
                    className="cursor-pointer"
                  >
                    Download JSON
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {db.backups.map((bkp) => (
                  <div
                    key={bkp.id}
                    className="rounded-lg border border-border bg-muted/30 p-3 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-foreground">
                        {bkp.label}
                      </div>
                      <div className="text-muted-foreground">
                        {bkp.recordCount} records ·{" "}
                        {(bkp.sizeBytes / 1024).toFixed(1)} KB · by{" "}
                        {bkp.createdBy}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-brand-strong">
                      {bkp.timestamp.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Immutable Security Audit Log (Req 4) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-strong" />
                <h3 className="text-base font-bold text-primary">
                  System Security & Action Audit Log
                </h3>
              </div>
              <Badge variant="outline">{db.auditLogs.length} Events</Badge>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {db.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-brand-strong mr-2">
                      [{log.action}]
                    </span>
                    <strong className="text-foreground">{log.actorName}</strong>{" "}
                    <span className="text-muted-foreground">
                      ({log.actorRole}) — {log.details}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {log.timestamp.slice(0, 19).replace("T", " ")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Intern Record Modal */}
      {recordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <h3 className="text-xl font-bold text-primary">
                {editingIntern
                  ? `Edit Intern Record (${editingIntern.internId})`
                  : "Add New Intern Record"}
              </h3>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInternRecord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Full Name *
                  </label>
                  <Input
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Father&apos;s Name
                  </label>
                  <Input
                    value={formFatherName}
                    onChange={(e) => setFormFatherName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    CNIC / Student ID *
                  </label>
                  <Input
                    required
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Email *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Phone
                  </label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    City
                  </label>
                  <Input
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    University
                  </label>
                  <Input
                    value={formUni}
                    onChange={(e) => setFormUni(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Degree & CGPA
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formDegree}
                      onChange={(e) => setFormDegree(e.target.value)}
                      placeholder="BS CS"
                    />
                    <Input
                      value={formCgpa}
                      onChange={(e) => setFormCgpa(e.target.value)}
                      placeholder="3.75"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Department / Field
                  </label>
                  <select
                    value={formFieldId}
                    onChange={(e) => setFormFieldId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {db.fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Duration (Months)
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {db.durations.map((d) => (
                      <option key={d.id} value={d.months}>
                        {d.months} Months
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Start Date (End Date Auto-Calculated)
                  </label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                  <span className="text-[11px] text-brand-strong font-semibold">
                    Auto End Date: {calculatedEndDate}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Assigned Mentor
                  </label>
                  <select
                    value={formMentorId}
                    onChange={(e) => setFormMentorId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {db.mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Cohort Batch
                  </label>
                  <select
                    value={formBatchId}
                    onChange={(e) => setFormBatchId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {db.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-primary">
                    Internship Lifecycle Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as InternshipStatus)
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Dropped">Dropped</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-primary">
                  Skills (Comma separated)
                </label>
                <Input
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  className="font-semibold cursor-pointer"
                >
                  Save Intern Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        intern={certModalIntern}
        certificate={db.certificates.find(
          (c) => c.internRecordId === certModalIntern?.id,
        )}
        initialDocType={certModalType}
      />
    </div>
  );
}

