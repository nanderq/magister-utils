import { type Account, type Enrollment } from "../types";
import { getJson } from "../utils/common";

export async function getAccount(
    baseUrl: string,
    accessToken: string,
  ): Promise<Account> {
    const account = await getJson<Partial<Account>>(
      `${baseUrl}/account?noCache=0`,
      accessToken,
      "Account",
    );
    if (!account.Persoon || typeof account.Persoon.Id !== "number") {
      throw new Error("Account response did not contain a valid person");
    }
    return account as Account;
  }

export async function getEnrollments<Latest extends boolean = false>(
    baseUrl: string,
    accessToken: string,
    personId: number,
    options: { begin?: string; latest?: Latest } = {},
): Promise<Latest extends true ? Enrollment : Enrollment[]> {
    const query = new URLSearchParams({ begin: options.begin ?? "1970-01-01" });
    const url = `${baseUrl}/leerlingen/${personId}/aanmeldingen?${query.toString()}`;
    const data = await getJson<{ items?: Enrollment[]; Items?: Enrollment[] }>(
        url,
        accessToken,
        "Enrollment",
    );
    const enrollments = data.items ?? data.Items ?? [];
    if (!Array.isArray(enrollments)) {
        throw new Error("Enrollment response did not contain an items array");
    }
    return (options.latest ? latestEnrollment(enrollments) : enrollments) as Latest extends true
        ? Enrollment
        : Enrollment[];
}

function enrollmentEnd(enrollment: Enrollment): number {
    const ms = Date.parse(enrollment.einde);
    return Number.isFinite(ms) ? ms : -1;
}

function latestEnrollment(enrollments: Enrollment[]): Enrollment {
    const valid = enrollments.filter((item) => item.id > 0);
    if (valid.length === 0) {
        throw new Error("No school years found");
    }
    return valid.reduce((current, next) =>
        enrollmentEnd(next) > enrollmentEnd(current) ? next : current,
    );
}
