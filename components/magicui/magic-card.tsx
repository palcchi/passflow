import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function MagicCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flat-card", className)}>{children}</div>;
}
