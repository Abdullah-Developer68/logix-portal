"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  FieldDepartment,
  DurationOption,
  BatchCohort,
  InternRecord,
} from "@/lib/types";
import {
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
  const [fieldId, setFieldId] = useState("fld-web");
  const [durationMonths, setDurationMonths] = useState(3);
  const [startPreference, setStartPreference] = useState("2026-11-01");
  const [batchId, setBatchId] = useState("bat-winter-26");

  // Uploads & Links
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [skillsInput, setSkillsInput] = useState(
    "Next.js, React, TypeScript, Tailwind CSS",
  );
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedIntern, setSubmittedIntern] = useState<InternRecord | null>(
    null,
  );

  const cvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portal")
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
          setDurations(
            data.durations.filter((d: DurationOption) => d.active),
          );
        }
        if (data.batches) {
          setBatches(data.batches);
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

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      setError("CV must be a PDF, DOC, or DOCX document.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("CV file size cannot exceed 10MB.");
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

    setLoading(true);
    setError(null);

    try {
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
          photoUrl: photoFileName,
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
          coverLetter,
          skills: skillsInput,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
          password: password || "Intern@123",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Application submission failed");

      setSubmittedIntern(data.intern);
      // Save session so applicant can jump directly into Intern Dashboard
      localStorage.setItem(
        "logix_portal_session",
        JSON.stringify({
          id: data.intern.userId || `usr-${Date.now()}`,
          email: data.intern.email,
          role: "intern",
          name: data.intern.fullName,
          emailVerified: true,
          internRecordId: data.intern.id,
          loginTime: Date.now(),
        }),
      );
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
      <main className="flex-1 bg-muted pb-20">
        <PageHero
          eyebrow="INTERN REGISTRATION & APPLICATION"
          badgeText="Winter & Autumn 2026 Cohorts Open"
          title={
            <>
              Apply for the{" "}
              <span className="text-brand-strong">
                Logix Engineering & Design
              </span>{" "}
              Internship Program.
            </>
          }
          description="Complete your official application below. Upon submission, you will receive an instant Intern Tracking ID, email confirmation, and access to your student dashboard."
        />

        <div className="container-x max-w-4xl mt-10">
          {submittedIntern ? (
            <Card className="p-8 sm:p-10 text-center bg-card border-border shadow-xl">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand/20 text-brand-strong border border-brand/30">
                <CheckCircle2 className="size-8" />
              </div>
              <Badge variant="brand" className="mt-4">
                Application Status: {submittedIntern.applicationStatus}
              </Badge>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-primary">
                Application Received, {submittedIntern.fullName}!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                An email confirmation has been dispatched to{" "}
                <strong className="text-foreground">
                  {submittedIntern.email}
                </strong>
                . You will receive email notifications whenever your status is
                updated.
              </p>

              <div className="mt-6 max-w-md mx-auto rounded-xl border border-border bg-muted p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Intern ID:</span>
                  <span className="font-mono font-bold text-brand-strong">
                    {submittedIntern.internId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.fieldName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration & Dates:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.durationMonths} Months (
                    {submittedIntern.startDate} → {submittedIntern.endDate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Mentor:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.mentorName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CV Attached:</span>
                  <span className="font-semibold text-foreground">
                    {submittedIntern.cvFileName}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  onClick={() => router.push("/portal")}
                  className="w-full sm:w-auto font-semibold cursor-pointer"
                >
                  Open My Intern Dashboard →
                </Button>
                <ButtonLink
                  href="/"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Return to Portal Home
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <Card className="p-6 sm:p-9 bg-card border-border shadow-lg">
              {error && (
                <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Personal Details */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <User className="size-4 text-brand-strong" />
                    <h3 className="text-base font-bold text-primary">
                      1. Personal Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                    <label className="text-xs font-semibold uppercase tracking-wider text-primary block mb-1.5">
                      Profile Photo (Optional)
                    </label>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPhotoFileName(f.name);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Camera className="size-4 text-brand-strong" />
                      {photoFileName
                        ? `Selected Photo: ${photoFileName}`
                        : "Upload Passport / Profile Photograph"}
                    </button>
                  </div>
                </div>

                {/* 2. Education Details */}
                <div>
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                    <GraduationCap className="size-4 text-brand-strong" />
                    <h3 className="text-base font-bold text-primary">
                      2. Education Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                    <h3 className="text-base font-bold text-primary">
                      3. Internship Field, Duration & Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Internship Field / Department{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <select
                        value={fieldId}
                        onChange={(e) => setFieldId(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none"
                      >
                        {fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.totalSeats - f.filledSeats} seats open)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Cohort Batch
                      </label>
                      <select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none"
                      >
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Preferred Duration{" "}
                        <span className="text-brand-strong">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
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
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {m} {m === 1 ? "Month" : "Months"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                    <h3 className="text-base font-bold text-primary">
                      4. Technical Skills, Portfolio Links & CV Upload
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary">
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center justify-between">
                        <span>
                          Upload CV / Resume{" "}
                          <span className="text-brand-strong">*</span>
                        </span>
                        <span className="text-[11px] font-normal normal-case text-muted-foreground">
                          PDF, DOC, DOCX (Max 10MB)
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
                        <div className="flex items-center justify-between rounded-xl border border-brand/40 bg-accent/40 p-3.5">
                          <div className="flex items-center gap-3">
                            <FileText className="size-5 text-brand-strong" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">
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
                            className="text-xs text-destructive font-semibold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => cvInputRef.current?.click()}
                          className="border-2 border-dashed border-border hover:border-brand-strong/60 hover:bg-muted/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
                        >
                          <Upload className="size-6 mx-auto text-brand-strong" />
                          <p className="mt-2 text-sm font-medium text-foreground">
                            Click to attach your CV / Resume
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            PDF or Word Document (Max 10MB)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Cover Letter / Statement of Interest (Optional)
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Share what projects you've built and what you hope to achieve during your Logix internship..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Set Portal Account Password (Optional)
                      </label>
                      <Input
                        type="password"
                        placeholder="Leave blank to use default demo password (Intern@123)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

