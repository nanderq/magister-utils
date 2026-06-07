import { describe, expect, test } from "bun:test";

import { extractMagisterRedirectUrl, getRedirectParameter } from "./redirect";

describe("Magister console redirect parsing", () => {
  test("extracts a quoted redirect from surrounding console output", () => {
    const output = `Navigation failed\n'm6loapp://oauth2redirect/#code=abc&state=xyz&id_token=secret'\nmore output`;
    const url = extractMagisterRedirectUrl(output);
    expect(url).not.toBeNull();
    expect(getRedirectParameter(url!, "code")).toBe("abc");
    expect(getRedirectParameter(url!, "state")).toBe("xyz");
  });

  test("normalizes escaped ampersands", () => {
    const url = extractMagisterRedirectUrl("m6loapp://oauth2redirect/#code=abc\\u0026state=xyz");
    expect(getRedirectParameter(url!, "state")).toBe("xyz");
  });

  test("returns null when no redirect is present", () => {
    expect(extractMagisterRedirectUrl("ordinary console output")).toBeNull();
  });
});
