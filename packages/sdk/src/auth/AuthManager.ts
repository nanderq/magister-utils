import { generateRandomString, generateRandomHex, sha256Base64Url } from "../utils/generator";
import {
    MAGISTER_ACCOUNTS_URL,
    MAGISTER_API_DISCOVERY_URL,
    MAGISTER_CLIENT_ID,
    MAGISTER_REDIRECT_URI,
} from "../constants";
import { TokenStore } from "./token-store";
import type { Session, Tokens } from "../types";

export interface AuthManagerOptions {
    tenant: string;
    username: string;
    password: string;
    authCode?: string;
    tokenStore?: TokenStore;
}

interface ChallengeResult {
    action?: string;
    redirectURL?: string;
    error?: string;
}

export class AuthManager {
    private readonly tenant: string;
    private readonly username: string;
    private readonly password: string;
    private readonly authCode?: string;
    private readonly tokenStore: TokenStore;
    private tokens: Tokens | null = null;
    private cachedBaseUrl: string | null = null;
    private sessionPromise: Promise<Session> | null = null;
    private loginPromise: Promise<Session> | null = null;
    private refreshPromise: Promise<Session> | null = null;

    constructor(options: AuthManagerOptions) {
        this.tenant = normalizeTenantHost(options.tenant);
        this.username = options.username.trim();
        this.password = options.password;
        this.authCode = options.authCode;
        this.tokenStore = options.tokenStore ?? new TokenStore();

        if (!this.username) throw new Error("Username is required");
        if (!this.password) throw new Error("Password is required");
    }

    async login(): Promise<Session> {
        if (this.loginPromise) return this.loginPromise;

        this.loginPromise = this.performLogin().finally(() => {
            this.loginPromise = null;
        });
        return this.loginPromise;
    }

    private async performLogin(): Promise<Session> {
        this.clearSession();
        const { code, codeVerifier } = await this.getAuthorizationCode();
        const tokens = await this.fetchTokens(code, codeVerifier);
        await this.tokenStore.store(tokens);
        this.tokens = tokens;
        return this.session();
    }

    async session(): Promise<Session> {
        if (this.hasUsableSession()) return this.currentSession();

        if (!this.sessionPromise) {
            this.sessionPromise = this.loadSession()
                .catch((error) => {
                    this.cachedBaseUrl = null;
                    throw error;
                })
                .finally(() => {
                    this.sessionPromise = null;
                });
        }

        return this.sessionPromise;
    }

    async hasSession(): Promise<boolean> {
        if (this.isUsable(this.tokens)) return true;

        try {
            const tokens = await this.tokenStore.read();
            return this.isUsable(tokens) || tokens.refreshToken.length > 0;
        } catch {
            return false;
        }
    }

    async logout(): Promise<void> {
        await this.deleteTokens();
    }

