import type { AssignmentDetail, AssignmentItem } from "../types";
import { getJson } from "../utils/common";

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
