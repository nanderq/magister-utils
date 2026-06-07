# Magister MCP

Next.js dashboard and authenticated remote MCP server for the Magister client in this monorepo.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create Google OAuth credentials and add this callback URL: `http://localhost:3000/api/auth/callback/google`.
3. Generate `BETTER_AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`.
4. Apply the Drizzle migration with `bun run db:migrate`.
5. Start the app from the repository root with `bun run dev:mcp`.

`TOKEN_ENCRYPTION_KEY` must decode to exactly 32 bytes. Rotating it requires re-encrypting stored Magister tokens.

## Vercel

Create a Vercel project with `apps/mcp` as its Root Directory. Configure the production Google callback as `https://<domain>/api/auth/callback/google`, add every variable from `.env.example`, and set `PUPPETEER_SKIP_DOWNLOAD=true`.

Run migrations as an explicit release step. Configure a Vercel Firewall rate limit for `/api/mcp`; application authentication does not replace platform request throttling.

## MCP authentication

Clients send `Authorization: Bearer mag_mcp_...` to `/api/mcp`. OAuth-only MCP clients are not supported in this release.
