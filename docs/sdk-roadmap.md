# Magister SDK Roadmap

## Current repo state

The repo already has the right raw ingredients for an SDK, but they are not arranged as a publishable package yet.

- `packages/shared` contains the real Magister logic: auth, token persistence, HTTP calls, normalization helpers, and setup flow.
- `apps/mcli`, `apps/mtui`, and `apps/mcp` are consumer apps built on top of that shared code.
- `apps/sdk` is only a Bun scaffold and should not be the long-term home of an npm SDK.

The main structural issue is that the reusable code is still organized as an internal support package instead of a stable public developer product.

## Port gap audit

Comparison baseline:

- Shared implementation: [`packages/shared/src/magister.ts`](../packages/shared/src/magister.ts)
- Current SDK client: [`packages/sdk/src/client/MagisterClient.ts`](../packages/sdk/src/client/MagisterClient.ts)
- Current SDK exports: [`packages/sdk/src/index.ts`](../packages/sdk/src/index.ts)

### Already ported into `packages/sdk`

- Auth/session lifecycle: `login`, `session`, `hasSession`, `ensureSession`, `logout`
- Account: `account`, `enrollments`
- Grades: latest enrollment grade overview only
- Assignments: list + detail
- Study guides: list + detail + part + file extraction

### Missing runtime capabilities

These exist in the shared client but do not exist in the SDK client yet.

- Schedule list: `getSchedule(personId, from, to)`
- Appointment detail: `getAppointment(personId, appointmentId)`
- Messages list: `getMessages({ skip, top })`
- Message detail: `getMessage(messageId)`
- Message attachments: `getMessageAttachments(messageId)`
- Message detail convenience: `getMessageWithAttachments(messageId)`
- Contact search: `searchContacts(query, { top, type })`
- File upload: `uploadFile(body, { contentType })`
- Send message: `sendMessage(payload)`

### Missing client/session management capabilities

These are part of the shared `MagisterClient` shape and are not represented in the SDK client yet.

- Constructing a client directly from stored tokens: `MagisterClient.fromTokensFile(...)`
- Reading current tokens: `getTokens()`
- Replacing tokens: `setTokens(...)`
- Explicit token refresh: `refreshTokens()`
- Base URL resolution/cache access: `ensureBaseUrl()`
- Full auth/account state access: `getAuthState()`
- Derived person id convenience: `getPersonId()`
- Low-level authenticated request helpers: `request(...)`

### Missing public helper exports

The shared module exports a large helper surface that has not been ported or re-exposed from the SDK package.

- Auth helpers: `generateLoginURL`, `parseAuthResponse`, `exchangeCodeForTokens`, `refreshTokens`
- Token file helpers: `getGlobalTokensFilePath`, `getDefaultTokensFilePath`, `ensureParentDir`, `readTokensFile`, `writeTokensFile`, `loadStoredTokens`
- Identity helpers: `parseIdToken`, `resolveAccountName`, `getMagisterBaseUrl`, `getMagisterAccount`, `getGlobalAuthState`, `buildGlobalAuthState`
- Formatting/content helpers: `formatDateYYYYMMDD`, `decodeEntities`, `htmlToText`, `readAppointmentHomework`, `formatBytes`
- Download URL helpers: `resolveDownloadUrl`, `resolveAppointmentAttachmentDownloadUrl`, `resolveAssignmentAttachmentDownloadUrl`, `buildStudyGuideAttachmentUrl`

### Missing public types

The SDK currently exports only account, enrollment, grades, assignments, study guides, session, and tokens. The following shared types are still missing from the SDK public surface.

- `AccountInfo`
- `AccountPrivilege`
- `MagisterAccount`
- `GlobalAuthState`
- `GradePeriod`
- `GradeSubject`
- `GradesOverviewResult`
- `ScheduleItem`
- `ScheduleResponse`
- `AppointmentAttachmentLink`
- `AppointmentAttachment`
- `AppointmentDetail`
- `AssignmentsResponse`
- `StudyGuidesResponse`
- `MessageSender`
- `MessageRecipient`
- `MessageItem`
- `MessagesResponse`
- `MessageDetail`
- `MessageAttachment`
- `AttachmentsResponse`
- `Contact`
- `ContactsResponse`
- `UploadedAttachment`
- `MessageRecipientRef`
- `MessageAttachmentRef`
- `SendMessagePayload`
- `LoginURLOptions`
- `MagisterCredentials`
- `CredentialLoginOptions`
- `TokensFileShape`
- `TokenKey`
- `MagisterClientOptions`

### Behavior and API mismatches

