import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-input text-foreground",
  brand: "bg-accent text-brand-strong",
} as const;

export function Badge({
  variant = "default",
  dot = false,
  className,
  children,
  ...props
}: {
  variant?: keyof typeof variants;
  dot?: boolean;
} & ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            variant === "brand" ? "bg-brand-strong" : "bg-current",
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
