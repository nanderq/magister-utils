# magister-sdk

> [!WARNING]
> This SDK is a very early work in progress. It is not published for production use, and its API, types, authentication flow, and token storage format may change without notice.

`magister-sdk` is a typed TypeScript client for Magister. It handles login, token persistence and refresh, discovers the school API, and exposes account, schedule, grade, message, assignment, and study-guide operations through one client.

The SDK is a cleaner successor to the experimental client in `@magister/shared`. It is currently developed and consumed from this monorepo.

## Requirements

- Bun 1.3.10 or later
- A Magister school account
- The tenant hostname for the school, such as `school.magister.net`

Install the monorepo dependencies from the repository root:

```bash
bun install
```

Install from npm:

```ts
import { MagisterClient } from "magister-sdk";
```

## Quick start

```ts
import { MagisterClient } from "magister-sdk";

const client = new MagisterClient(
  "school.magister.net",
  "student@example.com",
  process.env.MAGISTER_PASSWORD!,
);

const session = await client.ensureSession();
const account = await client.account();
const personId = account.Persoon.Id;

const schedule = await client.schedule(personId, "2026-09-01", "2026-09-07");
const grades = await client.grades(personId);
const messages = await client.messages({ top: 20 });

console.log({ session, schedule, grades, messages });
```

`ensureSession()` reuses or refreshes stored credentials when possible and performs a new login when no stored session exists.

## Authentication and tokens

Create a client with the tenant hostname, username, and password:

```ts
const client = new MagisterClient(tenant, username, password);
```

The default token file is `~/.config/magister/tokens.json`. Set `MAGISTER_TOKENS_FILE` to use another location. Treat this file like a password: it contains credentials that can access the Magister account.

The client automatically retries an API request once after refreshing the session when Magister returns HTTP 401.

| Method | Description |
| --- | --- |
| `login()` | Performs a fresh username/password login, stores the resulting tokens, and returns the session. |
| `session()` | Loads the stored session, refreshing expired access tokens when possible. Throws if no stored session exists. |
| `hasSession()` | Reports whether a usable or refreshable stored session exists. |
| `ensureSession()` | Reuses an existing session or logs in when none exists. |
| `logout()` | Clears the in-memory session and deletes the stored token file. |

The returned `Session` contains `accessToken`, `refreshToken`, `idToken`, `expiresAt`, and the discovered Magister `baseUrl`.

## Account and enrollments

```ts
const account = await client.account();
const personId = account.Persoon.Id;

const allEnrollments = await client.enrollments(personId);
const latestEnrollment = await client.enrollments(personId, { latest: true });
const enrollmentsSinceDate = await client.enrollments(personId, {
  begin: "2025-08-01",
});
```

| Method | Returns | Description |
| --- | --- | --- |
| `account()` | `Promise<Account>` | Returns the authenticated account and person information. |
| `enrollments(personId, options?)` | `Promise<Enrollment[]>` or `Promise<Enrollment>` | Lists enrollments. `begin` filters by start date; `latest: true` returns the enrollment with the latest end date. |

## Schedule

```ts
const appointments = await client.schedule(
  personId,
  new Date(2026, 8, 1),
  new Date(2026, 8, 7),
);

const appointment = await client.appointment(personId, appointments[0].Id!);
```

| Method | Returns | Description |
| --- | --- | --- |
| `schedule(personId, from, to)` | `Promise<ScheduleItem[]>` | Lists appointments in a date range. Dates may be `Date` objects or strings accepted by the API. |
| `appointment(personId, appointmentId)` | `Promise<AppointmentDetail>` | Returns one appointment, including available teachers, rooms, subjects, notes, and attachments. |

Invalid `Date` objects are rejected before a network request is made.

## Grades

```ts
const grades = await client.grades(personId, {
  peildatum: new Date(),
  actievePerioden: true,
  alleenBerekendeKolommen: false,
  alleenPTAKolommen: false,
});
```

`grades(personId, options?)` returns `Promise<GradeItem[]>`. The option names currently follow Magister's Dutch API:

- `peildatum`: reference date, as a string or `Date`
- `actievePerioden`: include active periods only
- `alleenBerekendeKolommen`: include calculated columns only
- `alleenPTAKolommen`: include PTA columns only

## Messages

Read inbox messages and their attachments:

```ts
const inbox = await client.messages({ skip: 0, top: 20 });
const detail = await client.message(inbox[0].id!);
const attachments = await client.messageAttachments(inbox[0].id!);

// Fetches attachments only when the message says it has attachments.
const result = await client.messageWithAttachments(inbox[0].id!);
```

