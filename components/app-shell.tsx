import type { CSSProperties, ReactNode } from "react";
import { UserNavbar } from "@/components/user-navbar";

export function AppShell({ name, email, avatarUrl, organizer = false, narrow = false, style, children }: {
  name: string; email?: string | null; avatarUrl?: string | null; organizer?: boolean; narrow?: boolean; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <div className="ui-app" style={style}>
      <UserNavbar name={name} email={email} avatarUrl={avatarUrl} organizer={organizer} />
      <main id="main" className={narrow ? "ui-main ui-main-narrow" : "ui-main"}>{children}</main>
    </div>
  );
}
