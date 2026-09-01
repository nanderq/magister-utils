import { AuthManager } from "../auth/AuthManager";
import { TokenStore } from "../auth/token-store";

class MagisterClient {
    private readonly auth: AuthManager;

    constructor(
        tenant: string,
        username: string,
        password: string,
        tokenStore?: TokenStore,
    ) {
        this.auth = new AuthManager({ tenant, username, password, tokenStore });
    }

    async login() {
        return this.auth.login();
    }
}

export default MagisterClient;
