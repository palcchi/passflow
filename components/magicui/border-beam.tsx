import { cn } from "@/lib/utils";
export function BorderBeam({ className }: { className?: string }) { return <span aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[inherit] border border-primary/50 [mask-image:linear-gradient(transparent,black,transparent)] animate-pulse", className)} />; }
