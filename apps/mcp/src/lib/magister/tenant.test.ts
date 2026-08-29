import { describe, expect, test } from "bun:test";

import { normalizeSchoolHost, schoolUrlError } from "./tenant";

describe("school URL validation", () => {
  test("accepts a full HTTPS Magister URL", () => {
    expect(normalizeSchoolHost("https://school.magister.net")).toBe(
      "school.magister.net",
    );
  });

  test("accepts a bare tenant hostname", () => {
    expect(normalizeSchoolHost("school.magister.net")).toBe("school.magister.net");
  });

  test("keeps the host when a path is present", () => {
    expect(normalizeSchoolHost("https://school.magister.net/magister/")).toBe(
      "school.magister.net",
    );
  });

  test("rejects an empty value", () => {
    expect(schoolUrlError("   ")).toBe("School URL is required");
  });

  test("rejects HTTP URLs", () => {
    expect(schoolUrlError("http://school.magister.net")).toBe(
      "Enter a valid HTTPS Magister school URL",
    );
  });

  test("rejects malformed URLs", () => {
    expect(schoolUrlError("https://")).toBe("Enter a valid Magister school URL");
  });
});
