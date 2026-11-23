// Listing photo categories (backend services/photo_categories.py). Order is
// the order rooms are shown in the photo tour.
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
export type PhotoCategories = Record<string, PhotoCategory | null>;

const LABELS: Record<string, string> = Object.fromEntries(PHOTO_CATEGORIES);

export function photoCategoryLabel(code?: string | null): string | null {
  return code ? LABELS[code] ?? null : null;
}

/** Photos grouped by category in tour order; uncategorised photos last under "More photos". */
export function groupPhotos<T extends { category?: string | null }>(images: T[]): { code: string; label: string; images: T[] }[] {
  const groups = PHOTO_CATEGORIES.map(([code, label]) => ({ code: code as string, label: label as string, images: images.filter((i) => i.category === code) }));
  const rest = images.filter((i) => !photoCategoryLabel(i.category));
  return [...groups, { code: "", label: "More photos", images: rest }].filter((g) => g.images.length);
}
