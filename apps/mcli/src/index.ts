#!/usr/bin/env bun
import { parseArgs } from "util";
import {
  MagisterClient,
  htmlToText,
  formatDateYYYYMMDD,
  runSetup,
  getDefaultTokensFilePath,
  presentAssignment,
  presentAssignmentDetail,
  presentGrade,
  presentMessage,
  presentMessageDetail,
  presentScheduleItem,
  presentStudyGuide,
  presentStudyGuideDetail,
} from "@magister/shared";

// ---------------------------------------------------------------------------
// Output helpers — all output goes to stdout as JSON, always
// ---------------------------------------------------------------------------

function ok(command: string, data: unknown): never {
  console.log(JSON.stringify({ ok: true, command, data }, null, 2));
  process.exit(0);
}

function fail(command: string, code: string, message: string, details?: string): never {
  console.log(
    JSON.stringify(
      { ok: false, command, error: { code, message, ...(details ? { details } : {}) } },
      null,
      2,
    ),
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Date resolution
// ---------------------------------------------------------------------------

function resolveDate(input: string, flag: string, command: string): string {
  if (input === "today") return formatDateYYYYMMDD(new Date());
  if (input === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateYYYYMMDD(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  fail(command, "INVALID_DATE", `${flag} has invalid date "${input}". Use 'today', 'tomorrow', or YYYY-MM-DD.`);
}

// ---------------------------------------------------------------------------
// Client loader
// ---------------------------------------------------------------------------

async function loadClient(command: string): Promise<MagisterClient> {
  const path = getDefaultTokensFilePath();
  try {
    return await MagisterClient.fromTokensFile(path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT") || msg.includes("No such file") || msg.includes("not found")) {
      fail(command, "TOKEN_FILE_NOT_FOUND", `tokens file not found at "${path}". Run 'mcli setup' or set MAGISTER_TOKENS_FILE.`);
    }
    if (msg.includes("token") || msg.includes("auth") || msg.includes("401")) {
      fail(command, "AUTH_ERROR", msg);
    }
    fail(command, "UNEXPECTED_ERROR", msg);
  }
}

// ---------------------------------------------------------------------------
// Command: capabilities
// ---------------------------------------------------------------------------

async function handleCapabilities(): Promise<void> {
  const tokensFile = getDefaultTokensFilePath();
  ok("capabilities", {
    version: "0.1.0-alpha.1",
    entry_point: "mcli",
    tokens_file: tokensFile,
    date_format: "Accepts: 'today', 'tomorrow', or 'YYYY-MM-DD'",
    commands: [
      {
        name: "capabilities",
        description: "Returns this capabilities manifest. Does not require authentication.",
        flags: [],
        positional: [],
        example: "mcli capabilities",
      },
      {
        name: "account",
        description: "Returns the authenticated user's account and personal info.",
        flags: [],
        positional: [],
        example: "mcli account",
      },
      {
        name: "schedule",
        description: "Returns scheduled appointments (lessons, events) in a date range.",
        flags: [
          { name: "--from", type: "date", required: true, description: "Start date. Accepts: today, tomorrow, YYYY-MM-DD." },
          { name: "--to", type: "date", required: true, description: "End date. Accepts: today, tomorrow, YYYY-MM-DD." },
        ],
        positional: [],
        example: "mcli schedule --from today --to today",
      },
      {
        name: "grades",
        description: "Returns the latest grades overview for the current school year.",
        flags: [
          { name: "--calculated-only", type: "boolean", required: false, description: "Only return calculated/aggregate grade columns." },
        ],
        positional: [],
        example: "mcli grades",
      },
      {
        name: "messages",
        description: "Returns inbox messages, newest first.",
        flags: [
          { name: "--limit", type: "integer", required: false, default: 12, description: "Maximum number of messages to return." },
          { name: "--skip", type: "integer", required: false, default: 0, description: "Number of messages to skip (for pagination)." },
        ],
        positional: [],
        example: "mcli messages --limit 20",
      },
      {
        name: "message",
        description: "Returns the full content of a single message by ID.",
        flags: [
          { name: "--attachments", type: "boolean", required: false, description: "Include attachment metadata in the response." },
        ],
        positional: [
          { name: "id", type: "integer", required: true, description: "The numeric message ID (obtained from the 'messages' command)." },
        ],
        example: "mcli message 12345",
      },
      {
        name: "assignments",
        description: "Returns a paginated list of assignments.",
        flags: [
          { name: "--limit", type: "integer", required: false, default: 50, description: "Maximum number of assignments to return." },
          { name: "--skip", type: "integer", required: false, default: 0, description: "Number of assignments to skip." },
        ],
        positional: [],
        example: "mcli assignments",
      },
      {
        name: "assignment",
        description: "Returns the full detail of a single assignment by ID.",
        flags: [],
        positional: [
          { name: "id", type: "integer", required: true, description: "The numeric assignment ID (obtained from the 'assignments' command)." },
        ],
        example: "mcli assignment 67890",
      },
      {
        name: "study-guides",
        description: "Returns all active study guides for the current enrollment.",
        flags: [],
        positional: [],
        example: "mcli study-guides",
      },
      {
        name: "study-guide",
        description: "Returns the full detail of a single study guide including its parts.",
        flags: [],
        positional: [
          { name: "id", type: "integer", required: true, description: "The numeric study guide ID (obtained from the 'study-guides' command)." },
        ],
        example: "mcli study-guide 111",
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Command: account
// ---------------------------------------------------------------------------

async function handleAccount(): Promise<void> {
  const client = await loadClient("account");
  const authState = await client.getAuthState();
  ok("account", {
    name: authState.name,
    preferred_username: authState.accountInfo.preferred_username ?? null,
    personId: authState.magisterAccount.Persoon?.Id?.toString() ?? null,
    account: authState.magisterAccount,
  });
}

// ---------------------------------------------------------------------------
// Command: schedule
// ---------------------------------------------------------------------------

async function handleSchedule(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      from: { type: "string" },
      to: { type: "string" },
    },
    strict: false,
  });

  if (typeof values.from !== "string") fail("schedule", "MISSING_REQUIRED_FLAG", "--from is required");
  if (typeof values.to !== "string") fail("schedule", "MISSING_REQUIRED_FLAG", "--to is required");

  const from = resolveDate(values.from, "--from", "schedule");
  const to = resolveDate(values.to, "--to", "schedule");

  const client = await loadClient("schedule");
  const personId = await client.getPersonId();
  const items = await client.getSchedule(personId, from, to);

  ok("schedule", {
    from,
    to,
    count: items.length,
    items: items.map(presentScheduleItem),
  });
}

// ---------------------------------------------------------------------------
// Command: grades
// ---------------------------------------------------------------------------

async function handleGrades(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      "calculated-only": { type: "boolean" },
    },
    strict: false,
  });

  const client = await loadClient("grades");
  const personId = await client.getPersonId();
  const result = await client.getLatestGradesOverview(personId, {
    onlyCalculatedColumns: values["calculated-only"] === true,
  });

  ok("grades", {
    schoolYearId: result.schoolYearId,
    schoolYearEnd: result.schoolYearEnd,
    count: result.items.length,
    items: result.items.map(presentGrade),
  });
}

// ---------------------------------------------------------------------------
// Command: messages
// ---------------------------------------------------------------------------

async function handleMessages(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      limit: { type: "string" },
      skip: { type: "string" },
    },
    strict: false,
  });

  const limit = typeof values.limit === "string" ? parseInt(values.limit, 10) : 12;
  const skip = typeof values.skip === "string" ? parseInt(values.skip, 10) : 0;

  if (isNaN(limit) || limit < 1) fail("messages", "INVALID_ID", "--limit must be a positive integer");
  if (isNaN(skip) || skip < 0) fail("messages", "INVALID_ID", "--skip must be a non-negative integer");

  const client = await loadClient("messages");
  const items = await client.getMessages({ top: limit, skip });

  ok("messages", {
    skip,
    limit,
    count: items.length,
    items: items.map(presentMessage),
  });
}

