import { parseArgs } from "node:util";
import { MagisterClient, type SendMessagePayload } from "magister-sdk";
import {
  presentAssignment, presentAssignmentDetail, presentGrade, presentMessage,
  presentMessageDetail, presentScheduleItem, presentStudyGuide, presentStudyGuideDetail,
} from "@magister/shared";

type Flag = { type: "string" | "boolean"; description: string; required?: boolean; default?: string | boolean };
type Context = { client: MagisterClient; values: Record<string, string | boolean | undefined>; ids: number[]; person: () => Promise<number> };
type Command = { description: string; flags?: Record<string, Flag>; positional?: string[]; effect?: "read" | "remote-write" | "local-auth"; run: (ctx: Context) => Promise<unknown> };
const str = (description: string, required = false): Flag => ({ type: "string", description, required });
const bool = (description: string): Flag => ({ type: "boolean", description });
const pagination = { limit: str("Positive page size (messages: 12; assignments: 50)"), skip: str("Non-negative offset; default 0") };
const personFlag = { "person-id": str("Person ID; defaults to account.Persoon.Id") };
const rawFlag = { raw: bool("Return complete SDK fields without presentation filtering") };
const dateFlag = { date: str("Reference date: today, tomorrow, or YYYY-MM-DD") };
const folderFlag = { "flat": bool("Disable folder structure (SDK useFolderStructure=false)") };

