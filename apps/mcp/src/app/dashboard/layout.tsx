import Link from "next/link";
import type { ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth/session";

const shell = "mx-auto w-full max-w-[1320px] px-6 sm:px-10 lg:px-14";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080a09] text-[#f2f4ed] selection:bg-[#c8ff4a] selection:text-[#080a09]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(126,159,76,0.1),transparent_68%)]"
      />

      <div className="relative">
        <header className={shell}>
          <div className="flex h-24 items-center justify-between border-b border-white/10">
            <Link
              className="inline-flex items-center text-[13px] font-semibold tracking-[0.16em] text-[#f2f4ed] uppercase no-underline"
              href="/"
            >
              MMCP
            </Link>
            <SignOutButton />
          </div>

          <DashboardNav />
        </header>

        <main className={`${shell} py-16 sm:py-20 lg:py-28`}>{children}</main>
      </div>
    </div>
  );
}
