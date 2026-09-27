import { AuthShell } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";
export const metadata = { title: "Password baru" };
export default function AuthResetPage() {
  return <AuthShell title="Set a new password." description="Choose a new password with at least 8 characters." backHref="/login" backLabel="Back to sign in" kicker="ACCOUNT RECOVERY"><UpdatePasswordForm/></AuthShell>;
}
