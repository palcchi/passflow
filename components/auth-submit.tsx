"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthSubmit({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <Button className="w-full" variant="outline" size="lg" type="submit" disabled={disabled || pending} aria-busy={pending}>
    {pending ? <><LoaderCircle className="animate-spin" aria-hidden="true" /> Menghubungkan...</> : children}
  </Button>;
}
