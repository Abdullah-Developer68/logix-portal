"use client";

import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useInViewOnce(rootMargin = "-40px") {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.visible === "true") return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.visible = "true";
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0 },
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
  rootMargin = "-40px",
  style,
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  rootMargin?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const ref = useInViewOnce(rootMargin);

  const offsets = {
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };
  const offset = offsets[direction];

  return (
    <div
      ref={ref}
      data-visible="false"
      className={cn("reveal-item", className)}
      style={
        {
          "--reveal-x": `${offset.x}px`,
          "--reveal-y": `${offset.y}px`,
          "--reveal-duration": `${duration}s`,
          "--reveal-delay": `${delay}s`,
          ...style,
        } as CSSProperties
      }
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
} & HTMLAttributes<HTMLDivElement>) {
  const ref = useInViewOnce("-40px");

  return (
    <div
      ref={ref}
      data-visible="false"
      className={cn("stagger-container", className)}
      style={
        {
          "--stagger-base": `${delayChildren}s`,
          "--stagger-step": `${staggerDelay}s`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
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
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("stagger-item", className)}
      style={{ "--stagger-y": `${distance}px`, ...style } as CSSProperties}
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
  return (
    <div className={cn("h-full transition-transform duration-200 ease-out hover:-translate-y-1", className)}>
      {children}
    </div>
  );
}
