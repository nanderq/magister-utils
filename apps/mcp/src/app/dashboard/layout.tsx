import Link from "next/link";
import { GraduationCap, KeyRound, LayoutDashboard, Link2 } from "lucide-react";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="dashboard-shell">
    <nav className="dashboard-nav"><div className="shell site-header">
      <Link className="brand" href="/dashboard"><GraduationCap aria-hidden="true" />Magister MCP</Link>
      <div className="dashboard-links"><Link href="/dashboard"><LayoutDashboard aria-hidden="true" />Overview</Link><Link href="/dashboard/magister"><Link2 aria-hidden="true" />Magister</Link><Link href="/dashboard/api-key"><KeyRound aria-hidden="true" />API key</Link></div>
      <SignOutButton />
    </div></nav>
    <main className="shell dashboard-main">{children}</main>
  </div>;
}
