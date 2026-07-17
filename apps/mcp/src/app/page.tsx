import { headers } from "next/headers";
import { ArrowRight, Check, Link2, LogIn } from "lucide-react";
import Link from "next/link";

import { auth } from "@/lib/auth";
import {
  MotionItem,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";

const steps = [
  {
    number: "01",
    title: "Sign in",
    description: "Create your secure MMCP account with Google.",
    icon: LogIn,
  },
  {
    number: "02",
    title: "Connect Magister",
    description:
      "Use Magister’s official login flow. Your password is never shared with us.",
    icon: Link2,
  },
  {
    number: "03",
    title: "Start asking",
    description:
      "Add your private endpoint to any MCP-compatible assistant and start a conversation.",
    icon: Check,
  },
] as const;

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const destination = session ? "/dashboard" : "/auth/signin";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080a09] font-sans text-[#f2f4ed] selection:bg-[#c8ff4a] selection:text-[#080a09] motion-reduce:[&_*]:transition-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[760px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(126,159,76,0.13),transparent_66%)]"
      />

      <MotionPage>
        <div className="relative mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-14">
          <header className="flex h-24 items-center justify-between border-b border-white/10">
            <Link
              className="inline-flex items-center text-[13px] font-semibold tracking-[0.16em] text-[#f2f4ed] uppercase no-underline"
              href="/"
            >
              MMCP
            </Link>

            <Link
              className="group inline-flex items-center gap-2.5 text-[13px] font-medium text-[#d7dbd0] no-underline transition-colors duration-300 hover:text-white [&_svg]:size-4 [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1"
              href={destination}
            >
              {session ? "Dashboard" : "Sign in"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <section
            className="grid min-h-[calc(100svh-6rem)] grid-cols-1 content-center py-24 lg:grid-cols-12 lg:py-28"
            aria-labelledby="hero-title"
          >
            <MotionSection className="lg:col-span-11">
              <MotionItem>
                <h1
                  className="m-0 max-w-[1250px] text-[clamp(4rem,10.7vw,9.6rem)] leading-[0.84] font-semibold tracking-[-0.065em]"
                  id="hero-title"
                >
                  Your school day.
                  <br />
                  <span className="text-[#848a80]">Finally clear.</span>
                </h1>
              </MotionItem>

              <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-12 lg:items-end">
                <MotionItem className="lg:col-span-5">
                  <p className="m-0 max-w-[540px] text-[clamp(17px,1.6vw,22px)] leading-[1.55] tracking-[-0.02em] text-[#adb2a8]">
                    Ask about schedules, grades, and assignments in plain
                    language. MMCP turns your Magister data into a conversation.
                  </p>
                  <Link
                    className="group mt-8 inline-flex w-fit items-center gap-5 border-b border-[#c8ff4a] pb-2 text-[13px] font-semibold text-[#f2f4ed] no-underline transition-colors duration-300 hover:text-[#c8ff4a] [&_svg]:size-4 [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1"
                    href={destination}
                  >
                    Connect Magister
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </MotionItem>
              </div>
            </MotionSection>
          </section>

          <section
            className="border-t border-white/10 py-24 lg:py-36"
            aria-labelledby="how-title"
          >
            <MotionSection className="mb-16 grid gap-8 lg:mb-24 lg:grid-cols-12">
              <MotionItem className="lg:col-span-9">
                <h2
                  className="m-0 max-w-[820px] text-[clamp(3rem,6.5vw,6.5rem)] leading-[0.94] font-semibold tracking-[-0.055em]"
                  id="how-title"
                >
                  One connection.
                  <br />
                  Everything in reach.
                </h2>
              </MotionItem>
            </MotionSection>

            <MotionSection className="border-t border-white/15">
              {steps.map(({ number, title, description, icon: Icon }) => (
                <MotionItem key={number}>
                  <article className="group grid gap-5 border-b border-white/15 py-8 transition-colors duration-300 hover:border-white/35 sm:grid-cols-[64px_1fr_auto] sm:items-center lg:grid-cols-12 lg:py-10">
                    <span className="font-mono text-[10px] text-[#6f756b] lg:col-span-1">
                      {number}
                    </span>
                    <h3 className="m-0 text-[clamp(1.8rem,3.2vw,3.4rem)] font-medium tracking-[-0.045em] sm:col-start-2 lg:col-span-4">
                      {title}
                    </h3>
                    <p className="m-0 max-w-[470px] text-[15px] leading-[1.65] text-[#92998e] sm:col-start-2 lg:col-span-5 lg:col-start-7">
                      {description}
                    </p>
                    <Icon
                      aria-hidden="true"
                      className="hidden size-5 stroke-[1.25] text-[#c8ff4a] transition-transform duration-300 group-hover:translate-x-1 sm:block lg:col-span-1 lg:col-start-12 lg:justify-self-end"
                    />
                  </article>
                </MotionItem>
              ))}
            </MotionSection>
          </section>

          <section
            className="border-t border-white/10 py-28 lg:py-44"
            aria-labelledby="cta-title"
          >
            <MotionSection className="grid gap-12 lg:grid-cols-12 lg:items-end">
              <MotionItem className="lg:col-span-9">
                <h2
                  className="m-0 text-[clamp(3.8rem,8.8vw,8.5rem)] leading-[0.86] font-semibold tracking-[-0.065em]"
                  id="cta-title"
                >
                  Less searching.
                  <br />
                  <span className="text-[#848a80]">More knowing.</span>
                </h2>
              </MotionItem>
              <MotionItem className="lg:col-span-3 lg:pb-2">
                <p className="mt-0 mb-8 text-[15px] leading-[1.6] text-[#92998e]">
                  Connect once. Ask whenever you need clarity.
                </p>
                <Link
                  className="group inline-flex w-fit items-center gap-5 text-[14px] font-semibold text-[#c8ff4a] no-underline [&_svg]:size-5 [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1"
                  href={destination}
                >
                  {session ? "Open dashboard" : "Get started"}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </MotionItem>
            </MotionSection>
          </section>

        </div>
      </MotionPage>
    </main>
  );
}
