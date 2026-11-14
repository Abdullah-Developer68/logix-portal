"use client";

import type { ReactNode } from "react";
import { FadeIn } from "@/components/ui/motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow: string;
  badgeText?: string;
  badgeDot?: boolean;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  badgeText,
  badgeDot = true,
  title,
  description,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "border-b border-border bg-background py-14 sm:py-16 md:py-24 overflow-hidden",
        className,
      )}
    >
      <div className="container-x max-w-4xl">
        <FadeIn distance={16} duration={0.45} className="flex flex-wrap items-center gap-3 mb-4">
          <span className="eyebrow">{eyebrow}</span>
          {badgeText && (
            <Badge variant="brand" dot={badgeDot}>
              {badgeText}
            </Badge>
          )}
        </FadeIn>

        <FadeIn distance={20} duration={0.55} delay={0.08}>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-[56px] xl:leading-[62px] font-bold tracking-tight text-primary break-words">
            {title}
          </h1>
        </FadeIn>

        <FadeIn distance={20} duration={0.55} delay={0.16}>
          <p className="lead mt-4 sm:mt-6 max-w-2xl text-sm sm:text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </FadeIn>

        {children && (
          <FadeIn
            distance={16}
            duration={0.45}
            delay={0.24}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4"
          >
            {children}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
