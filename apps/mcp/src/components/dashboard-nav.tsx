"use client";

import { BookOpen, KeyRound, LayoutDashboard, Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/magister", label: "Magister", icon: Link2 },
  { href: "/dashboard/api-key", label: "API key", icon: KeyRound },
  { href: "/dashboard/examples", label: "Examples", icon: BookOpen },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className="flex min-h-16 items-center gap-7 overflow-x-auto border-b border-white/10 text-[12px] sm:gap-10"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`group relative inline-flex shrink-0 items-center gap-2.5 py-5 no-underline transition-colors duration-300 [&_svg]:size-3.5 [&_svg]:stroke-[1.5] ${
              active
                ? "text-[#f2f4ed] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#c8ff4a]"
                : "text-[#858c81] hover:text-[#f2f4ed]"
            }`}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