export class InputError extends Error { code = "INVALID_ARGUMENT"; }
export function integer(value: string, label: string, min = 1): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min)
    throw new InputError(`${label} must be a safe integer >= ${min}`);
  return Number(value);
}
export function date(value: string): string {
  if (value === "today" || value === "tomorrow") {
    const now = new Date();
    if (value === "tomorrow") now.setDate(now.getDate() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new InputError("Use today, tomorrow, or a valid YYYY-MM-DD date");
  return value;
}
const text = (ctx: Context, key: string) => ctx.values[key] as string | undefined;
const selected = <T>(ctx: Context, value: T, present: (value: T) => unknown) => ctx.values.raw ? value : present(value);
const list = <T>(ctx: Context, items: T[], present: (value: T) => unknown = (v) => v) => ({ count: items.length, items: items.map(v => selected(ctx, v, present)) });
const page = (ctx: Context, fallback: number) => ({ top: integer(text(ctx, "limit") ?? String(fallback), "--limit"), skip: integer(text(ctx, "skip") ?? "0", "--skip", 0) });
const sessionInfo = (s: { baseUrl: string; expiresAt: number }) => ({ authenticated: true, baseUrl: s.baseUrl, expiresAt: s.expiresAt });

export const commands: Record<string, Command> = {
  session: { description: "Validate/refresh the saved session; excludes tokens", run: async c => sessionInfo(await c.client.session()) },
  "has-session": { description: "Check for usable or refreshable saved tokens without network access", run: async c => ({ hasSession: await c.client.hasSession() }) },
  "ensure-session": { description: "Ensure a session; login fallback needs MAGISTER_TENANT, MAGISTER_USERNAME, MAGISTER_PASSWORD", effect: "local-auth", run: async c => sessionInfo(await c.client.ensureSession()) },
  login: { description: "Log in using MAGISTER_TENANT, MAGISTER_USERNAME, MAGISTER_PASSWORD and save SDK tokens", effect: "local-auth", run: async c => sessionInfo(await c.client.login()) },
  logout: { description: "Delete the selected local token store", effect: "local-auth", run: async c => { await c.client.logout(); return { loggedOut: true }; } },
  account: { description: "Account and personal information", flags: rawFlag, run: async c => {
    const account = await c.client.account();
    return selected(c, account, a => ({ name: [a.Persoon.Roepnaam, a.Persoon.Tussenvoegsel, a.Persoon.Achternaam].filter(Boolean).join(" "), personId: String(a.Persoon.Id), account: a }));
  } },
  enrollments: { description: "School enrollments; --latest selects the greatest end date", flags: { ...personFlag, begin: str("Enrollment start filter; default 1970-01-01"), latest: bool("Return only the latest enrollment") }, run: async c => c.client.enrollments(await c.person(), { begin: text(c, "begin"), latest: c.values.latest === true }) },
  schedule: { description: "Lessons/events for a date range", flags: { ...personFlag, ...rawFlag, from: str("Start date", true), to: str("End date", true) }, run: async c => ({ from: text(c, "from"), to: text(c, "to"), ...list(c, await c.client.schedule(await c.person(), text(c, "from")!, text(c, "to")!), presentScheduleItem) }) },
  appointment: { description: "Full appointment detail, homework and attachment metadata", positional: ["id"], flags: personFlag, run: async c => c.client.appointment(await c.person(), c.ids[0]!) },
  grades: { description: "Grades for the latest enrollment", flags: { ...personFlag, ...rawFlag, ...dateFlag, "calculated-only": bool("Only aggregate columns"), "active-periods": bool("Only active periods"), "pta-only": bool("Only PTA columns") }, run: async c => {
    const person = await c.person();
    const enrollment = await c.client.enrollments(person, { latest: true });
    if (Array.isArray(enrollment)) throw new Error("Expected latest enrollment");
    return { schoolYearId: enrollment.id, schoolYearEnd: enrollment.einde, ...list(c, await c.client.grades(person, { peildatum: text(c, "date"), actievePerioden: c.values["active-periods"] === true, alleenBerekendeKolommen: c.values["calculated-only"] === true, alleenPTAKolommen: c.values["pta-only"] === true }), presentGrade) };
  } },
  messages: { description: "Inbox messages, paginated", flags: { ...pagination, ...rawFlag }, run: async c => { const p = page(c, 12); return { limit: p.top, skip: p.skip, ...list(c, await c.client.messages(p), presentMessage) }; } },
  message: { description: "Full message; optionally include attachment metadata", positional: ["id"], flags: { ...rawFlag, attachments: bool("Include attachments") }, run: async c => {
    const result = c.values.attachments ? await c.client.messageWithAttachments(c.ids[0]!) : { message: await c.client.message(c.ids[0]!), attachments: [] };
    return c.values.raw ? result : presentMessageDetail(result.message, result.attachments);
  } },
  "message-attachments": { description: "Attachment metadata and download links", positional: ["id"], run: async c => list(c, await c.client.messageAttachments(c.ids[0]!)) },
  contacts: { description: "Search recipients and obtain person IDs", flags: { query: str("Search text", true), limit: str("Maximum contacts; default 250"), type: str("SDK contact type filter; default alle") }, run: async c => list(c, await c.client.searchContacts(text(c, "query")!, { top: integer(text(c, "limit") ?? "250", "--limit"), type: text(c, "type") })) },
  "upload-file": { description: "Upload a local file; returns attachment ID for send-message", effect: "remote-write", flags: { file: str("Local file path", true), "content-type": str("MIME type override") }, run: async c => {
    const file = Bun.file(text(c, "file")!);
    if (!await file.exists()) throw new InputError("Upload file does not exist");
    return c.client.uploadFile(file, { contentType: text(c, "content-type") });
  } },
  "send-message": { description: "Send SDK SendMessagePayload JSON from a file or stdin (-)", effect: "remote-write", flags: { "payload-file": str("JSON file path, or - for stdin", true) }, run: async c => {
    const payload = await readPayload(text(c, "payload-file")!);
    await c.client.sendMessage(payload);
    return { sent: true };
  } },
  assignments: { description: "Paginated assignments", flags: { ...personFlag, ...pagination, ...rawFlag }, run: async c => { const p = page(c, 50); return { limit: p.top, skip: p.skip, ...list(c, await c.client.assignments(await c.person(), p), presentAssignment) }; } },
  assignment: { description: "Assignment detail and attachment metadata", positional: ["id"], flags: { ...personFlag, ...rawFlag }, run: async c => selected(c, await c.client.assignment(await c.person(), c.ids[0]!), presentAssignmentDetail) },
  "study-guides": { description: "Study guides active on a reference date (default today)", flags: { ...personFlag, ...rawFlag, ...dateFlag }, run: async c => list(c, await c.client.studyGuides(await c.person(), text(c, "date")), presentStudyGuide) },
  "study-guide": { description: "Study guide and its parts", positional: ["id"], flags: { ...personFlag, ...rawFlag }, run: async c => selected(c, await c.client.studyGuide(await c.person(), c.ids[0]!), presentStudyGuideDetail) },
  "study-guide-part": { description: "Full part detail, including nested folders", positional: ["guide-id", "part-id"], flags: { ...personFlag, ...folderFlag }, run: async c => c.client.studyGuidePart(await c.person(), c.ids[0]!, c.ids[1]!, !c.values.flat) },
  "study-guide-files": { description: "Extract file metadata and links from a study-guide part", positional: ["guide-id", "part-id"], flags: { ...personFlag, ...folderFlag }, run: async c => list(c, await c.client.studyGuideFiles(await c.person(), c.ids[0]!, c.ids[1]!, !c.values.flat)) },
};

export function parseCommand(command: string, args: string[]) {
  const spec = Object.hasOwn(commands, command) ? commands[command]! : undefined;
  if (!spec) throw new InputError(`Unknown command '${command}'. Run mcli capabilities.`);
  let parsed;
  try { parsed = parseArgs({ args, options: spec.flags ?? {}, strict: true, allowPositionals: true }); }
  catch (error) { throw new InputError((error as Error).message); }
  const values = parsed.values as Context["values"];
  for (const [key, flag] of Object.entries(spec.flags ?? {})) {
    if (flag.required && (values[key] === undefined || values[key] === "")) throw new InputError(`--${key} is required`);
  }
  if (parsed.positionals.length !== (spec.positional?.length ?? 0)) throw new InputError(`Expected positional arguments: ${(spec.positional ?? []).join(" ") || "none"}`);
  const ids = parsed.positionals.map((v, i) => integer(v, spec.positional![i]!));
  for (const key of ["limit", "skip", "person-id"]) if (values[key] !== undefined) integer(values[key] as string, `--${key}`, key === "skip" ? 0 : 1);
  for (const key of ["from", "to", "date", "begin"]) if (values[key] !== undefined) values[key] = date(values[key] as string);
  if (values.from && values.to && values.from > values.to) throw new InputError("--from must be on or before --to");
  return { spec, values, ids };
}

export async function execute(command: string, args: string[], load: () => Promise<MagisterClient>) {
  const { spec, values, ids } = parseCommand(command, args);
  const client = await load();
  let personId: number | undefined;
  return spec.run({ client, values, ids, person: async () => personId ??= values["person-id"] ? integer(values["person-id"] as string, "--person-id") : (await client.account()).Persoon.Id });
}

export async function readPayload(path: string): Promise<SendMessagePayload> {
  let payload;
  try { payload = JSON.parse(await (path === "-" ? Bun.stdin : Bun.file(path)).text()); }
  catch { throw new InputError("Cannot read message payload as JSON"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new InputError("Payload must be an object");
  const allowed = ["ontvangers", "kopieOntvangers", "blindeKopieOntvangers", "heeftPrioriteit", "inhoud", "onderwerp", "verzendOptie", "bijlagen"];
  if (Object.keys(payload).some(k => !allowed.includes(k))) throw new InputError("Unknown message payload field");
  for (const key of ["ontvangers", "kopieOntvangers", "blindeKopieOntvangers", "bijlagen"]) {
    const refs = payload[key];
    if (refs === undefined && key !== "ontvangers") continue;
    if (!Array.isArray(refs) || (key === "ontvangers" && !refs.length) || refs.some(r => !r || !Number.isSafeInteger(r.id) || r.id < 1 || r.type !== (key === "bijlagen" ? "upload" : "persoon"))) throw new InputError(`Invalid ${key} references`);
  }
  for (const key of ["inhoud", "onderwerp"]) if (typeof payload[key] !== "string" || !payload[key].trim()) throw new InputError(`${key} must be a non-empty string`);
  if (payload.heeftPrioriteit !== undefined && typeof payload.heeftPrioriteit !== "boolean") throw new InputError("heeftPrioriteit must be boolean");
  if (payload.verzendOptie !== undefined && typeof payload.verzendOptie !== "string") throw new InputError("verzendOptie must be a string");
  return payload;
}
