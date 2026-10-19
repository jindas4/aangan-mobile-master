// A small "STAGING" tag on test builds (EXPO_PUBLIC_APP_ENV=staging, set by the
// preview and development profiles in eas.json), so testers always know they
// are on the test server — fake data, simulated payments — not the live app.
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || "";

export function EnvBadge() {
  const insets = useSafeAreaInsets();
  if (APP_ENV !== "staging") return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 2 }]}>
      <Text style={styles.text}>STAGING</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", alignSelf: "center", zIndex: 9999,
    backgroundColor: "#7C3AED", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, opacity: 0.92,
  },
  text: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
});