- The shared client supports both raw grade overview by school year and convenience latest-grade access. The SDK only implements the convenience path, so callers cannot target a specific enrollment or receive `schoolYearId` and `schoolYearEnd` metadata.
- The shared client is token-first. The SDK client is credential-first. For a reusable SDK, the token-first shape is usually the cleaner base layer because it supports CLI, MCP, browser, and external app reuse without forcing a fresh login flow.
- The shared token shape uses Magister field names (`access_token`, `refresh_token`, `id_token`). The SDK token shape renames them to camelCase and adds `expiresAt`. That is not wrong, but it means the port is not yet a clean structural split of raw vs normalized auth models.
- `packages/sdk/src/types.ts` currently narrows some shared raw shapes, especially `Enrollment` and `Account.Groep.Privileges`, which makes the SDK less faithful to the real shared implementation.
- The SDK currently exports only the high-level client and a subset of types from [`packages/sdk/src/index.ts`](../packages/sdk/src/index.ts). Resource functions, auth helpers, and utilities are not organized into a stable public surface yet.

### Priority order

1. Port schedule and message resources first. They are real end-user features already present in the shared implementation and currently absent from the SDK.
2. Add token-first client construction and auth-state helpers. Without that, the SDK is harder to embed cleanly in other apps.
3. Expose helper utilities for downloads and HTML/text normalization. Those are already part of the practical developer workflow around Magister payloads.
4. Normalize the public model strategy: decide which types stay raw Magister-shaped and which become cleaned SDK-shaped, then keep that consistent across every resource.

## Recommendation

Build the SDK as a publishable package in `packages/sdk`, not `apps/sdk`.

Reasoning:

- An SDK is a library other developers install, so it belongs with reusable packages, not runnable apps.
- The current `packages/shared` code can become the internal base for the SDK or be folded into it.
- The CLI, TUI, and MCP app should all depend on the SDK package so there is one public API surface and one implementation path.

## Target architecture

Proposed dependency direction:

```text
packages/sdk         public npm package
packages/core        optional internal package for low-level Magister/auth logic

apps/mcli  --------\
apps/mtui   --------> consume packages/sdk
apps/mcp   --------/
```

Two viable shapes:

1. Minimal migration

- Rename or evolve `packages/shared` into `packages/sdk`.
- Keep one package with both auth and resource clients.
- Move presenters into clearer API modules.

2. Cleaner long-term split

- `packages/core`: raw Magister protocol/auth/session/token internals.
- `packages/sdk`: stable public API, typed resource modules, docs-first exports.

I recommend option 2 if you intend to publish and maintain this for external developers. It gives you a clean boundary between internal implementation churn and public API stability.

## Suggested package layout

```text
packages/
  core/
    package.json
    tsconfig.json
    src/
      auth/
        login.ts
        refresh.ts
        pkce.ts
        tokens.ts
      http/
        client.ts
        errors.ts
      magister/
        endpoints.ts
        tenants.ts
      storage/
        token-store.ts
        file-token-store.ts
      types/
        raw.ts
      index.ts

  sdk/
    package.json
    tsconfig.json
    README.md
    CHANGELOG.md
    src/
      client/
        MagisterClient.ts
        MagisterSession.ts
      resources/
        account.ts
        assignments.ts
        grades.ts
        messages.ts
        schedule.ts
        study-guides.ts
      models/
        account.ts
        assignment.ts
        grade.ts
        message.ts
        schedule.ts
        study-guide.ts
      auth/
        login.ts
        setup.ts
        token-store.ts
      utils/
        dates.ts
        html.ts
      errors/
        MagisterError.ts
        AuthenticationError.ts
        ValidationError.ts
      index.ts
      node.ts
```

## Suggested public API shape

Keep the default developer path short:

```ts
import { MagisterClient } from "@magister/sdk";

const client = await MagisterClient.login({
  tenant: "school.magister.net",
  username: "student@example.com",
  password: process.env.MAGISTER_PASSWORD!,
});

const account = await client.account.get();
const schedule = await client.schedule.list({
  from: "2026-09-01",
  to: "2026-09-07",
});
const grades = await client.grades.list();
```

Design goals:

- Resource-oriented modules: `client.schedule.list()`, `client.messages.get(id)`.
- Stable normalized return types for external developers.
- Raw-response access only as an explicit advanced option.
- Environment-specific entry points when needed, for example `@magister/sdk/node`.

## Module boundaries

Recommended responsibilities:

- `core`
  - Knows how Magister auth and transport work.
  - Owns refresh, token exchange, cookies, redirects, and low-level fetch behavior.
  - May expose raw data structures internally.

- `sdk`
  - Owns the API external developers actually use.
  - Exposes typed clients, models, errors, and token-store interfaces.
  - Normalizes Magister naming into predictable English developer-facing types.

- `apps/*`
  - Thin product shells.
  - No Magister protocol logic beyond app-specific orchestration.

## Naming changes I recommend

