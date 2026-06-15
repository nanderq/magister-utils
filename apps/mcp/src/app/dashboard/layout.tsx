import Link from "next/link";
import { KeyRound, LayoutDashboard, Link2 } from "lucide-react";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth/session";

const shell = "mx-auto w-[min(1240px,calc(100%_-_24px))]";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return (
    <div className="min-h-screen bg-white px-3.5 pb-6 text-[#050505]">
      <nav className="bg-white text-[#050505]">
        <div
          className={`${shell} flex min-h-[84px] items-center justify-between border-b border-[#e7e7e3]`}
        >
          <Link
            className="inline-flex items-center gap-[9px] text-[15px] leading-none font-bold tracking-[-0.025em] no-underline [&_svg]:size-[18px] [&_svg]:stroke-[1.8]"
            href="/dashboard"
          >
            MMCP
          </Link>
          <div className="flex gap-8 text-xs leading-none font-bold text-[#666] max-[760px]:hidden [&_a]:inline-flex [&_a]:items-center [&_a]:gap-2 [&_a]:py-3 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-[#050505] [&_svg]:size-3.5 [&_svg]:stroke-[1.8]">
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Overview
            </Link>
            <Link href="/dashboard/magister">
              <Link2 aria-hidden="true" />
              Magister
            </Link>
            <Link href="/dashboard/api-key">
              <KeyRound aria-hidden="true" />
              API key
            </Link>
          </div>
          <SignOutButton />
        </div>
      </nav>
      <main className={`${shell} mt-5 pb-6`}>
        {children}
      </main>
    </div>
  );
}
