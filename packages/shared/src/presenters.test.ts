import { describe, expect, test } from "bun:test";

import { presentStudyGuideDetail } from "./presenters";

describe("presentStudyGuideDetail", () => {
  const guide = {
    Id: 13494,
    Titel: "G EN HAVO 5",
    Van: "2026-08-01",
    TotEnMet: "2027-07-31",
    Onderdelen: {
      Items: [
        {
          Id: 69601,
          Titel: "Spreekvaardigheid Deel 1 Presentatie (PTA 654)",
          Omschrijving: "<p>Short description</p>",
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
  };

  test("always includes an attachments array on each part", () => {
    const presented = presentStudyGuideDetail(guide);

    expect(presented.parts).toEqual([
      {
        id: 69601,
        title: "Spreekvaardigheid Deel 1 Presentatie (PTA 654)",
        description: "Short description",
        order: 1,
        attachments: [],
      },
      {
        id: 69587,
        title: "Planning & PTA",
        description: "The PTA is in the bijlage",
        order: 2,
        attachments: [],
      },
    ]);
  });

  test("maps study-guide part files the same way as assignment attachments", () => {
    const presented = presentStudyGuideDetail(guide, {
      69587: [{
        id: "99",
        fileId: 99,
        name: "PTA.pdf",
        href: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
        size: 2048,
        contentType: "application/pdf",
      }],
    });

    expect(presented.parts[0]?.attachments).toEqual([]);
    expect(presented.parts[1]?.attachments).toEqual([{
      id: 99,
      name: "PTA.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      downloadUrl: "https://school.magister.net/api/leerlingen/42/studiewijzers/13494/onderdelen/69587/bijlagen/99",
    }]);
  });
});
