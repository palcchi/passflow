"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  validateEmail,
  validateFullName,
  validatePassword,
} from "@/lib/auth/validation";

function go(path: string): never {
  redirect(path);
}

function loginError(code: string, next: string): never {
  go(`/login?error=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
}

function registerError(code: string, next: string): never {
  go(`/register?error=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
}

export async function signInWithPassword(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");

  if (!validateEmail(email) || typeof password !== "string" || !password) {
    loginError("invalid", next);
  }
  if (!getSupabaseConfig()) loginError("unavailable", next);

  let result: "success" | "unverified" | "failed" = "failed";

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      result = "success";
    } else if ((error as { code?: string }).code === "email_not_confirmed") {
      result = "unverified";
    }
  } catch {
    result = "failed";
  }

  if (result === "success") {
    revalidatePath("/", "layout");
    go(next);
  }
  if (result === "unverified") loginError("unverified", next);
  loginError("credentials", next);
}

export async function signUpWithPassword(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const fullNameValue = formData.get("fullName");
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const origin = getAppOrigin();

  if (!validateFullName(fullNameValue)) registerError("name", next);
  if (!validateEmail(email)) registerError("email", next);
  if (!validatePassword(password)) registerError("password", next);
  if (password !== confirmPassword) registerError("mismatch", next);
  if (!origin || !getSupabaseConfig()) registerError("unavailable", next);

  let result: "session" | "confirmation" | "failed" = "failed";

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullNameValue.trim() },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (!error) result = data.session ? "session" : "confirmation";
  } catch {
    result = "failed";
  }

  if (result === "session") {
    revalidatePath("/", "layout");
    go(next);
  }
  if (result === "confirmation") {
    go(`/register?notice=check-email&next=${encodeURIComponent(next)}`);
  }

  // Deliberately generic so the UI does not become an account-enumeration oracle.
  registerError("signup", next);
}

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const origin = getAppOrigin();

  if (!validateEmail(email)) go("/forgot-password?error=email");
  if (!origin || !getSupabaseConfig()) go("/forgot-password?error=unavailable");

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
  } catch {
    // Always return the same user-facing state to avoid leaking account existence.
  }

  go("/forgot-password?notice=sent");
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!validatePassword(password)) go("/reset-password?error=password");
  if (password !== confirmPassword) go("/reset-password?error=mismatch");
  if (!getSupabaseConfig()) go("/reset-password?error=unavailable");

  let result: "success" | "no-session" | "failed" = "failed";

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      result = "no-session";
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      result = error ? "failed" : "success";
    }
  } catch {
    result = "failed";
  }

  if (result === "no-session") go("/login?error=recovery");
  if (result === "success") {
    revalidatePath("/", "layout");
    go("/account?notice=password-updated");
  }
  go("/reset-password?error=update");
}

export async function signOut() {
  let failed = false;

  if (getSupabaseConfig()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      failed = !!error;
    } catch {
      failed = true;
    }
  }

  if (failed) go("/login?error=signout");
  revalidatePath("/", "layout");
  go("/login?notice=signed-out");
}
