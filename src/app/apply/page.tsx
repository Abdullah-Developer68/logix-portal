"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/portal/status-badge";
import type {
  FieldDepartment,
  DurationOption,
  BatchCohort,
  InternRecord,
} from "@/lib/types";
import {
  ArrowUpRight,
  CheckCircle2,
  Upload,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Camera,
} from "lucide-react";

export default function ApplyPage() {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDepartment[]>([]);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [batches, setBatches] = useState<BatchCohort[]>([]);

  // Form State (Req 3.2)
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [cnicOrStudentId, setCnicOrStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");

  // Education
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [semester, setSemester] = useState("");
  const [cgpa, setCgpa] = useState("");

  // Internship Choice
  const [fieldId, setFieldId] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [startPreference, setStartPreference] = useState(() => {
    const d = new Date();
    const diff = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  });
  const [batchId, setBatchId] = useState("");

  // Uploads & Links
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedIntern, setSubmittedIntern] = useState<InternRecord | null>(
    null,
  );

  const cvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portal?meta=public")
      .then((r) => r.json())
      .then((data) => {
        if (data.fields) {
          const activeFields = data.fields.filter(
            (f: FieldDepartment) => f.active,
          );
          setFields(activeFields);
          if (activeFields[0]) setFieldId(activeFields[0].id);
        }
        if (data.durations) {
          const activeDurations = data.durations.filter(
            (d: DurationOption) => d.active,
          );
          setDurations(activeDurations);
          if (
            activeDurations.length > 0 &&
            !activeDurations.some((d: DurationOption) => d.months === 3)
          ) {
            setDurationMonths(activeDurations[0].months);
          }
        }
        if (data.batches) {
          setBatches(data.batches);
          if (data.batches[0]) setBatchId(data.batches[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Calculate preview end date from startPreference + durationMonths
  const previewEndDate = (() => {
    if (!startPreference) return "";
    const d = new Date(startPreference);
    if (Number.isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + Number(durationMonths || 3));
    return d.toISOString().split("T")[0];
  })();

  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      setError("CV must be a PDF, DOC, or DOCX document.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("CV file size cannot exceed 4MB.");
      return;
    }
    setError(null);
    setCvFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !cnicOrStudentId.trim()) {
      setError("Please fill in all required personal fields.");
      return;
    }
    if (!university.trim() || !degree.trim()) {
      setError("Please provide your university and degree details.");
      return;
    }
    if (!cvFile) {
      setError("Please upload your CV / Resume before submitting.");
      return;
    }
    if (cvFile.size > MAX_UPLOAD_BYTES) {
      setError("CV file size cannot exceed 4MB.");
      return;
    }
    if (photoFile && photoFile.size > MAX_UPLOAD_BYTES) {
      setError("Profile photo size cannot exceed 4MB.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const format429 = (res: Response) => {
        const retryAfter = res.headers.get("Retry-After");
        const sec = retryAfter ? Number(retryAfter) : NaN;
        return Number.isFinite(sec) && sec > 0
          ? `Too many requests, try again in ${Math.ceil(sec)} seconds.`
          : "Too many requests, try again in a few moments.";
      };

      const upload = async (
        file: File,
        kind: "application_cv" | "application_photo",
      ) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", kind);
        const uploadResponse = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });
        if (uploadResponse.status === 429) {
          throw new Error(format429(uploadResponse));
        }
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "File upload failed");
        }
        return uploadData.storageKey as string;
      };

      const cvStorageKey = await upload(cvFile, "application_cv");
      const photoStorageKey = photoFile
        ? await upload(photoFile, "application_photo")
        : "";
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_application",
          fullName,
          fatherName,
          cnicOrStudentId,
          email,
          phone,
          city,
          photoUrl: photoStorageKey,
          university,
          degree,
          semester,
          cgpa,
          fieldId,
          durationMonths,
          startPreference,
          batchId,
          cvFileName: cvFile.name,
          cvFileSize: cvFile.size,
          cvStorageKey,
          coverLetter,
          skills: skillsInput,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
        }),
      });
      if (res.status === 429) {
        throw new Error(format429(res));
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Application submission failed");

      setSubmittedIntern(data.intern);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit application",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />
      <main className="flex-1 bg-muted/40 dark:bg-background pb-20">
        <PageHero
          eyebrow="INTERN REGISTRATION & APPLICATION"
          badgeText="2026 Cohorts"
          title={
            <>
              Apply for the{" "}
              <span className="text-brand-strong">
                Logix Engineering & Design
              </span>{" "}
              Internship Program.
            </>
          }
          description="Complete your application below. You will receive an Intern Tracking ID right away, and the Logix team will contact you after reviewing your application."
        />

        <div className="container-x max-w-4xl mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Want to review open tracks, schedules, and program details first?
            </span>
            <a
              href="https://logixofficial.site/internships"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-brand-strong hover:underline shrink-0"
            >
              <span>Explore open tracks on logixofficial.site</span>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          {submittedIntern ? (
            <Card className="p-6 sm:p-10 text-center bg-card border-border shadow-lg">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-brand-strong border border-brand/30">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="mt-4">
                <StatusBadge status={submittedIntern.applicationStatus} dot>
                  Application Status: {submittedIntern.applicationStatus}
                </StatusBadge>
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-primary">
                Application Received, {submittedIntern.fullName}!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                The Logix team will review your application and contact you at{" "}
                <strong className="text-foreground">
                  {submittedIntern.email}
                </strong>
                . Keep your Intern Tracking ID for reference.
              </p>

              <div className="mt-6 max-w-md mx-auto rounded-xl border border-border bg-muted/60 p-4 text-left text-xs space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Unique Intern ID:</span>
                  <span className="font-mono font-bold text-brand-strong">
                    {submittedIntern.internId}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.fieldName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Duration & Dates:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.durationMonths} Months (
                    {submittedIntern.startDate} → {submittedIntern.endDate})
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Assigned Mentor:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.mentorName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">CV Attached:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {submittedIntern.cvFileName}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  onClick={() => router.push("/login?role=intern")}
                  className="w-full sm:w-auto font-semibold cursor-pointer"
                >
                  Continue to Sign In →
                </Button>
                <ButtonLink
                  href="/"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Return to Portal Dashboard
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <Card className="p-6 sm:p-9 bg-card border-border shadow-lg">
              {error && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Personal Details */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <User className="size-4 text-brand-strong" />
                    <h3 className="text-base font-semibold text-primary">
                      1. Personal Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Full Name <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. Hamza Ahmed"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Father&apos;s Name{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. Tariq Ahmed"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        CNIC / Student ID{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. 42101-8492014-3 or 22L-1234"
                        value={cnicOrStudentId}
                        onChange={(e) => setCnicOrStudentId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email Address{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder="you@university.edu.pk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Phone Number{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        type="tel"
                        placeholder="+92 300 0000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        City <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. Lahore, Karachi, Islamabad"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div className="mt-4">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Profile Photo (Optional · Max 4MB)
                    </label>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > MAX_UPLOAD_BYTES) {
                          setError("Profile photo size cannot exceed 4MB.");
                          return;
                        }
                        setError(null);
                        setPhotoFile(f);
                        setPhotoFileName(f.name);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="min-h-10 inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Camera className="size-4 text-brand-strong shrink-0" />
                      <span className="truncate max-w-[240px] sm:max-w-none">
                        {photoFileName
                          ? `Selected Photo: ${photoFileName}`
                          : "Upload Passport / Profile Photograph"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Education Details */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <GraduationCap className="size-4 text-brand-strong" />
                    <h3 className="text-base font-semibold text-primary">
                      2. Education Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        University / Institution{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. FAST-NUCES, NUST, LUMS, COMSATS"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Degree Program{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. BS Computer Science"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Current Semester{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. 6th Semester"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Current CGPA{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. 3.75"
                        value={cgpa}
                        onChange={(e) => setCgpa(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Internship Choice */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <Briefcase className="size-4 text-brand-strong" />
                    <h3 className="text-base font-semibold text-primary">
                      3. Internship Field, Duration & Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Internship Field / Department{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Select
                        value={fieldId}
                        onChange={(e) => setFieldId(e.target.value)}
                      >
                        {fields.length === 0 && (
                          <option value="">Loading departments...</option>
                        )}
                        {fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.totalSeats - f.filledSeats} seats open)
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Cohort Batch
                      </label>
                      <Select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                      >
                        {batches.length === 0 && (
                          <option value="">No active batches</option>
                        )}
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.status})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Preferred Duration{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(durations.length > 0
                          ? durations.map((d) => d.months)
                          : [1, 2, 3, 6]
                        ).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDurationMonths(m)}
                            className={`h-10 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              durationMonths === m
                                ? "border-brand bg-brand text-brand-foreground shadow-xs"
                                : "border-input bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {m} {m === 1 ? "Month" : "Months"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Preferred Start Date{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <Input
                        type="date"
                        required
                        value={startPreference}
                        onChange={(e) => setStartPreference(e.target.value)}
                      />
                      {previewEndDate && (
                        <p className="text-[11px] text-brand-strong font-medium">
                          Auto-calculated End Date: <strong>{previewEndDate}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Skills, Links & CV Upload */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <Code2 className="size-4 text-brand-strong" />
                    <h3 className="text-base font-semibold text-primary">
                      4. Technical Skills, Portfolio Links & CV Upload
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Technical Skills (Comma separated)
                      </label>
                      <Input
                        placeholder="e.g. React, TypeScript, Python, Figma, SQL"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          GitHub URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://github.com/username"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          LinkedIn URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Portfolio URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://yourportfolio.dev"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* CV Upload Zone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
                        <span>
                          Upload CV / Resume{" "}
                          <span className="text-brand-strong">*</span>
                        </span>
                        <span className="text-[11px] font-normal normal-case text-muted-foreground">
                          PDF, DOC, DOCX (Max 4MB)
                        </span>
                      </label>
                      <input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleCvUpload}
                      />

                      {cvFile ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/40 bg-accent/40 p-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="size-5 text-brand-strong shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {cvFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(cvFile.size / 1024).toFixed(0)} KB · Validated
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCvFile(null)}
                            className="min-h-9 px-2 text-xs text-destructive font-semibold hover:underline cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => cvInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-border hover:border-brand-strong/60 hover:bg-muted/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
                        >
                          <Upload className="size-6 mx-auto text-brand-strong" />
                          <p className="mt-2 text-sm font-medium text-foreground">
                            Click to attach your CV / Resume
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            PDF or Word Document (Max 4MB)
                          </p>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Cover Letter / Statement of Interest (Optional)
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Share what projects you've built and what you hope to achieve during your Logix internship..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    By submitting, your application enters{" "}
                    <strong className="text-foreground">Pending</strong> status
                    and email notifications are enabled.
                  </p>
                  <Button
                    type="submit"
                    variant="brand"
                    size="lg"
                    disabled={loading}
                    className="w-full sm:w-auto font-semibold cursor-pointer"
                  >
                    {loading
                      ? "Submitting Application..."
                      : "Submit Official Application →"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
