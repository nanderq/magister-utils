import { describe, expect, test } from "bun:test";

import { extractQueryParameter } from "../../src/utils/common";

describe("extractQueryParameter", () => {
  test("returns the matching query value", () => {
    const url = "https://accounts.magister.net/account/login?sessionId=abc&returnUrl=%2Fdone";

    expect(extractQueryParameter(url, "sessionId")).toBe("abc");
    expect(extractQueryParameter(url, "returnUrl")).toBe("/done");
  });

  test("returns null when the parameter is missing", () => {
    expect(extractQueryParameter("https://accounts.magister.net/account/login", "sessionId")).toBeNull();
  });
});
