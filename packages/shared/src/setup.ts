import * as readline from "readline/promises";
import puppeteer, { type Page } from "puppeteer";

import {
  buildGlobalAuthState,
  exchangeCodeForTokens,
  generateLoginURL,
  generateRandomString,
  loadStoredTokens,
  NATIVE_REDIRECT_URI,
  parseAuthResponse,
  refreshTokens,
  writeTokensFile,
  getGlobalTokensFilePath,
} from "./magister.ts";

// ---------------------------------------------------------------------------
// Puppeteer helpers (extracted from auth.ts)
// ---------------------------------------------------------------------------

const USERNAME_SELECTORS = [
  "input#username",
  "input#i0116",
  'input[name="username"]',
  'input[name="loginfmt"]',
  'input[type="email"]',
  'input[autocomplete="username"]',
  'input[type="text"]',
];

const PASSWORD_SELECTORS = [
  "input#password",
  "input#i0118",
  'input[name="password"]',
  'input[name="passwd"]',
  'input[type="password"]',
  'input[autocomplete="current-password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button[id="idSIButton9"]',
  'input[id="idSIButton9"]',
];

async function findVisibleSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const handle = await page.$(selector);
    if (!handle) continue;
    const isVisible = await handle.isVisible().catch(() => false);
    await handle.dispose();
    if (isVisible) return selector;
  }
  return null;
}

async function waitForVisibleSelector(
  page: Page,
  selectors: string[],
  timeout: number,
): Promise<string | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const selector = await findVisibleSelector(page, selectors);
    if (selector) return selector;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function submitCurrentStep(page: Page) {
  const submitSelector = await findVisibleSelector(page, SUBMIT_SELECTORS);
  if (submitSelector) {
    await page.click(submitSelector);
    return;
  }
  await page.keyboard.press("Enter");
}

async function completeUsernameStep(page: Page, username: string): Promise<boolean> {
  const usernameSelector = await findVisibleSelector(page, USERNAME_SELECTORS);
  if (!usernameSelector) return false;
  await page.locator(usernameSelector).fill(username);
  await submitCurrentStep(page);
  return true;
}

async function completePasswordStep(page: Page, password: string): Promise<boolean> {
  const passwordSelector = await waitForVisibleSelector(page, PASSWORD_SELECTORS, 30000);
  if (!passwordSelector) return false;
  await page.locator(passwordSelector).fill(password);
  await submitCurrentStep(page);
  return true;
}

async function waitForAuthRedirect(page: Page): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      page.off("console", handleConsole);
      reject(new Error("Authentication timed out after 60 s"));
    }, 60_000);

    const handleConsole = (msg: { text: () => string }) => {
      const text = msg.text();
      if (!text.includes("m6loapp://oauth2redirect")) return;
      const match = text.match(/'([^']+)'/);
      if (!match?.[1]) return;
      clearTimeout(timeout);
      page.off("console", handleConsole);
      resolve(match[1]);
    };

    page.on("console", handleConsole);
  });
}

// ---------------------------------------------------------------------------
// Exported setup entry point
// ---------------------------------------------------------------------------

export async function runSetup(): Promise<void> {
  const TOKENS_PATH = getGlobalTokensFilePath();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function print(msg: string) {
    process.stdout.write(msg + "\n");
  }

  function separator() {
    print("─".repeat(60));
  }

  async function ask(question: string): Promise<string> {
    return (await rl.question(question)).trim();
  }

  async function askPassword(question: string): Promise<string> {
    process.stdout.write(question);
    rl.pause();

    return new Promise((resolve) => {
      let password = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onData = (data: Buffer | string) => {
        const char = data.toString("utf8");
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          rl.resume();
          resolve(password);
        } else if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(0);
        } else if (char === "\u007f" || char === "\b") {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char >= " ") {
          password += char;
          process.stdout.write("•");
        }
      };

      process.stdin.on("data", onData);
    });
  }

  try {
    print("");
    print("Magister CLI — Auth Setup");
    separator();

    // Check for existing tokens
    const existing = await loadStoredTokens(TOKENS_PATH);
    if (existing) {
      print(`Found existing tokens at: ${TOKENS_PATH}`);
      print("Verifying...");
      try {
        const state = await buildGlobalAuthState(existing);
        print(`Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
        separator();
        const answer = await ask("Re-authenticate? [y/N] ");
        if (answer.toLowerCase() !== "y") {
          print("Nothing to do. Exiting.");
          rl.close();
          process.exit(0);
        }
      } catch {
        print("Tokens appear expired. Trying to refresh...");
        try {
          const refreshed = await refreshTokens(existing.refresh_token);
          await writeTokensFile(TOKENS_PATH, refreshed);
          const state = await buildGlobalAuthState(refreshed);
          print(`Refreshed. Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
          print(`Tokens saved to: ${TOKENS_PATH}`);
          rl.close();
          process.exit(0);
        } catch {
          print("Refresh failed. Starting fresh login.");
        }
      }
    }

    separator();
    print("Enter your Magister school details:");
    print("");

    const tenantUrl = await ask("School URL (e.g. https://school.magister.net): ");
    const username  = await ask("Username (email): ");
    const password  = await askPassword("Password: ");

    if (!tenantUrl || !username || !password) {
      print("All fields are required. Aborting.");
      rl.close();
      process.exit(1);
    }

    separator();
    print("Starting headless browser login...");
    separator();

    const codeVerifier = generateRandomString(50);
    const loginUrl = await generateLoginURL(codeVerifier, {
      tenant: tenantUrl,
      username,
      redirectUri: NATIVE_REDIRECT_URI,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
      page.waitForNetworkIdle({ idleTime: 1000, timeout: 60000 }).catch(() => {});

      const filledUsername = await completeUsernameStep(page, username);
      if (filledUsername) print("Username submitted.");

      const filledPassword = await completePasswordStep(page, password);
      if (!filledPassword) {
        throw new Error("No password field found on the auth page. Check that your school URL is correct.");
      }
      print("Password submitted. Waiting for redirect...");

      const redirectUrl = await waitForAuthRedirect(page);
      print("Redirect captured.");

      const { code, error, errorDescription } = parseAuthResponse(redirectUrl);
      if (error || !code) {
        throw new Error(errorDescription ?? error ?? "Unknown auth error");
      }

      print("Exchanging authorization code for tokens...");
      const tokens = await exchangeCodeForTokens(code, codeVerifier, NATIVE_REDIRECT_URI);

      await writeTokensFile(TOKENS_PATH, tokens);
      print(`Tokens saved to: ${TOKENS_PATH}`);

      print("Verifying...");
      const state = await buildGlobalAuthState(tokens);

      separator();
      print(`Logged in as: ${state.name ?? state.accountInfo.preferred_username ?? "unknown"}`);
      print("Setup complete. You can now use the Magister CLI:");
      print("  mcli capabilities");
      separator();
    } finally {
      await browser.close();
    }
  } catch (err) {
    print(`\nError: ${err instanceof Error ? err.message : String(err)}`);
    rl.close();
    process.exit(1);
  }

  rl.close();
}
