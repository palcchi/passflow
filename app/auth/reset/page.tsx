import { AuthShell } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/update-password-form";
export const metadata = { title: "Password baru" };
export default function AuthResetPage() {
  return <AuthShell title="Awal yang baru." description="Buat password baru dengan minimal 8 karakter." backHref="/login" backLabel="Kembali ke login" kicker="ACCOUNT RECOVERY"><UpdatePasswordForm/></AuthShell>;
}
