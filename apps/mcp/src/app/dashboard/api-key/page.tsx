import { ApiKeyForm } from "@/components/api-key-form";
import { requireUser } from "@/lib/auth/session";
import { getApiKeyStatus } from "@/lib/security/api-key-repository";

export const dynamic = "force-dynamic";

export default async function ApiKeyPage() {
  const user = await requireUser();
  const key = await getApiKeyStatus(user.id);
  const endpoint = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/mcp`;
  return <><header className="page-head"><div><h1>API key</h1></div><p>One active key per account. The plaintext is only returned during creation or rotation.</p></header>
    <section className="card-grid"><article className="card"><div className={`status ${key ? "ok" : ""}`}>{key ? "Active" : "Not created"}</div><h2>{key ? `${key.prefix}…${key.lastFour}` : "Create your first key"}</h2>{key && <p className="meta">CREATED {key.createdAt.toLocaleString()}<br />LAST USED {key.lastUsedAt?.toLocaleString() ?? "NEVER"}</p>}<ApiKeyForm hasKey={Boolean(key)} /></article>
    <article className="card"><h2>For stdio-only clients</h2><div className="code">{`{\n  "command": "npx",\n  "args": [\n    "-y", "mcp-remote",\n    "${endpoint}",\n    "--header",\n    "Authorization:Bearer ${"${MAGISTER_MCP_KEY}"}"\n  ],\n  "env": {\n    "MAGISTER_MCP_KEY": "mag_mcp_…"\n  }\n}`}</div></article></section></>;
}
