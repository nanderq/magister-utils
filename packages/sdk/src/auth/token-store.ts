import { chmod, mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Tokens } from "../types";

export interface TokenStoreOptions {
    path?: string;
}

export interface TokenStoreAccount {
    tenant: string;
    username: string;
}

type StoredTokens = Partial<Tokens> & {
    account?: Partial<TokenStoreAccount>;
};

export class TokenStore {
    readonly path: string;

    constructor(options: TokenStoreOptions = {}) {
        this.path = options.path ?? defaultTokenStorePath();
    }

    async store(tokens: Tokens, account?: TokenStoreAccount): Promise<void> {
        await mkdir(dirname(this.path), { recursive: true });
        const stored: StoredTokens = account ? { ...tokens, account } : tokens;
        await writeFile(this.path, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
        await chmod(this.path, 0o600);
    }

    async read(account?: TokenStoreAccount): Promise<Tokens> {
        const file = Bun.file(this.path);
        if (!(await file.exists())) {
            throw new Error(`No token file at ${this.path}`);
        }

        const tokens = await file.json() as StoredTokens;
        if (
            typeof tokens.accessToken !== "string"
            || typeof tokens.refreshToken !== "string"
            || typeof tokens.idToken !== "string"
            || typeof tokens.expiresAt !== "number"
            || !Number.isFinite(tokens.expiresAt)
        ) {
            throw new Error(`Invalid token file at ${this.path}`);
        }
        if (
            account
            && (
                tokens.account?.tenant !== account.tenant
                || tokens.account.username !== account.username
            )
        ) {
            throw new Error(`Token file belongs to another Magister account: ${this.path}`);
        }

        const { accessToken, refreshToken, idToken, expiresAt } = tokens;
        return { accessToken, refreshToken, idToken, expiresAt };
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
