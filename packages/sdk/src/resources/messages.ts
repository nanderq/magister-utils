import { MagisterRequestError } from "../errors";
import type {
    Contact,
    CreatedMessageDraft,
    MessageAttachment,
    MessageDetail,
    MessageDraft,
    MessageItem,
    MessageWithAttachments,
    SendMessagePayload,
    UploadedAttachment,
} from "../types";
import { getJson } from "../utils/common";

export interface GetMessagesOptions {
    skip?: number;
    top?: number;
}

export interface SearchContactsOptions {
    top?: number;
    type?: string;
}

export interface UploadFileOptions {
    contentType?: string;
}

export type UploadBody = Blob | ArrayBuffer | Uint8Array;

export async function getMessages(
    baseUrl: string,
    accessToken: string,
    options: GetMessagesOptions = {},
): Promise<MessageItem[]> {
    return getFolderMessages(baseUrl, accessToken, "postvakin", options, "Messages");
}

export async function getSentMessages(
    baseUrl: string,
    accessToken: string,
    options: GetMessagesOptions = {},
): Promise<MessageItem[]> {
    return getFolderMessages(baseUrl, accessToken, "verzondenitems", options, "Sent messages");
}

async function getFolderMessages(
    baseUrl: string,
    accessToken: string,
    folder: "postvakin" | "verzondenitems",
    options: GetMessagesOptions,
    label: string,
): Promise<MessageItem[]> {
    const query = new URLSearchParams({
        skip: String(options.skip ?? 0),
        top: String(options.top ?? 12),
    });
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/berichten/${folder}/berichten?${query}`,
        accessToken,
        label,
    );
    return readItems<MessageItem>(payload, label);
}

export async function getMessageDrafts(
    baseUrl: string,
    accessToken: string,
    options: GetMessagesOptions = {},
): Promise<MessageDraft[]> {
    const query = new URLSearchParams({
        skip: String(options.skip ?? 0),
        top: String(options.top ?? 12),
    });
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/berichten/concepten?${query}`,
        accessToken,
        "Message drafts",
    );
    return readItems<MessageDraft>(payload, "Message drafts");
}

export async function getMessageDraftCount(baseUrl: string, accessToken: string): Promise<number> {
    const payload = await getJson<{ count?: unknown; Count?: unknown }>(
        `${baseUrl}/berichten/concepten/count`,
        accessToken,
        "Message draft count",
    );
    const count = payload.count ?? payload.Count;
    if (typeof count !== "number") throw new Error("Message draft count response did not contain a count");
    return count;
}

export async function getMessage(
    baseUrl: string,
    accessToken: string,
    messageId: number,
): Promise<MessageDetail> {
    return getJson<MessageDetail>(
        `${baseUrl}/berichten/berichten/${messageId}`,
        accessToken,
        "Message",
    );
}

export async function getMessageAttachments(
    baseUrl: string,
    accessToken: string,
    messageId: number,
): Promise<MessageAttachment[]> {
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/berichten/berichten/${messageId}/bijlagen`,
        accessToken,
        "Message attachments",
    );
    return readItems<MessageAttachment>(payload, "Message attachments");
}

export async function getMessageWithAttachments(
    baseUrl: string,
    accessToken: string,
    messageId: number,
): Promise<MessageWithAttachments> {
    const message = await getMessage(baseUrl, accessToken, messageId);
    const attachments = message.heeftBijlagen
        ? await getMessageAttachments(baseUrl, accessToken, messageId)
        : [];
    return { message, attachments };
}

export async function searchContacts(
    baseUrl: string,
    accessToken: string,
    query: string,
    options: SearchContactsOptions = {},
): Promise<Contact[]> {
    const params = new URLSearchParams({
        q: query,
        top: String(options.top ?? 250),
        type: options.type ?? "alle",
    });
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/contacten/personen?${params}`,
        accessToken,
        "Contacts",
    );
    return readItems<Contact>(payload, "Contacts");
}

export async function uploadFile(
    baseUrl: string,
    accessToken: string,
    body: UploadBody,
    options: UploadFileOptions = {},
): Promise<UploadedAttachment> {
    const contentType = options.contentType
        ?? (body instanceof Blob && body.type ? body.type : "application/octet-stream");
    const requestBody = body instanceof Blob ? body : new Blob([copyBytes(body)], { type: contentType });
    const url = `${baseUrl}/bestanden`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": contentType,
        },
        body: requestBody,
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `File upload failed (${response.status}) for ${url}`,
            response.status,
        );
    }

    const payload = await response.json() as unknown;
    const uploaded = Array.isArray(payload) ? payload[0] : payload;
    if (!uploaded || typeof uploaded !== "object" || typeof uploaded.id !== "number") {
        throw new Error("File upload response did not contain an attachment id");
    }
    return uploaded as UploadedAttachment;
}

export async function sendMessage(
    baseUrl: string,
    accessToken: string,
    payload: SendMessagePayload,
): Promise<void> {
    await postMessagePayload(`${baseUrl}/berichten/berichten`, accessToken, payload, "Send message");
}

export async function createMessageDraft(
    baseUrl: string,
    accessToken: string,
    payload: SendMessagePayload,
): Promise<CreatedMessageDraft> {
    const response = await postMessagePayload(
        `${baseUrl}/berichten/concepten`,
        accessToken,
        payload,
        "Create message draft",
    );
    const path = response.headers.get("location")?.split(/[?#]/, 1)[0] ?? "";
    const id = Number(path.match(/\/concepten\/(\d+)\/?$/)?.[1]);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Create message draft response did not contain a draft id");
    }
    return { id };
}

export async function deleteMessageDrafts(
    baseUrl: string,
    accessToken: string,
    draftIds: number[],
): Promise<void> {
    if (draftIds.length === 0) return;
    const url = `${baseUrl}/berichten/concepten`;
    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(draftIds.map(conceptId => ({ conceptId }))),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Delete message drafts failed (${response.status}) for ${url}`,
            response.status,
        );
    }
}

async function postMessagePayload(
    url: string,
    accessToken: string,
    payload: SendMessagePayload,
    label: string,
): Promise<Response> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            kopieOntvangers: [],
            blindeKopieOntvangers: [],
            heeftPrioriteit: false,
            verzendOptie: "standaard",
            bijlagen: [],
            ...payload,
        }),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `${label} failed (${response.status}) for ${url}`,
            response.status,
        );
    }
    return response;
}

function readItems<T>(payload: { Items?: unknown; items?: unknown }, label: string): T[] {
    const items = payload.Items ?? payload.items;
    if (!Array.isArray(items)) throw new Error(`${label} response did not contain an items array`);
    return items as T[];
}

function copyBytes(body: ArrayBuffer | Uint8Array): Uint8Array<ArrayBuffer> {
    if (body instanceof Uint8Array) return new Uint8Array(body);
    return new Uint8Array(body.slice(0));
}
