import { cn } from "@/lib/utils";

export function NumberTicker({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {new Intl.NumberFormat("id-ID").format(value)}
    </span>
  );
}
