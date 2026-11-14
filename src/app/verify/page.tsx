"use client";

import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { PortalHeader, PortalFooter } from "@/components/layout/portal-header";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/portal/status-badge";
import { QrCodeSvg } from "@/components/portal/qr-code-svg";
import type { CertificateRecord, InternRecord } from "@/lib/types";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Award,
  CheckCircle2,
  History,
  Printer,
} from "lucide-react";

const CertificateModal = dynamic(
  () =>
    import("@/components/portal/certificate-modal").then(
      (mod) => mod.CertificateModal,
    ),
  { ssr: false },
);

interface VerificationResult {
  verified: boolean;
  certificate: CertificateRecord;
  intern: {
    internId: string;
    fullName: string;
    university?: string;
    degree?: string;
    fieldName: string;
    durationMonths: number;
    batchName: string;
    startDate: string;
    endDate: string;
    skills?: string[];
  } | null;
  evaluation: {
    totalMarks: number;
    grade: string;
    mentorName: string;
  } | null;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("cert") || "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const performLookup = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal?verify=${encodeURIComponent(code.trim())}`,
      );
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const sec = retryAfter ? Number(retryAfter) : NaN;
        setResult(null);
        setError(
          Number.isFinite(sec) && sec > 0
            ? `Too many requests, try again in ${Math.ceil(sec)} seconds.`
            : "Too many requests, try again in a few moments.",
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult(null);
        setError(data.error || "Certificate not found.");
        return;
      }
      setResult(data);
    } catch {
      setError("Unable to verify certificate at this moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery.trim()) return;
    let active = true;
    fetch(`/api/portal?verify=${encodeURIComponent(initialQuery.trim())}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const sec = retryAfter ? Number(retryAfter) : NaN;
          setResult(null);
          setError(
            Number.isFinite(sec) && sec > 0
              ? `Too many requests, try again in ${Math.ceil(sec)} seconds.`
              : "Too many requests, try again in a few moments.",
          );
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          setResult(null);
          setError(data.error || "Certificate not found.");
        } else {
          setError(null);
          setResult(data);
        }
      })
      .catch(() => {
        if (active) setError("Unable to verify certificate at this moment.");
      });
    return () => {
      active = false;
    };
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(query);
  };

  const modalIntern: InternRecord | null = result
    ? {
        id: result.certificate.internRecordId,
        internId: result.certificate.internId,
        fullName: result.certificate.internName,
        fatherName: result.certificate.fatherName || "",
        cnicOrStudentId: "",
        email: "",
        phone: "",
        city: "",
        university: result.intern?.university || "",
        degree: result.intern?.degree || "",
        semester: "",
        cgpa: "",
        fieldId: "",
        fieldName: result.certificate.fieldName,
        durationMonths: result.certificate.durationMonths,
        startPreference: result.certificate.startDate,
        startDate: result.certificate.startDate,
        endDate: result.certificate.endDate,
        batchId: "",
        batchName: result.certificate.batchName || "",
        mentorId: "",
        mentorName: result.certificate.mentorName || "",
        cvFileName: "",
        cvFileSize: 0,
        skills: result.intern?.skills || [result.certificate.fieldName],
        applicationStatus: "Approved",
        internshipStatus: "Completed",
        archived: false,
        progressPercentage: 100,
        attendancePercentage: 100,
        appliedAt: result.certificate.issueDate,
        updatedAt: result.certificate.issueDate,
      }
    : null;

  const verifyUrl =
    result && typeof window !== "undefined"
      ? `${window.location.origin}/verify?cert=${encodeURIComponent(result.certificate.certificateNumber)}`
      : result
        ? `https://portal.logix.dev/verify?cert=${encodeURIComponent(result.certificate.certificateNumber)}`
        : "";

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader />
      <main className="flex-1 bg-muted/40 dark:bg-background pb-20">
        <PageHero
          eyebrow="PUBLIC CREDENTIAL REGISTRY"
          badgeText="QR & Certificate Number Lookup"
          title={
            <>
              Verify <span className="text-brand-strong">Logix Internship</span>{" "}
              Certificates Instantly.
            </>
          }
          description="Employers, universities, and credential verifiers can enter any Logix Certificate Number or scan the embedded QR code to confirm authenticity and completion details."
        />

        <div className="container-x max-w-4xl mt-10 space-y-6">
          {/* Search Bar Card */}
          <Card className="p-5 sm:p-7 bg-card border-border shadow-md">
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1 min-w-0">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter Certificate Number (e.g. LGX-CERT-2026-...) or Intern ID"
                  aria-label="Certificate Number or Intern ID"
                  className="font-mono text-sm h-11"
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                disabled={loading || !query.trim()}
                className="h-11 font-semibold cursor-pointer"
              >
                <Search className="size-4" />
                {loading ? "Verifying..." : "Verify Credential"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Enter an official Logix Certificate Number or Intern ID to verify
              issuance status, tenure, and evaluation grade.
            </p>
          </Card>

          {error && (
            <Card
              role="alert"
              className="p-6 border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-3"
            >
              <ShieldAlert className="size-6 shrink-0" />
              <div>
                <h3 className="text-base font-semibold">
                  Credential Verification Failed
                </h3>
                <p className="text-xs sm:text-sm mt-0.5">{error}</p>
              </div>
            </Card>
          )}

          {result && (
            <Card className="p-5 sm:p-8 bg-card border-border shadow-xl space-y-6">
              {/* Verification Banner */}
              <div
                className={`rounded-xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  result.verified
                    ? "border-brand/40 bg-accent/50 text-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {result.verified ? (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
                      <ShieldCheck className="size-6" />
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive text-primary-foreground">
                      <ShieldAlert className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-primary">
                        {result.verified
                          ? "Authentic & Verified Credential"
                          : "Revoked Credential"}
                      </h2>
                      <StatusBadge
                        status={result.certificate.status}
                        tone={result.verified ? "brand" : "danger"}
                        dot
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 break-words">
                      Certificate No:{" "}
                      <strong className="font-mono text-foreground">
                        {result.certificate.certificateNumber}
                      </strong>{" "}
                      · Issued on {result.certificate.issueDate}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={() => setModalOpen(true)}
                  className="shrink-0 cursor-pointer"
                >
                  <Printer className="size-4" />
                  View / Print Official PDF
                </Button>
              </div>

              {result.certificate.revokedReason && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <strong>Revocation Reason:</strong>{" "}
                  {result.certificate.revokedReason}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                      Intern Full Name
                    </span>
                    <div className="text-base font-semibold text-primary mt-1">
                      {result.certificate.internName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Intern ID:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {result.certificate.internId}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                      Internship Department
                    </span>
                    <div className="text-base font-semibold text-brand-strong mt-1">
                      {result.certificate.fieldName}
                    </div>
                    {result.certificate.batchName && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Cohort: {result.certificate.batchName}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                      Duration & Tenure
                    </span>
                    <div className="text-base font-semibold text-primary mt-1">
                      {result.certificate.durationMonths} Months (100% Remote)
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {result.certificate.startDate} to{" "}
                      {result.certificate.endDate}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                      Final Evaluation & Mentor
                    </span>
                    <div className="text-base font-semibold text-primary mt-1 flex items-center gap-2">
                      <Award className="size-4 text-brand-strong shrink-0" />
                      <span>
                        Grade {result.certificate.grade} (
                        {result.certificate.totalMarks}/100)
                      </span>
                    </div>
                    {result.certificate.mentorName && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Supervised by {result.certificate.mentorName}
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Verification Box (kept light for scanner quiet-zone contrast) */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-4 text-center">
                  <QrCodeSvg value={verifyUrl} size={136} />
                  <span className="mt-2 font-mono text-[11px] font-bold text-[#0b1f3a] break-all">
                    {result.certificate.certificateNumber}
                  </span>
                  <span className="text-[10px] text-[#5b6b84]">
                    QR Verification Match
                  </span>
                </div>
              </div>

              {/* Certificate History Log */}
              {Array.isArray(result.certificate.history) &&
                result.certificate.history.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      <History className="size-4 text-brand-strong" />
                      <span>Certificate Audit History Log</span>
                    </div>
                    <div className="space-y-2">
                      {result.certificate.history.map((h, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <CheckCircle2 className="size-3.5 text-brand-strong shrink-0" />
                            <strong className="text-foreground">
                              {h.action}
                            </strong>
                            <span className="text-muted-foreground">
                              by {h.actor}
                            </span>
                            {h.note && (
                              <span className="text-muted-foreground">
                                — {h.note}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {h.timestamp.slice(0, 19).replace("T", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </Card>
          )}
        </div>
      </main>
      <PortalFooter />

      {modalOpen && (
        <CertificateModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          intern={modalIntern}
          certificate={result?.certificate}
        />
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyContent />
    </Suspense>
  );
}
