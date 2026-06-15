import { headers } from "next/headers";
import { ArrowRight, Check, Link2, LogIn } from "lucide-react";
import Link from "next/link";

import { auth } from "@/lib/auth";
import {
  MotionItem,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const destination = session ? "/dashboard" : "/auth/signin";

  return (
    <main className="min-h-screen bg-white p-3.5 font-sans text-[#050505] motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*::before]:transition-none motion-reduce:[&_*::after]:transition-none max-[650px]:p-2">
      <MotionPage>
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex min-h-[72px] items-center justify-end px-2.5 pb-3.5 max-[650px]:min-h-16">
          <Link
            className="inline-flex items-center gap-[9px] text-[13px] font-bold text-[#050505] no-underline [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-1"
            href={destination}
          >
            {session ? "Dashboard" : "Sign in"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </header>

        <section
          className="flex min-h-[590px] items-center overflow-hidden rounded-[34px] bg-[#f1f1ef] p-[clamp(48px,6vw,82px)] max-[900px]:min-h-0 max-[900px]:px-[34px] max-[900px]:pt-[58px] max-[900px]:pb-9 max-[650px]:rounded-3xl max-[650px]:px-[22px] max-[650px]:pt-[46px] max-[650px]:pb-[42px]"
          aria-labelledby="hero-title"
        >
          <MotionSection>
            <MotionItem>
              <h1
                className="m-0 text-[clamp(62px,7.3vw,116px)] leading-[0.9] font-semibold tracking-[-0.055em] max-[650px]:text-[clamp(52px,16vw,72px)]"
                id="hero-title"
              >
                Your school data.
                <br />
                Ready to talk.
              </h1>
            </MotionItem>
            <MotionItem>
              <p className="my-10 max-w-[600px] text-[clamp(17px,1.5vw,21px)] leading-[1.6] tracking-[-0.015em] text-[#555]">
                MMCP is a bridge between Magister and your AI assistant.
                Ask about schedules, grades, assignments, and more.
              </p>
            </MotionItem>
            <MotionItem>
              <Link
                className="inline-flex w-fit items-center gap-7 rounded-full border border-[#050505] bg-[#050505] px-6 py-[17px] text-[13px] font-bold text-white no-underline transition-[background,color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.14)] [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-1"
                href={destination}
              >
                Connect Magister <ArrowRight aria-hidden="true" />
              </Link>
            </MotionItem>
          </MotionSection>
        </section>

        <section
          className="px-[clamp(24px,7vw,100px)] py-[clamp(72px,8vw,112px)] max-[650px]:px-3.5 max-[650px]:py-[72px]"
          aria-labelledby="how-title"
        >
          <MotionSection className="mb-16 max-[650px]:mb-12">
            <MotionItem>
            <h2
              className="m-0 text-[clamp(50px,6vw,88px)] leading-[0.95] font-semibold tracking-[-0.055em]"
              id="how-title"
            >
              Three steps.
              <br />
              One connection.
            </h2>
            </MotionItem>
          </MotionSection>
          <MotionSection className="grid grid-cols-3 border-t border-[#111] max-[650px]:grid-cols-1 [&_article]:relative [&_article]:min-h-[300px] [&_article]:border-r [&_article]:border-[#d5d5d2] [&_article]:px-9 [&_article]:py-8 [&_article:first-child]:pl-0 [&_article:last-child]:border-r-0 max-[650px]:[&_article]:min-h-0 max-[650px]:[&_article]:border-r-0 max-[650px]:[&_article]:border-b max-[650px]:[&_article]:px-1 max-[650px]:[&_article]:pt-7 max-[650px]:[&_article]:pb-12">
            <MotionItem>
            <article>
              <span className="font-mono text-[10px] leading-none font-bold text-[#777]">
                01
              </span>
              <div className="my-7 mt-11 grid size-[52px] place-items-center rounded-2xl border border-[#111] max-[650px]:my-6 max-[650px]:mt-7 [&_svg]:size-[21px] [&_svg]:stroke-[1.6]">
                <LogIn aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-[27px] font-semibold tracking-[-0.03em]">
                Sign in
              </h3>
              <p className="m-0 max-w-[300px] text-sm leading-[1.6] text-[#666]">
                Use Google to create your secure Magister MCP account.
              </p>
            </article>
            </MotionItem>
            <MotionItem>
            <article>
              <span className="font-mono text-[10px] leading-none font-bold text-[#777]">
                02
              </span>
              <div className="my-7 mt-11 grid size-[52px] place-items-center rounded-2xl border border-[#111] max-[650px]:my-6 max-[650px]:mt-7 [&_svg]:size-[21px] [&_svg]:stroke-[1.6]">
                <Link2 aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-[27px] font-semibold tracking-[-0.03em]">
                Connect
              </h3>
              <p className="m-0 max-w-[300px] text-sm leading-[1.6] text-[#666]">
                Link Magister through its official login flow. Your password is
                never shared.
              </p>
            </article>
            </MotionItem>
            <MotionItem>
            <article>
              <span className="font-mono text-[10px] leading-none font-bold text-[#777]">
                03
              </span>
              <div className="my-7 mt-11 grid size-[52px] place-items-center rounded-2xl border border-[#111] max-[650px]:my-6 max-[650px]:mt-7 [&_svg]:size-[21px] [&_svg]:stroke-[1.6]">
                <Check aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-[27px] font-semibold tracking-[-0.03em]">
                Start asking
              </h3>
              <p className="m-0 max-w-[300px] text-sm leading-[1.6] text-[#666]">
                Add your private endpoint to any MCP-compatible assistant.
              </p>
            </article>
            </MotionItem>
          </MotionSection>
        </section>

        <section
          className="flex min-h-[650px] flex-col items-center justify-center rounded-[34px] bg-[#050505] px-6 pt-[90px] pb-8 text-center text-white max-[650px]:min-h-[620px] max-[650px]:rounded-3xl max-[650px]:px-[18px] max-[650px]:pt-20 max-[650px]:pb-[26px]"
          aria-labelledby="cta-title"
        >
          <MotionSection>
            <MotionItem>
              <h2
                className="m-0 text-[clamp(54px,7vw,104px)] leading-[0.92] font-semibold tracking-[-0.055em] max-[650px]:text-[clamp(48px,14vw,68px)]"
                id="cta-title"
              >
                Make your school day
                <br />
                easier to understand.
              </h2>
            </MotionItem>
            <MotionItem>
              <p className="my-10 text-[17px] text-[#aaa]">
                Connect once. Ask whenever you need clarity.
              </p>
            </MotionItem>
            <MotionItem>
              <Link
                className="inline-flex w-fit items-center gap-7 rounded-full border border-white bg-white px-6 py-[17px] text-[13px] font-bold text-[#050505] no-underline transition-[background,color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,255,255,0.12)] [&_svg]:w-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.5] [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:translate-x-1"
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
