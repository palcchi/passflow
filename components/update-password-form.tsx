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
      if (updateError) { setError("Password belum berhasil diubah. Buka kembali tautan reset dari email."); return; }
      router.push("/account?notice=password-updated"); router.refresh();
    } catch {
      setError("Koneksi terputus. Silakan coba menyimpan password lagi.");
    } finally {
      setSaving(false);
    }
  }
  return <form onSubmit={submit} className="auth-form">
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <div className="auth-field"><span aria-hidden="true">Password baru</span><PasswordField autoComplete="new-password" placeholder="Minimal 8 karakter"/></div>
    <AuthSubmit disabled={!ready || saving}>{saving ? "Menyimpan…" : "Simpan password"}</AuthSubmit>
    {!ready && <p className="text-xs text-muted-foreground">Tautan reset belum aktif atau sudah kedaluwarsa.</p>}
  </form>;
}
