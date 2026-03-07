import { chromium } from "playwright";
import {
  parseRunnerData,
  parseRunResults,
} from "../lib/parsers";

const ATHLETE_ID = process.argv[2] || "8070821";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Fetch all results page
  const allUrl = `https://www.parkrun.org.uk/parkrunner/${ATHLETE_ID}/all/`;
  console.log(`Fetching ${allUrl}...`);
  const allPage = await context.newPage();
  await allPage.goto(allUrl, { waitUntil: "networkidle", timeout: 30000 });
  await allPage.waitForTimeout(2000);
  const allHtml = await allPage.content();
  await allPage.close();

  await browser.close();

  console.log(`\nHTML: ${allHtml.length} bytes\n`);

  console.log("--- Runner Data ---");
  const runner = parseRunnerData(allHtml);
  console.log(runner);

  console.log("\n--- Run Results ---");
  const runs = parseRunResults(allHtml);
  console.log(`${runs.length} results`);
  if (runs.length > 0) {
    console.log("First 3:", runs.slice(0, 3));
    console.log("Last 3:", runs.slice(-3));
  }
}

main().catch(console.error);
