export const AMENITIES: { key: string; icon: string }[] = [
  { key: "Wifi", icon: "wifi-outline" },
  { key: "Air conditioning", icon: "snow-outline" },
  { key: "Kitchen", icon: "restaurant-outline" },
  { key: "Free parking", icon: "car-outline" },
  { key: "Pool", icon: "water-outline" },
  { key: "Workspace", icon: "laptop-outline" },
  { key: "Breakfast", icon: "cafe-outline" },
  { key: "All meals", icon: "fast-food-outline" },
  { key: "Mountain view", icon: "trail-sign-outline" },
  { key: "Sea view", icon: "boat-outline" },
  { key: "Lake view", icon: "fish-outline" },
  { key: "Fireplace", icon: "flame-outline" },
  { key: "Heater", icon: "thermometer-outline" },
  { key: "Bonfire", icon: "bonfire-outline" },
  { key: "Elevator", icon: "arrow-up-outline" },
  { key: "Gym", icon: "barbell-outline" },
  { key: "Rooftop", icon: "sunny-outline" },
  { key: "Yoga deck", icon: "body-outline" },
  { key: "Laundry", icon: "shirt-outline" },
  { key: "Pet friendly", icon: "paw-outline" },
  { key: "Heritage", icon: "business-outline" },
  { key: "Estate walks", icon: "walk-outline" },
];

export const AMENITY_ICON_MAP: Record<string, string> = Object.fromEntries(
  AMENITIES.map((a) => [a.key, a.icon]),
);
