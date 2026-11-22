/** Meal plans (backend services/meal_plans.py), priced per guest per night. */
export const PRICED_MEAL_CODES = ["CP", "MAP", "AP"] as const;
export type PricedMealCode = (typeof PRICED_MEAL_CODES)[number];

const NAMES: Record<string, string> = {
  EP: "Room only",
  CP: "Breakfast included",
  MAP: "Breakfast + lunch or dinner",
  AP: "All meals",
};

export function mealPlanName(code?: string | null): string {
  return NAMES[(code || "EP").toUpperCase()] ?? (code || "Room only");
}
