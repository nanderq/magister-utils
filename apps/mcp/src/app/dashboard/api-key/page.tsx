import { ApiKeyForm } from "@/components/api-key-form";
import {
  MotionCard,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";
import { requireUser } from "@/lib/auth/session";
import { getApiKeyStatus } from "@/lib/security/api-key-repository";
import {
  card,
  cardGrid,
  meta,
  pageHead,
  status,
  statusOk,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ApiKeyPage() {
  const user = await requireUser();
  const key = await getApiKeyStatus(user.id);
  return (
    <MotionPage>
      <header className={pageHead}>
        <div>
          <h1>
            Your API key.
          </h1>
        </div>
      </header>
      <MotionSection className={cardGrid}>
        <MotionCard className={`${card} col-span-full max-[760px]:col-auto`}>
          <div className={key ? statusOk : status}>
            {key ? "Active" : "Not created"}
          </div>
          <h2>
            {key ? `${key.prefix}…${key.lastFour}` : "Create your first key"}
          </h2>
          {key && (
            <p className={meta}>
              CREATED {key.createdAt.toLocaleString()}
              <br />
              LAST USED {key.lastUsedAt?.toLocaleString() ?? "NEVER"}
            </p>
          )}
          <ApiKeyForm hasKey={Boolean(key)} />
        </MotionCard>
      </MotionSection>
    </MotionPage>
  );
}
