import { describe, expect, test } from "bun:test";

import { MagisterClient, type Tokens } from "./magister";

describe("MagisterClient token persistence", () => {
  test("notifies non-file token stores when tokens change", async () => {
    const initial: Tokens = { access_token: "a", refresh_token: "r", id_token: "i" };
    const next: Tokens = { access_token: "a2", refresh_token: "r2", id_token: "i2" };
    let persisted: Tokens | undefined;
    const client = new MagisterClient({
      tokens: initial,
      autoPersistTokens: false,
      onTokensChanged: async (tokens) => { persisted = tokens; },
    });
    await client.setTokens(next);
    expect(persisted).toEqual(next);
  });
});
