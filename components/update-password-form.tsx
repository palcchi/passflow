"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthSubmit } from "@/components/auth-submit";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
    setSaving(true); setError("");
    const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({ password });
    if (updateError) { setError("Password belum berhasil diubah. Buka kembali tautan reset dari email."); setSaving(false); return; }
    router.push("/account?notice=password-updated"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 space-y-3">
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Password baru" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-md border border-border px-3 text-sm" />
    <AuthSubmit disabled={!ready || saving}>{saving ? "Menyimpan…" : "Simpan password"}</AuthSubmit>
    {!ready && <p className="text-xs text-muted-foreground">Tautan reset belum aktif atau sudah kedaluwarsa.</p>}
  </form>;
}
