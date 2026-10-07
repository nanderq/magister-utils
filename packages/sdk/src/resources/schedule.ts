import { MagisterRequestError } from "../errors";
import type { AppointmentDetail, CreateAppointmentPayload, CreatedAppointment, ScheduleItem } from "../types";
import { getJson } from "../utils/common";

export async function getSchedule(
    baseUrl: string,
    accessToken: string,
    personId: number,
    from: string | Date,
    to: string | Date,
): Promise<ScheduleItem[]> {
    const query = new URLSearchParams({
        van: formatDate(from, "from"),
        tot: formatDate(to, "to"),
    });
    const payload = await getJson<{ Items?: unknown; items?: unknown }>(
        `${baseUrl}/personen/${personId}/afspraken?${query}`,
        accessToken,
        "Schedule",
    );
    const items = payload.Items ?? payload.items;
    if (!Array.isArray(items)) {
        throw new Error("Schedule response did not contain an items array");
    }
    return items as ScheduleItem[];
}

export async function getAppointment(
    baseUrl: string,
    accessToken: string,
    personId: number,
    appointmentId: number,
): Promise<AppointmentDetail> {
    return getJson<AppointmentDetail>(
        `${baseUrl}/personen/${personId}/afspraken/${appointmentId}`,
        accessToken,
        "Appointment",
    );
}

export async function createAppointment(
    baseUrl: string,
    accessToken: string,
    personId: number,
    payload: CreateAppointmentPayload,
): Promise<CreatedAppointment> {
    const url = `${baseUrl}/personen/${personId}/afspraken`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            Start: formatDateTime(payload.Start, "start"),
            Einde: formatDateTime(payload.Einde, "end"),
            DuurtHeleDag: payload.DuurtHeleDag ?? false,
            Omschrijving: payload.Omschrijving,
            Inhoud: payload.Inhoud ?? "",
            Lokatie: payload.Lokatie ?? "",
            Type: payload.Type ?? 1,
            InfoType: payload.InfoType ?? 6,
            Status: payload.Status ?? 2,
            WeergaveType: payload.WeergaveType ?? 0,
            Subtype: payload.Subtype ?? 1,
        }),
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Create appointment failed (${response.status}) for ${url}`,
            response.status,
        );
    }

    const id = readCreatedAppointmentId(response.headers.get("location"))
        ?? await readCreatedAppointmentIdFromBody(response);
    if (id === undefined) {
        throw new Error("Create appointment response did not contain an appointment id");
    }
    return { id };
}

export async function deleteAppointment(
    baseUrl: string,
    accessToken: string,
    personId: number,
    appointmentId: number,
): Promise<void> {
    const url = `${baseUrl}/personen/${personId}/afspraken/${appointmentId}`;
    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `Delete appointment failed (${response.status}) for ${url}`,
            response.status,
        );
    }
}

function readCreatedAppointmentId(location: string | null): number | undefined {
    const path = location?.split(/[?#]/, 1)[0] ?? "";
    const match = path.match(/\/afspraken\/(\d+)\/?$/);
    if (!match?.[1]) return undefined;
    return safeAppointmentId(Number(match[1]));
}

async function readCreatedAppointmentIdFromBody(response: Response): Promise<number | undefined> {
    const text = await response.text();
    if (text.trim().length === 0) return undefined;

    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return undefined;
    }

    const source = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!source || typeof source !== "object") return undefined;
    const record = source as { Id?: unknown; id?: unknown };
    return safeAppointmentId(record.Id) ?? safeAppointmentId(record.id);
}

function safeAppointmentId(value: unknown): number | undefined {
    return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function formatDateTime(value: string | Date, field: "start" | "end"): string {
    if (typeof value === "string") {
        if (value.length === 0) throw new Error(`Create appointment requires a valid ${field} time`);
        return value;
    }
    if (!Number.isFinite(value.getTime())) {
        throw new Error(`Create appointment requires a valid ${field} time`);
    }
    return value.toISOString();
}

function formatDate(value: string | Date, field: "from" | "to"): string {
    if (typeof value === "string") return value;
    if (!Number.isFinite(value.getTime())) {
        throw new Error(`Schedule requires a valid ${field} date`);
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
