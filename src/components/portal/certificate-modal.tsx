"use client";

import React, { useState } from "react";
import { QrCodeSvg } from "./qr-code-svg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CertificateRecord, InternRecord } from "@/lib/types";
import {
  Award,
  FileText,
  Printer,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export type DocumentType =
  | "certificate"
  | "offer_letter"
  | "completion_letter"
  | "experience_letter";

export function CertificateModal({
  isOpen,
  onClose,
  intern,
  certificate,
  initialDocType = "certificate",
}: {
  isOpen: boolean;
  onClose: () => void;
  intern: InternRecord | null;
  certificate?: CertificateRecord | null;
  initialDocType?: DocumentType;
}) {
  const [docType, setDocType] = useState<DocumentType>(initialDocType);

  if (!isOpen || !intern) return null;

  const certNumber =
    certificate?.certificateNumber ||
    `LGX-CERT-2026-${intern.internId.slice(-3)}`;
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?cert=${encodeURIComponent(certNumber)}`
      : `https://portal.logix.dev/verify?cert=${encodeURIComponent(certNumber)}`;

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Official Internship Documents & Certificate"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 sm:p-7 my-auto max-h-[95vh] overflow-y-auto">
        {/* Top Toolbar (Hidden when printing) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDocType("certificate")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                docType === "certificate"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="size-3.5" />
              Completion Certificate
            </button>
            <button
              type="button"
              onClick={() => setDocType("offer_letter")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                docType === "offer_letter"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              Offer Letter
            </button>
            <button
              type="button"
              onClick={() => setDocType("completion_letter")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                docType === "completion_letter"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              Completion Letter
            </button>
            <button
              type="button"
              onClick={() => setDocType("experience_letter")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                docType === "experience_letter"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="size-3.5" />
              Experience Letter
            </button>
          </div>

          <div className="flex items-center gap-2">
            {certificate && (
              <Link
                href={`/verify?cert=${encodeURIComponent(certNumber)}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <ExternalLink className="size-3.5" />
                Verify Page
              </Link>
            )}
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handlePrintPdf}
              className="cursor-pointer font-semibold"
            >
              <Printer className="size-3.5" />
              Download / Print PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Surface */}
        {docType === "certificate" ? (
          <div className="relative overflow-hidden rounded-xl border-4 border-[#0b1f3a] bg-white p-6 sm:p-10 text-[#0b1f3a] shadow-inner">
            {/* Decorative Inner Frame */}
            <div className="border-2 border-[#1fc8aa]/50 rounded-lg p-6 sm:p-10 relative">
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 size-6 border-t-4 border-l-4 border-[#0e9983]" />
              <div className="absolute top-2 right-2 size-6 border-t-4 border-r-4 border-[#0e9983]" />
              <div className="absolute bottom-2 left-2 size-6 border-b-4 border-l-4 border-[#0e9983]" />
              <div className="absolute bottom-2 right-2 size-6 border-b-4 border-r-4 border-[#0e9983]" />

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#e2e8f0] pb-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#0b1f3a] ring-2 ring-[#1fc8aa]">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5 text-[#1fc8aa]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 5v14h10" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-xl font-bold tracking-tight text-[#0b1f3a]">
                      LOG<span className="text-[#1fc8aa]">IX</span> TECHNOLOGIES
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-[#0e9983] font-semibold">
                      Official Engineering & Talent Academy
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="text-[11px] uppercase tracking-wider text-[#5b6b84]">
                    Certificate No.
                  </div>
                  <div className="font-mono text-sm font-bold text-[#0b1f3a] bg-[#e6f9f5] px-2.5 py-1 rounded border border-[#1fc8aa]/40">
                    {certNumber}
                  </div>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="py-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0e9983]">
                  CERTIFICATE OF INTERNSHIP COMPLETION
                </p>
                <p className="mt-3 text-sm text-[#5b6b84]">
                  This is to proudly certify that
                </p>
                <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#0b1f3a]">
                  {intern.fullName}
                </h2>
                {intern.fatherName && intern.fatherName !== "Not Provided" && (
                  <p className="mt-1 text-xs text-[#5b6b84]">
                    S/D/O {intern.fatherName} · Intern ID:{" "}
                    <strong className="text-[#0b1f3a]">{intern.internId}</strong>
                  </p>
                )}

                <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed text-[#334155]">
                  has successfully completed a{" "}
                  <strong className="text-[#0b1f3a]">
                    {intern.durationMonths}-Month Remote Internship
                  </strong>{" "}
                  in the department of{" "}
                  <strong className="text-[#0e9983]">{intern.fieldName}</strong>{" "}
                  ({intern.batchName}) from{" "}
                  <strong className="text-[#0b1f3a]">{intern.startDate}</strong>{" "}
                  to <strong className="text-[#0b1f3a]">{intern.endDate}</strong>{" "}
                  at <strong>Logix Technologies Inc.</strong>
                </p>

                <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 rounded-xl bg-[#f4f6fa] border border-[#e2e8f0] px-5 py-2.5 text-xs">
                  <span>
                    Performance Grade:{" "}
                    <strong className="text-[#0e9983]">
                      {certificate?.grade || "A+"} (
                      {certificate?.totalMarks || 95}/100)
                    </strong>
                  </span>
                  <span className="text-[#cbd5e1]">•</span>
                  <span>
                    Authenticity Status:{" "}
                    <strong className="text-[#0e9983]">
                      {certificate?.status || "Valid"}
                    </strong>
                  </span>
                  <span className="text-[#cbd5e1]">•</span>
                  <span>
                    Issue Date:{" "}
                    <strong className="text-[#0b1f3a]">
                      {certificate?.issueDate ||
                        new Date().toISOString().split("T")[0]}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Signatures & QR Code Footer */}
              <div className="mt-4 pt-6 border-t border-[#e2e8f0] grid grid-cols-1 sm:grid-cols-3 items-end gap-6">
                <div className="text-center sm:text-left">
                  <div className="font-serif italic text-lg text-[#0b1f3a] font-semibold">
                    {intern.mentorName}
                  </div>
                  <div className="h-px w-40 bg-[#0b1f3a]/30 my-1.5 mx-auto sm:mx-0" />
                  <div className="text-xs font-bold text-[#0b1f3a]">
                    {intern.mentorName}
                  </div>
                  <div className="text-[11px] text-[#5b6b84]">
                    Supervising Mentor · {intern.fieldName}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="p-2 rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
                    <QrCodeSvg value={verifyUrl} size={92} />
                  </div>
                  <span className="mt-1.5 text-[10px] text-[#5b6b84] font-mono">
                    Scan or visit /verify
                  </span>
                </div>

                <div className="text-center sm:text-right">
                  <div className="font-serif italic text-lg text-[#0b1f3a] font-semibold">
                    {certificate?.signatoryName || "Areeba Siddiqui"}
                  </div>
                  <div className="h-px w-44 bg-[#0b1f3a]/30 my-1.5 mx-auto sm:ml-auto sm:mr-0" />
                  <div className="text-xs font-bold text-[#0b1f3a]">
                    {certificate?.signatoryName || "Areeba Siddiqui"}
                  </div>
                  <div className="text-[11px] text-[#5b6b84]">
                    Director of Engineering & Talent
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Offer Letter, Completion Letter, or Experience Letter */
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 sm:p-12 text-[#0b1f3a] shadow-inner">
            <div className="flex items-start justify-between border-b-2 border-[#0b1f3a] pb-6">
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#0b1f3a]">
                  LOG<span className="text-[#1fc8aa]">IX</span> TECHNOLOGIES INC.
                </div>
                <p className="text-xs text-[#5b6b84] mt-1">
                  Engineering HQ · Remote-First Global Delivery · portal@logix.dev
                </p>
              </div>
              <div className="text-right text-xs text-[#5b6b84]">
                <div>
                  <strong>Ref ID:</strong> {intern.internId}
                </div>
                <div>
                  <strong>Date:</strong> {new Date().toISOString().split("T")[0]}
                </div>
              </div>
            </div>

            <div className="py-8 space-y-5 text-sm leading-7 text-[#1e293b]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#0b1f3a]">
                    To: {intern.fullName}
                  </p>
                  <p className="text-xs text-[#5b6b84]">
                    {intern.university} ({intern.degree}) · {intern.email}
                  </p>
                </div>
                <Badge variant="brand" className="uppercase">
                  {docType.replace("_", " ")}
                </Badge>
              </div>

              {docType === "offer_letter" && (
                <>
                  <h3 className="text-lg font-bold text-[#0b1f3a] pt-2">
                    Subject: Official Offer of Internship — {intern.fieldName} (
                    {intern.batchName})
                  </h3>
                  <p>
                    Dear <strong>{intern.fullName}</strong>,
                  </p>
                  <p>
                    We are delighted to offer you a{" "}
                    <strong>
                      {intern.durationMonths}-Month Remote Internship
                    </strong>{" "}
                    with <strong>Logix Technologies Inc.</strong> in the{" "}
                    <strong>{intern.fieldName}</strong> practice pod, commencing on{" "}
                    <strong>{intern.startDate}</strong> and concluding on{" "}
                    <strong>{intern.endDate}</strong>.
                  </p>
                  <div className="rounded-lg bg-[#f4f6fa] p-4 border border-[#e2e8f0] text-xs space-y-1.5">
                    <div>
                      <strong>Intern Tracking ID:</strong> {intern.internId}
                    </div>
                    <div>
                      <strong>Department / Pod:</strong> {intern.fieldName}
                    </div>
                    <div>
                      <strong>Assigned Mentor:</strong> {intern.mentorName}
                    </div>
                    <div>
                      <strong>Duration:</strong> {intern.durationMonths} Months (
                      {intern.startDate} to {intern.endDate})
                    </div>
                    <div>
                      <strong>Work Mode:</strong> 100% Remote with Weekly Mentor
                      Reviews
                    </div>
                  </div>
                  <p>
                    During your placement, you will collaborate on production-grade
                    engineering deliverables, receive continuous mentorship feedback,
                    and be eligible for a QR-verifiable Completion Certificate upon
                    successful evaluation.
                  </p>
                </>
              )}

              {docType === "completion_letter" && (
                <>
                  <h3 className="text-lg font-bold text-[#0b1f3a] pt-2">
                    Subject: Internship Completion Confirmation — {intern.internId}
                  </h3>
                  <p>To Whom It May Concern,</p>
                  <p>
                    This letter formally confirms that{" "}
                    <strong>{intern.fullName}</strong> (Student/CNIC ID:{" "}
                    <strong>{intern.cnicOrStudentId}</strong>) from{" "}
                    <strong>{intern.university}</strong> has completed their{" "}
                    <strong>{intern.durationMonths}-month internship</strong> at{" "}
                    <strong>Logix Technologies Inc.</strong> in the{" "}
                    <strong>{intern.fieldName}</strong> department from{" "}
                    <strong>{intern.startDate}</strong> to{" "}
                    <strong>{intern.endDate}</strong>.
                  </p>
                  <p>
                    Throughout the <strong>{intern.batchName}</strong> cohort,{" "}
                    {intern.fullName} fulfilled all assigned engineering milestones
                    under the supervision of <strong>{intern.mentorName}</strong>{" "}
                    with a task completion rate of{" "}
                    <strong>{intern.progressPercentage}%</strong> and an attendance
                    record of <strong>{intern.attendancePercentage}%</strong>.
                  </p>
                </>
              )}

              {docType === "experience_letter" && (
                <>
                  <h3 className="text-lg font-bold text-[#0b1f3a] pt-2">
                    Subject: Letter of Experience & Recommendation —{" "}
                    {intern.fullName}
                  </h3>
                  <p>To Whom It May Concern,</p>
                  <p>
                    It is with great pleasure that we provide this Experience &
                    Recommendation Letter for <strong>{intern.fullName}</strong>,
                    who served as a <strong>{intern.fieldName} Intern</strong> at{" "}
                    <strong>Logix Technologies Inc.</strong> from{" "}
                    <strong>{intern.startDate}</strong> to{" "}
                    <strong>{intern.endDate}</strong> ({intern.durationMonths}{" "}
                    Months).
                  </p>
                  <p>
                    During this tenure, {intern.fullName} demonstrated strong
                    proficiency in{" "}
                    <strong>{intern.skills.join(", ") || intern.fieldName}</strong>.
                    In their final mentor evaluation conducted by{" "}
                    <strong>{intern.mentorName}</strong>, they earned a grade of{" "}
                    <strong>{certificate?.grade || "A+"}</strong>.
                  </p>
                  <p>
                    We found {intern.fullName} to be punctual, collaborative, and
                    deeply committed to software quality. We wholeheartedly
                    recommend them for future engineering roles and academic
                    pursuits.
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[#e2e8f0] flex items-end justify-between">
              <div>
                <div className="font-serif italic text-lg text-[#0b1f3a] font-semibold">
                  Areeba Siddiqui
                </div>
                <div className="text-xs font-bold text-[#0b1f3a] mt-1">
                  Areeba Siddiqui
                </div>
                <div className="text-xs text-[#5b6b84]">
                  Director of Engineering & Talent · Logix Technologies Inc.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <QrCodeSvg value={verifyUrl} size={68} />
                <div className="text-[11px] text-[#5b6b84]">
                  <div>Verified Portal Document</div>
                  <div className="font-mono font-bold text-[#0b1f3a]">
                    {certNumber}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

