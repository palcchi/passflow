import Link from "next/link";
import { cn } from "@/lib/utils";

type ShinyButtonProps = {
  href?: string;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
};

export function ShinyButton({
  href,
  children,
  className,
  type = "button",
}: ShinyButtonProps) {
  const classes = cn("magic-shiny-button", className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        <span>{children}</span>
      </Link>
    );
  }
  return (
    <button type={type} className={classes}>
      <span>{children}</span>
    </button>
  );
}
