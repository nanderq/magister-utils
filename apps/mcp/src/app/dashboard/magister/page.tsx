import { MagisterConnectionForm } from "@/components/magister-connection-form";
import { requireUser } from "@/lib/auth/session";
import { getMagisterConnection } from "@/lib/magister/repository";
import { Unplug } from "lucide-react";

import { disconnectMagisterAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MagisterPage() {
  const user = await requireUser();
  const connection = await getMagisterConnection(user.id);
  return <><header className="page-head"><div><h1>Magister account</h1></div></header>
    <section className="card-grid">
      <article className="card full">
        {connection ? <><div className="status ok">Connected</div><h2>{connection.displayName ?? "Magister student"}</h2><p className="meta">PERSON {connection.personId}<br />CONNECTED {connection.connectedAt.toLocaleString()}<br />LAST VERIFIED {connection.lastVerifiedAt.toLocaleString()}</p><form action={disconnectMagisterAction}><button className="button danger" type="submit"><Unplug aria-hidden="true" />Disconnect Magister</button></form></> : <><div className="status">Not connected</div><h2>Link your student account</h2><MagisterConnectionForm /></>}
      </article>
    </section>
  </>;
}
