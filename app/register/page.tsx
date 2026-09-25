import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/redirect";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  redirect(`/login?next=${encodeURIComponent(safeNext(params.next))}`);
}