// ---------------------------------------------------------------------------
// Command: message
// ---------------------------------------------------------------------------

async function handleMessage(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(3),
    options: {
      attachments: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  const rawId = positionals[0];
  if (!rawId) fail("message", "MISSING_REQUIRED_FLAG", "a message <id> is required as a positional argument");
  const id = parseInt(rawId, 10);
  if (isNaN(id)) fail("message", "INVALID_ID", `message id must be an integer, got "${rawId}"`);

  const client = await loadClient("message");

  if (values.attachments) {
    const { message: m, attachments } = await client.getMessageWithAttachments(id);
    ok("message", {
      id: m.id ?? null,
      subject: m.onderwerp ?? null,
      sender: m.afzender?.naam ?? null,
      sentAt: m.verzondenOp ?? null,
      hasPriority: m.heeftPrioriteit ?? false,
      body: htmlToText(m.inhoud) || null,
      recipients: (m.ontvangers ?? []).map((r) => r.weergavenaam ?? null).filter(Boolean),
      hasAttachments: m.heeftBijlagen ?? false,
      attachments: attachments.map((a) => ({
        id: a.id ?? null,
        name: a.naam ?? null,
        contentType: a.contentType ?? null,
        sizeBytes: a.grootte ?? null,
        downloadUrl: a.links?.download?.href ?? null,
      })),
    });
  } else {
    const m = await client.getMessage(id);
    ok("message", {
      id: m.id ?? null,
      subject: m.onderwerp ?? null,
      sender: m.afzender?.naam ?? null,
      sentAt: m.verzondenOp ?? null,
      hasPriority: m.heeftPrioriteit ?? false,
      body: htmlToText(m.inhoud) || null,
      recipients: (m.ontvangers ?? []).map((r) => r.weergavenaam ?? null).filter(Boolean),
      hasAttachments: m.heeftBijlagen ?? false,
      attachments: [],
    });
  }
}

// ---------------------------------------------------------------------------
// Command: assignments
// ---------------------------------------------------------------------------

async function handleAssignments(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      limit: { type: "string" },
      skip: { type: "string" },
    },
    strict: false,
  });

  const limit = typeof values.limit === "string" ? parseInt(values.limit, 10) : 50;
  const skip = typeof values.skip === "string" ? parseInt(values.skip, 10) : 0;

  if (isNaN(limit) || limit < 1) fail("assignments", "INVALID_ID", "--limit must be a positive integer");
  if (isNaN(skip) || skip < 0) fail("assignments", "INVALID_ID", "--skip must be a non-negative integer");

  const client = await loadClient("assignments");
  const personId = await client.getPersonId();
  const items = await client.getAssignments(personId, { top: limit, skip });

  ok("assignments", {
    skip,
    limit,
    count: items.length,
    items: items.map((a) => ({
      id: a.Id ?? null,
      title: a.Titel ?? null,
      deadline: a.InleverenVoor ?? null,
      submittedAt: a.IngeleverdOp ?? null,
      closed: a.Afgesloten ?? false,
      canSubmit: a.MagInleveren ?? false,
    })),
  });
}

