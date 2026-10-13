import { expect, mock, test } from "bun:test";

mock.module("@/lib/magister/repository", () => ({
  createMagisterClient: async () => ({
    getPersonId: async () => "42",
    getStudyGuideWithFiles: async () => ({
      guide: {
        Id: 13494,
        Titel: "G EN HAVO 5",
        Onderdelen: {
          Items: [
            {
              Id: 69601,
              Titel: "Spreekvaardigheid Deel 1 Presentatie (PTA 654)",
              Omschrijving: "Short description",
              Volgnummer: 1,
            },
            {
              Id: 69587,
              Titel: "Planning & PTA",
              Omschrijving: "The PTA is in the bijlage",
              Volgnummer: 2,
            },
          ],
        },
      },
      parts: [
        { part: { Id: 69601 }, files: [] },
        {
          part: { Id: 69587 },
          files: [{
            id: "99",
            fileId: 99,
            name: "PTA.pdf",
            href: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
            size: 2048,
            contentType: "application/pdf",
          }],
        },
      ],
    }),
  }),
}));

const { registerMagisterTools } = await import("./server");

test("get_study_guide returns part attachments with download URLs", async () => {
  const callbacks = new Map<string, (...args: any[]) => Promise<any>>();
  registerMagisterTools({
    registerTool(name: unknown, ...args: unknown[]) {
      callbacks.set(String(name), args.at(-1) as (...args: any[]) => Promise<any>);
    },
  });

  const result = await callbacks.get("get_study_guide")?.(
    { id: 13494 },
    { authInfo: { extra: { userId: "user-1" } } },
  );

  expect(result.isError).toBeUndefined();
  expect(result.structuredContent.parts[0].attachments).toEqual([]);
  expect(result.structuredContent.parts[1].attachments).toEqual([{
    id: 99,
    name: "PTA.pdf",
    contentType: "application/pdf",
    sizeBytes: 2048,
    downloadUrl: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
  }]);
});
