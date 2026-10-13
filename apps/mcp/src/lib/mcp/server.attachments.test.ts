import { expect, mock, test } from "bun:test";

mock.module("@/lib/magister/repository", () => ({
  createMagisterClient: async () => ({
    downloadAttachment: async (downloadUrl: string, options?: { fileName?: string }) => {
      if (downloadUrl.includes("timeout")) {
        const error = new Error("Attachment download timed out before the file was received.");
        error.name = "AttachmentDownloadError";
        throw error;
      }
      if (!downloadUrl.includes("/bijlagen/")) {
        const error = new Error("Invalid attachment download URL. Pass a study-guide or message bijlage downloadUrl from get_study_guide or get_message.");
        throw error;
      }
      return {
        kind: downloadUrl.includes("/studiewijzers/") ? "study_guide" : "message",
        bytes: Uint8Array.from([1, 2, 3, 4]),
        contentType: "application/pdf",
        fileName: options?.fileName ?? "PTA.pdf",
      };
    },
  }),
}));

const { registerMagisterTools } = await import("./server");

function callbacks() {
  const registered = new Map<string, (...args: any[]) => Promise<any>>();
  registerMagisterTools({
    registerTool(name: unknown, ...args: unknown[]) {
      registered.set(String(name), args.at(-1) as (...args: any[]) => Promise<any>);
    },
  });
  return registered;
}

test("download_attachment returns file bytes for a study-guide downloadUrl", async () => {
  const download = callbacks().get("download_attachment");
  const result = await download?.(
    {
      downloadUrl: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
    },
    { authInfo: { extra: { userId: "user-1" } } },
  );

  expect(result.isError).toBeUndefined();
  expect(result.structuredContent).toMatchObject({
    kind: "study_guide",
    name: "PTA.pdf",
    contentType: "application/pdf",
    sizeBytes: 4,
    dataBase64: "AQIDBA==",
  });
  expect(result.content[0]).toEqual({
    type: "resource",
    resource: {
      uri: "magister-attachment://study_guide/PTA.pdf",
      mimeType: "application/pdf",
      blob: "AQIDBA==",
    },
  });
  expect(JSON.parse(result.content[1].text).dataBase64).toBe("AQIDBA==");
});

test("download_attachment reports an invalid bijlage URL", async () => {
  const download = callbacks().get("download_attachment");
  const result = await download?.(
    { downloadUrl: "https://school.magister.net/api/account" },
    { authInfo: { extra: { userId: "user-1" } } },
  );

  expect(result.isError).toBe(true);
  expect(result.structuredContent.error).toEqual({
    code: "INVALID_ARGUMENT",
    message: "Invalid attachment download URL. Pass a study-guide or message bijlage downloadUrl from get_study_guide or get_message.",
  });
  expect(result.content.some((item: { type: string }) => item.type === "resource")).toBe(false);
});

test("download_attachment reports a timeout instead of hanging", async () => {
  const download = callbacks().get("download_attachment");
  const result = await download?.(
    { downloadUrl: "https://school.magister.net/api/leerlingen/42/studiewijzers/1/onderdelen/2/bijlagen/3?timeout=1" },
    { authInfo: { extra: { userId: "user-1" } } },
  );

  expect(result.isError).toBe(true);
  expect(result.structuredContent.error).toEqual({
    code: "UPSTREAM_TIMEOUT",
    message: "Attachment download timed out before the file was received.",
  });
  expect(result.content.some((item: { type: string }) => item.type === "resource")).toBe(false);
});
