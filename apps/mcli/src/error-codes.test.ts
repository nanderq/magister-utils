import { describe, expect, test } from "bun:test";
import { cliErrorCode } from "./index";

const tokenPath = "/home/user/.config/magister/tokens.json";

describe("CLI error codes", () => {
  test("ENOENT on the token file is TOKEN_FILE_NOT_FOUND", () => {
    const error = Object.assign(new Error(`ENOENT: no such file or directory, open '${tokenPath}'`), { code: "ENOENT", path: tokenPath });
    expect(cliErrorCode(error)).toBe("TOKEN_FILE_NOT_FOUND");
  });

  test("invalid token file asks for setup and is AUTH_ERROR", () => {
    expect(cliErrorCode(new Error("Invalid token file at /tmp/tokens.json. Run mcli setup."))).toBe("AUTH_ERROR");
  });

  test("filesystem errors that only mention the token path are UNEXPECTED_ERROR", () => {
    const cases = [
      ["EACCES", `EACCES: permission denied, open '${tokenPath}'`],
      ["EPERM", `EPERM: operation not permitted, open '${tokenPath}'`],
      ["EISDIR", `EISDIR: illegal operation on a directory, read '${tokenPath}'`],
    ] as const;
    for (const [code, message] of cases) {
      expect(cliErrorCode(Object.assign(new Error(message), { code, path: tokenPath }))).toBe("UNEXPECTED_ERROR");
    }
  });

  test("expired Magister session is AUTH_ERROR", () => {
    expect(cliErrorCode(new Error("Magister session expired. Call login() again."))).toBe("AUTH_ERROR");
  });
});
