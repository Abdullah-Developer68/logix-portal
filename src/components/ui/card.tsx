import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({
  inverted,
  className,
  ...props
}: { inverted?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 sm:p-6",
        inverted
          ? "border-primary bg-[#0b1f3a] text-white dark:bg-card dark:border-border dark:text-foreground"
          : "border-border bg-card text-foreground",
        className,
      )}
      {...props}
    />
  );
}
