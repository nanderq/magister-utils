import { MagisterRequestError } from "../errors";

export function extractQueryParameter(url: string, parameter: string) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(parameter);
}

export async function getJson<T extends object>(
    url: string,
    accessToken: string,
    label: string,
): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        throw new MagisterRequestError(
            `${label} request failed (${response.status}) for ${url}`,
            response.status,
        );
    }

    const payload = await response.json() as unknown;
    if (!payload || typeof payload !== "object") {
        throw new Error(`${label} response was not an object`);
    }
    return payload as T;
}
