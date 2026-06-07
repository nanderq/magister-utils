import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

declare const Bun: {
  file(path: string): { text(): Promise<string> };
  write(path: string, data: string): Promise<number>;
  spawn(command: string[]): { exited: Promise<number> };
};

export const MAGISTER_CLIENT_ID = "M6LOAPP";
export const NATIVE_REDIRECT_URI = "m6loapp://oauth2redirect/";

export const TOKEN_KEYS = [
  "access_token",
  "refresh_token",
  "id_token",
] as const;

export type TokenKey = (typeof TOKEN_KEYS)[number];

export type Tokens = Record<TokenKey, string>;

export interface TokensFileShape extends Partial<Tokens> {
  [key: string]: unknown;
}

export interface LoginURLOptions {
  tenant?: string;
  username?: string;
  redirectUri?: string;
  clientId?: string;
  state?: string;
  nonce?: string;
}

export interface AccountPrivilege {
  Naam: string;
  AccessType: string[];
  Categorie?: string;
}

export interface AccountInfo {
  sub?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  locale?: string;
  tid?: string;
  sid?: string;
  idp?: string;
  amr?: string[];
  [key: string]: unknown;
}

export interface MagisterAccount {
  UuId?: string;
  Persoon?: {
    Id?: number;
    Roepnaam?: string;
    OfficieleVoornamen?: string;
    Voorletters?: string;
    Tussenvoegsel?: string;
    Achternaam?: string;
    OfficieleTussenvoegsels?: string;
    OfficieleAchternaam?: string;
    Geboortedatum?: string;
    ExterneId?: string;
    [key: string]: unknown;
  };
  Groep?: {
    Privileges?: AccountPrivilege[];
    [key: string]: unknown;
  }[];
  Links?: unknown[];
  [key: string]: unknown;
}

export interface GlobalAuthState {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  baseURL: string;
  name: string | null;
  accountInfo: AccountInfo;
  magisterAccount: MagisterAccount;
}

export interface Enrollment {
  id?: number;
  Id?: number;
  begin?: string;
  Begin?: string;
  einde?: string;
  Einde?: string;
  [key: string]: unknown;
}

export interface EnrollmentsResponse {
  items?: Enrollment[];
  Items?: Enrollment[];
}

export interface GradePeriod {
  Id?: number;
  Naam?: string | null;
  VolgNummer?: number;
}

export interface GradeSubject {
  Id?: number;
  Afkorting?: string | null;
  Omschrijving?: string | null;
  Volgnr?: number;
}

export interface GradeColumn {
  Id?: number;
  KolomNaam?: string | null;
  KolomNummer?: string | null;
  KolomVolgNummer?: string | null;
  KolomKop?: string | null;
  KolomOmschrijving?: string | null;
  KolomSoort?: number;
  IsHerkansingKolom?: boolean;
  IsDocentKolom?: boolean;
  HeeftOnderliggendeKolommen?: boolean;
  IsPTAKolom?: boolean;
}

export interface GradeItem {
  CijferId?: number;
  CijferStr?: string | null;
  DatumIngevoerd?: string | null;
  IsVoldoende?: boolean;
  Vak?: GradeSubject | null;
  CijferPeriode?: GradePeriod | null;
  CijferKolom?: GradeColumn | null;
  [key: string]: unknown;
}

export interface GradesResponse {
  items?: GradeItem[];
  Items?: GradeItem[];
}

export interface GradesOverviewResult {
  items: GradeItem[];
  schoolYearId: number;
  schoolYearEnd: string;
}

export interface ScheduleItem {
  Id?: number;
  Status?: number;
  InfoType?: number;
  Start?: string;
  Einde?: string;
  Omschrijving?: string;
  Lokatie?: string | null;
  LesuurVan?: number;
  Inhoud?: string | null;
  Opmerking?: string | null;
  Aantekening?: string | null;
  [key: string]: unknown;
}

export interface ScheduleResponse {
  items?: ScheduleItem[];
  Items?: ScheduleItem[];
}

export interface AppointmentAttachmentLink {
  Rel?: string;
  rel?: string;
  Href?: string;
  href?: string;
}

export interface AppointmentAttachment {
  Id?: number;
  Naam?: string | null;
  ContentType?: string | null;
  Grootte?: number | null;
  Url?: string | null;
  Links?: AppointmentAttachmentLink[] | null;
  [key: string]: unknown;
}

