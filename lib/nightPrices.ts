// Prices that change by night: a weekend price and special prices for dates
// (festivals, holidays, seasons). The server decides what a stay costs
// (backend services/pricing.py nightly_rates); this mirrors it for showing
// prices, e.g. under each date in a calendar. Same file in the mobile app
// (lib/nightPrices.ts): keep the two in step. Copied from the website (frontend/lib/nightPrices.ts).
//
// A night is named by the date it starts on: "the night of Friday" is check-in
// Friday, check-out Saturday. Weekdays are 0 Monday … 6 Sunday (Python's
// date.weekday()), NOT JavaScript's getDay() (0 Sunday).

export interface PricePeriod {
  id?: number | null;
  label: string;
  /** The first and last night at this price, YYYY-MM-DD (end inclusive). */
  start_date: string;
  end_date: string;
  price_inr: number;
}

/** Nights of a stay at one price, as the server groups them. */
export interface NightGroup {
  kind: "base" | "weekend" | "special" | string;
  label?: string | null;
  rate_inr: number;
  nights: number;
  amount_inr: number;
  first?: string | null;
}

export interface ListingVideo {
  id: number;
  url: string;
  poster_url?: string | null;
  position: number;
  duration_s?: number | null;
  caption?: string | null;
}

export interface NightPricing {
  price_inr: number;
  weekend_price_inr?: number | null;
  weekend_days?: number[] | null;
  price_periods?: PricePeriod[] | null;
}

export const DEFAULT_WEEKEND_DAYS = [4, 5];          // Friday and Saturday nights
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MAX_PERIODS = 60;
export const MAX_PERIOD_DAYS = 120;
/** Videos per listing, and the longest clip the apps let a host pick. */
export const MAX_VIDEOS = 5;
export const VIDEO_MAX_SECONDS = 120;
export const VIDEO_MAX_MB = 100;

/** 0 Monday … 6 Sunday for a YYYY-MM-DD date. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function hasNightPrices(l: NightPricing): boolean {
  return !!l.weekend_price_inr || !!(l.price_periods && l.price_periods.length);
}

/** The price of the night starting on `iso`, and why. */
export function nightPrice(l: NightPricing, iso: string): { price_inr: number; kind: "base" | "weekend" | "special"; label?: string } {
  const special = (l.price_periods || []).find((p) => p.start_date <= iso && iso <= p.end_date);
  if (special) return { price_inr: special.price_inr, kind: "special", label: special.label };
  const days = l.weekend_days ?? DEFAULT_WEEKEND_DAYS;
  if (l.weekend_price_inr && days.includes(weekdayOf(iso))) return { price_inr: l.weekend_price_inr, kind: "weekend" };
  return { price_inr: l.price_inr, kind: "base" };
}

/** "Fri & Sat nights", "Sat nights", "Fri, Sat & Sun nights". */
export function weekendDaysLabel(days: number[] | null | undefined): string {
  const d = [...(days ?? DEFAULT_WEEKEND_DAYS)].sort((a, b) => a - b).map((i) => DAY_SHORT[i]);
  if (!d.length) return "no nights";
  const list = d.length === 1 ? d[0] : `${d.slice(0, -1).join(", ")} & ${d[d.length - 1]}`;
  return `${list} nights`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 weeknights", "2 weekend nights", "Diwali · 2 nights". */
export function groupLabel(g: NightGroup): string {
  if (g.kind === "weekend") return plural(g.nights, "weekend night", "weekend nights");
  if (g.kind === "special") return `${g.label || "Special price"} · ${plural(g.nights, "night", "nights")}`;
  return plural(g.nights, "weeknight", "weeknights");
}

/** A booking's room charges: stored since nights could be priced differently. */
export function roomTotal(b: { room_inr?: number | null; nightly_inr: number; nights: number }): number {
  return b.room_inr ?? b.nightly_inr * b.nights;
}

/** "12 Nov" / "12 – 14 Nov" / "30 Dec – 1 Jan" for a special price's nights. */
export function periodDates(p: { start_date: string; end_date: string }): string {
  const f = (iso: string, withMonth = true) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return withMonth ? dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : String(d);
  };
  if (p.start_date === p.end_date) return f(p.start_date);
  const sameMonth = p.start_date.slice(0, 7) === p.end_date.slice(0, 7);
  return `${sameMonth ? f(p.start_date, false) : f(p.start_date)} – ${f(p.end_date)}`;
}

