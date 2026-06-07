import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getMagisterConnection } from "@/lib/magister/repository";
import { getApiKeyStatus } from "@/lib/security/api-key-repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [connection, key] = await Promise.all([getMagisterConnection(user.id), getApiKeyStatus(user.id)]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/mcp`;
  return <>
    <header className="page-head"><div><h1>Welcome back</h1></div></header>
    <section className="card-grid">
      <article className="card"><div className={`status ${connection ? "ok" : ""}`}>Magister {connection ? "connected" : "not connected"}</div><h2>{connection?.displayName ?? "No student account"}</h2><p>{connection ? `Person ${connection.personId}. Last verified ${connection.lastVerifiedAt.toLocaleString()}.` : "Complete the browser login flow to store encrypted Magister tokens."}</p><Link className="button secondary" href="/dashboard/magister">Manage Magister<ArrowRight aria-hidden="true" /></Link></article>
      <article className="card"><div className={`status ${key ? "ok" : ""}`}>API key {key ? "active" : "not created"}</div><h2>{key ? `${key.prefix}…${key.lastFour}` : "No client credential"}</h2><p>{key ? `Created ${key.createdAt.toLocaleString()}. Last used ${key.lastUsedAt?.toLocaleString() ?? "never"}.` : "Create a bearer key, then add it to your MCP client configuration."}</p><Link className="button secondary" href="/dashboard/api-key">Manage API key<ArrowRight aria-hidden="true" /></Link></article>
      <article className="card full"><h2>{endpoint}</h2><div className="code">{`Authorization: Bearer mag_mcp_…\nContent-Type: application/json`}</div><p>This first release supports clients that can attach custom headers. OAuth-only hosted connectors are not supported yet.</p></article>
    </section>
  </>;
}
