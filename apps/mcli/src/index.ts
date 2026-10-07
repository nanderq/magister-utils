#!/usr/bin/env bun
import { MagisterClient, MagisterRequestError, TokenStore } from "magister-sdk";
import { commands, execute, InputError } from "./commands";
import { runSetup } from "./setup";

const AUTH_ERROR_PATTERN = /token|session|login|password|username|school url|run mcli setup|invalid token file|missing sdk account metadata/i;

export function cliErrorCode(error: unknown): string {
  if (error instanceof InputError) return error.code;
  if (error instanceof MagisterRequestError) return "HTTP_ERROR";
  if ((error as { code?: string }).code === "ENOENT") return "TOKEN_FILE_NOT_FOUND";
  const message = error instanceof Error ? error.message : String(error);
  const path = (error as { path?: unknown }).path;
  const probe = messageWithoutFilePath(message, typeof path === "string" ? path : undefined);
  return AUTH_ERROR_PATTERN.test(probe) ? "AUTH_ERROR" : "UNEXPECTED_ERROR";
}

function messageWithoutFilePath(message: string, path?: string): string {
  let text = path ? message.split(path).join(" ") : message;
  text = text.replace(/['"][^'"\n]*[\\/][^'"\n]*['"]/g, " ");
  text = text.replace(/(?:^|\s)(?:\/[^\s'"]+|~\/[^\s'"]+|[A-Za-z]:\\[^\s'"]+)/g, " ");
  text = text.replace(/[^\s'"]*tokens\.json/gi, " ");
  return text;
}

if (import.meta.main) {
  const command = process.argv[2] ?? "capabilities";
  const args = process.argv.slice(3);
  const store = new TokenStore();
  const ok = (data: unknown) => console.log(JSON.stringify({ ok: true, command, data }, null, 2));

  async function loadClient() {
    if (command === "login" && !process.env.MAGISTER_PASSWORD) {
      throw new Error("Login requires MAGISTER_TENANT, MAGISTER_USERNAME and MAGISTER_PASSWORD. Alternatively run mcli setup.");
    }
    if (["login", "ensure-session"].includes(command) && process.env.MAGISTER_PASSWORD) {
      return new MagisterClient(process.env.MAGISTER_TENANT ?? "", process.env.MAGISTER_USERNAME ?? "", process.env.MAGISTER_PASSWORD, store);
    }
    return MagisterClient.fromTokensFile(store.path);
  }

  try {
    if (["capabilities", "help", "--help"].includes(command)) {
      ok({ version: "0.1.0-alpha.2", schema_version: 2, entry_point: "mcli", tokens_file: store.path,
        output: "{ok:true,command,data} or {ok:false,command,error:{code,message,status?}}; exit 0/1. setup is interactive.",
        dates: "today/tomorrow use local system time; otherwise YYYY-MM-DD",
        commands: [
          { name: "capabilities", description: "Offline command manifest", effect: "read", flags: [], positional: [] },
          { name: "setup", description: "Interactive SDK login with hidden password entry", effect: "local-auth", flags: [], positional: [] },
          ...Object.entries(commands).map(([name, { run, flags, positional, effect, ...spec }]) => ({ name, ...spec, effect: effect ?? "read", flags: Object.entries(flags ?? {}).map(([name, flag]) => ({ name: `--${name}`, ...flag })), positional: (positional ?? []).map(name => ({ name, type: "integer", required: true })) })),
        ],
      });
    } else if (command === "setup") {
      if (args.length) throw new InputError("setup takes no arguments");
      await runSetup(store);
    } else if (command === "has-session") {
      if (args.length) throw new InputError("has-session takes no arguments");
      const client = await loadClient().catch(() => null);
      ok({ hasSession: client ? await client.hasSession() : false });
    } else if (command === "logout") {
      if (args.length) throw new InputError("logout takes no arguments");
      await store.delete();
      ok({ loggedOut: true });
    } else {
      ok(await execute(command, args, loadClient));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = cliErrorCode(error);
    console.log(JSON.stringify({ ok: false, command, error: { code, message, ...(error instanceof MagisterRequestError ? { status: error.status } : {}) } }, null, 2));
    process.exitCode = 1;
  }
}
