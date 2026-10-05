const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECT_BODY_BYTES = 64 * 1024;
const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 25_000;
const DOWNLOAD_TIMEOUT_MESSAGE = "Attachment download timed out before the file was received.";
const SIZE_LIMIT_MESSAGE = "Attachment cannot be downloaded because it exceeds the 10 MiB size limit";

const ATTACHMENT_DOWNLOAD_PATHS: { kind: AttachmentKind; pattern: RegExp }[] = [
  {
    kind: "message",
    pattern: /^\/api\/berichten\/berichten\/\d+\/bijlagen\/\d+(?:\/download)?\/?$/i,
  },
  {
    kind: "study_guide",
    pattern: /^\/api\/leerlingen\/\d+\/studiewijzers\/\d+\/onderdelen\/\d+\/bijlagen\/\d+(?:\/download)?\/?$/i,
  },
];

export type AttachmentKind = "message" | "study_guide";

export interface DownloadedAttachment {
  kind: AttachmentKind;
  bytes: Uint8Array;
  contentType: string;
  fileName: string | null;
}

export interface DownloadAttachmentOptions {
  fileName?: string;
  timeoutMs?: number;
}

export class AttachmentDownloadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AttachmentDownloadError";
    this.status = status;
  }
}

export function resolveAttachmentDownloadTarget(
  baseUrl: string,
  downloadUrl: string,
): { url: string; kind: AttachmentKind } | null {
  const resolved = resolveSameOriginUrl(baseUrl, downloadUrl);
  if (!resolved) return null;
  const path = resolved.pathname;
  const match = ATTACHMENT_DOWNLOAD_PATHS.find((candidate) => candidate.pattern.test(path));
  if (!match) return null;
  return { url: resolved.toString(), kind: match.kind };
}

export async function downloadMagisterAttachment(
  baseUrl: string,
  accessToken: string,
  downloadUrl: string,
  options: DownloadAttachmentOptions = {},
): Promise<DownloadedAttachment> {
  const target = resolveAttachmentDownloadTarget(baseUrl, downloadUrl);
  if (!target) {
    throw new AttachmentDownloadError(
      "Invalid attachment download URL. Pass a study-guide or message bijlage downloadUrl from get_study_guide or get_message.",
    );
  }

  const tenantOrigin = new URL(baseUrl).origin;
  const signal = AbortSignal.timeout(resolveTimeoutMs(options.timeoutMs));
  // The bijlage route proxies file bytes unless this query is set. That proxy
  // stream does not end on the Vercel runtime, so the tool sits in SSE
  // keepalives until the function is killed. Magister's own client requests
  // the JSON location instead and downloads that URL.
  let url = bijlageDownloadRequestUrl(target.url);
  let sendBearer = true;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetchWithDeadline(url, {
        redirect: "manual",
        headers: {
          ...(sendBearer ? { Authorization: `Bearer ${accessToken}` } : {}),
          Accept: sendBearer ? "application/json, text/plain, */*" : "*/*",
        },
      }, signal);

      if (response.status >= 300 && response.status < 400) {
        await cancelBody(response);
        const next = followHttpRedirect(baseUrl, url, response.headers.get("location"), tenantOrigin, response.status);
        url = next.url;
        sendBearer = next.sendBearer;
        continue;
      }

      if (!response.ok) {
        await cancelBody(response);
        throw new AttachmentDownloadError(`Attachment download failed (${response.status})`, response.status);
      }

      if (sendBearer && isJsonResponse(response)) {
        const location = await readRedirectLocation(response, signal);
        const next = followLocationBody(baseUrl, url, location, tenantOrigin);
        url = next.url;
        sendBearer = next.sendBearer;
        continue;
      }

      const bytes = await readLimitedBytes(response, MAX_ATTACHMENT_BYTES, signal);
      const contentType = mediaType(response.headers.get("content-type"));
      const fileName = filenameFromContentDisposition(response.headers.get("content-disposition"))
        ?? sanitizeFileName(options.fileName);
      return {
        kind: target.kind,
        bytes,
        contentType,
        fileName,
      };
    }
  } catch (error) {
    if (error instanceof AttachmentDownloadError) throw error;
    if (signal.aborted || isAbortError(error)) throw new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE);
    throw error;
  }

  throw new AttachmentDownloadError("Attachment download redirected too many times");
}

function resolveTimeoutMs(timeoutMs: number | undefined): number {
  if (timeoutMs == null) return DOWNLOAD_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) return DOWNLOAD_TIMEOUT_MS;
  return Math.min(Math.floor(timeoutMs), DOWNLOAD_TIMEOUT_MS);
}

function bijlageDownloadRequestUrl(url: string): string {
  const next = new URL(url);
  next.searchParams.set("redirect_type", "body");
  next.searchParams.set("display", "attachment");
  return next.toString();
}

function followHttpRedirect(
  baseUrl: string,
  currentUrl: string,
  location: string | null,
  tenantOrigin: string,
  status: number,
): { url: string; sendBearer: boolean } {
  const next = nextRedirectUrl(currentUrl, location);
  if (!next || isBlockedRedirectTarget(next)) {
    throw new AttachmentDownloadError("Attachment download redirected to an unsupported URL", status);
  }
  if (next.origin === tenantOrigin) {
    const nextTarget = resolveAttachmentDownloadTarget(baseUrl, next.toString());
    if (!nextTarget) {
      throw new AttachmentDownloadError("Attachment download redirected to an unsupported URL", status);
    }
    return { url: bijlageDownloadRequestUrl(nextTarget.url), sendBearer: true };
  }
  return { url: next.toString(), sendBearer: false };
}

