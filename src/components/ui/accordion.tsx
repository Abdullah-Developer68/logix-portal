"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="py-4">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between text-left font-medium text-foreground transition-colors hover:text-brand-strong"
              aria-expanded={isOpen}
            >
              <span className="text-sm sm:text-base font-semibold pr-2">{item.question}</span>
              <span
                className={cn(
                  "ml-2 sm:ml-4 flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs transition-transform duration-200",
                  isOpen ? "rotate-45 bg-accent text-brand-strong border-brand-strong/30" : "bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="mt-3 text-xs sm:text-sm leading-5 sm:leading-6 text-muted-foreground pr-2 sm:pr-8">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

