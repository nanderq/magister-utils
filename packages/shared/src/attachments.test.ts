import { afterEach, describe, expect, test } from "bun:test";

import {
  AttachmentDownloadError,
  downloadMagisterAttachment,
  resolveAttachmentDownloadTarget,
} from "./attachments.ts";
import { MagisterClient, type Tokens } from "./magister.ts";

const baseUrl = "https://school.magister.net/api";
const accessToken = "token";
const studyGuideUrl = "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99";
const messageUrl = "https://school.magister.net/api/berichten/berichten/7/bijlagen/8";

const originalFetch = globalThis.fetch;

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
    expect(requested).toBe(studyGuideUrl);
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
    expect(requests).toEqual([
      { url: messageUrl, authorization: "Bearer token" },
      { url: studyGuideUrl, authorization: "Bearer token" },
    ]);
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
    expect(requests).toEqual([
      { url: messageUrl, authorization: "Bearer token" },
      { url: "https://files.example.net/blob/plan.pdf", authorization: "" },
    ]);
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
    expect(requested).toEqual([studyGuideUrl]);

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
    expect(requested).toEqual([messageUrl]);
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
      if (url === messageUrl) {
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
