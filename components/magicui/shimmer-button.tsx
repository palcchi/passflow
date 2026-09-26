import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export function ShimmerButton({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn("magic-shimmer-button", className)}
      {...props}
    />
  );
}
