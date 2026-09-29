import type { ReactNode } from "react";
import { DesignSubnav } from "@/components/design-subnav";

export default async function DesignLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <>
      <DesignSubnav eventId={eventId} />
      {children}
    </>
  );
}
