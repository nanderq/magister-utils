import { afterEach, describe, expect, test } from "bun:test";

import {
    getMessageWithAttachments,
    getMessages,
    searchContacts,
    sendMessage,
    uploadFile,
} from "../../src/resources/messages";
import { MagisterRequestError } from "../../src/errors";

const baseUrl = "https://school.magister.net/api";
const accessToken = "access-token";

describe("messages", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("lists inbox messages with pagination and authentication", async () => {
        let request: { url: string; headers: Headers } | undefined;
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            request = {
                url: input instanceof Request ? input.url : input.toString(),
                headers: new Headers(init?.headers),
            };
            return Response.json({ Items: [{ id: 7, onderwerp: "Hello" }] });
        }) as typeof fetch;

        await expect(getMessages(baseUrl, accessToken, { skip: 10, top: 5 }))
            .resolves.toEqual([{ id: 7, onderwerp: "Hello" }]);
        expect(request?.url).toBe(`${baseUrl}/berichten/postvakin/berichten?skip=10&top=5`);
        expect(request?.headers.get("authorization")).toBe(`Bearer ${accessToken}`);
    });

    test("loads attachments only when the detail says they exist", async () => {
        const urls: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = input instanceof Request ? input.url : input.toString();
            urls.push(url);
            if (url.endsWith("/bijlagen")) return Response.json({ items: [{ id: 8, naam: "a.pdf" }] });
            return Response.json({ id: 7, heeftBijlagen: true });
        }) as unknown as typeof fetch;

        await expect(getMessageWithAttachments(baseUrl, accessToken, 7)).resolves.toEqual({
            message: { id: 7, heeftBijlagen: true },
            attachments: [{ id: 8, naam: "a.pdf" }],
        });
        expect(urls).toEqual([
            `${baseUrl}/berichten/berichten/7`,
            `${baseUrl}/berichten/berichten/7/bijlagen`,
        ]);

        urls.length = 0;
        globalThis.fetch = (async () => Response.json({ id: 9, heeftBijlagen: false })) as unknown as typeof fetch;
        await expect(getMessageWithAttachments(baseUrl, accessToken, 9)).resolves.toEqual({
            message: { id: 9, heeftBijlagen: false },
            attachments: [],
        });
    });

    test("searches contacts using encoded query options", async () => {
        let url = "";
        globalThis.fetch = (async (input: string | URL | Request) => {
            url = input instanceof Request ? input.url : input.toString();
            return Response.json({ items: [{ id: 3, weergavenaam: "Ada" }] });
        }) as unknown as typeof fetch;

        await expect(searchContacts(baseUrl, accessToken, "Ada & Bob", { top: 20, type: "leerling" }))
            .resolves.toEqual([{ id: 3, weergavenaam: "Ada" }]);
        expect(url).toBe(`${baseUrl}/contacten/personen?q=Ada+%26+Bob&top=20&type=leerling`);
    });

    test("uploads bytes and accepts an array upload response", async () => {
        let init: RequestInit | undefined;
        globalThis.fetch = (async (_input: string | URL | Request, requestInit?: RequestInit) => {
            init = requestInit;
            return Response.json([{ id: 11, naam: "notes.txt" }]);
        }) as typeof fetch;

        await expect(uploadFile(baseUrl, accessToken, new Uint8Array([1, 2]), {
            contentType: "text/plain",
        })).resolves.toEqual({ id: 11, naam: "notes.txt" });
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("content-type")).toBe("text/plain");
        expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${accessToken}`);
        expect(init?.body).toBeInstanceOf(Blob);
    });

    test("sends a message with defaults without overwriting supplied values", async () => {
        let body: Record<string, unknown> = {};
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            body = JSON.parse(String(init?.body));
            return new Response(null, { status: 204 });
        }) as typeof fetch;

        await sendMessage(baseUrl, accessToken, {
            ontvangers: [{ id: 3, type: "persoon" }],
            onderwerp: "Subject",
            inhoud: "Body",
            heeftPrioriteit: true,
        });
        expect(body).toMatchObject({
            ontvangers: [{ id: 3, type: "persoon" }],
            kopieOntvangers: [],
            blindeKopieOntvangers: [],
            bijlagen: [],
            verzendOptie: "standaard",
            heeftPrioriteit: true,
        });
    });

    test("uses the SDK request error for failed mutations", async () => {
        globalThis.fetch = (async () => new Response("no", { status: 413 })) as unknown as typeof fetch;

        const error = await uploadFile(baseUrl, accessToken, new Uint8Array()).catch((value) => value);
        expect(error).toBeInstanceOf(MagisterRequestError);
        expect(error.status).toBe(413);
    });

    test("rejects malformed collection and upload responses", async () => {
        globalThis.fetch = (async () => Response.json({ unexpected: true })) as unknown as typeof fetch;
        await expect(getMessages(baseUrl, accessToken)).rejects.toThrow(
            "Messages response did not contain an items array",
        );
        await expect(uploadFile(baseUrl, accessToken, new Uint8Array())).rejects.toThrow(
            "File upload response did not contain an attachment id",
        );
    });
});