/** Problems with a set of special prices, as the server would report them; null = fine. */
export function periodsError(periods: PricePeriod[]): string | null {
  if (periods.length > MAX_PERIODS) return `At most ${MAX_PERIODS} special prices.`;
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  for (const p of sorted) {
    if (!p.label.trim() || p.label.trim().length < 2) return "Give each special price a name, e.g. Diwali.";
    if (!p.start_date || !p.end_date) return `“${p.label}”: choose its dates.`;
    if (p.end_date < p.start_date) return `“${p.label}”: the last night is before the first.`;
    if (!(p.price_inr > 0)) return `“${p.label}”: enter a price per night.`;
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_date <= sorted[i - 1].end_date) {
      return `“${sorted[i - 1].label}” and “${sorted[i].label}” overlap: each night can have one special price.`;
    }
  }
  return null;
}

/** National holidays on fixed dates, as quick picks (festivals move each year:
 *  the host enters those dates). Each is the night before the holiday and the
 *  holiday itself, the nights people travel. */
const FIXED_HOLIDAYS: { label: string; month: number; day: number; nights: number; startOffset: number }[] = [
  { label: "New Year", month: 12, day: 31, nights: 2, startOffset: -1 },          // 30 + 31 Dec
  { label: "Republic Day", month: 1, day: 26, nights: 2, startOffset: -1 },
  { label: "Independence Day", month: 8, day: 15, nights: 2, startOffset: -1 },
  { label: "Gandhi Jayanti", month: 10, day: 2, nights: 2, startOffset: -1 },
  { label: "Christmas", month: 12, day: 25, nights: 2, startOffset: -1 },
];

/** The next occurrence of each fixed-date holiday, from `todayIso` on. */
export function holidayPicks(todayIso: string): { label: string; start_date: string; end_date: string }[] {
  const year = Number(todayIso.slice(0, 4));
  return FIXED_HOLIDAYS.map((h) => {
    for (const y of [year, year + 1]) {
      const day = `${y}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
      const start = addDays(day, h.startOffset);
      const end = addDays(start, h.nights - 1);
      if (end >= todayIso) return { label: h.label, start_date: start, end_date: end };
    }
    return null;
  }).filter((x): x is { label: string; start_date: string; end_date: string } => !!x)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

/** "1:05" for a video's length. */
export function fmtDuration(s?: number | null): string {
  if (!s && s !== 0) return "";
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

/** A price line for a group of nights, through the app's translator:
 *  "Weekend nights: ₹5,500 × 2" (keys reserve.weeknightsRow / weekendRow / specialRow). */
export function nightGroupRow(t: (key: any, vars?: Record<string, string | number>) => string, g: NightGroup): string {
  const vars = { price: inr(g.rate_inr), nights: g.nights, label: g.label || "" };
  return t(g.kind === "weekend" ? "reserve.weekendRow" : g.kind === "special" ? "reserve.specialRow" : "reserve.weeknightsRow", vars);
}

/** The same line in English, for the host's and admin's pages: "Weekend nights: ₹5,500 × 2". */
export function nightGroupLabel(g: NightGroup): string {
  const name = g.kind === "weekend" ? "Weekend nights" : g.kind === "special" ? (g.label || "Special price") : "Weeknights";
  return `${name}: ${inr(g.rate_inr)} × ${g.nights}`;
}
