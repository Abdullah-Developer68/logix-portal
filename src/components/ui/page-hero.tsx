import type { CSSProperties, ReactNode } from "react";
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
    <section className={cn("border-b border-border bg-background py-14 sm:py-16 md:py-24 overflow-hidden", className)}>
      <div className="container-x max-w-4xl">
        <div
          className="animate-fade-up flex flex-wrap items-center gap-3 mb-4"
          style={{ "--fade-y": "16px", "--fade-duration": "0.5s", "--fade-delay": "0s" } as CSSProperties}
        >
          <span className="eyebrow">{eyebrow}</span>
          {badgeText && (
            <Badge variant="brand" dot={badgeDot}>
              {badgeText}
            </Badge>
          )}
        </div>

        <h1
          className="animate-fade-up text-2xl sm:text-4xl lg:text-5xl xl:text-[56px] xl:leading-[62px] font-bold tracking-tight text-primary break-words"
          style={{ "--fade-y": "20px", "--fade-duration": "0.6s", "--fade-delay": "0.1s" } as CSSProperties}
        >
          {title}
        </h1>

        <p
          className="animate-fade-up lead mt-4 sm:mt-6 max-w-2xl text-sm sm:text-lg leading-relaxed text-muted-foreground"
          style={{ "--fade-y": "20px", "--fade-duration": "0.6s", "--fade-delay": "0.2s" } as CSSProperties}
        >
          {description}
        </p>

        {children && (
          <div
            className="animate-fade-up mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4"
            style={{ "--fade-y": "16px", "--fade-duration": "0.5s", "--fade-delay": "0.3s" } as CSSProperties}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
