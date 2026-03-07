// Cron scheduling is handled by GitHub Actions (fetch-parkrun.yml)
// instead of Convex crons, because Parkrun requires headless browser
// access via Playwright which can't run inside Convex actions.
//
// This file is kept as a placeholder. If you add Convex-native crons
// in the future, define them here.

import { cronJobs } from "convex/server";

const crons = cronJobs();

export default crons;
