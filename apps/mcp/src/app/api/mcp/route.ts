import type { AuthInfo, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { registerMagisterTools, type ToolServer } from "@/lib/mcp/server";
import { authenticateApiKey } from "@/lib/security/api-key-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// registerMagisterTools reads the tool context as { authInfo, requestInfo }. mcp-handler 2.x
// passes its own context object as the last callback argument, so map it to that shape here.
function withToolExtra(server: McpServer): ToolServer {
  return {
    registerTool: (name, config, callback) => (server.registerTool as (...args: unknown[]) => unknown)(
      name,
      config,
      (...args: unknown[]) => {
        const ctx = args[args.length - 1] as ServerContext;
        const extra = {
          authInfo: ctx.http?.authInfo,
          requestInfo: { headers: Object.fromEntries(ctx.http?.req?.headers ?? []) },
        };
        return (callback as (...cbArgs: unknown[]) => unknown)(...args.slice(0, -1), extra);
      },
    ),
  };
}

const mcpHandler = createMcpHandler(
  (server) => registerMagisterTools(withToolExtra(server)),
  { serverInfo: { name: "magister-mcp", version: "0.1.0-alpha.1" }, verboseLogs: false },
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
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, X-Time-Zone");
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
