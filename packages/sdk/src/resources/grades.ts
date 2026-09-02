import type { GradeItem } from "../types";
import { getJson } from "../utils/common";
import { getEnrollments } from "./account";

export async function getGrades(
    baseUrl: string,
    accessToken: string,
    personId: number,
    {
        peildatum,
        actievePerioden = false,
        alleenBerekendeKolommen = false,
        alleenPTAKolommen = false,
    }: {
        peildatum?: string | Date;
        actievePerioden?: boolean;
        alleenBerekendeKolommen?: boolean;
        alleenPTAKolommen?: boolean;
    } = {},
): Promise<GradeItem[]> {
    const enrollment = await getEnrollments(baseUrl, accessToken, personId, {
        latest: true,
    });

    const date = peildatum instanceof Date
        ? peildatum
        : new Date(peildatum ?? enrollment.einde ?? Date.now());
    if (!Number.isFinite(date.getTime())) {
        throw new Error("Grades request requires a valid peildatum or enrollment end date");
    }
    const query = new URLSearchParams({
        actievePerioden: String(actievePerioden),
        alleenBerekendeKolommen: String(alleenBerekendeKolommen),
        alleenPTAKolommen: String(alleenPTAKolommen),
        peildatum: date.toISOString(),
    });
    const url = `${baseUrl}/personen/${personId}/aanmeldingen/${enrollment.id}/cijfers/cijferoverzichtvooraanmelding?${query.toString()}`;

    const data = await getJson<{ items?: unknown; Items?: unknown }>(
        url,
        accessToken,
        "Grades",
    );
    const items = data.items ?? data.Items;
    if (!Array.isArray(items)) {
        throw new Error("Grades response did not contain an items array");
    }
    return items as GradeItem[];
}
