import * as readline from "readline/promises";

import {
  buildGlobalAuthState,
  getGlobalTokensFilePath,
  loadStoredTokens,
  loginWithCredentials,
  refreshTokens,
  writeTokensFile,
} from "./magister.ts";

export async function runSetup(): Promise<void> {
  const tokensPath = getGlobalTokensFilePath();
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

    const existing = await loadStoredTokens(tokensPath);
    if (existing) {
      print(`Found existing tokens at: ${tokensPath}`);
      print("Verifying...");
      try {
        const state = await buildGlobalAuthState(existing);
        print(`Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
        separator();
        if ((await ask("Re-authenticate? [y/N] ")).toLowerCase() !== "y") {
          print("Nothing to do. Exiting.");
          return;
        }
      } catch {
        print("Tokens appear expired. Trying to refresh...");
        try {
          const refreshed = await refreshTokens(existing.refresh_token);
          await writeTokensFile(tokensPath, refreshed);
          const state = await buildGlobalAuthState(refreshed);
          print(`Refreshed. Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
          print(`Tokens saved to: ${tokensPath}`);
          return;
        } catch {
          print("Refresh failed. Starting fresh login.");
        }
      }
    }

    separator();
    print("Enter your Magister school details:");
    print("");

    const tenant = await ask("School URL (e.g. https://school.magister.net): ");
    const username = await ask("Username (email): ");
    const password = await askPassword("Password: ");
    if (!tenant || !username || !password) throw new Error("All fields are required");

    separator();
    print("Signing in to Magister...");
    const tokens = await loginWithCredentials({ tenant, username, password });
    await writeTokensFile(tokensPath, tokens);

    print("Verifying...");
    const state = await buildGlobalAuthState(tokens);
    separator();
    print(`Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
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
