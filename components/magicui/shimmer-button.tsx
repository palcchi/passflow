import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export function ShimmerButton({
  asChild = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn("magic-shimmer-button", className)}
      {...props}
    >
      <span aria-hidden className="magic-shimmer-ring" />
      <span className="magic-shimmer-content">{children}</span>
    </Comp>
  );
}
