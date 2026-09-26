"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
function authRedirect(path: string, key: string) { return `/login?${key}=1&next=${encodeURIComponent(path)}`; }

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const origin = getAppOrigin();
  if (!origin || !getSupabaseConfig()) redirect(authRedirect(next, "unavailable"));

  let providerUrl: string | null = null;
  try {
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", next);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (!error) providerUrl = data.url;
  } catch {
    // The button resolves to a local, non-sensitive error state below.
  }

  if (!providerUrl) redirect(authRedirect(next, "provider"));
  redirect(providerUrl);
}

export async function signInWithEmail(formData: FormData) {
  const next=safeNext(formData.get("next")); const email=String(formData.get("email")??"").trim().toLowerCase(); const password=String(formData.get("password")??"");
  if(!email||password.length<8) redirect(authRedirect(next,"invalid"));
  let success = false;
  let errorCode = "invalid";
  try {
    const supabase=await createServerSupabaseClient();
    const {error}=await supabase.auth.signInWithPassword({email,password});
    success = !error;
    if (error?.code === "email_not_confirmed") errorCode = "unverified";
  } catch {}
  if (success) redirect(next);
  if (errorCode === "unverified") redirect(authRedirect(next,"unverified"));
  redirect(authRedirect(next,"invalid"));
}
export async function signUpWithEmail(formData: FormData) {
  const next=safeNext(formData.get("next")); const email=String(formData.get("email")??"").trim().toLowerCase(); const password=String(formData.get("password")??""); const origin=getAppOrigin();
  const username=String(formData.get("username")??"").trim().toLowerCase();
  if(!origin||!getSupabaseConfig()||!email||password.length<8||!/^[a-z0-9_]{3,24}$/.test(username)) redirect(`/register?error=invalid&next=${encodeURIComponent(next)}`);
  let success = false;
  // Confirmation email template appends /auth/confirm and consumes TokenHash itself.
  // Keep RedirectTo at the origin so the template never duplicates callback paths.
  try { const supabase=await createServerSupabaseClient(); const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:origin,data:{username}}}); success = !error; } catch {}
  if (success) redirect(`/register?notice=check-email&next=${encodeURIComponent(next)}`);
  redirect(`/register?error=provider&next=${encodeURIComponent(next)}`);
}
export async function resendSignupConfirmation(formData: FormData) {
  const next=safeNext(formData.get("next")); const email=String(formData.get("email")??"").trim().toLowerCase(); const origin=getAppOrigin();
  if(!email||!origin||!getSupabaseConfig()) redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
  let success=false;
  try { const supabase=await createServerSupabaseClient(); const {error}=await supabase.auth.resend({type:"signup",email,options:{emailRedirectTo:origin}}); success=!error; } catch {}
  if(success) redirect(`/login?notice=verification-sent&next=${encodeURIComponent(next)}`);
  redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
}
export async function requestPasswordReset(formData: FormData) {
  const email=String(formData.get("email")??"").trim().toLowerCase(); const origin=getAppOrigin();
  if(origin&&getSupabaseConfig()&&email){try{const supabase=await createServerSupabaseClient(); await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/reset`});}catch{}}
  redirect("/login?notice=reset-sent");
}
export async function updatePassword(formData: FormData) {
  const password=String(formData.get("password")??""); if(password.length<8) redirect("/auth/reset?error=invalid");
  let success = false;
  let hasUser = true;
  try{const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user) hasUser = false; else { const {error}=await supabase.auth.updateUser({password}); success = !error; }}catch{}
  if (!hasUser) redirect("/login?error=expired");
  if (success) redirect("/account?notice=password-updated");
  redirect("/auth/reset?error=provider");
}
export async function signOut(){let failed=false;if(getSupabaseConfig()){try{const supabase=await createServerSupabaseClient();const {error}=await supabase.auth.signOut({scope:"local"});failed=!!error;}catch{failed=true;}}if(failed)redirect("/login?error=signout");revalidatePath("/","layout");redirect("/login?notice=signed-out");}
