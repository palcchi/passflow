"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

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
    <button
      className={`ui-btn ${variant === "outline" ? "ui-btn-secondary" : "ui-btn-primary"} ui-btn-lg ui-btn-block`}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
          Working…
        </>
      ) : (
        children
      )}
    </button>
  );
}
