import crypto from "node:crypto";

export function generateRandomString(length = 50): string {
    const chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (value: number) => chars[value % chars.length]).join("");
  }
  
export function generateRandomHex(length: number): string {
  const chars = "abcdef0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value: number) => chars[value % chars.length]).join("");
}

export async function sha256Base64Url(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const raw = String.fromCharCode(...Array.from(new Uint8Array(digest)));
    return btoa(raw).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
