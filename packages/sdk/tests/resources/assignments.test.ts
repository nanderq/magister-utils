import { afterEach, describe, expect, test } from "bun:test";

import { MagisterRequestError } from "../../src/errors";
import {
    getAssignment,
    getAssignments,
    getAssignmentUploadSettings,
    submitAssignment,
} from "../../src/resources/assignments";

const baseUrl = "https://school.magister.net/api";
const accessToken = "token";

interface CapturedRequest {
    url: string;
    method: string;
    headers: Headers;
    text: string | null;
    bytes: Uint8Array | null;
}

async function readBody(body: BodyInit | null | undefined): Promise<{ text: string | null; bytes: Uint8Array | null }> {
    if (body == null) return { text: null, bytes: null };
    if (typeof body === "string") return { text: body, bytes: new TextEncoder().encode(body) };
    if (body instanceof URLSearchParams) {
        const text = body.toString();
        return { text, bytes: new TextEncoder().encode(text) };
    }
    if (body instanceof Uint8Array) return { text: null, bytes: new Uint8Array(body) };
    if (body instanceof ArrayBuffer) return { text: null, bytes: new Uint8Array(body) };
    if (body instanceof Blob) return { text: null, bytes: new Uint8Array(await body.arrayBuffer()) };
    throw new Error("Unexpected request body type");
}

describe("assignments", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("returns assignment items from either response casing", async () => {
        const requests: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            requests.push(input instanceof Request ? input.url : input.toString());
            return Response.json({ Items: [{ Id: 42, Titel: "Essay" }] });
        }) as unknown as typeof fetch;

        await expect(getAssignments("https://school.magister.net/api", "token", 123, {
            skip: 5,
            top: 10,
        })).resolves.toEqual([{ Id: 42, Titel: "Essay" }]);
        expect(requests[0]).toEndWith("/personen/123/opdrachten?skip=5&top=10");
    });

    test("returns assignment details", async () => {
        globalThis.fetch = (async () => Response.json({
            Id: 42,
            Titel: "Essay",
            Omschrijving: "Write it",
        })) as unknown as typeof fetch;

        await expect(getAssignment(
            "https://school.magister.net/api",
            "token",
            123,
            42,
        )).resolves.toMatchObject({ Id: 42, Omschrijving: "Write it" });
    });

    test("returns upload quota settings", async () => {
        let authorization = "";
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            authorization = new Headers(init?.headers).get("authorization") ?? "";
            const url = input instanceof Request ? input.url : input.toString();
            expect(url).toBe(`${baseUrl}/personen/123/bestanden/uploadinstellingen`);
            return Response.json({
                MyDiskQuota: 100,
                MaxUploadFileSize: 200,
                BlacklistedExtensions: "exe,bat",
            });
        }) as typeof fetch;

        await expect(getAssignmentUploadSettings(baseUrl, accessToken, 123)).resolves.toMatchObject({
            MaxUploadFileSize: 200,
            BlacklistedExtensions: "exe,bat",
        });
        expect(authorization).toBe("Bearer token");
    });
});

