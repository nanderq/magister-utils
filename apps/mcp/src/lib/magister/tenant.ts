/** Mirrors `normalizeTenantHost` in `@magister/shared` so step 1 can validate without Node APIs. */
export function normalizeSchoolHost(tenant: string): string {
  const value = tenant.trim();
  if (!value) throw new Error("School URL is required");

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("Enter a valid Magister school URL");
  }

  if (url.protocol !== "https:" || !url.hostname) {
    throw new Error("Enter a valid HTTPS Magister school URL");
  }

  return url.host;
}

export function schoolUrlError(tenant: string): string | null {
  try {
    normalizeSchoolHost(tenant);
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Enter a valid Magister school URL";
  }
}
