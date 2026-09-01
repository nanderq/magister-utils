import { describe, expect, test } from "bun:test";

import MagisterClient from "../../src/client/MagisterClient";

describe("MagisterClient", () => {
  test("can be constructed with tenant, username, and password", () => {
    const client = new MagisterClient("school.magister.net", "student@example.com", "secret");

    expect(client).toBeInstanceOf(MagisterClient);
    expect(client.login).toBeInstanceOf(Function);
  });
});