describe("submitAssignment", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("uploads every file and finalizes a new submission version", async () => {
        const requests: CapturedRequest[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            const method = init?.method ?? (input instanceof Request ? input.method : "GET");
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            const body = await readBody(init?.body ?? null);
            requests.push({ url, method, headers, ...body });

            if (url.endsWith("/personen/123/opdrachten/77")) {
                return Response.json({
                    Id: 77,
                    Titel: "Lab report",
                    Vak: "SC",
                    InleverenVoor: "2026-10-09T21:30:00.0000000Z",
                    LaatsteOpdrachtVersienummer: 2,
                    Links: [{ Rel: "Self", Href: "/api/opdrachten/77", $$hashKey: "object:9" }],
                });
            }

            if (url.endsWith("/bestanden/upload")) {
                const name = JSON.parse(body.text ?? "{}").name as string;
                const storageId = name === "report.docx"
                    ? "storage-report"
                    : "storage-notes";
                return Response.json({
                    id: 10,
                    storageId,
                    uri: `https://files.example.net/blob/${storageId}?sig=secret-sas`,
                    requiredHeaders: { "x-ms-blob-type": "BlockBlob" },
                    method: "PUT",
                });
            }

            if (url.startsWith("https://files.example.net/blob/")) {
                return new Response(null, { status: 201 });
            }

            if (url.endsWith("/personen/123/opdrachten/77/versie")) {
                return Response.json({
                    Id: 501,
                    Status: 2,
                    OpdrachtId: 77,
                    LeerlingBijlagen: [],
                    VersieNummer: 3,
                }, { status: 201 });
            }

            if (url === `${baseUrl}/personen/123/opdrachten/versie/501?opdrachtId=77`) {
                const payload = JSON.parse(body.text ?? "{}");
                return Response.json({
                    ...payload,
                    Status: 6,
                    IngeleverdOp: "2026-09-26T19:03:23.0000000Z",
                    LeerlingBijlagen: payload.LeerlingBijlagen.map((attachment: { Naam: string }, index: number) => ({
                        ...attachment,
                        Id: 900 + index,
                        Grootte: 12,
                        UniqueId: "00000000-0000-0000-0000-000000000000",
                    })),
                });
            }

            throw new Error(`Unexpected request ${method} ${url}`);
        }) as typeof fetch;

        const notesFile = new Blob([Uint8Array.from([9, 8])], { type: "text/plain" });
        const submitted = await submitAssignment(baseUrl, accessToken, 123, 77, {
            note: "See the attached report.",
            files: [
                {
                    name: "report.docx",
                    body: new Uint8Array([1, 2, 3]),
                    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                },
                {
                    name: "notes.txt",
                    body: notesFile,
                },
            ],
        });

        expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
            `GET ${baseUrl}/personen/123/opdrachten/77`,
            `POST ${baseUrl}/bestanden/upload`,
            "PUT https://files.example.net/blob/storage-report?sig=secret-sas",
            `POST ${baseUrl}/bestanden/upload`,
            "PUT https://files.example.net/blob/storage-notes?sig=secret-sas",
            `POST ${baseUrl}/personen/123/opdrachten/77/versie`,
            `PUT ${baseUrl}/personen/123/opdrachten/versie/501?opdrachtId=77`,
        ]);

        const reportUpload = requests[1]!;
        expect(reportUpload.headers.get("authorization")).toBe("Bearer token");
        expect(JSON.parse(reportUpload.text ?? "")).toEqual({ name: "report.docx" });

        const reportPut = requests[2]!;
        expect(reportPut.headers.get("authorization")).toBeNull();
        expect(reportPut.headers.get("content-type")).toBe("multipart/form-data");
        expect(reportPut.headers.get("x-ms-blob-type")).toBe("BlockBlob");
        expect(reportPut.headers.get("x-ms-blob-content-type")).toBe(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        expect(reportPut.bytes).toEqual(new Uint8Array([1, 2, 3]));

        const notesPut = requests[4]!;
        expect(notesPut.headers.get("x-ms-blob-content-type")).toBe(notesFile.type);
        expect(notesPut.bytes).toEqual(new Uint8Array([9, 8]));

        const createBody = JSON.parse(requests[5]!.text ?? "") as Record<string, unknown>;
        expect(createBody).toMatchObject({
            Id: -1,
            Titel: "Lab report",
            Vak: "SC",
            Status: 7,
            OpdrachtId: 77,
            LeerlingOpmerking: "See the attached report.",
            InleverenVoor: "2026-10-09T21:30:00.0000000Z",
            VersieNummer: 3,
            IngeleverdOp: null,
            FeedbackBijlagen: null,
        });
        expect(createBody.GestartOp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(createBody.Links).toEqual([{ Rel: "Self", Href: "/api/opdrachten/77" }]);
        expect(JSON.stringify(createBody)).not.toContain("$$hashKey");
        expect(createBody.LeerlingBijlagen).toEqual([
            {
                Id: 0,
                Naam: "report.docx",
                ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                Datum: null,
                Grootte: 0,
                Url: "",
                UniqueId: "storage-report",
                BronSoort: 1,
                Links: null,
            },
            {
                Id: 0,
                Naam: "notes.txt",
                ContentType: notesFile.type,
                Datum: null,
                Grootte: 0,
                Url: "",
                UniqueId: "storage-notes",
                BronSoort: 1,
                Links: null,
            },
        ]);

        const finalizeBody = JSON.parse(requests[6]!.text ?? "") as Record<string, unknown>;
        expect(finalizeBody.Id).toBe(501);
        expect(finalizeBody.Status).toBe(2);
        expect(finalizeBody.LeerlingBijlagen).toEqual(createBody.LeerlingBijlagen);
        expect(requests[6]!.headers.get("authorization")).toBe("Bearer token");

        expect(submitted).toMatchObject({
            Id: 501,
            Status: 6,
            IngeleverdOp: "2026-09-26T19:03:23.0000000Z",
        });
        expect(submitted.LeerlingBijlagen?.[0]).toMatchObject({ Id: 900, Naam: "report.docx" });
    });

    test("sends an empty student note when none is provided", async () => {
        const bodies: unknown[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            const body = await readBody(init?.body ?? null);
            if (body.text) bodies.push(JSON.parse(body.text));
            if (url.endsWith("/opdrachten/77")) return Response.json({ Id: 77, LaatsteOpdrachtVersienummer: 0 });
            if (url.endsWith("/bestanden/upload")) {
                return Response.json({
                    storageId: "storage-1",
                    uri: "https://files.example.net/blob/storage-1",
                    requiredHeaders: { "x-ms-blob-type": "BlockBlob" },
                    method: "PUT",
                });
            }
            if (url.startsWith("https://files.example.net/")) return new Response(null, { status: 201 });
            if (url.endsWith("/versie") && (init?.method ?? "GET") === "POST") {
                return Response.json({ Id: 8, Status: 2 }, { status: 201 });
            }
            return Response.json({ Id: 8, Status: 6 });
        }) as typeof fetch;

        await submitAssignment(baseUrl, accessToken, 123, 77, {
            files: [{ name: "notes.txt", body: new Uint8Array([1]) }],
        });

        const created = bodies.find((body) =>
            typeof body === "object" && body !== null && "VersieNummer" in body) as { LeerlingOpmerking: string; VersieNummer: number };
        expect(created.LeerlingOpmerking).toBe("");
        expect(created.VersieNummer).toBe(1);
    });

    test("stops when the upload slot request fails", async () => {
        const urls: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            urls.push(url);
            if (url.endsWith("/opdrachten/77")) return Response.json({ Id: 77, LaatsteOpdrachtVersienummer: 1 });
            return new Response("no", { status: 403 });
        }) as typeof fetch;

        const error = await submitAssignment(baseUrl, accessToken, 123, 77, {
            files: [{ name: "notes.txt", body: new Uint8Array([1]) }],
        }).catch((value) => value);

        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(403);
        expect(urls.some((url) => url.includes("/versie"))).toBe(false);
        expect(urls.some((url) => url.includes("files.example.net"))).toBe(false);
    });

    test("stops when storing the file bytes fails", async () => {
        const urls: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            urls.push(url);
            if (url.endsWith("/opdrachten/77")) return Response.json({ Id: 77 });
            if (url.endsWith("/bestanden/upload")) {
                return Response.json({
                    storageId: "storage-1",
                    uri: "https://files.example.net/blob/storage-1?sig=secret-sas",
                    requiredHeaders: { "x-ms-blob-type": "BlockBlob" },
                    method: "PUT",
                });
            }
            return new Response("denied", { status: 403 });
        }) as typeof fetch;

        const error = await submitAssignment(baseUrl, accessToken, 123, 77, {
            files: [{ name: "notes.txt", body: new Uint8Array([1]) }],
        }).catch((value) => value);

        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(403);
        expect(error.message).toContain("notes.txt");
        expect(error.message).not.toContain("sig=");
        expect(urls.some((url) => url.includes("/versie"))).toBe(false);
    });

    test("stops when creating the version fails", async () => {
        const methods: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            const method = init?.method ?? "GET";
            methods.push(`${method} ${url}`);
            if (url.endsWith("/opdrachten/77")) return Response.json({ Id: 77, LaatsteOpdrachtVersienummer: 1 });
            if (url.endsWith("/bestanden/upload")) {
                return Response.json({
                    storageId: "storage-1",
                    uri: "https://files.example.net/blob/storage-1",
                    requiredHeaders: {},
                    method: "PUT",
                });
            }
            if (url.startsWith("https://files.example.net/")) return new Response(null, { status: 201 });
            return new Response("bad", { status: 422 });
        }) as typeof fetch;

        const error = await submitAssignment(baseUrl, accessToken, 123, 77, {
            files: [{ name: "notes.txt", body: new Uint8Array([1]) }],
        }).catch((value) => value);

        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(422);
        expect(methods.some((request) => request.startsWith("PUT ") && request.includes("/versie/"))).toBe(false);
    });

    test("reports a finalize failure after the version was created", async () => {
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            const method = init?.method ?? "GET";
            if (url.endsWith("/opdrachten/77")) return Response.json({ Id: 77, LaatsteOpdrachtVersienummer: 4 });
            if (url.endsWith("/bestanden/upload")) {
                return Response.json({
                    storageId: "storage-1",
                    uri: "https://files.example.net/blob/storage-1",
                    requiredHeaders: { "x-ms-blob-type": "BlockBlob" },
                    method: "PUT",
                });
            }
            if (url.startsWith("https://files.example.net/")) return new Response(null, { status: 201 });
            if (method === "POST") return Response.json({ Id: 80, Status: 2 }, { status: 201 });
            return new Response("conflict", { status: 409 });
        }) as typeof fetch;

        const error = await submitAssignment(baseUrl, accessToken, 123, 77, {
            files: [{ name: "notes.txt", body: new Uint8Array([1]) }],
        }).catch((value) => value);

        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(409);
        expect(error.message).toContain("/opdrachten/versie/80?opdrachtId=77");
    });

    test("rejects a submission without files before calling Magister", async () => {
        globalThis.fetch = (() => {
            throw new Error("fetch should not be called");
        }) as unknown as typeof fetch;

        await expect(submitAssignment(baseUrl, accessToken, 123, 77, { files: [] }))
            .rejects.toThrow("Assignment submission requires at least one file");
    });
});
