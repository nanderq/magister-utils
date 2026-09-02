import { afterEach, describe, expect, test } from "bun:test";

import { MagisterRequestError } from "../../src/errors";
import { extractQueryParameter, getJson } from "../../src/utils/common";

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

describe("getJson", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("requests and returns authenticated JSON", async () => {
    let headers = new Headers();
    globalThis.fetch = (async (_input, init) => {
      headers = new Headers(init?.headers);
      return Response.json({ value: 42 });
    }) as typeof fetch;

    await expect(getJson<{ value: number }>("https://example.test/data", "token", "Data"))
      .resolves.toEqual({ value: 42 });
    expect(headers.get("authorization")).toBe("Bearer token");
    expect(headers.get("accept")).toBe("application/json");
  });

  test("throws a status-bearing error for failed requests", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as unknown as typeof fetch;

    try {
      await getJson("https://example.test/data", "token", "Data");
      throw new Error("Expected getJson to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(MagisterRequestError);
      expect((error as MagisterRequestError).status).toBe(401);
      expect((error as Error).message).toBe(
        "Data request failed (401) for https://example.test/data",
      );
    }
  });

  test("rejects successful primitive responses", async () => {
    globalThis.fetch = (async () => Response.json("unexpected")) as unknown as typeof fetch;

    await expect(getJson("https://example.test/data", "token", "Data"))
      .rejects.toThrow("Data response was not an object");
  });
});
