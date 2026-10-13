import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  brand: "bg-brand text-brand-foreground hover:bg-brand/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-accent",
  link: "text-foreground underline-offset-4 hover:underline",
  dark: "bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90 shadow-md",
  "outline-dark": "border-2 border-[#0b1f3a] text-[#0b1f3a] bg-white/15 hover:bg-white/30",
  "ghost-dark": "bg-white/30 text-[#0b1f3a] hover:bg-white/45 border border-[#0b1f3a]/20",
  white: "bg-white text-[#0b1f3a] hover:bg-white/90 shadow-sm",
  unstyled: "",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(
  variant: ButtonVariant = "default",
  size: ButtonSize = "default",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    variant !== "link" && sizes[size],
    className,
  );
}

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ComponentProps<"button">;

export function Button({ variant, size, className, ...props }: Props) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ComponentProps<typeof Link>;

export function ButtonLink({ variant, size, className, ...props }: LinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
