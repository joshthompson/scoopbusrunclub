/**
 * Runs both fetch-results (athlete results) and fetch-parkrun (parkrun-specific
 * data such as volunteering) sequentially with a pause in between.
 *
 * Usage:
 *   npx tsx scripts/fetch-all.ts
 *   npx tsx scripts/fetch-all.ts --env=prod
 *
 *   # Dry run (passes --dry to both scripts, no pauses):
 *   npx tsx scripts/fetch-all.ts --dry
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { randomDelay, sleep } from "./shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pass through --env and --dry args
const envArg = process.argv.find((a) => a.startsWith("--env="));
const envFlag = envArg ? ` ${envArg}` : "";
const isDryRun = process.argv.includes("--dry");
const dryFlag = isDryRun ? " --dry" : "";

async function main() {
  // --- Step 1: fetch-results (athlete run results) ---
  console.log("=".repeat(60));
  console.log("Step 1: Running fetch-results (athlete results)...");
  console.log("=".repeat(60));

  try {
    execSync(`npx tsx scripts/fetch-results.ts${envFlag}${dryFlag}`, {
      cwd: dirname(__dirname), // api package root
      stdio: "inherit",
    });
  } catch (error) {
    console.error("fetch-results failed:", error);
    process.exit(1);
  }

  // --- Pause ---
  if (!isDryRun) {
    const delay = randomDelay({ min: 30_000, max: 60_000 });
    console.log(`\nPausing ${(delay / 1000).toFixed(1)}s between scripts...\n`);
    await sleep(delay);
  }

  // --- Step 2: fetch-parkrun (parkrun-specific: volunteers) ---
  console.log("=".repeat(60));
  console.log("Step 2: Running fetch-parkrun (volunteers)...");
  console.log("=".repeat(60));

  try {
    execSync(`npx tsx scripts/fetch-parkrun.ts${envFlag}${dryFlag}`, {
      cwd: dirname(__dirname), // api package root
      stdio: "inherit",
    });
  } catch (error) {
    console.error("fetch-parkrun failed:", error);
    process.exit(1);
  }

  console.log("\n✓ fetch-all complete.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
