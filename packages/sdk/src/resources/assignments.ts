import { MagisterRequestError } from "../errors";
import type {
    AssignmentDetail,
    AssignmentItem,
    AssignmentUploadSettings,
    AssignmentVersion,
    AssignmentVersionAttachment,
} from "../types";
import { getJson } from "../utils/common";
import type { UploadBody } from "./messages";

/** Magister creates a new turn-in version with status OpnieuwInleveren. */
const NEW_SUBMISSION_STATUS = 7;
/** Student file attachments use BronSoort Bestand. */
const FILE_ATTACHMENT_SOURCE = 1;

export interface AssignmentSubmissionFile {
    name: string;
    body: UploadBody;
    contentType?: string;
}

export interface SubmitAssignmentInput {
    files: AssignmentSubmissionFile[];
    note?: string;
}

interface FileUploadTicket {
    storageId: string;
    uri: string;
    method: string;
    requiredHeaders: Record<string, string>;
}

export async function getAssignments(
    baseUrl: string,
    accessToken: string,
    personId: number,
    options: { skip?: number; top?: number } = {},
): Promise<AssignmentItem[]> {
    const query = new URLSearchParams({
        skip: String(options.skip ?? 0),
        top: String(options.top ?? 250),
    });
    const url = `${baseUrl}/personen/${personId}/opdrachten?${query.toString()}`;
    const data = await getJson<{ Items?: unknown; items?: unknown }>(
        url,
        accessToken,
        "Assignments",
    );
    const items = data.Items ?? data.items;
    if (!Array.isArray(items)) throw new Error("Assignments response did not contain an items array");
    return items as AssignmentItem[];
}

export async function getAssignment(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
): Promise<AssignmentDetail> {
    const url = `${baseUrl}/personen/${personId}/opdrachten/${assignmentId}`;
    return getJson<AssignmentDetail>(url, accessToken, "Assignment");
}

export async function getAssignmentUploadSettings(
    baseUrl: string,
    accessToken: string,
    personId: number,
): Promise<AssignmentUploadSettings> {
    const url = `${baseUrl}/personen/${personId}/bestanden/uploadinstellingen`;
    return getJson<AssignmentUploadSettings>(url, accessToken, "Assignment upload settings");
}

export async function submitAssignment(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
    input: SubmitAssignmentInput,
): Promise<AssignmentVersion> {
    const files = input.files ?? [];
    if (files.length === 0) {
        throw new Error("Assignment submission requires at least one file");
    }

    const assignment = await getAssignment(baseUrl, accessToken, personId, assignmentId);
    const attachments: AssignmentVersionAttachment[] = [];
    for (const file of files) {
        attachments.push(await uploadAssignmentFile(baseUrl, accessToken, file));
    }

    const version = stripAngularFields({
        Id: -1,
        Links: assignment.Links ?? [],
        Titel: assignment.Titel ?? null,
        Vak: assignment.Vak ?? null,
        Status: NEW_SUBMISSION_STATUS,
        OpdrachtId: assignmentId,
        LeerlingOpmerking: input.note ?? "",
        DocentOpmerking: null,
        LeerlingBijlagen: attachments,
        FeedbackBijlagen: null,
        GestartOp: new Date().toISOString(),
        InleverenVoor: assignment.InleverenVoor ?? null,
        IngeleverdOp: null,
        Beoordeling: null,
        BeoordeeldOp: null,
        VersieNummer: nextVersionNumber(assignment.LaatsteOpdrachtVersienummer),
    });

    const created = await createAssignmentVersion(
        baseUrl,
        accessToken,
        personId,
        assignmentId,
        version,
    );
    return finalizeAssignmentVersion(baseUrl, accessToken, personId, assignmentId, {
        ...version,
        Id: created.Id,
        Status: created.Status,
    });
}

async function uploadAssignmentFile(
    baseUrl: string,
    accessToken: string,
    file: AssignmentSubmissionFile,
): Promise<AssignmentVersionAttachment> {
    const name = file.name?.trim();
    if (!name) throw new Error("Assignment file is missing a name");
    if (file.body == null) throw new Error(`Assignment file ${name} is missing a body`);

    const ticket = await requestFileUpload(baseUrl, accessToken, name);
    const contentType = file.contentType
        || (file.body instanceof Blob && file.body.type ? file.body.type : "")
        || "application/octet-stream";
    await putFileBytes(ticket, await toBlob(file.body), contentType, name);

    return {
        Id: 0,
        Naam: name,
        ContentType: contentType,
        Datum: null,
        Grootte: 0,
        Url: "",
        UniqueId: ticket.storageId,
        BronSoort: FILE_ATTACHMENT_SOURCE,
        Links: null,
    };
}

