"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RoleBadge } from "@/components/portal/status-badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { ArrowUpRight, LogOut } from "lucide-react";

const navLinks = [
  { href: "/portal", label: "Portal", external: false },
  { href: "/verify", label: "Verify Certificate", external: false },
  { href: "https://logixofficial.site/internships", label: "Internships", external: true },
  { href: "https://logixofficial.site", label: "Main Site", external: true },
] as const;

export interface PortalHeaderUser {
  name: string;
  email?: string;
  role: UserRole;
}

export interface PortalHeaderProps {
  signedIn?: boolean;
  user?: PortalHeaderUser | null;
  onLogout?: () => void;
  hideAuthCta?: boolean;
}

export function PortalHeader({
  signedIn = false,
  user = null,
  onLogout,
  hideAuthCta = false,
}: PortalHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  const isAuthenticated = Boolean(signedIn || user);

  return (
    <header className="no-print sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* Desktop Nav */}
        <nav
          className="hidden items-center gap-5 lg:gap-8 md:flex"
          aria-label="Portal Navigation"
        >
          {navLinks.map((l) => {
            if (l.external) {
              return (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
                >
                  <span>{l.label}</span>
                  <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
                </a>
              );
            }

            const isActive =
              l.href === "/portal"
                ? pathname === "/" || pathname.startsWith("/portal")
                : pathname.startsWith(l.href);

            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 pl-1">
              <span className="hidden lg:inline-block max-w-[160px] truncate text-xs font-medium text-foreground">
                {user.name}
              </span>
              <RoleBadge role={user.role} />
              {onLogout && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Logout</span>
                </Button>
              )}
            </div>
          ) : (
            !hideAuthCta && (
              <ButtonLink href="/login" size="sm" variant="default">
                Sign in
              </ButtonLink>
            )
          )}
        </div>

        {/* Mobile Actions: Theme Toggle & Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu & Overlay */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          "relative z-50 overflow-hidden border-b border-border bg-background md:hidden transition-[max-height,opacity] duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-[calc(100dvh-4rem)] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <nav className="flex flex-col gap-3" aria-label="Mobile Navigation">
            {navLinks.map((l) => {
              if (l.external) {
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-between text-base py-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{l.label}</span>
                    <ArrowUpRight className="size-4 opacity-60" aria-hidden="true" />
                  </a>
                );
              }

              const isActive =
                l.href === "/portal"
                  ? pathname === "/" || pathname.startsWith("/portal")
                  : pathname.startsWith(l.href);

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-base py-2 font-medium transition-colors",
                    isActive
                      ? "text-brand-strong font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground truncate">{user.name}</span>
                  <RoleBadge role={user.role} />
                </div>
                {onLogout && (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="w-full justify-center cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut className="size-4" />
                    <span>Logout</span>
                  </Button>
                )}
              </>
            ) : (
              !hideAuthCta && (
                <ButtonLink
                  href="/login"
                  size="default"
                  variant="default"
                  className="w-full justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </ButtonLink>
              )
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}

const footerColumns = [
  {
    title: "Portal",
    links: [
      { label: "Workspace", href: "/portal", external: false },
      { label: "Sign In", href: "/login", external: false },
      { label: "Apply for Internship", href: "/apply", external: false },
      { label: "Verify Certificate", href: "/verify", external: false },
    ],
  },
  {
    title: "Portals by Role",
    links: [
      { label: "Intern Sign In", href: "/login?role=intern", external: false },
      { label: "Mentor Sign In", href: "/login?role=mentor", external: false },
      { label: "Admin Sign In", href: "/login?role=admin", external: false },
    ],
  },
  {
    title: "Logix",
    links: [
      { label: "Main Website", href: "https://logixofficial.site", external: true },
      { label: "Open Internships", href: "https://logixofficial.site/internships", external: true },
      { label: "About Logix", href: "https://logixofficial.site/about", external: true },
      { label: "Contact", href: "https://logixofficial.site/contact", external: true },
    ],
  },
];

export function PortalFooter() {
  return (
    <footer className="no-print bg-[#0b1f3a] dark:bg-[#050c18] text-white border-t border-white/10">
      <div className="container-x pt-12 sm:pt-16 pb-8 sm:pb-10">
        <div className="grid gap-8 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/70 break-words">
              Logix Internship Portal for cohort coordination, mentorship tasks, attendance tracking, and certificate verification.
            </p>
            <div className="mt-5 space-y-1 text-sm text-white/60">
              <p>
                <a href="mailto:info@logixofficial.site" className="hover:text-brand transition-colors break-all">
                  info@logixofficial.site
                </a>
              </p>
              <p>
                <a href="tel:+923499780508" className="hover:text-brand transition-colors whitespace-nowrap">
                  +92 349 9780508
                </a>
              </p>
            </div>
          </div>

          {footerColumns.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-white tracking-tight">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/60 transition-colors hover:text-white leading-5 inline-flex items-center gap-1"
                      >
                        <span>{l.label}</span>
                        <ArrowUpRight className="size-3 opacity-60" aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-white/60 transition-colors hover:text-white leading-5 inline-block"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 sm:mt-14 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <span className="break-words">© 2026 Logix Technologies Inc. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2">
            <a
              href="https://logixofficial.site/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://logixofficial.site/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </a>
            <Link href="/verify" className="hover:text-white transition-colors">
              Certificate Verification
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

