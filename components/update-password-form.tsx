"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthSubmit } from "@/components/auth-submit";
import { PasswordField } from "@/components/password-field";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    try {
      const supabase = createBrowserSupabaseClient();
      supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session))).catch(() => setReady(false));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(Boolean(session)));
      return () => listener.subscription.unsubscribe();
    } catch {
      // An unconfigured preview keeps recovery disabled without crashing the page.
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
    setSaving(true); setError("");
    try {
      const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({ password });
      if (updateError) { setError("The password could not be updated. Reopen the reset link from your email."); return; }
      router.push("/account?notice=password-updated"); router.refresh();
    } catch {
      setError("The connection was interrupted. Please try saving your password again.");
    } finally {
      setSaving(false);
    }
  }
  return <form onSubmit={submit} className="auth-form">
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <div className="auth-field"><span aria-hidden="true">New password</span><PasswordField autoComplete="new-password" placeholder="At least 8 characters"/></div>
    <AuthSubmit disabled={!ready || saving}>{saving ? "Saving…" : "Save password"}</AuthSubmit>
    {!ready && <p className="text-xs text-muted-foreground">The reset link is not active or has expired.</p>}
  </form>;
}