    async refresh(): Promise<Session> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = this.performRefresh().finally(() => {
            this.refreshPromise = null;
        });
        return this.refreshPromise;
    }

    private async performRefresh(): Promise<Session> {
        const tokens = this.tokens ?? await this.tokenStore.read();
        const refreshed = await this.refreshTokens(tokens);
        await this.tokenStore.store(refreshed);
        this.tokens = refreshed;
        this.cachedBaseUrl = null;
        const baseUrl = await this.ensureBaseUrl(refreshed.accessToken);
        return { ...refreshed, baseUrl };
    }

    async readTokens(): Promise<Tokens> {
        return this.ensureTokens();
    }

    async storeTokens(tokens: Tokens): Promise<void> {
        this.tokens = tokens;
        this.cachedBaseUrl = null;
        this.sessionPromise = null;
        return this.tokenStore.store(tokens);
    }

    async deleteTokens(): Promise<void> {
        this.clearSession();
        return this.tokenStore.delete();
    }

    async baseUrl(): Promise<string> {
        return (await this.session()).baseUrl;
    }

    private isUsable(tokens: Tokens | null): boolean {
        return tokens !== null && tokens.expiresAt > Date.now();
    }

    private hasUsableSession(): boolean {
        return this.isUsable(this.tokens) && this.cachedBaseUrl !== null;
    }

    private currentSession(): Session {
        if (!this.tokens || !this.cachedBaseUrl) {
            throw new Error("No Magister session");
        }

        return { ...this.tokens, baseUrl: this.cachedBaseUrl };
    }

    private async loadSession(): Promise<Session> {
        const tokens = await this.ensureTokens();
        const baseUrl = await this.ensureBaseUrl(tokens.accessToken);
        return { ...tokens, baseUrl };
    }

    private async ensureTokens(): Promise<Tokens> {
        if (this.tokens && this.isUsable(this.tokens)) {
            return this.tokens;
        }

        const tokens = await this.tokenStore.read();
        if (this.isUsable(tokens)) {
            this.tokens = tokens;
            return tokens;
        }

        if (tokens.refreshToken) {
            const refreshed = await this.refreshTokens(tokens);
            await this.tokenStore.store(refreshed);
            this.tokens = refreshed;
            this.cachedBaseUrl = null;
            return refreshed;
        }

        this.tokens = null;
        throw new Error("Magister session expired. Call login() again.");
    }

    private async ensureBaseUrl(accessToken: string): Promise<string> {
        if (this.cachedBaseUrl) return this.cachedBaseUrl;
        this.cachedBaseUrl = await resolveBaseUrl(accessToken);
        return this.cachedBaseUrl;
    }

    private clearSession(): void {
        this.tokens = null;
        this.cachedBaseUrl = null;
        this.sessionPromise = null;
    }

    private async getAuthorizationCode(): Promise<{ code: string; codeVerifier: string }> {
        const codeVerifier = generateRandomString(64);
        const codeChallenge = await sha256Base64Url(codeVerifier);
        const authUrl = buildAuthorizationUrl(codeChallenge, this.tenant, this.username);
        const cookies = new CookieJar();
        const noRedirects: RequestInit = { redirect: "manual" };

        const authorizeResponse = await fetch(authUrl, noRedirects);
        cookies.addFrom(authorizeResponse.headers);
        const authorizeLocation = requireHeader(authorizeResponse, "location");

        const bootstrapResponse = await fetch(new URL(authorizeLocation, MAGISTER_ACCOUNTS_URL), noRedirects);
        cookies.addFrom(bootstrapResponse.headers);

        const challengeUrl = new URL(requireHeader(bootstrapResponse, "location"), MAGISTER_ACCOUNTS_URL);
        const sessionId = challengeUrl.searchParams.get("sessionId");
        const returnUrl = challengeUrl.searchParams.get("returnUrl");
        if (!sessionId || !returnUrl) {
            throw new Error("Magister did not start a username/password challenge");
        }

        const xsrfToken = readXsrfToken(cookies);
        const challengeHeaders = () => ({
            "Content-Type": "application/json",
            Cookie: cookies.toHeader(),
            "X-XSRF-TOKEN": xsrfToken,
        });
        const challengeBody = (value: Record<string, unknown>) =>
            JSON.stringify({ authCode: this.authCode, sessionId, returnUrl, ...value });

        const usernameResponse = await fetch(`${MAGISTER_ACCOUNTS_URL}/challenges/username`, {
            method: "POST",
            body: challengeBody({ username: this.username }),
            headers: challengeHeaders(),
        });
        cookies.addFrom(usernameResponse.headers);
        await validate(usernameResponse);

        const passwordResponse = await fetch(`${MAGISTER_ACCOUNTS_URL}/challenges/password`, {
            method: "POST",
            body: challengeBody({ password: this.password }),
            headers: challengeHeaders(),
        });
        cookies.addFrom(passwordResponse.headers);
        await validate(passwordResponse);
        const passwordChallenge = await readChallengeResult(passwordResponse);

        let authorizationTarget = passwordChallenge.redirectURL ?? returnUrl;
        if (passwordChallenge.action === "pairfidopromo") {
            const skipResponse = await fetch(`${MAGISTER_ACCOUNTS_URL}/challenges/skip-pair-fido-promo`, {
                method: "POST",
                body: challengeBody({
                    reason: "browser-not-supported",
                    userVerifyingPlatformAuthenticator: null,
                }),
                headers: challengeHeaders(),
            });
            cookies.addFrom(skipResponse.headers);
            await validate(skipResponse);
            const skipChallenge = await readChallengeResult(skipResponse);
            if (!skipChallenge.redirectURL) {
                throw new Error("Magister did not finish the passkey promotion");
            }
            authorizationTarget = skipChallenge.redirectURL;
        }

        const callbackResponse = await fetch(new URL(authorizationTarget, MAGISTER_ACCOUNTS_URL), {
            redirect: "manual",
            headers: { Cookie: cookies.toHeader() },
        });
        const redirectUrl = requireHeader(callbackResponse, "location");
        const parsed = new URL(redirectUrl, MAGISTER_ACCOUNTS_URL);
        const code = new URLSearchParams(parsed.hash.slice(1)).get("code") ?? parsed.searchParams.get("code");
        if (!code) {
            throw new Error("Magister did not return an authorization code");
        }

        return { code, codeVerifier };
    }

    private async fetchTokens(code: string, codeVerifier: string): Promise<Tokens> {
        const response = await fetch(`${MAGISTER_ACCOUNTS_URL}/connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                redirect_uri: MAGISTER_REDIRECT_URI,
                client_id: MAGISTER_CLIENT_ID,
                grant_type: "authorization_code",
                code_verifier: codeVerifier,
            }).toString(),
        });

        const payload = (await response.json()) as {
            access_token?: string;
            refresh_token?: string;
            id_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };

        if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.id_token) {
            throw new Error(
                payload.error_description ?? payload.error ?? `Token exchange failed (${response.status})`,
            );
        }

        return {
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            idToken: payload.id_token,
            expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
        };
    }

    private async refreshTokens(tokens: Tokens): Promise<Tokens> {
        const response = await fetch(`${MAGISTER_ACCOUNTS_URL}/connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: MAGISTER_CLIENT_ID,
                grant_type: "refresh_token",
                refresh_token: tokens.refreshToken,
            }).toString(),
        });
        const payload = await response.json() as {
            access_token?: string;
            refresh_token?: string;
            id_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };
        if (!response.ok || !payload.access_token) {
            throw new Error(
                payload.error_description ?? payload.error ?? `Token refresh failed (${response.status})`,
            );
        }
        return {
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token ?? tokens.refreshToken,
            idToken: payload.id_token ?? tokens.idToken,
            expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
        };
    }
}