export interface AppointmentDetail {
  Id?: number;
  Omschrijving?: string;
  Start?: string;
  Einde?: string;
  LesuurVan?: number;
  LesuurTotMet?: number;
  Lokatie?: string;
  Inhoud?: string | null;
  Opmerking?: string | null;
  Aantekening?: string | null;
  Docenten?: { Naam?: string }[] | null;
  Lokalen?: { Naam?: string }[] | null;
  Vakken?: { Naam?: string }[] | null;
  Bijlagen?: AppointmentAttachment[] | null;
  [key: string]: unknown;
}

export interface AssignmentAttachment {
  Id?: number;
  Naam?: string;
  ContentType?: string;
  Grootte?: number;
  Links?: AppointmentAttachmentLink[];
  [key: string]: unknown;
}

export interface AssignmentItem {
  Id?: number;
  Titel?: string | null;
  InleverenVoor?: string | null;
  IngeleverdOp?: string | null;
  Afgesloten?: boolean;
  MagInleveren?: boolean;
  [key: string]: unknown;
}

export interface AssignmentDetail extends AssignmentItem {
  Omschrijving?: string | null;
  Bijlagen?: AssignmentAttachment[];
}

export interface AssignmentsResponse {
  Items?: AssignmentItem[];
  items?: AssignmentItem[];
}

export interface StudyGuidePart {
  Id?: number;
  Titel?: string;
  Omschrijving?: string;
  Volgnummer?: number;
  [key: string]: unknown;
}

export interface StudyGuideDetail {
  Id?: number;
  Van?: string;
  TotEnMet?: string;
  Titel?: string;
  Onderdelen?: {
    Items?: StudyGuidePart[];
    items?: StudyGuidePart[];
  };
  [key: string]: unknown;
}

export interface StudyGuideItem {
  Id?: number;
  Van?: string;
  TotEnMet?: string;
  Titel?: string;
  InLeerlingArchief?: boolean;
  [key: string]: unknown;
}

export interface StudyGuidesResponse {
  items?: StudyGuideItem[];
  Items?: StudyGuideItem[];
}

export interface StudyGuideFile {
  id: string;
  fileId?: number;
  name: string;
  href?: string;
  size?: number;
  contentType?: string;
}

export interface MessageSender {
  naam?: string;
}

export interface MessageRecipient {
  weergavenaam?: string;
  [key: string]: unknown;
}

export interface MessageItem {
  id?: number;
  onderwerp?: string;
  afzender?: MessageSender;
  heeftPrioriteit?: boolean;
  verzondenOp?: string;
  [key: string]: unknown;
}

export interface MessagesResponse {
  items?: MessageItem[];
  Items?: MessageItem[];
}

export interface MessageDetail extends MessageItem {
  inhoud?: string;
  ontvangers?: MessageRecipient[];
  kopieOntvangers?: MessageRecipient[];
  heeftBijlagen?: boolean;
}

