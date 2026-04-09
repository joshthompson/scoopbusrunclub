/**
 * Shared utilities for Parkrun scraping scripts.
 *
 * Used by fetch-results.ts, fetch-parkrun.ts, and fetch-all.ts.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// --- Tracked athletes ---

export const TRACKED_ATHLETES: { parkrunId: string; name: string }[] = [
  { parkrunId: "8070821", name: "Josh" },
  { parkrunId: "10663604", name: "Alisa" },
  { parkrunId: "7758658", name: "Adam" },
  { parkrunId: "5635044", name: "Keith" },
  { parkrunId: "6076813", name: "Sophie" },
  { parkrunId: "377595", name: "Claire" },
  { parkrunId: "8009111", name: "Lyra" },
  { parkrunId: "545803", name: "August" },
  { parkrunId: "850764", name: "Anna" },
  { parkrunId: "8943925", name: "Eline" },
  { parkrunId: "9679233", name: "Rick" },
  { parkrunId: "5346109", name: "Other Josh" },
];

export const TRACKED_IDS = new Set(TRACKED_ATHLETES.map((a) => a.parkrunId));

// --- Constants ---

/** Delay range (in ms) between fetches to avoid rate-limiting. */
export const DELAY_BETWEEN_FETCHES_MS = { min: 30_000, max: 60_000 };

/** Number of times to retry a failed page load before giving up. */
export const MAX_RETRIES = 4;

// --- Env loading ---

/**
 * Load environment variables from .env.{envName} file relative to the api package root.
 * Returns the env name used.
 */
export function loadEnv(importMetaUrl: string): string {
  const scriptDir = dirname(fileURLToPath(importMetaUrl));
  const envArg = process.argv.find((a) => a.startsWith("--env="));
  const envName = envArg ? envArg.split("=")[1] : "local";
  const envFile = resolve(scriptDir, `../.env.${envName}`);

  if (existsSync(envFile)) {
    console.log(`Loading env from: .env.${envName}`);
    const lines = readFileSync(envFile, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && !(key in process.env)) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  } else {
    console.warn(`Warning: env file not found: ${envFile}`);
  }

  return envName;
}

/**
 * Validate that required env vars are present. Exits if missing.
 */
export function requireEnvVars(): { convexSiteUrl: string; ingestSecret: string } {
  const convexSiteUrl = process.env.CONVEX_SITE_URL;
  const ingestSecret = process.env.INGEST_SECRET;

  if (!convexSiteUrl) {
    console.error("Missing CONVEX_SITE_URL environment variable");
    process.exit(1);
  }
  if (!ingestSecret) {
    console.error("Missing INGEST_SECRET environment variable");
    process.exit(1);
  }

  return { convexSiteUrl, ingestSecret };
}

// --- Helpers ---

export function randomDelay({ min, max }: { min: number; max: number }): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Browser ---

export type BrowserContext = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>;

/**
 * Launch a headless Chromium browser and create a context with Swedish locale
 * (so parkrun.se renders dates as YYYY-MM-DD) and a standard user agent.
 */
export async function launchBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  return { browser, context };
}

/**
 * Fetch a page's HTML content with retries and exponential backoff.
 */
export async function fetchPage(
  context: BrowserContext,
  url: string,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      const html = await page.content();
      return html;
    } catch (error) {
      if (attempt <= MAX_RETRIES) {
        const backoff = randomDelay({ min: 10_000, max: 20_000 });
        console.log(`  ⟳ Attempt ${attempt} failed, retrying in ${(backoff / 1000).toFixed(1)}s...`);
        await sleep(backoff);
      } else {
        throw error;
      }
    } finally {
      await page.close();
    }
  }
  throw new Error("Unreachable");
}

// --- API helpers ---

/**
 * Fetch a value from the appData key/value store via the HTTP API.
 */
export async function getAppDataValue(
  convexSiteUrl: string,
  ingestSecret: string,
  key: string,
): Promise<string | null> {
  const url = `${convexSiteUrl}/api/app-data?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ingestSecret}` },
  });

  if (!response.ok) {
    console.warn(`Warning: failed to fetch appData key "${key}" (${response.status})`);
    return null;
  }

  const data = await response.json();
  return data.value ?? null;
}
