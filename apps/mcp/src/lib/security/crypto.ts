import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function getKey(): Buffer {
  const encoded = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptSecret(value: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(Buffer.from(userId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string, userId: string): string {
  const [version, ivValue, tagValue, ciphertextValue] = sealed.split(".");
  if (version !== VERSION || !ivValue || !tagValue || ciphertextValue == null) {
    throw new Error("Invalid encrypted value");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAAD(Buffer.from(userId, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
