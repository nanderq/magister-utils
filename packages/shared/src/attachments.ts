const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

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
  let url = target.url;
  let sendBearer = true;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        ...(sendBearer ? { Authorization: `Bearer ${accessToken}` } : {}),
        Accept: "*/*",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      await cancelBody(response);
      const next = nextRedirectUrl(url, response.headers.get("location"));
      if (!next || isBlockedRedirectTarget(next)) {
        throw new AttachmentDownloadError("Attachment download redirected to an unsupported URL", response.status);
      }
      if (next.origin === tenantOrigin) {
        const nextTarget = resolveAttachmentDownloadTarget(baseUrl, next.toString());
        if (!nextTarget) {
          throw new AttachmentDownloadError("Attachment download redirected to an unsupported URL", response.status);
        }
        url = nextTarget.url;
        sendBearer = true;
        continue;
      }
      url = next.toString();
      sendBearer = false;
      continue;
    }

    if (!response.ok) {
      await cancelBody(response);
      throw new AttachmentDownloadError(`Attachment download failed (${response.status})`, response.status);
    }

    const bytes = await readLimitedBytes(response, MAX_ATTACHMENT_BYTES);
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

  throw new AttachmentDownloadError("Attachment download redirected too many times");
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

async function readLimitedBytes(response: Response, limit: number): Promise<Uint8Array> {
  const declared = response.headers.get("content-length");
  if (declared != null && declared.trim() !== "") {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0 || size > limit) {
      await cancelBody(response);
      throw new AttachmentDownloadError("Attachment cannot be downloaded because it exceeds the 10 MiB size limit");
    }
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) {
      throw new AttachmentDownloadError("Attachment cannot be downloaded because it exceeds the 10 MiB size limit");
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new AttachmentDownloadError("Attachment cannot be downloaded because it exceeds the 10 MiB size limit");
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
}

async function cancelBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}
