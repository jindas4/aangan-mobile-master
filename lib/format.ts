export function inr(n: number | null | undefined): string {
  return "₹" + (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/**
 * Parse an API date. A plain calendar date ("2026-10-10") is read as that day
 * in the device's time zone — `new Date("2026-10-10")` means UTC midnight,
 * which is still the previous day anywhere west of UTC.
 */
export function parseDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
}

export function shortDate(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fullDate(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return shortDate(iso);
}

const MEDIA_BASE = process.env.EXPO_PUBLIC_API_URL || "https://backend-service-production-2df4.up.railway.app";

export function imageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("scene://")) return "";
  return `${MEDIA_BASE}${url}`;
}

// One of our uploads: …/images/<owner>/<id>.<ext>, with or without a signature after it.
const UPLOAD_RE = /\/images\/(usr_[A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\.[A-Za-z0-9]+(?:\?|$)/;

/**
 * The address of a small copy of a listing photo — thumb (320 px), medium
 * (1080 px) or large (1600 px) — instead of the multi-MB original.
 *
 * The copies live at a fixed address on our API, so the app caches them on
 * the phone; the signed link for the original is different every time and is
 * downloaded again on each visit. Anything that isn't one of our uploads
 * passes through unchanged. Use via <RemoteImage>, which falls back to the
 * original if a copy can't be loaded. Mirrors the web app's lib/format.
 */
export function imageVariantUrl(url: string, size: "thumb" | "medium" | "large"): string {
  if (!url) return url;
  const m = UPLOAD_RE.exec(url);
  return m ? `${MEDIA_BASE}/api/media/images/${m[1]}/${size}/${m[2]}.webp` : url;
}

/** Aangan Stay's host fee on marketplace bookings, and the GST charged on it.
 *  Keep in step with backend/app/services/pricing.py. */
export const HOST_FEE_PCT = 15.5;
export const HOST_FEE_DIRECT_PCT = 8;
/** What a host keeps from an amount after the fee and the 18% GST on it (before TDS). */
export function hostTakeHome(amount: number, feePct: number = HOST_FEE_PCT): number {
  return Math.round((amount || 0) * (1 - (feePct / 100) * 1.18));
}

export interface HostPayoutEstimate {
  guestPays: number; earnings: number; feePct: number; fee: number; feeGst: number; tds: number; payout: number;
}
/** What a host is paid for one booking, worked out the way the server does it
 *  (backend pricing.py + payouts.py): fee on room + cleaning, 18% GST on the
 *  fee, 0.1% TDS on room + cleaning. Amounts in rupees. */
export function hostPayoutEstimate(pricePerNight: number, cleaning: number, nights: number,
                                   feePct: number = HOST_FEE_PCT): HostPayoutEstimate {
  const rupees = Math.max(pricePerNight || 0, 0) * Math.max(nights, 1) + Math.max(cleaning || 0, 0);
  const feePaise = Math.floor((rupees * Math.round(feePct * 100) + 50) / 100);
  const gstPaise = Math.floor((feePaise * 18 + 50) / 100);
  const tdsPaise = Math.floor((rupees * 100 * 10) / 10000);
  return {
    guestPays: rupees + Math.round(rupees * gstPct(pricePerNight) / 100), earnings: rupees, feePct,
    fee: feePaise / 100, feeGst: gstPaise / 100, tds: tdsPaise / 100,
    payout: (rupees * 100 - feePaise - gstPaise - tdsPaise) / 100,
  };
}

/** Rupees with two decimals always — for columns of amounts that must line up. */
export function inr2(n: number): string {
  return "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** GST on a stay, by the price of a night. Keep in step with backend pricing.py. */
export function gstPct(pricePerNight: number): number {
  return pricePerNight <= 7500 ? 5 : 18;
}
/** A night's price with GST added — what a guest actually pays per night.
 *  Uses the server's figure when it sent one. */
export function nightWithTax(item: { price_inr: number; price_incl_tax_inr?: number }): number {
  return item.price_incl_tax_inr || item.price_inr + Math.round(item.price_inr * gstPct(item.price_inr) / 100);
}

/** Whether a booking can still be cancelled: until its check-in day. Uses the
 *  server's answer when it sent one. */
export function canCancelBooking(b: { status: string; start_date: string; can_cancel?: boolean }): boolean {
  if (typeof b.can_cancel === "boolean") return b.can_cancel;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (b.status === "pending" || b.status === "confirmed") && today <= b.start_date;
}

/** "14:00" → "2:00 PM" (check-in / check-out times). */
export function fmtTime(hhmm: string | null | undefined, fallback = ""): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return fallback;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** A valid 24-hour "HH:MM" time. */
export const isHHMM = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim());

/** "Sat 28 Nov, 3:15 PM" in Indian time — deadlines such as a host's time to answer a request. */
export function fmtDeadline(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return `${day}, ${t.toUpperCase()}`;
}