export interface MessageAttachment {
  id?: number;
  naam?: string;
  contentType?: string;
  grootte?: number;
  status?: string;
  links?: {
    download?: { href?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AttachmentsResponse {
  items?: MessageAttachment[];
  Items?: MessageAttachment[];
}

export interface Contact {
  id: number;
  naam?: string;
  weergavenaam?: string;
  displayName?: string;
  volledigeNaam?: string;
  volledigeNaamMetVoorletters?: string;
  roepnaam?: string;
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  [key: string]: unknown;
}

export interface ContactsResponse {
  items?: Contact[];
  Items?: Contact[];
}

export interface UploadedAttachment {
  id: number;
  naam: string;
  [key: string]: unknown;
}

export interface MessageRecipientRef {
  id: number;
  type: "persoon";
}

export interface MessageAttachmentRef {
  id: number;
  type: "upload";
}

export interface SendMessagePayload {
  ontvangers: MessageRecipientRef[];
  kopieOntvangers?: MessageRecipientRef[];
  blindeKopieOntvangers?: MessageRecipientRef[];
  heeftPrioriteit?: boolean;
  inhoud: string;
  onderwerp: string;
  verzendOptie?: string;
  bijlagen?: MessageAttachmentRef[];
  [key: string]: unknown;
}

export interface MagisterClientOptions {
  tokens: Tokens;
  tokensFilePath?: string;
  autoPersistTokens?: boolean;
  onTokensChanged?: (tokens: Tokens) => Promise<void>;
}

class HttpStatusError extends Error {
  status: number;
  body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
    this.body = body;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTokens(value: unknown): value is Tokens {
  if (!isObject(value)) return false;
  return TOKEN_KEYS.every((key) => typeof value[key] === "string" && value[key]);
}

function pickString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.trim();
  return value.length > 0 ? value : undefined;
}

function pickNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  return undefined;
}

function pickInteger(input: unknown): number | undefined {
  const direct = pickNumber(input);
  if (direct != null && Number.isInteger(direct)) return direct;
  if (typeof input === "string" && /^\d+$/.test(input.trim())) {
    const parsed = Number.parseInt(input.trim(), 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return undefined;
}

function normalizeDate(input: Date | string): string {
  if (input instanceof Date) return formatDateYYYYMMDD(input);
  return input;
}

function enrollmentId(enrollment: Enrollment): number {
  return Number(enrollment.id ?? enrollment.Id ?? -1);
}

function enrollmentEnd(enrollment: Enrollment): number {
  const raw = enrollment.einde ?? enrollment.Einde;
  const ms = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(ms) ? ms : -1;
}

async function sha256Base64Url(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const raw = String.fromCharCode(...Array.from(new Uint8Array(digest)));
  return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generateRandomString(length = 50): string {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => chars[value % chars.length]).join("");
}

export function generateRandomHex(length: number): string {
  const chars = "abcdef0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => chars[value % chars.length]).join("");
}

export async function generateLoginURL(
  codeVerifier: string,
  {
    tenant,
    username,
    redirectUri = NATIVE_REDIRECT_URI,
    clientId = MAGISTER_CLIENT_ID,
    state = generateRandomString(),
    nonce = generateRandomHex(32),
  }: LoginURLOptions = {},
): Promise<string> {
  const codeChallenge = await sha256Base64Url(codeVerifier);

  let url =
    "https://accounts.magister.net/connect/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&scope=openid%20profile%20offline_access%20magister.mobile%20magister.ecs" +
    "&response_type=code%20id_token" +
    `&state=${state}` +
    `&nonce=${nonce}` +
    `&code_challenge=${codeChallenge}` +
    "&code_challenge_method=S256";

  if (tenant) {
    const host = new URL(tenant).host;
    url += `&acr_values=tenant:${host}&prompt=select_account`;
    if (username) url += `&login_hint=${encodeURIComponent(username)}`;
  }

  return url;
}

export function parseAuthResponse(url: string): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const fragment = url.split("#")[1] ?? "";
  const query = url.split("?")[1] ?? "";
  const fragmentParams = new URLSearchParams(fragment);
  const queryParams = new URLSearchParams(query);
  const get = (key: string) => fragmentParams.get(key) ?? queryParams.get(key);
  return {
    code: get("code"),
    error: get("error"),
    errorDescription: get("error_description"),
  };
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId = MAGISTER_CLIENT_ID,
): Promise<Tokens> {
  const res = await fetch("https://accounts.magister.net/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }).toString(),
  });

  const payload = (await res.json()) as Partial<Tokens> & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        `Token exchange failed (${res.status})`,
    );
  }

  if (!payload.access_token || !payload.refresh_token || !payload.id_token) {
    throw new Error("Token response missing required fields");
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    id_token: payload.id_token,
  };
}

export async function refreshTokens(
  refreshToken: string,
  clientId = MAGISTER_CLIENT_ID,
): Promise<Tokens> {
  const res = await fetch("https://accounts.magister.net/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      grant_type: "refresh_token",
    }).toString(),
  });

  const payload = (await res.json()) as Partial<Tokens> & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        `Token refresh failed (${res.status})`,
    );
  }

  if (!payload.access_token || !payload.id_token) {
    throw new Error("Token refresh response missing required fields");
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? refreshToken,
    id_token: payload.id_token,
  };
}

export function getGlobalTokensFilePath(): string {
  return join(process.env.HOME ?? ".", ".config", "magister", "tokens.json");
}

export function getDefaultTokensFilePath(): string {
  if (process.env.MAGISTER_TOKENS_FILE) return process.env.MAGISTER_TOKENS_FILE;

  const localPath = join(process.cwd(), "tokens.json");
  if (existsSync(localPath)) return localPath;

  return getGlobalTokensFilePath();
}

export async function ensureParentDir(path: string): Promise<void> {
  await Bun.spawn(["mkdir", "-p", dirname(path)]).exited;
}

export async function readTokensFile(path: string): Promise<Tokens> {
  const text = await Bun.file(path).text();
  const data = JSON.parse(text) as unknown;

  if (!isTokens(data)) {
    throw new Error(
      `Invalid token file at ${path}. Expected JSON with access_token, refresh_token and id_token.`,
    );
  }

  return data;
}

export async function writeTokensFile(
  path: string,
  tokens: Tokens,
  existingData?: TokensFileShape,
): Promise<void> {
  const base = existingData ?? (await readOptionalTokensFileShape(path));
  await ensureParentDir(path);
  await Bun.write(path, `${JSON.stringify({ ...base, ...tokens }, null, 2)}\n`);
}