// ---------------------------------------------------------------------------
// Command: assignment
// ---------------------------------------------------------------------------

async function handleAssignment(): Promise<void> {
  const { positionals } = parseArgs({
    args: process.argv.slice(3),
    options: {},
    allowPositionals: true,
    strict: false,
  });

  const rawId = positionals[0];
  if (!rawId) fail("assignment", "MISSING_REQUIRED_FLAG", "an assignment <id> is required as a positional argument");
  const id = parseInt(rawId, 10);
  if (isNaN(id)) fail("assignment", "INVALID_ID", `assignment id must be an integer, got "${rawId}"`);

  const client = await loadClient("assignment");
  const personId = await client.getPersonId();
  const a = await client.getAssignment(personId, id);

  ok("assignment", {
    id: a.Id ?? null,
    title: a.Titel ?? null,
    deadline: a.InleverenVoor ?? null,
    submittedAt: a.IngeleverdOp ?? null,
    closed: a.Afgesloten ?? false,
    canSubmit: a.MagInleveren ?? false,
    description: htmlToText(a.Omschrijving) || null,
    attachments: (a.Bijlagen ?? []).map((b) => ({
      id: b.Id ?? null,
      name: b.Naam ?? null,
      contentType: b.ContentType ?? null,
      sizeBytes: b.Grootte ?? null,
    })),
  });
}

