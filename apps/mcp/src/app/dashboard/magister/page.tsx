import { MagisterConnectionForm } from "@/components/magister-connection-form";
import {
  MotionCard,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";
import { requireUser } from "@/lib/auth/session";
import { getMagisterConnection } from "@/lib/magister/repository";
import { Unplug } from "lucide-react";

import { disconnectMagisterAction } from "./actions";
import {
  card,
  cardGrid,
  dangerButton,
  meta,
  pageHead,
  status,
  statusOk,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function MagisterPage() {
  const user = await requireUser();
  const connection = await getMagisterConnection(user.id);
  return (
    <MotionPage>
      <header className={pageHead}>
        <div>
          <h1>Magister account</h1>
        </div>
      </header>
      <MotionSection className={cardGrid}>
        <MotionCard className={`${card} col-span-full max-[760px]:col-auto`}>
          {connection ? (
            <>
              <div className={statusOk}>Connected</div>
              <h2>{connection.displayName ?? "Magister student"}</h2>
              <p className={meta}>
                PERSON {connection.personId}
                <br />
                CONNECTED {connection.connectedAt.toLocaleString()}
                <br />
                LAST VERIFIED {connection.lastVerifiedAt.toLocaleString()}
              </p>
              <form action={disconnectMagisterAction}>
                <button className={dangerButton} type="submit">
                  <Unplug aria-hidden="true" />
                  Disconnect Magister
                </button>
              </form>
            </>
          ) : (
            <>
              <div className={status}>Not connected</div>
              <h2>Link your student account</h2>
              <MagisterConnectionForm />
            </>
          )}
        </MotionCard>
      </MotionSection>
    </MotionPage>
  );
}
