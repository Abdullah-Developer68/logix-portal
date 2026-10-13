import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 shrink-0", className)} aria-label="Logix home">
      <span className="flex size-7 items-center justify-center rounded-md bg-[#0b1f3a] dark:bg-[#0f172a] ring-1 ring-brand/40">
        <svg viewBox="0 0 24 24" className="size-4 text-brand" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5v14h10" />
        </svg>
      </span>
      <span className={cn("text-base font-bold tracking-tight", light ? "text-white" : "text-primary")}>
        LOG<span className="text-brand">IX</span>
      </span>
    </Link>
  );
}
