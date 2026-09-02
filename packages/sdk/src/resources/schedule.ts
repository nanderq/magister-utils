import type { AppointmentDetail, ScheduleItem } from "../types";
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
