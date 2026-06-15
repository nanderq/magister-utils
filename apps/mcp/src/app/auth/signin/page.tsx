import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/google-sign-in";
import { MotionItem, MotionSection } from "@/components/motion-primitives";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  if (await auth.api.getSession({ headers: await headers() }))
    redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center bg-white p-5 text-[#050505] sm:p-8">
      <MotionSection className="w-full max-w-[620px] rounded-[32px] border border-[#deded9] bg-[#f1f1ef] p-[clamp(40px,7vw,76px)] shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
        <MotionItem>
          <h1 className="m-0 max-w-[430px] text-[clamp(42px,7vw,68px)] leading-[0.95] font-semibold tracking-[-0.055em]">
            Sign in securely.
          </h1>
        </MotionItem>
        <MotionItem>
          <p className="mt-6 mb-9 max-w-[440px] leading-[1.7] text-[#666]">
            Use your Google account to access the dashboard.
          </p>
        </MotionItem>
        <MotionItem>
          <GoogleSignIn />
        </MotionItem>
      </MotionSection>
    </main>
  );
}
