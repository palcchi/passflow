"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthSubmit({
  children,
  disabled = false,
  variant = "default",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      variant={variant}
      size="lg"
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          Memproses...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
