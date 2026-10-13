import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  src,
  alt,
  className,
}: {
  initials: string;
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative size-9 shrink-0 overflow-hidden rounded-full border border-border", className)}>
        <Image src={src} alt={alt || initials} fill className="object-cover" />
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-primary select-none",
        className,
      )}
      aria-label={alt || initials}
    >
      {initials}
    </span>
  );
}
