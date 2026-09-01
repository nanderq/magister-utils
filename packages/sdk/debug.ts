import { MagisterClient } from "@magister/sdk";

const tenant = process.env.MAGISTER_TENANT;
const username = process.env.MAGISTER_USERNAME;
const password = process.env.MAGISTER_PASSWORD;

if (!tenant || !username || !password) {
    throw new Error("Set MAGISTER_TENANT, MAGISTER_USERNAME, and MAGISTER_PASSWORD");
}

const client = new MagisterClient(tenant, username, password);

const tokens = await client.login();
console.log(tokens);