Current names are good enough internally but not ideal for a public SDK.

- `packages/shared` -> `packages/core` or `packages/sdk`
- `presenters.ts` -> split into `models/` or `serializers/`
- `magister.ts` -> split by concern instead of one large file
- `runSetup()` -> keep for CLI flows, but do not make it the primary SDK entry point

## Roadmap

### Phase 1: Define the public SDK boundary

Goal: decide what external developers should import and what remains internal.

- Freeze a first public API surface for account, schedule, grades, messages, assignments, and study guides.
- Decide package name now, for example `@magister/sdk`.
- Decide runtime support now: Node only first is the pragmatic choice.
- Define which types are public and versioned.

Deliverable:

- `packages/sdk` skeleton with documented exports.

### Phase 2: Extract internals from `packages/shared`

Goal: separate low-level implementation from public surface.

- Move auth/token/fetch internals into `packages/core` or internal folders.
- Break `packages/shared/src/magister.ts` into smaller modules by domain.
- Keep behavior identical while changing structure.

Deliverable:

- Internal modules with unchanged tests still passing.

### Phase 3: Build the SDK surface

Goal: expose easy resource modules that external developers can understand quickly.

- Create `MagisterClient`.
- Create per-domain resources: `account`, `schedule`, `grades`, `messages`, `assignments`, `studyGuides`.
- Convert presenter logic into public typed models returned by those resources.
- Add explicit SDK error classes.

Deliverable:

- Usable imports with examples in the package README.

### Phase 4: Make packaging publishable

Goal: make `npm install` actually work cleanly.

- Add proper `name`, `version`, `exports`, `types`, and build outputs.
- Emit `dist/` JavaScript and declaration files.
- Support ESM cleanly; add CJS only if there is a real compatibility need.
- Ensure no Bun-only runtime assumptions leak into the published package unless Bun is a hard requirement.

Deliverable:

- A package that can be installed from npm and imported in a normal Node TypeScript project.

### Phase 5: Migrate internal consumers

Goal: make the monorepo prove the SDK design.

- Update `apps/mcli` to consume `@magister/sdk`.
- Update `apps/mtui` to consume `@magister/sdk`.
- Update `apps/mcp` to consume `@magister/sdk` where possible.
- Remove duplicated normalization logic from app layers.

Deliverable:

- Internal apps act as real integration tests for the SDK.

### Phase 6: Stabilize and publish

Goal: reduce breaking changes before external adoption.

- Add integration tests around the public API.
- Write migration notes.
- Tag `0.x` releases until the API is stable enough for `1.0.0`.
- Document auth caveats, token security, and unsupported Magister edge cases.

Deliverable:

- First public prerelease.

## File layout for the apps after migration

After the SDK exists, the apps can simplify to this shape:

```text
apps/
  mcli/
    src/
      commands/
        account.ts
        assignments.ts
        grades.ts
        messages.ts
        schedule.ts
        study-guides.ts
      output/
        json.ts
      index.ts

  mtui/
    src/
      tui/
        components/
        hooks/
        views/
      index.tsx

  mcp/
    src/
      lib/
        auth/
        db/
        mcp/
      app/
```

The rule should be:

- SDK owns Magister business logic.
- Apps own UX, command parsing, persistence choices, and app-specific orchestration.

## Packaging details to decide early

- Package name: `@magister/sdk` is stronger than `magister-sdk`.
- Runtime target: Node 20+ is a reasonable first target.
- Build tool: `tsup`, `unbuild`, or plain `tsc` are all fine; pick one and keep it boring.
- HTTP layer: prefer standard `fetch` so the SDK stays portable.
- Token persistence: expose an interface so consumers can use memory, file, database, or custom stores.

## Risks in the current codebase for SDK publishing

- `packages/shared/src/magister.ts` is currently too large and mixes multiple concerns.
- Some flows assume Bun exists via declared globals, which is risky for a published npm package.
- Current exports are internal-facing and not yet shaped as a small, opinionated public API.
- Presenter functions are useful, but they should become first-class SDK models rather than app-side helpers.

## First implementation steps I would take

1. Stop investing in `apps/sdk`; move the SDK effort to `packages/sdk`.
2. Create `packages/sdk` with `src/index.ts`, `src/client/MagisterClient.ts`, and `src/resources/*`.
3. Move current shared logic into smaller modules without changing behavior.
4. Point `apps/mcli` at the new SDK surface first because it is the simplest consumer.
5. Publish a `0.1.0-alpha` package only after the CLI is using it successfully.

## Practical conclusion

You do not need to build a brand-new system from scratch. The repo already has the hard part: working Magister logic.

The right move is to:

- treat that logic as the future SDK core,
- move the publishable package into `packages/`,
- define a narrow public API,
- and then migrate the existing apps to consume it.
