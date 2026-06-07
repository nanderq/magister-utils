import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { registerMagisterTools } from "@/lib/mcp/server";
import { authenticateApiKey } from "@/lib/security/api-key-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  (server) => registerMagisterTools(server as unknown as import("@/lib/mcp/server").ToolServer),
  { serverInfo: { name: "magister-mcp", version: "1.0.0" } },
  { basePath: "/api", maxDuration: 60, disableSse: true, verboseLogs: false },
);

const authenticatedHandler = withMcpAuth(
  mcpHandler,
  async (_request, bearerToken): Promise<AuthInfo | undefined> => {
    if (!bearerToken) return undefined;
    const identity = await authenticateApiKey(bearerToken);
    if (!identity) return undefined;
    return {
      token: bearerToken,
      clientId: identity.userId,
      scopes: ["magister:read"],
      extra: { userId: identity.userId, apiKeyPrefix: identity.prefix },
    };
  },
  { required: true, requiredScopes: ["magister:read"] },
);

function withHeaders(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response.headers.append("Vary", "Origin");
    const origin = request.headers.get("origin");
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (origin && appOrigin && origin === new URL(appOrigin).origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    return response;
  };
}

export const GET = withHeaders(authenticatedHandler);
export const POST = withHeaders(authenticatedHandler);
export const DELETE = withHeaders(authenticatedHandler);

export async function OPTIONS(request: Request) {
  return withHeaders(async () => new Response(null, { status: 204 }))(request);
}
