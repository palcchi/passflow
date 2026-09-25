import Link from "next/link";
import { UpdatePasswordForm } from "@/components/update-password-form";
export const metadata={title:"Password baru"};
export default function AuthResetPage(){return <main className="min-h-screen bg-background px-5 py-14"><section className="mx-auto max-w-md rounded-lg border border-border bg-card p-7"><p className="text-xs uppercase tracking-widest text-primary">Password baru</p><h1 className="mt-3 text-3xl font-semibold">Buat password baru</h1><p className="mt-3 text-sm text-muted-foreground">Gunakan minimal 8 karakter.</p><UpdatePasswordForm/><Link href="/login" className="mt-5 block text-center text-xs text-muted-foreground underline">Kembali ke login</Link></section></main>}
