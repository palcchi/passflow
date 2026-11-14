"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSubmit } from "@/components/auth-submit";
import { PasswordField } from "@/components/password-field";

export function UpdatePasswordForm({ token = "" }: { token?: string }) {
  const router = useRouter();
  const ready = Boolean(token);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);


  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (token) {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ token, password }),
        });
        if (!response.ok) {
          setError("The reset link is invalid or expired. Request a new password-reset email.");
          return;
        }
      } else {
        setError("This reset link is missing its token. Request a new password-reset email.");
        return;
      }
      router.push("/login?notice=password-updated");
      router.refresh();
    } catch {
      setError("The connection was interrupted. Please try saving your password again.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="auth-form">
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <div className="auth-field"><span aria-hidden="true">New password</span><PasswordField autoComplete="new-password" placeholder="8+ characters, Aa and 1" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Use at least 8 characters with uppercase, lowercase, and a number."/></div>
    <AuthSubmit disabled={!ready || saving}>{saving ? "Saving…" : "Save password"}</AuthSubmit>
    {!ready && <p className="text-xs text-muted-foreground">The reset link is not active or has expired.</p>}
  </form>;
}