async function requestFileUpload(
    baseUrl: string,
    accessToken: string,
    name: string,
): Promise<FileUploadTicket> {
    const url = `${baseUrl}/bestanden/upload`;
    const response = await fetch(url, {
        method: "POST",
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment upload request failed (${response.status}) for ${url}`,
            response.status,
        );
    }

    const payload = await readJsonObject(response, "Assignment upload");
    const storageId = payload.storageId;
    const uri = payload.uri;
    if (typeof storageId !== "string" || storageId.length === 0 || typeof uri !== "string" || uri.length === 0) {
        throw new Error("Assignment upload response did not contain a storage location");
    }
    const method = typeof payload.method === "string" && payload.method.length > 0
        ? payload.method
        : "PUT";
    return {
        storageId,
        uri,
        method,
        requiredHeaders: headerRecord(payload.requiredHeaders),
    };
}

async function putFileBytes(
    ticket: FileUploadTicket,
    body: Blob,
    contentType: string,
    fileName: string,
): Promise<void> {
    const response = await fetch(ticket.uri, {
        method: ticket.method,
        headers: {
            "Content-Type": "multipart/form-data",
            "x-ms-blob-type": "BlockBlob",
            "x-ms-blob-content-type": contentType,
            ...ticket.requiredHeaders,
        },
        body,
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment file upload failed (${response.status}) for ${fileName}`,
            response.status,
        );
    }
}

async function createAssignmentVersion(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
    version: AssignmentVersion,
): Promise<AssignmentVersion> {
    const url = `${baseUrl}/personen/${personId}/opdrachten/${assignmentId}/versie`;
    const response = await fetch(url, {
        method: "POST",
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(version),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment version create failed (${response.status}) for ${url}`,
            response.status,
        );
    }
    const created = await readJsonObject(response, "Assignment version") as AssignmentVersion;
    if (typeof created.Id !== "number") {
        throw new Error("Assignment version response did not contain an id");
    }
    if (typeof created.Status !== "number") {
        throw new Error("Assignment version response did not contain a status");
    }
    return created;
}

async function finalizeAssignmentVersion(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
    version: AssignmentVersion,
): Promise<AssignmentVersion> {
    const url = `${baseUrl}/personen/${personId}/opdrachten/versie/${version.Id}?opdrachtId=${assignmentId}`;
    const response = await fetch(url, {
        method: "PUT",
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(version),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment submit failed (${response.status}) for ${url}`,
            response.status,
        );
    }
    return await readJsonObject(response, "Assignment submit") as AssignmentVersion;
}

function jsonHeaders(accessToken: string): HeadersInit {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    };
}

function nextVersionNumber(latest: number | null | undefined): number {
    return typeof latest === "number" && Number.isFinite(latest) ? latest + 1 : 1;
}

function headerRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const headers: Record<string, string> = {};
    for (const [key, header] of Object.entries(value)) {
        if (header == null) continue;
        headers[key] = String(header);
    }
    return headers;
}

function stripAngularFields<T>(value: T): T {
    if (Array.isArray(value)) return value.map((entry) => stripAngularFields(entry)) as T;
    if (!value || typeof value !== "object") return value;
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (key.startsWith("$$")) continue;
        result[key] = stripAngularFields(entry);
    }
    return result as T;
}

async function readJsonObject(response: Response, label: string): Promise<Record<string, unknown>> {
    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new Error(`${label} response was not JSON`);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error(`${label} response was not an object`);
    }
    return payload as Record<string, unknown>;
}

async function toBlob(body: UploadBody): Promise<Blob> {
    if (body instanceof Blob) return new Blob([new Uint8Array(await body.arrayBuffer())]);
    return new Blob([copyBytes(body)]);
}

function copyBytes(body: ArrayBuffer | Uint8Array): Uint8Array<ArrayBuffer> {
    if (body instanceof Uint8Array) return new Uint8Array(body);
    return new Uint8Array(body.slice(0));
}
