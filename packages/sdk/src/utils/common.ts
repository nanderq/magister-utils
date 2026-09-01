export function extractQueryParameter(url: string, parameter: string) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(parameter);
}