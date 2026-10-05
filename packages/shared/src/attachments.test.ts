import { afterEach, describe, expect, test } from "bun:test";

import {
  AttachmentDownloadError,
  downloadMagisterAttachment,
  resolveAttachmentDownloadTarget,
} from "./attachments.ts";
import { MagisterClient, type Tokens } from "./magister.ts";

const DOWNLOAD_TIMEOUT_PATTERN = /Attachment download timed out before the file was received/;
const baseUrl = "https://school.magister.net/api";
const accessToken = "token";
const studyGuideUrl = "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99";
const messageUrl = "https://school.magister.net/api/berichten/berichten/7/bijlagen/8";

const originalFetch = globalThis.fetch;

function expectBijlageRequest(actual: string, expected: string) {
  const actualUrl = new URL(actual);
  const expectedUrl = new URL(expected);
  expect(actualUrl.origin).toBe(expectedUrl.origin);
  expect(actualUrl.pathname).toBe(expectedUrl.pathname);
  expect(actualUrl.searchParams.get("redirect_type")).toBe("body");
  expect(actualUrl.searchParams.get("display")).toBe("attachment");
  for (const [key, value] of expectedUrl.searchParams) {
    expect(actualUrl.searchParams.get(key)).toBe(value);
  }
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("resolveAttachmentDownloadTarget", () => {
  test("accepts study-guide and message bijlage URLs on the tenant origin", () => {
    expect(resolveAttachmentDownloadTarget(baseUrl, studyGuideUrl)).toEqual({
      url: studyGuideUrl,
      kind: "study_guide",
    });
    expect(resolveAttachmentDownloadTarget(baseUrl, "/api/berichten/berichten/7/bijlagen/8")).toEqual({
      url: messageUrl,
      kind: "message",
    });
    expect(resolveAttachmentDownloadTarget(
      baseUrl,
      "/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
    )?.kind).toBe("study_guide");
    expect(resolveAttachmentDownloadTarget(baseUrl, `${messageUrl}?nocache=1`)?.url).toBe(`${messageUrl}?nocache=1`);
  });

  test("rejects other origins and non-bijlage paths", () => {
    expect(resolveAttachmentDownloadTarget(
      baseUrl,
      "https://files.example.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
    )).toBeNull();
    expect(resolveAttachmentDownloadTarget(baseUrl, "https://school.magister.net/api/account")).toBeNull();
    expect(resolveAttachmentDownloadTarget(
      baseUrl,
      "https://school.magister.net/api/personen/42/opdrachten/bijlagen/Contents/9",
    )).toBeNull();
    expect(resolveAttachmentDownloadTarget(baseUrl, "https://user:pass@school.magister.net/api/berichten/berichten/7/bijlagen/8")).toBeNull();
  });
});

describe("downloadMagisterAttachment", () => {
  test("downloads a study-guide bijlage with the session bearer token", async () => {
    let authorization = "";
    let requested = "";
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requested = input instanceof Request ? input.url : input.toString();
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf; charset=binary",
          "Content-Disposition": "attachment; filename=\"PTA.pdf\"",
        },
      });
    }) as typeof fetch;

    const file = await downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl);
    expectBijlageRequest(requested, studyGuideUrl);
    expect(authorization).toBe("Bearer token");
    expect(file.kind).toBe("study_guide");
    expect(file.contentType).toBe("application/pdf");
    expect(file.fileName).toBe("PTA.pdf");
    expect(file.bytes).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  test("uses a decoded content-disposition name and falls back to the caller hint", async () => {
    globalThis.fetch = (async (_input: string | URL | Request) => new Response(Uint8Array.from([9]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename*=UTF-8''week%20plan.pdf",
      },
    })) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, messageUrl)).resolves.toMatchObject({
      kind: "message",
      fileName: "week plan.pdf",
    });

    globalThis.fetch = (async (_input: string | URL | Request) => new Response(Uint8Array.from([9]), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, messageUrl, { fileName: "../notes.txt" }))
      .resolves.toMatchObject({ fileName: "notes.txt" });
  });

  test("keeps the bearer token when a bijlage URL redirects to another bijlage on the same tenant", async () => {
    const requests: { url: string; authorization: string }[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push({ url, authorization: new Headers(init?.headers).get("authorization") ?? "" });
      if (requests.length === 1) {
        return new Response(null, { status: 302, headers: { Location: studyGuideUrl } });
      }
      return new Response(Uint8Array.from([6]), { status: 200, headers: { "Content-Type": "application/pdf" } });
    }) as typeof fetch;

    const file = await downloadMagisterAttachment(baseUrl, accessToken, messageUrl);
    expect(file.kind).toBe("message");
    expect(file.bytes).toEqual(new Uint8Array([6]));
    expect(requests).toHaveLength(2);
    expectBijlageRequest(requests[0].url, messageUrl);
    expect(requests[0].authorization).toBe("Bearer token");
    expectBijlageRequest(requests[1].url, studyGuideUrl);
    expect(requests[1].authorization).toBe("Bearer token");
  });

  test("follows a public redirect without sending the Magister bearer token", async () => {
    const requests: { url: string; authorization: string }[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push({ url, authorization: new Headers(init?.headers).get("authorization") ?? "" });
      if (requests.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { Location: "https://files.example.net/blob/plan.pdf" },
        });
      }
      return new Response(Uint8Array.from([5]), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    }) as typeof fetch;

    const file = await downloadMagisterAttachment(baseUrl, accessToken, messageUrl);
    expect(file.bytes).toEqual(new Uint8Array([5]));
    expect(requests).toHaveLength(2);
    expectBijlageRequest(requests[0].url, messageUrl);
    expect(requests[0].authorization).toBe("Bearer token");
    expect(requests[1]).toEqual({ url: "https://files.example.net/blob/plan.pdf", authorization: "" });
  });

  test("does not follow redirects off the bijlage API or onto local addresses", async () => {
    const requested: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested.push(input instanceof Request ? input.url : input.toString());
      return new Response(null, {
        status: 302,
        headers: { Location: "https://school.magister.net/api/account" },
      });
    }) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl)).rejects.toThrow(
      "Attachment download redirected to an unsupported URL",
    );
    expect(requested).toHaveLength(1);
    expectBijlageRequest(requested[0], studyGuideUrl);

    requested.length = 0;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested.push(input instanceof Request ? input.url : input.toString());
      return new Response(null, {
        status: 302,
        headers: { Location: "http://127.0.0.1/secret" },
      });
    }) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, messageUrl)).rejects.toThrow(
      "Attachment download redirected to an unsupported URL",
    );
    expect(requested).toHaveLength(1);
    expectBijlageRequest(requested[0], messageUrl);
  });

  test("rejects disallowed URLs before fetching and surfaces upstream status", async () => {
    globalThis.fetch = (async (_input: string | URL | Request): Promise<Response> => {
      throw new Error("fetch should not be called");
    }) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, "https://evil.example/api/account"))
      .rejects.toBeInstanceOf(AttachmentDownloadError);

    globalThis.fetch = (async (_input: string | URL | Request) => new Response("no", {
      status: 403,
      headers: { "Content-Length": "2" },
    })) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl)).rejects.toMatchObject({ status: 403 });

    globalThis.fetch = (async (_input: string | URL | Request) => new Response(new Uint8Array(8), {
      status: 200,
      headers: { "Content-Length": String(10 * 1024 * 1024 + 1) },
    })) as typeof fetch;
    await expect(downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl)).rejects.toThrow(/10 MiB/);
  });

  test("downloads the file URL from a redirect_type=body location without the session bearer", async () => {
    const requests: { url: string; authorization: string; accept: string }[] = [];
    const fileUrl = "https://files.example.net/blob/Planning-LO.pdf?sig=1";
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      const headers = new Headers(init?.headers);
      requests.push({
        url,
        authorization: headers.get("authorization") ?? "",
        accept: headers.get("accept") ?? "",
      });
      if (requests.length === 1) {
        return Response.json({ location: fileUrl });
      }
      return new Response(Uint8Array.from([4, 5, 6]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"Planning-LO.pdf\"",
        },
      });
    }) as typeof fetch;

    const file = await downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl, {
      fileName: "Planning-LO-H5-V6-26-27.pdf",
    });
    expect(file.bytes).toEqual(new Uint8Array([4, 5, 6]));
    expect(file.fileName).toBe("Planning-LO.pdf");
    expect(file.contentType).toBe("application/pdf");
    expectBijlageRequest(requests[0].url, studyGuideUrl);
    expect(requests[0].authorization).toBe("Bearer token");
    expect(requests[0].accept).toContain("application/json");
    expect(requests[1]).toEqual({ url: fileUrl, authorization: "", accept: "*/*" });
  });

  test("does not fetch a redirect location that points at a local address", async () => {
    const requested: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested.push(input instanceof Request ? input.url : input.toString());
      return Response.json({ location: "http://127.0.0.1/secret" });
    }) as typeof fetch;

    await expect(downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl)).rejects.toThrow(
      "Attachment download redirected to an unsupported URL",
    );
    expect(requested).toHaveLength(1);
  });

  test("stops a bijlage response whose body never ends", async () => {
    globalThis.fetch = (async (_input: string | URL | Request) => {
      const stream = new ReadableStream<Uint8Array>({
        start() {},
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    }) as typeof fetch;

    const started = Date.now();
    await expect(downloadMagisterAttachment(baseUrl, accessToken, studyGuideUrl, { timeoutMs: 200 }))
      .rejects.toThrow(DOWNLOAD_TIMEOUT_PATTERN);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  test("stops when the bijlage request itself never settles", async () => {
    globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) => new Promise((_resolve, reject) => {
      const fail = () => reject(Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" }));
      if (init?.signal?.aborted) {
        fail();
        return;
      }
      init?.signal?.addEventListener("abort", fail, { once: true });
    })) as typeof fetch;

    const started = Date.now();
    await expect(downloadMagisterAttachment(baseUrl, accessToken, messageUrl, { timeoutMs: 200 }))
      .rejects.toThrow(DOWNLOAD_TIMEOUT_PATTERN);
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});

describe("MagisterClient.downloadAttachment", () => {
  test("refreshes an expired session and retries the bijlage request", async () => {
    const tokens: Tokens = { access_token: "old", refresh_token: "refresh", id_token: "id" };
    const client = new MagisterClient({ tokens, autoPersistTokens: false });
    const authorizations: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.startsWith("https://magister.net/.well-known/host-meta.json")) {
        return Response.json({ links: [{ href: "https://school.magister.net/api" }] });
      }
      if (url === "https://accounts.magister.net/connect/token") {
        return Response.json({
          access_token: "new",
          refresh_token: "refresh-2",
          id_token: "id-2",
        });
      }
      if (new URL(url).pathname === new URL(messageUrl).pathname) {
        const authorization = new Headers(init?.headers).get("authorization") ?? "";
        authorizations.push(authorization);
        if (authorization === "Bearer old") return new Response(null, { status: 401 });
        return new Response(Uint8Array.from([7, 8]), {
          status: 200,
          headers: { "Content-Type": "application/pdf" },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    const file = await client.downloadAttachment("/berichten/berichten/7/bijlagen/8");
    expect(file.bytes).toEqual(new Uint8Array([7, 8]));
    expect(authorizations).toEqual(["Bearer old", "Bearer new"]);
    expect(client.getTokens().access_token).toBe("new");
  });
});
