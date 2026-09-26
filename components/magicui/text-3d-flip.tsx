import { cn } from "@/lib/utils";

export function Text3DFlip({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={cn("text-3d-flip", className)} aria-label={children}>
      {Array.from(children).map((letter, index) => (
        <span
          className="text-3d-letter"
          style={{ transitionDelay: `${index * 18}ms` }}
          key={`${letter}-${index}`}
          aria-hidden="true"
        >
          <span className="text-3d-front">{letter === " " ? "\u00A0" : letter}</span>
          <span className="text-3d-back">{letter === " " ? "\u00A0" : letter}</span>
        </span>
      ))}
    </span>
  );
}
