import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { Shell, ShellFallback } from "@/components/shell";

export const instant = false;

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Authed>{children}</Authed>
    </Suspense>
  );
}

async function Authed({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <Shell user={user}>{children}</Shell>;
}