// ---------------------------------------------------------------------------
// Command: study-guides
// ---------------------------------------------------------------------------

async function handleStudyGuides(): Promise<void> {
  const client = await loadClient("study-guides");
  const personId = await client.getPersonId();
  const items = await client.getStudyGuides(personId);

  ok("study-guides", {
    count: items.length,
    items: items.map((s) => ({
      id: s.Id ?? null,
      title: s.Titel ?? null,
      from: s.Van ?? null,
      to: s.TotEnMet ?? null,
      archived: s.InLeerlingArchief ?? false,
    })),
  });
}

// ---------------------------------------------------------------------------
// Command: study-guide
// ---------------------------------------------------------------------------

async function handleStudyGuide(): Promise<void> {
  const { positionals } = parseArgs({
    args: process.argv.slice(3),
    options: {},
    allowPositionals: true,
    strict: false,
  });

  const rawId = positionals[0];
  if (!rawId) fail("study-guide", "MISSING_REQUIRED_FLAG", "a study-guide <id> is required as a positional argument");
  const id = parseInt(rawId, 10);
  if (isNaN(id)) fail("study-guide", "INVALID_ID", `study-guide id must be an integer, got "${rawId}"`);

  const client = await loadClient("study-guide");
  const personId = await client.getPersonId();
  const s = await client.getStudyGuide(personId, id);

  const rawParts = s.Onderdelen?.Items ?? s.Onderdelen?.items ?? [];

  ok("study-guide", {
    id: s.Id ?? null,
    title: s.Titel ?? null,
    from: s.Van ?? null,
    to: s.TotEnMet ?? null,
    parts: rawParts.map((p) => ({
      id: p.Id ?? null,
      title: p.Titel ?? null,
      description: htmlToText(p.Omschrijving) || null,
      order: p.Volgnummer ?? null,
    })),
  });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const COMMANDS: Record<string, () => Promise<void>> = {
  capabilities: handleCapabilities,
  account: handleAccount,
  schedule: handleSchedule,
  grades: handleGrades,
  messages: handleMessages,
  message: handleMessage,
  assignments: handleAssignments,
  assignment: handleAssignment,
  "study-guides": handleStudyGuides,
  "study-guide": handleStudyGuide,
};

const command = process.argv[2] ?? "";

// setup is interactive / human-facing — runs outside the JSON dispatch wrapper
if (command === "setup") {
  await runSetup();
  process.exit(process.exitCode ?? 0);
}

if (!command || !(command in COMMANDS)) {
  fail(
    command,
    "UNKNOWN_COMMAND",
    `Unknown command: "${command}". Run 'mcli capabilities' to see available commands.`,
  );
}

try {
  await COMMANDS[command]();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  const isHttp = err instanceof Error && "status" in err;
  const code = isHttp ? "HTTP_ERROR" : "UNEXPECTED_ERROR";
  const details = isHttp && "body" in err ? String((err as { body: unknown }).body) : undefined;
  fail(command, code, msg, details);
}
