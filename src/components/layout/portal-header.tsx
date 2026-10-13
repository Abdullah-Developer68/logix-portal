"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShieldCheck, LayoutDashboard, UserPlus, LogIn } from "lucide-react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/apply", label: "Apply for Internship" },
  { href: "/verify", label: "Verify Certificate" },
  { href: "/portal", label: "Portal Workspace" },
];

export function PortalHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge variant="brand" dot className="hidden sm:inline-flex">
            Internship Portal v1.0
          </Badge>
        </div>

        {/* Desktop Nav */}
        <nav
          className="hidden items-center gap-6 lg:gap-8 md:flex"
          aria-label="Portal Navigation"
        >
          {links.map((l) => {
            const isActive =
              pathname === l.href ||
              (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive
                    ? "text-brand-strong font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          <ButtonLink href="/login" size="sm" variant="outline">
            <LogIn className="size-3.5" />
            Sign In
          </ButtonLink>
          <ButtonLink href="/apply" size="sm" variant="brand" className="font-semibold">
            <UserPlus className="size-3.5" />
            Apply Now
          </ButtonLink>
          <ButtonLink href="/portal" size="sm" variant="default">
            <LayoutDashboard className="size-3.5" />
            Dashboard
          </ButtonLink>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-background px-4 py-5 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-base py-1.5 font-medium",
                  pathname === l.href
                    ? "text-brand-strong font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
            <ButtonLink
              href="/login"
              variant="outline"
              className="w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In (Intern / Mentor / Admin)
            </ButtonLink>
            <ButtonLink
              href="/apply"
              variant="brand"
              className="w-full justify-center font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Apply for Internship
            </ButtonLink>
            <ButtonLink
              href="/portal"
              variant="default"
              className="w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Open Portal Dashboard
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}

export function PortalFooter() {
  return (
    <footer className="no-print bg-[#0b1f3a] dark:bg-[#050c18] text-white border-t border-white/10">
      <div className="container-x pt-12 pb-8">
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/70">
              Logix Internship Management Portal v1.0 — Full lifecycle platform
              for applications, cohort tracking, mentorship evaluations, and
              QR-verified digital certificates.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-brand">
              <ShieldCheck className="size-3.5" />
              <span>Cryptographic QR Certificate Verification Active</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Portal Access</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link href="/apply" className="hover:text-white transition-colors">
                  Intern Registration & Application
                </Link>
              </li>
              <li>
                <Link href="/login?role=intern" className="hover:text-white transition-colors">
                  Student / Intern Login
                </Link>
              </li>
              <li>
                <Link href="/login?role=mentor" className="hover:text-white transition-colors">
                  Supervisor / Mentor Login
                </Link>
              </li>
              <li>
                <Link href="/login?role=admin" className="hover:text-white transition-colors">
                  Administrator Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Departments</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>Web & App Development</li>
              <li>AI / Machine Learning</li>
              <li>UI/UX & Design Systems</li>
              <li>Software Testing & QA</li>
              <li>Cloud, DevOps & Digital Growth</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Verification & Reports</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>
                <Link href="/verify" className="hover:text-white transition-colors">
                  Verify Certificate Number
                </Link>
              </li>
              <li>
                <Link
                  href="/verify?cert=LGX-CERT-2026-8401"
                  className="hover:text-brand transition-colors font-mono text-xs"
                >
                  Sample: LGX-CERT-2026-8401
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white transition-colors">
                  Analytics & PDF/Excel Reports
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
          <span>
            © 2026 Logix Technologies Inc. · Internship Management Portal v1.0
          </span>
          <span>
            Secured with scrypt password hashing, RBAC, and Audit Trail Logging
          </span>
        </div>
      </div>
    </footer>
  );
}

