import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { RotateAndCopyKeyButton } from "@/components/rotate-and-copy-key-button";
import {
  MotionCard,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";
import { requireUser } from "@/lib/auth/session";
import { getMagisterConnection } from "@/lib/magister/repository";
import { getApiKeyStatus } from "@/lib/security/api-key-repository";
import {
  card,
  cardGrid,
  pageHead,
  secondaryButton,
  status,
  statusOk,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const [connection, key] = await Promise.all([
    getMagisterConnection(user.id),
    getApiKeyStatus(user.id),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/mcp`;
  return (
    <MotionPage>
      <header className={pageHead}>
        <div>
          <h1>
            Welcome back,
            <br />
            <span className="text-[#848a80]">{firstName}</span>
          </h1>
        </div>
      </header>
      <MotionSection className={cardGrid}>
        <MotionCard className={card}>
          <div className={connection ? statusOk : status}>
            Magister {connection ? "connected" : "not connected"}
          </div>
          <h2>{connection?.displayName ?? "No student account"}</h2>
          <p>
            {connection
              ? `Person ${connection.personId}. Last verified ${connection.lastVerifiedAt.toLocaleString()}.`
              : "Complete the browser login flow to store encrypted Magister tokens."}
          </p>
          <Link
            className={`${secondaryButton} mt-6`}
            href="/dashboard/magister"
          >
            Manage Magister
            <ArrowRight aria-hidden="true" />
          </Link>
        </MotionCard>
        <MotionCard className={card}>
          <div className={key ? statusOk : status}>
            API key {key ? "active" : "not created"}
          </div>
          <h2>
            {key ? `${key.prefix}…${key.lastFour}` : "No client credential"}
          </h2>
          <p>
            {key
              ? `Created ${key.createdAt.toLocaleString()}. Last used ${key.lastUsedAt?.toLocaleString() ?? "never"}.`
              : "Create a bearer key, then add it to your MCP client configuration."}
          </p>
          <div className="mt-6 flex flex-wrap items-start gap-3">
            <Link className={secondaryButton} href="/dashboard/api-key">
              Manage API key
              <ArrowRight aria-hidden="true" />
            </Link>
            {key && <RotateAndCopyKeyButton />}
          </div>
        </MotionCard>
        <MotionCard
          className={`${card} col-span-full mt-8 max-[760px]:col-auto`}
        >
          <p>Use this endpoint in your client configuration.</p>
          <div className="mt-5 flex items-center gap-4 max-[760px]:flex-col max-[760px]:items-start">
            <h2 className="m-0 [overflow-wrap:anywhere] text-[clamp(22px,3vw,34px)] font-medium tracking-[-0.04em] text-[#dfe3d9]">
              {endpoint}
            </h2>
            <CopyButton value={endpoint} />
            <Link className={secondaryButton} href="/dashboard/examples">
              More examples
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </MotionCard>
      </MotionSection>
    </MotionPage>
  );
}
