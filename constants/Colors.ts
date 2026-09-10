// Synced to web's frontend/tailwind.config.ts — the "aangan" indigo brand has
// been fully retired there onto the terra/terracotta palette. Keep these two
// files in sync when the web tokens change.
export const Colors = {
  cream: "#FDFBF7",
  paper: "#FFFFFF",
  terra: "#B45309",
  terraDeep: "#92400E",
  terraSoft: "#FED7AA",
  terraTint: "#FFF7ED",
  charcoal: "#1F2937",
  charcoal2: "#4B5563",
  charcoal3: "#9CA3AF",
  aanganDeep: "#92400E",
  aanganSoft: "#FED7AA",
  mustard: "#B45309",
  veg: "#16A34A",
  vegSoft: "#DCFCE7",
  power: "#0891B2",
  powerSoft: "#CFFAFE",
  gold: "#FACC15",
  edge: "#E5E7EB",
  edgeStrong: "#D1D5DB",
  line: "#E5E7EB",
  success: "#16A34A",
  error: "#DC2626",
  warmBg: "#FFF7ED",
  overlay: "rgba(31,41,55,0.55)",
};

// RN-translated single-layer approximations of web's boxShadow.card/pill/pop/postcard.
export const Shadows = {
  card: { shadowColor: "#1F2937", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 26, elevation: 6 },
  pill: { shadowColor: "#1F2937", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 3 },
  pop:  { shadowColor: "#1F2937", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 12 },
  postcard: { shadowColor: "#1F2937", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 7 },
};

// Liquid Glass chrome tokens — mirrors web's .glass/.glass-strong/.glass-scrim
// recipes in frontend/app/globals.css. Glass is for chrome only (tab bar,
// headers, sheets, floating controls); content surfaces stay solid.
export const Glass = {
  // Tab bar / header tint. Kept fairly opaque on purpose: react-native-screens
  // freezes inactive tab screens, and UIVisualEffectView samples those stale
  // snapshots as well as the live screen — a thinner tint let the previous
  // tab's content ghost through onto empty screens.
  tint: "rgba(255,255,255,0.86)",        // overlay atop BlurView for chrome bars
  tintStrong: "rgba(255,255,255,0.85)",  // sheets — keeps form text readable
  fallback: "rgba(255,255,255,0.96)",    // Android / no-blur solid stand-in
  border: "rgba(255,255,255,0.40)",      // rim-light hairline
  scrim: "rgba(31,41,55,0.45)",          // the one modal scrim
  intensity: 60,                         // BlurView intensity for bars
  intensityStrong: 80,                   // BlurView intensity for sheets
};

export const Fonts = {
  regular: "Inter",
  bold: "Inter",
  display: "Fraunces",
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
