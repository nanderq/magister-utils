import { MagisterRequestError } from "../errors";
import type {
    AssignmentDetail,
    AssignmentItem,
    AssignmentLink,
    AssignmentUploadSettings,
    AssignmentVersion,
    AssignmentVersionAttachment,
    ParsedVersieNavigatieItem,
    VersieNavigatieItem,
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

export interface GetAssignmentVersionOptions {
    /** When set, appends `nocache` to the version request. `true` uses the current timestamp. */
    nocache?: string | number | boolean;
}

export interface CreateAssignmentVersionInput {
    note?: string;
    attachments?: AssignmentVersionAttachment[];
    /** Defaults to the in-progress submission status used by `submitAssignment`. */
    status?: number;
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

    const version = buildAssignmentVersionDraft(assignment, assignmentId, {
        note: input.note,
        attachments,
    });

    const created = await createAssignmentVersion(
        baseUrl,
        accessToken,
        personId,
        assignmentId,
        version,
    );
    return updateAssignmentVersion(baseUrl, accessToken, personId, assignmentId, {
        ...version,
        Id: created.Id,
        Status: created.Status,
    });
}

export function parseVersieNavigatieItems(
    source: AssignmentDetail | readonly VersieNavigatieItem[] | null | undefined,
): ParsedVersieNavigatieItem[] {
    const items = navigationItems(source);
    if (!Array.isArray(items)) return [];

    const parsed: ParsedVersieNavigatieItem[] = [];
    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        if (typeof item.Id !== "number" || !Number.isFinite(item.Id)) continue;
        const links = Array.isArray(item.Links) ? item.Links : [];
        const entry: ParsedVersieNavigatieItem = {
            id: item.Id,
            omschrijving: typeof item.Omschrijving === "string" ? item.Omschrijving : "",
        };
        const selfHref = findLinkHref(links, "self");
        const prevHref = findLinkHref(links, "prev") ?? findLinkHref(links, "previous");
        const nextHref = findLinkHref(links, "next");
        if (selfHref) entry.selfHref = selfHref;
        if (prevHref) entry.prevHref = prevHref;
        if (nextHref) entry.nextHref = nextHref;
        parsed.push(entry);
    }
    return parsed;
}

export async function getAssignmentVersion(
    baseUrl: string,
    accessToken: string,
    personId: number,
    versionId: number,
    options: GetAssignmentVersionOptions = {},
): Promise<AssignmentVersion> {
    const url = assignmentVersionUrl(baseUrl, personId, versionId, options.nocache);
    return getJson<AssignmentVersion>(url, accessToken, "Assignment version");
}

export async function getAssignmentVersionByHref(
    baseUrl: string,
    accessToken: string,
    href: string,
): Promise<AssignmentVersion> {
    const url = resolveAssignmentVersionHref(baseUrl, href);
    return getJson<AssignmentVersion>(url, accessToken, "Assignment version");
}

export function buildAssignmentVersionDraft(
    assignment: AssignmentDetail,
    assignmentId: number,
    input: CreateAssignmentVersionInput = {},
): AssignmentVersion {
    return stripAngularFields({
        Id: -1,
        Links: assignment.Links ?? [],
        Titel: assignment.Titel ?? null,
        Vak: assignment.Vak ?? null,
        Status: input.status ?? NEW_SUBMISSION_STATUS,
        OpdrachtId: assignmentId,
        LeerlingOpmerking: input.note ?? "",
        DocentOpmerking: null,
        LeerlingBijlagen: input.attachments ?? [],
        FeedbackBijlagen: null,
        GestartOp: new Date().toISOString(),
        InleverenVoor: assignment.InleverenVoor ?? null,
        IngeleverdOp: null,
        Beoordeling: null,
        BeoordeeldOp: null,
        VersieNummer: nextVersionNumber(assignment.LaatsteOpdrachtVersienummer),
    });
}

export async function createAssignmentDraft(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
    input: CreateAssignmentVersionInput = {},
): Promise<AssignmentVersion> {
    const assignment = await getAssignment(baseUrl, accessToken, personId, assignmentId);
    return createAssignmentVersion(
        baseUrl,
        accessToken,
        personId,
        assignmentId,
        buildAssignmentVersionDraft(assignment, assignmentId, input),
    );
}

export function resolveAssignmentContentsDownloadUrl(
    baseUrl: string,
    attachment: AssignmentVersionAttachment,
): string | null {
    const href = findLinkHref(attachment.Links, "contents");
    if (!href) return null;
    return resolveSameOriginHref(baseUrl, href);
}

export function resolveAssignmentIngeleverdDownloadUrl(
    baseUrl: string,
    attachment: AssignmentVersionAttachment,
    personId?: number,
): string | null {
    const href = findIngeleverdHref(attachment.Links);
    if (href) {
        const resolved = resolveSameOriginHref(baseUrl, href);
        if (resolved) return resolved;
    }
    if (personId == null || typeof attachment.Id !== "number" || attachment.Id <= 0) return null;
    try {
        const origin = new URL(baseUrl).origin;
        return `${origin}/api/personen/${personId}/opdrachten/bijlagen/Ingeleverd/${attachment.Id}`;
    } catch {
        return null;
    }
}

