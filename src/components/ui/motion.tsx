"use client";

import {
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

function useRevealElement(rootMargin = "0px 0px -40px 0px") {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-visible", "true");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return ref;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
  distance = 24,
  style,
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
} & ComponentProps<"div">) {
  const ref = useRevealElement();

  const offsets = {
    up: { x: "0px", y: `${distance}px` },
    down: { x: "0px", y: `${-distance}px` },
    left: { x: `${distance}px`, y: "0px" },
    right: { x: `${-distance}px`, y: "0px" },
    none: { x: "0px", y: "0px" },
  };

  const offset = offsets[direction];
  const revealStyle = {
    "--reveal-x": offset.x,
    "--reveal-y": offset.y,
    "--reveal-duration": `${Math.round(duration * 1000)}ms`,
    "--reveal-delay": `${Math.round(delay * 1000)}ms`,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn("reveal-fade", className)}
      style={revealStyle}
      {...props}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  delayChildren = 0.1,
  style,
  ...props
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
} & ComponentProps<"div">) {
  const ref = useRevealElement();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-stagger-item]");
    items.forEach((item, index) => {
      const delayMs = Math.round((delayChildren + index * staggerDelay) * 1000);
      item.style.setProperty("--reveal-delay", `${delayMs}ms`);
    });
  }, [ref, staggerDelay, delayChildren]);

  return (
    <div ref={ref} className={className} style={style} {...props}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
  distance = 20,
  style,
  ...props
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
} & ComponentProps<"div">) {
  const ref = useRevealElement();

  const revealStyle = {
    "--reveal-x": "0px",
    "--reveal-y": `${distance}px`,
    "--reveal-duration": "500ms",
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      data-stagger-item=""
      className={cn("reveal-fade", className)}
      style={revealStyle}
      {...props}
    >
      {children}
    </div>
  );
}

export function MotionCardWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("h-full reveal-card", className)}>{children}</div>;
}