| Method | Returns | Description |
| --- | --- | --- |
| `messages(options?)` | `Promise<MessageItem[]>` | Lists inbox messages. `skip` defaults to `0`; `top` defaults to `12`. |
| `message(messageId)` | `Promise<MessageDetail>` | Returns one message and its body/recipient metadata. |
| `messageAttachments(messageId)` | `Promise<MessageAttachment[]>` | Lists the attachments belonging to a message. |
| `messageWithAttachments(messageId)` | `Promise<MessageWithAttachments>` | Returns `{ message, attachments }` in one convenience call. |

### Composing messages

Search for recipients, optionally upload files, and send the message:

```ts
const [recipient] = await client.searchContacts("Ada Lovelace");

const attachment = await client.uploadFile(
  await Bun.file("./report.pdf").arrayBuffer(),
  { contentType: "application/pdf" },
);

await client.sendMessage({
  ontvangers: [{ id: recipient.id, type: "persoon" }],
  onderwerp: "Report",
  inhoud: "The report is attached.",
  bijlagen: [{ id: attachment.id, type: "upload" }],
});
```

| Method | Returns | Description |
| --- | --- | --- |
| `searchContacts(query, options?)` | `Promise<Contact[]>` | Searches contacts. `top` defaults to `250` and `type` defaults to `"alle"`. |
| `uploadFile(body, options?)` | `Promise<UploadedAttachment>` | Uploads a `Blob`, `ArrayBuffer`, or `Uint8Array`. Set `contentType` when it cannot be inferred. |
| `sendMessage(payload)` | `Promise<void>` | Sends a message. CC, BCC, priority, send mode, and attachments receive sensible defaults when omitted. |

`SendMessagePayload` requires `ontvangers`, `onderwerp`, and `inhoud`. Optional fields are `kopieOntvangers`, `blindeKopieOntvangers`, `heeftPrioriteit`, `verzendOptie`, and `bijlagen`.

Sending and uploading modify remote Magister data. The debug script deliberately does not call these methods.

## Assignments

```ts
const assignments = await client.assignments(personId, { skip: 0, top: 50 });
const assignment = await client.assignment(personId, assignments[0].Id!);
```

| Method | Returns | Description |
| --- | --- | --- |
| `assignments(personId, options?)` | `Promise<AssignmentItem[]>` | Lists assignments. `skip` defaults to `0`; `top` defaults to `250`. |
| `assignment(personId, assignmentId)` | `Promise<AssignmentDetail>` | Returns assignment details and attachment metadata. |

## Study guides

```ts
const guides = await client.studyGuides(personId);
const guide = await client.studyGuide(personId, guides[0].Id!);
const partId = guide.Onderdelen?.Items?.[0]?.Id;

if (partId) {
  const part = await client.studyGuidePart(personId, guide.Id!, partId);
  const files = await client.studyGuideFiles(personId, guide.Id!, partId);
  console.log({ part, files });
}
```

| Method | Returns | Description |
| --- | --- | --- |
| `studyGuides(personId, date?)` | `Promise<StudyGuideItem[]>` | Lists guides active on a date. The date defaults to today. |
| `studyGuide(personId, studyGuideId)` | `Promise<StudyGuideDetail>` | Returns a guide and its parts. |
| `studyGuidePart(personId, studyGuideId, partId, useFolderStructure?)` | `Promise<StudyGuidePartDetail>` | Returns the raw detail tree for a part. Folder structure defaults to enabled. |
| `studyGuideFiles(personId, studyGuideId, partId, useFolderStructure?)` | `Promise<StudyGuideFile[]>` | Extracts and deduplicates file metadata from a guide part. |

## Types and response shapes

All public result and payload types are exported from `magister-sdk`, including account, enrollment, schedule, appointment, grade, message, contact, assignment, and study-guide types. Message option types and upload body types are exported as well.

Magister response fields retain their upstream casing and Dutch names. Many fields are optional because actual payloads can differ between schools and account roles. Resource collections accept both Magister's `Items` and `items` response casing, but return plain arrays to callers.

## Errors and current limitations

- The SDK is unofficial and is not affiliated with Magister or Schoologica B.V.
- Username/password authentication may break when Magister changes its login flow.
- Accounts requiring an unsupported interactive challenge may not be able to log in.
- This alpha currently targets Bun and persists tokens with Bun's file APIs.
- API naming and response types are not stable until the first public release.
- Failed HTTP requests throw an error carrying the HTTP status internally; a stable public error export has not been finalized yet.

## Development

From `packages/sdk`:

```bash
bun test
bun run typecheck
```

For a live, non-destructive integration check, copy `.env.example` to `.env`, fill in the credentials, and run:

```bash
bun run debug
```

The live debug check reads account data, enrollments, grades, assignments, and study guides. Never commit `.env` or token files.
