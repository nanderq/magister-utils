import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/google-sign-in";
import {
  MotionItem,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  if (await auth.api.getSession({ headers: await headers() }))
    redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080a09] text-[#f2f4ed] selection:bg-[#c8ff4a] selection:text-[#080a09]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[700px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(126,159,76,0.12),transparent_68%)]"
      />
      <MotionPage>
        <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-6 sm:px-10 lg:px-14">
          <header className="flex h-24 items-center justify-between border-b border-white/10">
            <Link
              className="inline-flex items-center text-[13px] font-semibold tracking-[0.16em] text-[#f2f4ed] uppercase no-underline"
              href="/"
            >
              MMCP
            </Link>
            <Link
              className="group inline-flex items-center gap-2 text-[12px] text-[#858c81] no-underline transition-colors hover:text-[#f2f4ed] [&_svg]:size-3.5 [&_svg]:stroke-[1.5] [&_svg]:transition-transform hover:[&_svg]:-translate-x-1"
              href="/"
            >
              <ArrowLeft aria-hidden="true" />
              Back home
            </Link>
          </header>

          <div className="grid flex-1 py-20 lg:grid-cols-12 lg:items-center lg:py-28">
            <MotionSection className="lg:col-span-7 lg:pr-16">
              <MotionItem>
                <h1 className="m-0 max-w-[800px] text-[clamp(4rem,8.5vw,8rem)] leading-[0.86] font-semibold tracking-[-0.065em]">
                  Pick up where
                  <br />
                  <span className="text-[#848a80]">you left off.</span>
                </h1>
              </MotionItem>
            </MotionSection>

            <MotionSection className="mt-20 border-t border-white/15 pt-10 lg:col-span-5 lg:mt-0 lg:border-t-0 lg:border-l lg:py-10 lg:pl-16">
              <MotionItem>
                <h2 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] font-medium tracking-[-0.045em]">
                  Sign in securely
                </h2>
              </MotionItem>
              <MotionItem>
                <p className="mt-5 mb-9 max-w-[410px] text-[15px] leading-[1.7] text-[#92998e]">
                  Use your Google account to access your private MMCP dashboard.
                </p>
              </MotionItem>
              <MotionItem>
                <GoogleSignIn />
              </MotionItem>
              <MotionItem>
                <p className="mt-6 max-w-[390px] font-mono text-[9px] leading-[1.7] tracking-[0.08em] text-[#666d63] uppercase">
                  Your Magister credentials are never shared with MMCP.
                </p>
              </MotionItem>
            </MotionSection>
          </div>
        </div>
      </MotionPage>
    </main>
  );
}
