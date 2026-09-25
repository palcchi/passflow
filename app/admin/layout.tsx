import { headers } from "next/headers";
import { requireOrganizer } from "@/lib/auth/session";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  await requireOrganizer(requestHeaders.get("x-passflow-path") ?? "/admin");
  return children;
}