export function resolveAssignmentAttachmentDownloadUrl(
    baseUrl: string,
    attachment: AssignmentVersionAttachment,
    kind: "contents" | "ingeleverd",
    personId?: number,
): string | null {
    return kind === "contents"
        ? resolveAssignmentContentsDownloadUrl(baseUrl, attachment)
        : resolveAssignmentIngeleverdDownloadUrl(baseUrl, attachment, personId);
}

export function listSubmittedAssignmentFiles(
    baseUrl: string,
    version: AssignmentVersion,
    personId?: number,
): { attachment: AssignmentVersionAttachment; downloadUrl: string | null }[] {
    return (version.LeerlingBijlagen ?? []).map((attachment) => ({
        attachment,
        downloadUrl: resolveAssignmentIngeleverdDownloadUrl(baseUrl, attachment, personId),
    }));
}

export async function downloadAssignmentAttachment(
    baseUrl: string,
    accessToken: string,
    downloadUrl: string,
): Promise<Uint8Array> {
    const url = resolveSameOriginHref(baseUrl, downloadUrl);
    if (!url || !isAssignmentBijlagePath(url)) {
        throw new Error("Assignment attachment link is not an assignment bijlage URL");
    }
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "*/*",
        },
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment attachment download failed (${response.status}) for ${urlWithoutQuery(url)}`,
            response.status,
        );
    }
    return new Uint8Array(await response.arrayBuffer());
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

export async function createAssignmentVersion(
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
        body: JSON.stringify(asNewVersionBody(version)),
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

export async function updateAssignmentVersion(
    baseUrl: string,
    accessToken: string,
    personId: number,
    assignmentId: number,
    version: AssignmentVersion,
): Promise<AssignmentVersion> {
    const payload = stripAngularFields(version);
    if (typeof payload.Id !== "number") {
        throw new Error("Assignment version is missing an id");
    }
    const url = `${baseUrl}/personen/${personId}/opdrachten/versie/${payload.Id}?opdrachtId=${assignmentId}`;
    const response = await fetch(url, {
        method: "PUT",
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Assignment version update failed (${response.status}) for ${url}`,
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

function navigationItems(
    source: AssignmentDetail | readonly VersieNavigatieItem[] | null | undefined,
): readonly VersieNavigatieItem[] | null | undefined {
    if (Array.isArray(source)) return source as readonly VersieNavigatieItem[];
    return (source as AssignmentDetail | null | undefined)?.VersieNavigatieItems;
}

function asNewVersionBody(version: AssignmentVersion): AssignmentVersion {
    const stripped = stripAngularFields(version);
    const body: AssignmentVersion = { Id: -1 };
    for (const [key, value] of Object.entries(stripped)) {
        if (key === "Id") continue;
        body[key] = value;
    }
    return body;
}

function assignmentVersionUrl(
    baseUrl: string,
    personId: number,
    versionId: number,
    nocache: GetAssignmentVersionOptions["nocache"],
): string {
    const url = `${baseUrl}/personen/${personId}/opdrachten/versie/${versionId}`;
    if (nocache === undefined || nocache === false) return url;
    const value = nocache === true ? String(Date.now()) : String(nocache);
    return `${url}?${new URLSearchParams({ nocache: value })}`;
}

function resolveAssignmentVersionHref(baseUrl: string, href: string): string {
    const url = resolveSameOriginHref(baseUrl, href);
    if (!url || !new URL(url).pathname.toLowerCase().includes("/opdrachten/versie/")) {
        throw new Error("Assignment version link is not an assignment version URL");
    }
    return url;
}

function findLinkHref(
    links: AssignmentLink[] | null | undefined,
    rel: string,
): string | undefined {
    if (!Array.isArray(links)) return;
    for (const link of links) {
        if (!link || typeof link !== "object") continue;
        const linkRel = (link.Rel ?? link.rel ?? "").toLowerCase();
        if (linkRel !== rel) continue;
        const href = link.Href ?? link.href;
        if (typeof href === "string" && href.trim()) return href.trim();
    }
}

function findIngeleverdHref(links: AssignmentLink[] | null | undefined): string | undefined {
    if (!Array.isArray(links)) return;
    for (const link of links) {
        if (!link || typeof link !== "object") continue;
        const href = link.Href ?? link.href;
        if (typeof href !== "string" || !href.toLowerCase().includes("/opdrachten/bijlagen/ingeleverd/")) {
            continue;
        }
        const rel = (link.Rel ?? link.rel ?? "").toLowerCase();
        if (rel === "self" || rel === "ingeleverd") return href.trim();
    }
}

function resolveSameOriginHref(baseUrl: string, href: string): string | null {
    try {
        const base = new URL(baseUrl);
        const origin = base.origin;
        let resolved: URL;
        if (/^https?:\/\//i.test(href)) {
            resolved = new URL(href);
        } else if (href.startsWith("/api/") || href.startsWith("/api?")) {
            resolved = new URL(`${origin}${href}`);
        } else if (href.startsWith("/")) {
            resolved = new URL(`${origin}/api${href}`);
        } else {
            const prefix = base.href.endsWith("/") ? base.href : `${base.href}/`;
            resolved = new URL(href, prefix);
        }
        if (resolved.origin !== origin) return null;
        return resolved.toString();
    } catch {
        return null;
    }
}

function isAssignmentBijlagePath(url: string): boolean {
    return new URL(url).pathname.toLowerCase().includes("/opdrachten/bijlagen/");
}

function urlWithoutQuery(url: string): string {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
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
