/**
 * Special (non-Saturday) parkrun event day detection.
 * Returns the name of the special event for a given date, or null if it's a normal day.
 */

/** Fixed MM-DD → event name mapping */
const FIXED_SPECIAL_DAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "03-11": "Lithuanian Independence Restoration Day",
  "04-27": "Freedom Day",        // South Africa
  "05-04": "Greenery Day",       // Japan
  "07-01": "Canada Day",
  "08-09": "National Day",       // Singapore
  "09-16": "Malaysia Day",
  "10-03": "German Unity Day",
  "10-26": "Austrian National Day",
  "12-25": "Christmas Day",
  "12-26": "Boxing Day",
};

// ---------- Dynamic date helpers ----------

/** Compute Easter Sunday for a given year (Anonymous Gregorian algorithm) */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function toMMDD(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dynamic special days that depend on Easter or other yearly calculations */
function getDynamicSpecialDays(year: number): Record<string, string> {
  const easter = easterSunday(year);

  const ascension = new Date(easter);
  ascension.setDate(ascension.getDate() + 39);

  const whitMon = new Date(easter);
  whitMon.setDate(whitMon.getDate() + 50);

  const nov1 = new Date(year, 10, 1);
  const dayOfWeek = nov1.getDay();
  const firstThursday = dayOfWeek <= 4 ? 1 + (4 - dayOfWeek) : 1 + (11 - dayOfWeek);
  const fourthThursday = firstThursday + 21;
  const thanksgivingDate = new Date(year, 10, fourthThursday);

  return {
    [toMMDD(ascension)]: "Ascension Day",
    [toMMDD(whitMon)]: "Whit Monday",
    [toMMDD(thanksgivingDate)]: "Thanksgiving",
  };
}

/**
 * Given a date string (YYYY-MM-DD), returns the special event name or null.
 */
export function getSpecialDayName(dateStr: string): string | null {
  const mmdd = dateStr.slice(5); // "MM-DD"

  // Check fixed dates first
  if (FIXED_SPECIAL_DAYS[mmdd]) return FIXED_SPECIAL_DAYS[mmdd];

  // Check dynamic dates for the year
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return null;

  const dynamic = getDynamicSpecialDays(year);
  return dynamic[mmdd] ?? null;
}
