import { describe, expect, test } from "bun:test";
import { commands, execute, parseCommand, readPayload } from "./commands";
import { MagisterClient } from "magister-sdk";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cases: [string, string[], string, unknown[], unknown][] = [
  ["session", [], "session", [], { baseUrl: "https://school/api", expiresAt: 1, accessToken: "secret" }],
  ["has-session", [], "hasSession", [], true],
  ["ensure-session", [], "ensureSession", [], { baseUrl: "https://school/api", expiresAt: 1 }],
  ["login", [], "login", [], { baseUrl: "https://school/api", expiresAt: 1 }],
  ["logout", [], "logout", [], undefined],
  ["account", [], "account", [], { Persoon: { Id: 42, Roepnaam: "Test" } }],
  ["enrollments", ["--begin", "2025-01-01", "--latest"], "enrollments", [42, { begin: "2025-01-01", latest: true }], { id: 5 }],
  ["schedule", ["--from", "2026-09-01", "--to", "2026-09-02"], "schedule", [42, "2026-09-01", "2026-09-02"], []],
  ["appointment", ["7", "--person-id", "9"], "appointment", [9, 7], { Id: 7 }],
  ["grades", ["--date", "2026-09-01", "--calculated-only", "--active-periods", "--pta-only"], "grades", [42, { peildatum: "2026-09-01", actievePerioden: true, alleenBerekendeKolommen: true, alleenPTAKolommen: true }], []],
  ["messages", ["--limit", "2", "--skip", "4"], "messages", [{ top: 2, skip: 4 }], []],
  ["sent-messages", ["--limit", "2", "--skip", "4"], "sentMessages", [{ top: 2, skip: 4 }], []],
  ["drafts", ["--limit", "2", "--skip", "4"], "messageDrafts", [{ top: 2, skip: 4 }], []],
  ["draft", ["28830"], "messageDraft", [28830], { id: 28830, inhoud: "<p>Body</p>" }],
  ["draft-count", [], "messageDraftCount", [], 2],
  ["delete-drafts", ["--ids", "28829, 28828"], "deleteMessageDrafts", [[28829, 28828]], undefined],
  ["message", ["7"], "message", [7], { id: 7 }],
  ["message", ["7", "--attachments"], "messageWithAttachments", [7], { message: { id: 7 }, attachments: [] }],
  ["message-attachments", ["7"], "messageAttachments", [7], []],
  ["contacts", ["--query", "Teacher", "--limit", "5", "--type", "alle"], "searchContacts", ["Teacher", { top: 5, type: "alle" }], []],
  ["assignments", ["--limit", "5", "--skip", "2"], "assignments", [42, { top: 5, skip: 2 }], []],
  ["assignment", ["7"], "assignment", [42, 7], {}],
  ["study-guides", ["--date", "2026-09-01"], "studyGuides", [42, "2026-09-01"], []],
  ["study-guide", ["7"], "studyGuide", [42, 7], {}],
  ["study-guide-part", ["7", "8", "--flat"], "studyGuidePart", [42, 7, 8, false], {}],
  ["study-guide-files", ["7", "8"], "studyGuideFiles", [42, 7, 8, true], []],
];

