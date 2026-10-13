import * as readline from "readline/promises";

import { MagisterClient, TokenStore } from "magister-sdk";

export async function runSetup(store: TokenStore): Promise<void> {
  const tokensPath = store.path;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function print(message: string) {
    process.stdout.write(`${message}\n`);
  }

  function separator() {
    print("─".repeat(60));
  }

  async function ask(question: string): Promise<string> {
    return (await rl.question(question)).trim();
  }

  async function askPassword(question: string): Promise<string> {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      return ask(question);
    }

    // Read the secret ourselves so it never appears in terminal output.
    rl.close();
    process.stdout.write(question);
    return new Promise((resolve) => {
      let password = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const finish = () => {
        process.stdin.setRawMode(false);
        process.stdin.off("data", onData);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(password);
      };
      const onData = (data: Buffer | string) => {
        const input = data.toString("utf8");
        if (input === "\r" || input === "\n") return finish();
        if (input === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(0);
        }
        if (input === "\u007f" || input === "\b") {
          password = password.slice(0, -1);
          return;
        }
        if (input >= " ") password += input;
      };

      process.stdin.on("data", onData);
    });
  }

  try {
    print("");
    print("Magister CLI — Auth Setup");
    separator();
    print("Enter your Magister school details:");
    print("");

    const tenant = await ask("School URL (e.g. https://school.magister.net): ");
    const username = await ask("Username (email): ");
    const password = await askPassword("Password: ");
    if (!tenant || !username || !password) throw new Error("All fields are required");

    separator();
    print("Signing in to Magister...");
    const client = new MagisterClient(tenant, username, password, store);
    await client.login();
    const account = await client.account();
    separator();
    print(`Logged in as: ${account.Persoon.Roepnaam ?? username}`);
    print(`Tokens saved to: ${tokensPath}`);
    print("Setup complete. You can now use the Magister CLI:");
    print("  mcli capabilities");
    separator();
  } catch (error) {
    process.exitCode = 1;
    print(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    rl.close();
  }
}
