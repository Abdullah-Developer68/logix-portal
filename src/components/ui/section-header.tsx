"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "flex flex-col gap-4 mb-12",
        align === "center" && "text-center items-center mx-auto max-w-2xl",
        Boolean(action) && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] lg:leading-[44px] font-bold text-primary tracking-tight break-words">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm sm:text-base leading-6 text-muted-foreground max-w-xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-2 sm:pt-0">{action}</div>}
    </motion.div>
  );
}
