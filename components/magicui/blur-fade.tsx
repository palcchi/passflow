import { cn } from "@/lib/utils";

export function BlurFade({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={cn("minimal-reveal", className)}>{children}</div>;
}
