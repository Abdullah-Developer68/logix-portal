import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Logix mark: white "L" with the teal slash on a navy square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="41.5 67.5 800 800"
      className={cn("size-7 shrink-0 rounded-md", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="41.5" y="67.5" width="800" height="800" fill="#0b1f3a" />
      <polygon points="643,178 749,263 461,618 355,533" fill="#17c4b0" />
      <polygon points="134,169 288,169 288,612 561,612 561,766 134,766" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 shrink-0", className)} aria-label="Logix home">
      <LogoMark className="ring-1 ring-white/10" />
      <span className={cn("text-base font-bold tracking-tight", light ? "text-white" : "text-primary")}>
        LOG<span className="text-brand">IX</span>
      </span>
    </Link>
  );
}
