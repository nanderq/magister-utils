import { afterEach, describe, expect, test } from "bun:test";

import {
  buildStudyGuideAttachmentUrl,
  extractStudyGuideFiles,
  MagisterClient,
  resolveStudyGuideFileDownloadUrl,
} from "./magister";

describe("extractStudyGuideFiles", () => {
  test("extracts nested files and prefers Contents over Self", () => {
    const payload = {
      Id: 69587,
      Titel: "Planning & PTA",
      Links: [{ Rel: "Self", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587" }],
      Bronnen: [{
        Id: 99,
        Naam: "PTA.pdf",
        Grootte: 2048,
        ContentType: "application/pdf",
        Links: [
          { Rel: "Self", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bronnen/99" },
          { Rel: "Contents", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99" },
        ],
      }],
    };

    expect(extractStudyGuideFiles(payload)).toEqual([{
      id: "99",
      fileId: 99,
      name: "PTA.pdf",
      href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
      size: 2048,
      contentType: "application/pdf",
    }]);
  });

  test("does not treat a study-guide part with only a Self link as a file", () => {
    expect(extractStudyGuideFiles({
      Id: 69601,
      Titel: "Spreekvaardigheid Deel 1 Presentatie (PTA 654)",
      Omschrijving: "Short description",
      Links: [{ Rel: "Self", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69601" }],
    })).toEqual([]);
  });
});

describe("study-guide download URLs", () => {
  const baseUrl = "https://school.magister.net/api";

  test("builds the Magister bijlagen URL", () => {
    expect(buildStudyGuideAttachmentUrl(baseUrl, "42", 13494, 69587, 99))
      .toBe("https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99");
  });

  test("resolves relative hrefs and falls back to the bijlagen URL", () => {
    expect(resolveStudyGuideFileDownloadUrl(baseUrl, "42", 13494, 69587, {
      id: "99",
      fileId: 99,
      name: "PTA.pdf",
      href: "/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
    })).toBe("https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99");

    expect(resolveStudyGuideFileDownloadUrl(baseUrl, "42", 13494, 69587, {
      id: "99",
      fileId: 99,
      name: "PTA.pdf",
    })).toBe("https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99");
  });
});

describe("MagisterClient.getStudyGuideWithFiles", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches each part and resolves attachment download URLs", async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push(url);
      if (url.includes("host-meta")) {
        return Response.json({ links: [{ href: "https://school.magister.net/api" }] });
      }
      if (url.endsWith("/studiewijzers/13494")) {
        return Response.json({
          Id: 13494,
          Titel: "G EN HAVO 5",
          Onderdelen: { Items: [{ Id: 69587, Titel: "Planning & PTA" }] },
        });
      }
      if (url.includes("/onderdelen/69587")) {
        return Response.json({
          Id: 69587,
          Bronnen: [{
            Id: 99,
            Naam: "PTA.pdf",
            Grootte: 2048,
            ContentType: "application/pdf",
            Links: [
              { Rel: "Self", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bronnen/99" },
              { Rel: "Contents", Href: "/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99" },
            ],
          }],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    const client = new MagisterClient({
      tokens: { access_token: "access", refresh_token: "refresh", id_token: "id" },
      autoPersistTokens: false,
    });

    const result = await client.getStudyGuideWithFiles("42", 13494);

    expect(result.guide.Id).toBe(13494);
    expect(result.parts[0]?.files).toEqual([{
      id: "99",
      fileId: 99,
      name: "PTA.pdf",
      href: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
      size: 2048,
      contentType: "application/pdf",
    }]);
    expect(requests.some((url) => url.includes("/onderdelen/69587?gebruikMappenStructuur=true"))).toBe(true);
  });
});
