const REDIRECT_PATTERN = /m6loapp:\/\/oauth2redirect\/[^\s"'<>]*/gi;

function normalizeConsoleOutput(input: string): string {
  return input
    .replace(/\\u0026/gi, "&")
    .replace(/\\x26/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/\\\//g, "/");
}

export function extractMagisterRedirectUrl(consoleOutput: string): string | null {
  const normalized = normalizeConsoleOutput(consoleOutput);
  for (const match of normalized.matchAll(REDIRECT_PATTERN)) {
    const candidate = match[0].replace(/[),.;\]}]+$/, "");
    try {
      const url = new URL(candidate);
      if (url.protocol === "m6loapp:" && url.hostname === "oauth2redirect") {
        return url.toString();
      }
    } catch {
      // Continue looking for another redirect in the pasted output.
    }
  }
  return null;
}

export function getRedirectParameter(url: string, name: string): string | null {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  return fragment.get(name) ?? parsed.searchParams.get(name);
}
