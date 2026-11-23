// Listing photo categories (backend services/photo_categories.py). Order is
// the order rooms are shown in the photo tour. Bedrooms and bathrooms can be
// numbered: the API takes "bedroom:2" and returns category "bedroom" with
// room_no 2; the listing's master_bedroom_no names the master bedroom.
// The same file is in the app (aangan-mobile-master/lib/photoCategories.ts).
export const PHOTO_CATEGORIES = [
  ["exterior", "Outside"],
  ["living", "Living room"],
  ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"],
  ["kitchen", "Kitchen"],
  ["dining", "Dining"],
  ["balcony", "Balcony & terrace"],
  ["garden", "Garden"],
  ["pool", "Pool"],
  ["view", "View"],
  ["other", "Other"],
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number][0];
/** {photo url: "bedroom:2" | "kitchen" | null}, as the API takes it. */
export type PhotoCategories = Record<string, string | null>;

const LABELS: Record<string, string> = Object.fromEntries(PHOTO_CATEGORIES);
const ORDER: Record<string, number> = Object.fromEntries(PHOTO_CATEGORIES.map(([c], i) => [c, i]));
const NUMBERED = ["bedroom", "bathroom"];

export function photoCategoryLabel(code?: string | null): string | null {
  return code ? LABELS[code] ?? null : null;
}

/** "bedroom:2" → {code: "bedroom", room_no: 2}; unknown → {code: null}. */
export function splitRoom(value?: string | null): { code: string | null; room_no: number | null } {
  const [c, n] = (value || "").split(":");
  if (!LABELS[c]) return { code: null, room_no: null };
  const num = Number(n);
  return { code: c, room_no: NUMBERED.includes(c) && Number.isInteger(num) && num >= 1 ? num : null };
}

/** The API value for a photo: "bedroom:2", "kitchen", or null. */
export function roomValue(img: { category?: string | null; room_no?: number | null }): string | null {
  if (!img.category || !LABELS[img.category]) return null;
  return img.room_no && NUMBERED.includes(img.category) ? `${img.category}:${img.room_no}` : img.category;
}

/** Names to show; pass translated ones on guest pages. */
export interface RoomNames { category: (code: string) => string; master: string }
const ENGLISH: RoomNames = { category: (c) => LABELS[c] ?? c, master: "Master bedroom" };

/** "Master bedroom", "Bedroom 2", "Kitchen", or null for an untagged photo. */
export function roomLabel(img: { category?: string | null; room_no?: number | null },
                          master?: number | null, names: RoomNames = ENGLISH): string | null {
  const { code, room_no } = splitRoom(roomValue(img));
  if (!code) return null;
  if (code === "bedroom" && room_no && master === room_no) return names.master;
  return room_no ? `${names.category(code)} ${room_no}` : names.category(code);
}

/** The choices for a photo's room picker, numbering bedrooms and bathrooms when the home has several. */
export function roomOptions(bedrooms = 1, baths = 1, master?: number | null): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const [code, label] of PHOTO_CATEGORIES) {
    const count = code === "bedroom" ? bedrooms : code === "bathroom" ? baths : 0;
    if (count >= 2) {
      for (let n = 1; n <= Math.min(count, 30); n++) {
        out.push({ value: `${code}:${n}`, label: `${label} ${n}${code === "bedroom" && master === n ? " (master)" : ""}` });
      }
    } else {
      out.push({ value: code, label });
    }
  }
  return out;
}

/** Photos grouped room by room in tour order: the master bedroom first among
 *  bedrooms, then by number; untagged photos last (code ""). */
export function groupPhotos<T extends { category?: string | null; room_no?: number | null }>(
  images: T[], master?: number | null,
): { key: string; code: string; room_no: number | null; images: T[] }[] {
  const groups = new Map<string, { key: string; code: string; room_no: number | null; images: T[] }>();
  for (const img of images) {
    const { code, room_no } = splitRoom(roomValue(img));
    const key = code ? `${code}:${room_no ?? ""}` : "";
    if (!groups.has(key)) groups.set(key, { key, code: code || "", room_no, images: [] });
    groups.get(key)!.images.push(img);
  }
  const rank = (g: { code: string; room_no: number | null }) => [
    g.code ? ORDER[g.code] : 999,
    g.code === "bedroom" && g.room_no && g.room_no === master ? 0 : 1,
    g.room_no ?? 999,
  ];
  return [...groups.values()].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
}