describe("SDK command routing", () => {
  for (const [command, args, method, expected, result] of cases) test(`${command} ${args.join(" ")}`, async () => {
    const calls: unknown[][] = [];
    const client = {
      account: async () => ({ Persoon: { Id: 42 } }),
      enrollments: async () => ({ id: 5, einde: "2027-07-31" }),
      [method]: async (...args: unknown[]) => { calls.push(args); return result; },
    } as unknown as MagisterClient;
    const output = await execute(command, args, async () => client);
    expect(calls).toEqual([expected]);
    expect(JSON.stringify(output)).not.toContain("secret");
  });
  test("raw retains fields omitted by presenters", async () => {
    const item = { id: 1, extra: "preserved" };
    const client = { messages: async () => [item] } as unknown as MagisterClient;
    expect(await execute("messages", ["--raw"], async () => client)).toMatchObject({ items: [item] });
  });
  test("sent messages include recipients and preserve complete raw fields", async () => {
    const item = { id: 7, onderwerp: "Hello", ontvangers: [{ id: 3, weergavenaam: "Ada" }], heeftBijlagen: true };
    const client = { sentMessages: async () => [item] } as unknown as MagisterClient;
    expect(await execute("sent-messages", [], async () => client)).toMatchObject({
      limit: 12, skip: 0, count: 1, items: [{ id: 7, subject: "Hello", recipients: ["Ada"] }],
    });
    expect(await execute("sent-messages", ["--raw"], async () => client)).toMatchObject({ items: [item] });
  });
  test("upload and send pass full payloads to SDK", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mcli-"));
    try {
      const file = join(dir, "file.txt");
      await Bun.write(file, "attachment contents");
      const payload = { ontvangers: [{ id: 1, type: "persoon" }], kopieOntvangers: [{ id: 2, type: "persoon" }], blindeKopieOntvangers: [], onderwerp: "Subject", inhoud: "<p>Body</p>", heeftPrioriteit: true, verzendOptie: "standaard", bijlagen: [{ id: 3, type: "upload" }] };
      const json = join(dir, "message.json");
      await Bun.write(json, JSON.stringify(payload));
      let sent: unknown;
      let drafted: unknown;
      let updated: unknown;
      const client = {
        uploadFile: async (body: Blob, options: unknown) => { expect(await body.text()).toBe("attachment contents"); expect(options).toEqual({ contentType: "text/plain" }); return { id: 3 }; },
        sendMessage: async (body: unknown) => { sent = body; },
        createMessageDraft: async (body: unknown) => { drafted = body; return { id: 28829 }; },
        updateMessageDraft: async (id: number, body: unknown) => { updated = [id, body]; },
      } as unknown as MagisterClient;
      expect(await execute("upload-file", ["--file", file, "--content-type", "text/plain"], async () => client)).toEqual({ id: 3 });
      expect(await execute("send-message", ["--payload-file", json], async () => client)).toEqual({ sent: true });
      expect(sent).toEqual(payload);
      expect(await execute("create-draft", ["--payload-file", json], async () => client)).toEqual({ id: 28829 });
      expect(drafted).toEqual(payload);
      expect(await execute("update-draft", ["28829", "--payload-file", json], async () => client)).toEqual({ id: 28829, updated: true });
      expect(updated).toEqual([28829, payload]);
      await Bun.write(json, JSON.stringify({ ...payload, ontvangers: [{ id: "oops", type: "persoon" }] }));
      expect(readPayload(json)).rejects.toThrow("Invalid ontvangers");
      const reply = { ...payload, onderwerp: "RE: Subject", verzendOptie: "beantwoord", gerelateerdBerichtId: 8426121 };
      await Bun.write(json, JSON.stringify(reply));
      expect(await readPayload(json)).toMatchObject({ verzendOptie: "beantwoord", gerelateerdBerichtId: 8426121 });
      await Bun.write(json, JSON.stringify({ ...reply, gerelateerdBerichtId: "8426121" }));
      expect(readPayload(json)).rejects.toThrow("gerelateerdBerichtId must be a positive integer");
    } finally { await rm(dir, { recursive: true }); }
  });
  test("every resource command has a routing case", () => {
    expect(Object.keys(commands).sort()).toEqual([...new Set([...cases.map(c => c[0]), "upload-file", "send-message", "create-draft", "update-draft"])].sort());
  });
});

test("invalid arguments fail before authentication", async () => {
  for (const [command, args] of [
    ["messages", ["--limit", "2oops"]], ["messages", ["--skip", "-1"]],
    ["message", ["1.2"]], ["message", ["9007199254740992"]], ["message", ["1", "2"]],
    ["schedule", ["--from", "2026-02-30", "--to", "today"]],
    ["schedule", ["--from", "2026-09-02", "--to", "2026-09-01"]],
    ["schedule", []], ["grades", ["--typo"]], ["toString", []],
  ] as [string, string[]][]) {
    expect(() => parseCommand(command, args)).toThrow();
  }
});

test("CLI emits JSON, offline discovery and errors", async () => {
  const path = join(import.meta.dir, "index.ts");
  const run = async (...args: string[]) => {
    const p = Bun.spawn([process.execPath, path, ...args], { env: { ...process.env, MAGISTER_TOKENS_FILE: "/nonexistent/mcli-test-tokens.json" }, stdout: "pipe", stderr: "pipe" });
    return { data: JSON.parse(await new Response(p.stdout).text()), exit: await p.exited };
  };
  const manifest = await run("capabilities");
  expect(manifest.exit).toBe(0);
  expect(manifest.data.data.commands.find((c: { name: string }) => c.name === "send-message").effect).toBe("remote-write");
  expect((await run("has-session")).data.data.hasSession).toBe(false);
  expect((await run("account")).data.error.code).toBe("TOKEN_FILE_NOT_FOUND");
  expect((await run("messages", "--limit", "NaN")).data.error.code).toBe("INVALID_ARGUMENT");
  expect((await run("no-such-command")).exit).toBe(1);
});
