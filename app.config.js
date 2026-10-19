// Test builds (EXPO_PUBLIC_APP_ENV=staging — the preview, development and
// staging profiles in eas.json) are called "Aangan STAGING" on the home
// screen and in TestFlight, so they can never be mistaken for the live app.
// Everything else comes from app.json unchanged.
module.exports = ({ config }) =>
  process.env.EXPO_PUBLIC_APP_ENV === "staging" ? { ...config, name: "Aangan STAGING" } : config;
