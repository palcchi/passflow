import { requireOrganizer } from "@/lib/auth/session";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOrganizer();
  return children;
}
