import { cn } from "@/lib/utils";

export function AnimatedShinyText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("magic-shiny-text", className)}>
      {children}
    </span>
  );
}
