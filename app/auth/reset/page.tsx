import { AuthShell } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata = { title: "New password" };

export default async function AuthResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <AuthShell
      title="Set a new password."
      description="Choose a new password with at least 8 characters."
      backHref="/login"
      backLabel="Back to sign in"
      kicker="ACCOUNT RECOVERY"
    >
      <UpdatePasswordForm token={token} />
    </AuthShell>
  );
}