async function readOptionalTokensFileShape(
  path: string,
): Promise<TokensFileShape | undefined> {
  try {
    const text = await Bun.file(path).text();
    const data = JSON.parse(text) as unknown;
    return isObject(data) ? (data as TokensFileShape) : undefined;
  } catch {
    return undefined;
  }
}

export function parseIdToken(idToken: string): AccountInfo {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return JSON.parse(atob(padded)) as AccountInfo;
}

export function resolveAccountName(
  accountInfo: AccountInfo,
  magisterAccount: MagisterAccount,
): string | null {
  const person = magisterAccount.Persoon;
  const fullName = [
    person?.Roepnaam ?? accountInfo.given_name,
    person?.Tussenvoegsel ?? accountInfo.middle_name ?? undefined,
    person?.Achternaam ?? accountInfo.family_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || accountInfo.preferred_username || null;
}

export async function getMagisterBaseUrl(accessToken: string): Promise<string> {
  const res = await fetch(
    "https://magister.net/.well-known/host-meta.json?rel=magister-api",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const body = await res.text();

  if (!res.ok) {
    throw new HttpStatusError(
      res.status,
      `Base URL request failed (${res.status})`,
      body,
    );
  }

  const data = JSON.parse(body) as { links?: { href?: string }[] };
  const href = data.links?.[0]?.href;
  if (!href) throw new Error("Could not resolve Magister base URL");

  const url = new URL(href);
  return `${url.origin}/api`;
}

export async function getMagisterAccount(
  baseUrl: string,
  accessToken: string,
): Promise<MagisterAccount> {
  const res = await fetch(`${baseUrl}/account?noCache=0`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const body = await res.text();

  if (!res.ok) {
    throw new HttpStatusError(
      res.status,
      `Account request failed (${res.status})`,
      body,
    );
  }

  return JSON.parse(body) as MagisterAccount;
}

export async function loadStoredTokens(path?: string): Promise<Tokens | null> {
  const filePath = path ?? getDefaultTokensFilePath();
  try {
    return await readTokensFile(filePath);
  } catch {
    return null;
  }
}

export async function getGlobalAuthState(path?: string): Promise<GlobalAuthState> {
  const filePath = path ?? getDefaultTokensFilePath();
  const tokens = await readTokensFile(filePath);
  return buildGlobalAuthState(tokens);
}

export async function buildGlobalAuthState(
  tokens: Tokens,
): Promise<GlobalAuthState> {
  const accountInfo = parseIdToken(tokens.id_token);
  const baseURL = await getMagisterBaseUrl(tokens.access_token);
  const magisterAccount = await getMagisterAccount(baseURL, tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    baseURL,
    name: resolveAccountName(accountInfo, magisterAccount),
    accountInfo,
    magisterAccount,
  };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToText(input?: string | null): string {
  if (!input) return "";

  const withBreaks = input
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(withBreaks).replace(/\n{3,}/g, "\n\n").trim();
}

export function readAppointmentHomework(item: AppointmentDetail): string | null {
  const raw = item.Inhoud ?? item.Opmerking ?? item.Aantekening ?? "";
  const cleaned = stripHtml(raw);
  return cleaned.length > 0 ? cleaned : null;
}

export function formatBytes(
  size?: number | null,
  unknownSizeLabel = "?",
): string {
  if (size == null || !Number.isFinite(size)) return unknownSizeLabel;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveDownloadUrl(
  baseUrl: string,
  href?: string,
): string | null {
  if (!href) return null;
  try {
    if (/^https?:\/\//i.test(href)) return href;

    const origin = new URL(baseUrl).origin;
    if (href.startsWith("/api/")) return `${origin}${href}`;
    if (href.startsWith("api/")) return `${origin}/${href}`;
    if (href.startsWith("/leerlingen/")) return `${origin}/api${href}`;
    if (href.startsWith("leerlingen/")) return `${origin}/api/${href}`;
    if (href.startsWith("/")) return `${origin}${href}`;

    return new URL(href, `${origin}/api/`).toString();
  } catch {
    return null;
  }
}

export function resolveAppointmentAttachmentDownloadUrl(
  baseUrl: string,
  attachment: AppointmentAttachment,
): string | null {
  const directUrl = attachment.Url?.trim();
  if (directUrl) return resolveDownloadUrl(baseUrl, directUrl);

  const contentLink = attachment.Links?.find((link) => {
    const rel = link.Rel ?? link.rel ?? "";
    return rel.toLowerCase() === "contents";
  });
  return resolveDownloadUrl(baseUrl, contentLink?.Href ?? contentLink?.href);
}

export function resolveAssignmentAttachmentDownloadUrl(
  baseUrl: string,
  attachment: AssignmentAttachment,
): string | null {
  const contentLink = attachment.Links?.find((link) => {
    const rel = link.Rel ?? link.rel ?? "";
    return rel.toLowerCase() === "contents";
  });
  return resolveDownloadUrl(baseUrl, contentLink?.Href ?? contentLink?.href);
}

export function buildStudyGuideAttachmentUrl(
  baseUrl: string,
  personId: string,
  studiewijzerId: string,
  onderdeelId: number,
  fileId: number,
): string | null {
  try {
    const origin = new URL(baseUrl).origin;
    return `${origin}/api/leerlingen/${personId}/studiewijzers/${studiewijzerId}/onderdelen/${onderdeelId}/bijlagen/${fileId}`;
  } catch {
    return null;
  }
}

function extractHref(item: Record<string, unknown>): string | undefined {
  const links = item.Links;
  if (Array.isArray(links)) {
    const preferredRelOrder = [
      "download",
      "content",
      "attachment",
      "file",
      "enclosure",
      "open",
      "self",
    ];
    const linkCandidates = links.reduce<{ rel?: string; href: string }[]>(
      (acc, entry) => {
        if (!entry || typeof entry !== "object") return acc;
        const link = entry as {
          Rel?: unknown;
          rel?: unknown;
          Href?: unknown;
          href?: unknown;
          Url?: unknown;
          url?: unknown;
          Uri?: unknown;
          uri?: unknown;
        };
        const href =
          pickString(link.Href) ??
          pickString(link.href) ??
          pickString(link.Url) ??
          pickString(link.url) ??
          pickString(link.Uri) ??
          pickString(link.uri);
        if (!href) return acc;
        acc.push({
          rel: pickString(link.Rel) ?? pickString(link.rel),
          href,
        });
        return acc;
      },
      [],
    );

    for (const relName of preferredRelOrder) {
      const match = linkCandidates.find(
        (candidate) => candidate.rel?.toLowerCase() === relName,
      )?.href;
      if (match) return match;
    }

    const fallback = linkCandidates.find((candidate) => Boolean(candidate.href))
      ?.href;
    if (fallback) return fallback;
  }

  const directHref =
    pickString(item.DownloadUrl) ??
    pickString(item.downloadUrl) ??
    pickString(item.BestandUrl) ??
    pickString(item.bestandUrl) ??
    pickString(item.BronUrl) ??
    pickString(item.bronUrl) ??
    pickString(item.Url) ??
    pickString(item.url) ??
    pickString(item.Uri) ??
    pickString(item.uri);
  if (directHref) return directHref;

  const objectLinks = item.links as
    | {
        download?: { href?: unknown } | string;
        content?: { href?: unknown } | string;
        self?: { href?: unknown } | string;
      }
    | undefined;
  return (
    pickString(
      typeof objectLinks?.download === "string"
        ? objectLinks.download
        : objectLinks?.download?.href,
    ) ??
    pickString(
      typeof objectLinks?.content === "string"
        ? objectLinks.content
        : objectLinks?.content?.href,
    ) ??
    pickString(
      typeof objectLinks?.self === "string"
        ? objectLinks.self
        : objectLinks?.self?.href,
    )
  );
}

export function extractStudyGuideFiles(payload: unknown): StudyGuideFile[] {
  const files: StudyGuideFile[] = [];
  const seen = new Set<string>();

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const item = node as Record<string, unknown>;
    const name =
      pickString(item.Bestandsnaam) ??
      pickString(item.bestandsnaam) ??
      pickString(item.Naam) ??
      pickString(item.naam) ??
      pickString(item.Titel) ??
      pickString(item.titel) ??
      pickString(item.FileName) ??
      pickString(item.fileName);
    const href = extractHref(item);
    const size =
      pickNumber(item.Grootte) ??
      pickNumber(item.grootte) ??
      pickNumber(item.Bestandsgrootte) ??
      pickNumber(item.bestandsgrootte) ??
      pickNumber(item.Size) ??
      pickNumber(item.size);
    const contentType =
      pickString(item.ContentType) ??
      pickString(item.contentType) ??
      pickString(item.MimeType) ??
      pickString(item.mimeType);
    const idRaw =
      pickString(item.Id) ??
      pickString(item.id) ??
      (typeof item.Id === "number" ? String(item.Id) : undefined) ??
      (typeof item.id === "number" ? String(item.id) : undefined) ??
      `${name ?? "file"}-${href ?? ""}`;
    const fileId = pickInteger(item.Id) ?? pickInteger(item.id);

    const hasFileSignal =
      Boolean(href) ||
      size != null ||
      Boolean(contentType) ||
      Boolean(name && /\.[A-Za-z0-9]{2,5}$/.test(name));

    if (hasFileSignal) {
      const uniqueKey = `${idRaw}|${name ?? ""}|${href ?? ""}`;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        files.push({
          id: idRaw,
          fileId,
          name: name ?? "",
          href,
          size,
          contentType,
        });
      }
    }

    Object.values(item).forEach(visit);
  }

  visit(payload);
  return files;
}

export class MagisterClient {
  private tokens: Tokens;
  private readonly tokensFilePath?: string;
  private readonly autoPersistTokens: boolean;
  private readonly onTokensChanged?: (tokens: Tokens) => Promise<void>;
  private baseUrlPromise: Promise<string> | null = null;
  private authStatePromise: Promise<GlobalAuthState> | null = null;

  constructor(options: MagisterClientOptions) {
    this.tokens = options.tokens;
    this.tokensFilePath = options.tokensFilePath;
    this.autoPersistTokens = options.autoPersistTokens ?? true;
    this.onTokensChanged = options.onTokensChanged;
  }

  static async fromTokensFile(path = getDefaultTokensFilePath()): Promise<MagisterClient> {
    const tokens = await readTokensFile(path);
    return new MagisterClient({ tokens, tokensFilePath: path });
  }

  getTokens(): Tokens {
    return { ...this.tokens };
  }

  async setTokens(tokens: Tokens): Promise<void> {
    this.tokens = tokens;
    this.baseUrlPromise = null;
    this.authStatePromise = null;
    await this.persistTokensIfNeeded();
    await this.onTokensChanged?.(this.getTokens());
  }

  async ensureBaseUrl(): Promise<string> {
    if (!this.baseUrlPromise) {
      this.baseUrlPromise = this.resolveBaseUrl();
    }
    return this.baseUrlPromise;
  }

  async getAuthState(): Promise<GlobalAuthState> {
    if (!this.authStatePromise) {
      this.authStatePromise = this.resolveAuthState();
    }
    return this.authStatePromise;
  }

  async getPersonId(): Promise<string> {
    const authState = await this.getAuthState();
    const personId = authState.magisterAccount.Persoon?.Id?.toString();
    if (!personId) throw new Error("Missing Persoon.Id");
    return personId;
  }

  async refreshTokens(): Promise<Tokens> {
    const nextTokens = await refreshTokens(this.tokens.refresh_token);
    await this.setTokens(nextTokens);
    return this.getTokens();
  }

  async request(
    pathOrUrl: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const url = await this.resolveUrl(pathOrUrl);
    return this.requestAbsolute(url, init);
  }

  async getAccount(): Promise<MagisterAccount> {
    const authState = await this.getAuthState();
    return authState.magisterAccount;
  }

  async getEnrollments(personId: string, begin = "1970-01-01"): Promise<Enrollment[]> {
    const query = new URLSearchParams({ begin });
    const data = await this.getJson<EnrollmentsResponse>(
      `/leerlingen/${personId}/aanmeldingen?${query.toString()}`,
    );
    return data.items ?? data.Items ?? [];
  }

  async getLatestEnrollment(personId: string): Promise<Enrollment> {
    const enrollments = (await this.getEnrollments(personId)).filter(
      (item) => enrollmentId(item) > 0,
    );
    if (enrollments.length === 0) {
      throw new Error("No school years found");
    }
    return enrollments.reduce((current, next) =>
      enrollmentEnd(next) > enrollmentEnd(current) ? next : current,
    );
  }

  async getGradesOverview(
    personId: string,
    schoolYearId: number,
    options: {
      peildatum?: string | Date;
      actievePerioden?: boolean;
      alleenBerekendeKolommen?: boolean;
      alleenPTAKolommen?: boolean;
    } = {},
  ): Promise<GradeItem[]> {
    const query = new URLSearchParams({
      actievePerioden: String(options.actievePerioden ?? false),
      alleenBerekendeKolommen: String(
        options.alleenBerekendeKolommen ?? false,
      ),
      alleenPTAKolommen: String(options.alleenPTAKolommen ?? false),
      peildatum: normalizeDate(options.peildatum ?? new Date()),
    });

    const data = await this.getJson<GradesResponse>(
      `/personen/${personId}/aanmeldingen/${schoolYearId}/cijfers/cijferoverzichtvooraanmelding?${query.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getLatestGradesOverview(
    personId: string,
    options: { onlyCalculatedColumns?: boolean } = {},
  ): Promise<GradesOverviewResult> {
    const mostRecentEnrollment = await this.getLatestEnrollment(personId);
    const schoolYearId = enrollmentId(mostRecentEnrollment);
    const schoolYearEndRaw =
      mostRecentEnrollment.einde ?? mostRecentEnrollment.Einde;
    const schoolYearEnd = schoolYearEndRaw
      ? new Date(schoolYearEndRaw).toISOString()
      : new Date().toISOString();

    const items = await this.getGradesOverview(personId, schoolYearId, {
      peildatum: schoolYearEnd,
      alleenBerekendeKolommen: options.onlyCalculatedColumns ?? false,
    });

    return {
      items,
      schoolYearId,
      schoolYearEnd,
    };
  }

  async getSchedule(
    personId: string,
    from: string | Date,
    to: string | Date,
  ): Promise<ScheduleItem[]> {
    const query = new URLSearchParams({
      van: normalizeDate(from),
      tot: normalizeDate(to),
    });
    const data = await this.getJson<ScheduleResponse>(
      `/personen/${personId}/afspraken?${query.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getAppointment(
    personId: string,
    appointmentId: string | number,
  ): Promise<AppointmentDetail> {
    return this.getJson<AppointmentDetail>(
      `/personen/${personId}/afspraken/${appointmentId}`,
    );
  }

  async getAssignments(
    personId: string,
    options: { skip?: number; top?: number } = {},
  ): Promise<AssignmentItem[]> {
    const query = new URLSearchParams({
      skip: String(options.skip ?? 0),
      top: String(options.top ?? 250),
    });
    const data = await this.getJson<AssignmentsResponse>(
      `/personen/${personId}/opdrachten?${query.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getAssignment(
    personId: string,
    assignmentId: string | number,
  ): Promise<AssignmentDetail> {
    return this.getJson<AssignmentDetail>(
      `/personen/${personId}/opdrachten/${assignmentId}`,
    );
  }

  async getStudyGuides(
    personId: string,
    peildatum: string | Date = new Date(),
  ): Promise<StudyGuideItem[]> {
    const query = new URLSearchParams({
      peildatum: normalizeDate(peildatum),
    });
    const data = await this.getJson<StudyGuidesResponse>(
      `/leerlingen/${personId}/studiewijzers?${query.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getStudyGuide(
    personId: string,
    studiewijzerId: string | number,
  ): Promise<StudyGuideDetail> {
    return this.getJson<StudyGuideDetail>(
      `/leerlingen/${personId}/studiewijzers/${studiewijzerId}`,
    );
  }

  async getStudyGuidePart(
    personId: string,
    studiewijzerId: string | number,
    onderdeelId: string | number,
    gebruikMappenStructuur = true,
  ): Promise<unknown> {
    const query = new URLSearchParams({
      gebruikMappenStructuur: String(gebruikMappenStructuur),
    });
    return this.getJson<unknown>(
      `/leerlingen/${personId}/studiewijzers/${studiewijzerId}/onderdelen/${onderdeelId}?${query.toString()}`,
    );
  }

  async getStudyGuideFiles(
    personId: string,
    studiewijzerId: string | number,
    onderdeelId: string | number,
    gebruikMappenStructuur = true,
  ): Promise<StudyGuideFile[]> {
    const payload = await this.getStudyGuidePart(
      personId,
      studiewijzerId,
      onderdeelId,
      gebruikMappenStructuur,
    );
    return extractStudyGuideFiles(payload);
  }

  async getMessages(options: { skip?: number; top?: number } = {}): Promise<MessageItem[]> {
    const query = new URLSearchParams({
      skip: String(options.skip ?? 0),
      top: String(options.top ?? 12),
    });
    const data = await this.getJson<MessagesResponse>(
      `/berichten/postvakin/berichten?${query.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getMessage(messageId: string | number): Promise<MessageDetail> {
    return this.getJson<MessageDetail>(`/berichten/berichten/${messageId}`);
  }

  async getMessageAttachments(
    messageId: string | number,
  ): Promise<MessageAttachment[]> {
    const data = await this.getJson<AttachmentsResponse>(
      `/berichten/berichten/${messageId}/bijlagen`,
    );
    return data.Items ?? data.items ?? [];
  }

  async getMessageWithAttachments(
    messageId: string | number,
  ): Promise<{
    message: MessageDetail;
    attachments: MessageAttachment[];
  }> {
    const message = await this.getMessage(messageId);
    const attachments = message.heeftBijlagen
      ? await this.getMessageAttachments(messageId)
      : [];
    return { message, attachments };
  }

  async searchContacts(
    query: string,
    options: { top?: number; type?: string } = {},
  ): Promise<Contact[]> {
    const params = new URLSearchParams({
      q: query,
      top: String(options.top ?? 250),
      type: options.type ?? "alle",
    });
    const data = await this.getJson<ContactsResponse>(
      `/contacten/personen?${params.toString()}`,
    );
    return data.Items ?? data.items ?? [];
  }

  async uploadFile(
    body: Blob | ArrayBuffer | Uint8Array,
    options: { contentType?: string } = {},
  ): Promise<UploadedAttachment> {
    const requestBody =
      body instanceof Blob
        ? body
        : new Blob(
            [body instanceof Uint8Array ? new Uint8Array(Array.from(body)) : new Uint8Array(body)],
            {
              type: options.contentType ?? "application/octet-stream",
            },
          );
    const response = await this.request("/bestanden", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": options.contentType ?? "application/octet-stream",
      },
      body: requestBody,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new HttpStatusError(
        response.status,
        `File upload failed (${response.status})`,
        text,
      );
    }

    const payload = JSON.parse(text) as UploadedAttachment | UploadedAttachment[];
    const uploaded = Array.isArray(payload) ? payload[0] : payload;
    if (!uploaded?.id) {
      throw new Error("Upload response missing attachment id");
    }
    return uploaded;
  }

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    const response = await this.request("/berichten/berichten", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kopieOntvangers: [],
        blindeKopieOntvangers: [],
        heeftPrioriteit: false,
        verzendOptie: "standaard",
        bijlagen: [],
        ...payload,
      }),
    });

    if (!(response.status === 204 || response.ok)) {
      const body = await response.text();
      throw new HttpStatusError(
        response.status,
        `Send message failed (${response.status})`,
        body,
      );
    }
  }

  private async resolveBaseUrl(): Promise<string> {
    try {
      return await getMagisterBaseUrl(this.tokens.access_token);
    } catch (error) {
      if (!(error instanceof HttpStatusError) || error.status !== 401) {
        throw error;
      }

      await this.refreshTokens();
      return getMagisterBaseUrl(this.tokens.access_token);
    }
  }

  private async resolveAuthState(): Promise<GlobalAuthState> {
    const accountInfo = parseIdToken(this.tokens.id_token);
    const baseURL = await this.ensureBaseUrl();

    try {
      const magisterAccount = await getMagisterAccount(
        baseURL,
        this.tokens.access_token,
      );
      return {
        accessToken: this.tokens.access_token,
        refreshToken: this.tokens.refresh_token,
        idToken: this.tokens.id_token,
        baseURL,
        name: resolveAccountName(accountInfo, magisterAccount),
        accountInfo,
        magisterAccount,
      };
    } catch (error) {
      if (!(error instanceof HttpStatusError) || error.status !== 401) {
        throw error;
      }

      await this.refreshTokens();
      const nextAccountInfo = parseIdToken(this.tokens.id_token);
      const magisterAccount = await getMagisterAccount(
        baseURL,
        this.tokens.access_token,
      );

      return {
        accessToken: this.tokens.access_token,
        refreshToken: this.tokens.refresh_token,
        idToken: this.tokens.id_token,
        baseURL,
        name: resolveAccountName(nextAccountInfo, magisterAccount),
        accountInfo: nextAccountInfo,
        magisterAccount,
      };
    }
  }

  private async resolveUrl(pathOrUrl: string): Promise<string> {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const baseUrl = await this.ensureBaseUrl();
    return `${baseUrl}/${pathOrUrl.replace(/^\/+/, "")}`;
  }

  private async requestAbsolute(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const firstResponse = await this.fetchWithBearer(url, this.tokens.access_token, init);
    if (firstResponse.status !== 401) {
      return firstResponse;
    }

    await this.refreshTokens();
    return this.fetchWithBearer(url, this.tokens.access_token, init);
  }

  private async fetchWithBearer(
    url: string,
    accessToken: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  }

  private async getJson<T>(pathOrUrl: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(pathOrUrl, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const body = await response.text();

    if (!response.ok) {
      throw new HttpStatusError(
        response.status,
        `Request failed (${response.status}) for ${pathOrUrl}`,
        body,
      );
    }

    return body ? (JSON.parse(body) as T) : ({} as T);
  }

  private async persistTokensIfNeeded(): Promise<void> {
    if (!this.tokensFilePath || !this.autoPersistTokens) return;
    await writeTokensFile(this.tokensFilePath, this.tokens);
  }
}