function followLocationBody(
  baseUrl: string,
  currentUrl: string,
  location: string | null,
  tenantOrigin: string,
): { url: string; sendBearer: boolean } {
  if (!location) {
    throw new AttachmentDownloadError("Attachment download did not return a file");
  }
  const next = nextRedirectUrl(currentUrl, location);
  if (!next || isBlockedRedirectTarget(next)) {
    throw new AttachmentDownloadError("Attachment download redirected to an unsupported URL");
  }
  if (next.origin === tenantOrigin) {
    const nextTarget = resolveAttachmentDownloadTarget(baseUrl, next.toString());
    if (nextTarget) return { url: bijlageDownloadRequestUrl(nextTarget.url), sendBearer: true };
  }
  return { url: next.toString(), sendBearer: false };
}

function resolveSameOriginUrl(baseUrl: string, href: string): URL | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const base = new URL(baseUrl);
    const origin = base.origin;
    let resolved: URL;
    if (/^https?:\/\//i.test(trimmed)) {
      resolved = new URL(trimmed);
    } else if (trimmed.startsWith("/api/") || trimmed.startsWith("api/")) {
      resolved = new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, origin);
    } else if (trimmed.startsWith("/leerlingen/") || trimmed.startsWith("leerlingen/")) {
      const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      resolved = new URL(`/api${path}`, origin);
    } else if (trimmed.startsWith("/berichten/") || trimmed.startsWith("berichten/")) {
      const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      resolved = new URL(`/api${path}`, origin);
    } else if (trimmed.startsWith("/")) {
      resolved = new URL(trimmed, origin);
    } else {
      resolved = new URL(trimmed, `${origin}/api/`);
    }
    if (resolved.origin !== origin) return null;
    if (resolved.username || resolved.password) return null;
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return null;
    return resolved;
  } catch {
    return null;
  }
}

function nextRedirectUrl(currentUrl: string, location: string | null): URL | null {
  if (!location) return null;
  try {
    return new URL(location, currentUrl);
  } catch {
    return null;
  }
}

function isBlockedRedirectTarget(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return true;
  if (url.username || url.password) return true;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host === "0.0.0.0"
    || host === "::"
    || host === "::1"
  ) {
    return true;
  }
  if (host.includes(":")) {
    if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  }
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((part) => part > 255)) return true;
  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function mediaType(header: string | null): string {
  const value = header?.split(";")[0]?.trim().toLowerCase();
  return value && /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(value)
    ? value
    : "application/octet-stream";
}

export function sanitizeFileName(name: string | null | undefined): string | null {
  if (!name) return null;
  const base = name.replace(/\\/g, "/").split("/").pop()?.replace(/[\u0000-\u001f]/g, "").trim() ?? "";
  if (!base || base === "." || base === "..") return null;
  return base.slice(0, 255);
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    const raw = encoded[1].trim().replace(/^"|"$/g, "");
    try {
      return sanitizeFileName(decodeURIComponent(raw));
    } catch {
      return sanitizeFileName(raw);
    }
  }
  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(header);
  return sanitizeFileName(plain?.[2]);
}

function isJsonResponse(response: Response): boolean {
  const type = mediaType(response.headers.get("content-type"));
  return type === "application/json" || type.endsWith("+json");
}

async function readRedirectLocation(response: Response, signal: AbortSignal): Promise<string | null> {
  const bytes = await readLimitedBytes(
    response,
    MAX_REDIRECT_BODY_BYTES,
    signal,
    "Attachment download returned an unexpectedly large redirect response",
  );
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { location?: unknown };
    const location = typeof payload?.location === "string" ? payload.location.trim() : "";
    return location || null;
  } catch {
    return null;
  }
}

async function fetchWithDeadline(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  throwIfTimedOut(signal);
  return await new Promise((resolve, reject) => {
    const onAbort = () => reject(new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE));
    signal.addEventListener("abort", onAbort, { once: true });
    fetch(url, { ...init, signal }).then(
      (response) => {
        signal.removeEventListener("abort", onAbort);
        resolve(response);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted || isAbortError(error)) {
          reject(new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE));
          return;
        }
        reject(error);
      },
    );
  });
}

function throwIfTimedOut(signal: AbortSignal): void {
  if (signal.aborted) throw new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE);
}

function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<{ done: boolean; value?: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      void reader.cancel().catch(() => undefined);
      reject(new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve({ done: result.done, value: result.value });
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted || isAbortError(error)) {
          reject(new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE));
          return;
        }
        reject(error);
      },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

async function readLimitedBytes(
  response: Response,
  limit: number,
  signal: AbortSignal,
  limitMessage = SIZE_LIMIT_MESSAGE,
): Promise<Uint8Array> {
  throwIfTimedOut(signal);
  const declared = response.headers.get("content-length");
  if (declared != null && declared.trim() !== "") {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0 || size > limit) {
      await cancelBody(response);
      throw new AttachmentDownloadError(limitMessage);
    }
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw new AttachmentDownloadError(limitMessage);
    return bytes;
  }

  const reader = response.body.getReader();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      throwIfTimedOut(signal);
      const next = await readChunk(reader, signal);
      if (signal.aborted) throw new AttachmentDownloadError(DOWNLOAD_TIMEOUT_MESSAGE);
      if (next.done) break;
      const value = next.value;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new AttachmentDownloadError(limitMessage);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

async function cancelBody(response: Response): Promise<void> {
  const cancel = response.body?.cancel().catch(() => undefined);
  if (!cancel) return;
  await Promise.race([
    cancel,
    new Promise<void>((resolve) => setTimeout(resolve, 250)),
  ]);
}
