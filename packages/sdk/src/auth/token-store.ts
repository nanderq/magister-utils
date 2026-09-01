import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Tokens } from "../types";

export interface TokenStoreOptions {
    path?: string;
}

export class TokenStore {
    readonly path: string;

    constructor(options: TokenStoreOptions = {}) {
        this.path = options.path ?? defaultTokenStorePath();
    }

    async store(tokens: Tokens): Promise<void> {
        await mkdir(dirname(this.path), { recursive: true });
        await Bun.write(this.path, `${JSON.stringify(tokens, null, 2)}\n`);
    }

    async read(): Promise<Tokens> {
        const file = Bun.file(this.path);
        if (!(await file.exists())) {
            throw new Error(`No token file at ${this.path}`);
        }

        const tokens = (await file.json()) as Partial<Tokens>;
        return tokens as Tokens;
    }

    async delete(): Promise<void> {
        try {
            await unlink(this.path);
        } catch (error) {
            if ((error as { code?: string }).code !== "ENOENT") throw error;
        }
    }
}

function defaultTokenStorePath(): string {
    return process.env.MAGISTER_TOKENS_FILE
        ?? join(process.env.HOME ?? ".", ".config", "magister", "tokens.json");
}
