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

export function imageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("scene://")) return "";
  return `https://backend-service-production-2df4.up.railway.app${url}`;
}

// One of our uploads: …/images/<owner>/<id>.<ext>, with or without a signature after it.
const UPLOAD_RE = /\/images\/(usr_[A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\.[A-Za-z0-9]+(?:\?|$)/;
const MEDIA_BASE = process.env.EXPO_PUBLIC_API_URL || "https://backend-service-production-2df4.up.railway.app";

/**
 * The address of a small copy of a listing photo — thumb (320 px), medium
 * (800 px) or large (1600 px) — instead of the multi-MB original.
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
