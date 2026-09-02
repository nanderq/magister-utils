import { getJson } from "../utils/common";
import type {
    StudyGuideDetail,
    StudyGuideFile,
    StudyGuideItem,
    StudyGuidePartDetail,
} from "../types";

export async function getStudyGuides(
    baseUrl: string,
    accessToken: string,
    personId: number,
    date: string | Date = new Date(),
): Promise<StudyGuideItem[]> {
    const peildatum = date instanceof Date ? formatDate(date) : date;
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/leerlingen/${personId}/studiewijzers?${new URLSearchParams({ peildatum })}`,
        accessToken,
        "Study guides",
    );
    const items = payload.Items ?? payload.items;
    if (!Array.isArray(items)) {
        throw new Error("Study guides response did not contain an items array");
    }
    return items as StudyGuideItem[];
}

export async function getStudyGuide(
    baseUrl: string,
    accessToken: string,
    personId: number,
    studyGuideId: number,
): Promise<StudyGuideDetail> {
    return getJson<StudyGuideDetail>(
        `${baseUrl}/leerlingen/${personId}/studiewijzers/${studyGuideId}`,
        accessToken,
        "Study guide",
    );
}

export async function getStudyGuidePart(
    baseUrl: string,
    accessToken: string,
    personId: number,
    studyGuideId: number,
    partId: number,
    useFolderStructure = true,
): Promise<StudyGuidePartDetail> {
    const query = new URLSearchParams({ gebruikMappenStructuur: String(useFolderStructure) });
    return getJson<StudyGuidePartDetail>(
        `${baseUrl}/leerlingen/${personId}/studiewijzers/${studyGuideId}/onderdelen/${partId}?${query}`,
        accessToken,
        "Study guide part",
    );
}

export function extractStudyGuideFiles(payload: unknown): StudyGuideFile[] {
    const files = new Map<string, StudyGuideFile>();

    visitObjects(payload, (item) => {
        const name = readString(item, [
            "Bestandsnaam",
            "bestandsnaam",
            "Naam",
            "naam",
            "Titel",
            "titel",
            "FileName",
            "fileName",
        ]);
        const href = readHref(item);
        const size = readNumber(item, ["Grootte", "grootte", "Bestandsgrootte", "bestandsgrootte", "Size", "size"]);
        const contentType = readString(item, ["ContentType", "contentType", "MimeType", "mimeType"]);
        const filenameLooksLikeFile = name && /\.[A-Za-z0-9]{2,5}$/.test(name);
        if (!href && size === undefined && !contentType && !filenameLooksLikeFile) return;

        const fileId = readNumber(item, ["Id", "id"]);
        const id = fileId?.toString() ?? `${name ?? "file"}-${href ?? ""}`;
        const key = `${id}|${name ?? ""}|${href ?? ""}`;
        if (!files.has(key)) {
            files.set(key, { id, fileId, name: name ?? "", href, size, contentType });
        }
    });

    return [...files.values()];
}

function formatDate(date: Date): string {
    if (!Number.isFinite(date.getTime())) throw new Error("Study guides require a valid date");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function visitObjects(value: unknown, visit: (object: Record<string, unknown>) => void): void {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
        value.forEach((item) => visitObjects(item, visit));
        return;
    }
    const object = value as Record<string, unknown>;
    visit(object);
    Object.values(object).forEach((item) => visitObjects(item, visit));
}

function readString(object: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = object[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
}

function readNumber(object: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
        const value = object[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
}

function readHref(object: Record<string, unknown>): string | undefined {
    const direct = readString(object, [
        "DownloadUrl",
        "downloadUrl",
        "BestandUrl",
        "bestandUrl",
        "BronUrl",
        "bronUrl",
        "Url",
        "url",
        "Uri",
        "uri",
    ]);
    if (direct) return direct;
    if (!Array.isArray(object.Links)) return;

    const links = object.Links.filter((link): link is Record<string, unknown> =>
        Boolean(link) && typeof link === "object");
    const preferred = ["download", "content", "attachment", "file", "enclosure", "open", "self"];
    for (const relation of preferred) {
        const link = links.find((candidate) =>
            readString(candidate, ["Rel", "rel"])?.toLowerCase() === relation);
        const href = link && readString(link, ["Href", "href", "Url", "url", "Uri", "uri"]);
        if (href) return href;
    }
    return links.map((link) => readString(link, ["Href", "href", "Url", "url"])).find(Boolean);
}
