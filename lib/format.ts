export function inr(n: number | null | undefined): string {
  return "₹" + (n ?? 0).toLocaleString("en-IN");
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
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

/** Derive a resized WebP variant URL from an original upload URL.
 *
 * The backend worker renders every upload into thumb(320)/medium(960)/
 * large(1920) WebP files at `images/<user>/<size>/<id>.webp` — a fraction of
 * the original's bytes, which matters a lot on 4G. Mirrors the web app's
 * lib/format.imageVariantUrl; URLs that don't match the convention pass
 * through unchanged. Use via <RemoteImage>, which falls back to the original
 * if a variant hasn't been rendered yet. */
export function imageVariantUrl(url: string, size: "thumb" | "medium" | "large"): string {
  if (!url || !url.includes("/images/")) return url;
  const [prefix, remaining] = url.split("/images/");
  const parts = remaining.split("/");
  if (parts.length !== 2) return url;
  const fileId = parts[1].split(".")[0];
  return `${prefix}/images/${parts[0]}/${size}/${fileId}.webp`;
}
