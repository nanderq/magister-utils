import { beforeAll, describe, expect, test } from "bun:test";

import { decryptSecret, encryptSecret } from "./crypto";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("token encryption", () => {
  test("round-trips with user-bound authenticated data", () => {
    const sealed = encryptSecret("refresh-token", "user-1");
    expect(decryptSecret(sealed, "user-1")).toBe("refresh-token");
    expect(() => decryptSecret(sealed, "user-2")).toThrow();
  });

  test("rejects tampering", () => {
    const sealed = encryptSecret("access-token", "user-1");
    expect(() => decryptSecret(`${sealed.slice(0, -2)}aa`, "user-1")).toThrow();
  });
});