async function resolveBaseUrl(accessToken: string): Promise<string> {
    const response = await fetch(MAGISTER_API_DISCOVERY_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.text();

    if (!response.ok) {
        throw new Error(`Base URL request failed (${response.status})`);
    }

    const data = JSON.parse(body) as { links?: { href?: string }[] };
    const href = data.links?.[0]?.href;
    if (!href) throw new Error("Could not resolve Magister base URL");

    return `${new URL(href).origin}/api`;
}

function buildAuthorizationUrl(codeChallenge: string, tenant: string, username: string): string {
    const url = new URL(`${MAGISTER_ACCOUNTS_URL}/connect/authorize`);
    url.searchParams.set("client_id", MAGISTER_CLIENT_ID);
    url.searchParams.set("redirect_uri", MAGISTER_REDIRECT_URI);
    url.searchParams.set("scope", "openid profile offline_access magister.mobile magister.ecs");
    url.searchParams.set("response_type", "code id_token");
    url.searchParams.set("state", generateRandomString());
    url.searchParams.set("nonce", generateRandomHex(32));
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("acr_values", `tenant:${tenant}`);
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("login_hint", username);
    return url.toString();
}

function normalizeTenantHost(tenant: string): string {
    const value = tenant.trim();
    if (!value) throw new Error("School URL is required");

    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "https:" || !url.hostname) {
        throw new Error("Enter a valid HTTPS Magister school URL");
    }

    return url.host;
}

function readXsrfToken(cookies: CookieJar): string {
    const xsrfCookie = cookies.get("XSRF-TOKEN");
    if (!xsrfCookie) throw new Error("Magister did not return an XSRF token");

    try {
        return decodeURIComponent(xsrfCookie);
    } catch {
        return xsrfCookie;
    }
}

function requireHeader(response: Response, name: string): string {
    const value = response.headers.get(name);
    if (!value) {
        throw new Error(`Magister did not return a ${name} header`);
    }
    return value;
}

async function validate(response: Response): Promise<void> {
    if (response.status === 200) {
        return;
    }

    const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        error_description?: string;
    };
    throw new Error(
        data.error_description ?? data.error ?? `Magister authentication failed (${response.status})`,
    );
}

async function readChallengeResult(response: Response): Promise<ChallengeResult> {
    if (!response.headers.get("content-type")?.includes("json")) return {};

    const result = (await response.clone().json()) as ChallengeResult;
    if (result.error) throw new Error(result.error);
    return result;
}

class CookieJar {
    private readonly cookies = new Map<string, string>();

    addFrom(headers: Headers): void {
        for (const cookie of getSetCookieHeaders(headers)) {
            const pair = cookie.split(";", 1)[0]?.trim();
            const separator = pair?.indexOf("=") ?? -1;
            if (!pair || separator <= 0) continue;
            this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
    }

    get(name: string): string | undefined {
        return this.cookies.get(name);
    }

    toHeader(): string {
        return Array.from(this.cookies, ([name, value]) => `${name}=${value}`).join("; ");
    }
}

function getSetCookieHeaders(headers: Headers): string[] {
    const setCookie = headers.getSetCookie();
    if (setCookie.length) return setCookie;

    const combined = headers.get("set-cookie");
    return combined ? combined.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g) : [];
}
