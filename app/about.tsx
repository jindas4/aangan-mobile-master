import { ScrollView, View, Text, StyleSheet, Linking, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Application from "expo-application";
import { Colors, Radius, Shadows } from "@/constants/Colors";
import { WEB_BASE } from "@/lib/api";

const SUPPORT_EMAIL = "support@aanganstay.com";
const COMPANY = "Meera Stay India Private Limited";
const COMPANY_CIN = "U55101HR2026PTC151172";
const COMPANY_OFFICE = "223/8 Krishna Colony, Bhiwani, Haryana 127021";

// In-app browser sheet (SFSafariViewController page-sheet / Chrome Custom Tab)
// — the user never leaves the app for legal pages.
const openWeb = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });

export default function AboutScreen() {
  const version = Application.nativeApplicationVersion ?? "1.0.0";
  const build = Application.nativeBuildVersion ?? "1";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "About", headerBackTitle: "Back" }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo + tagline */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.appName}>Aangan Stay</Text>
          <Text style={styles.tagline}>Real homes, real hosts, all over India</Text>
          <Text style={styles.version}>Version {version} ({build})</Text>
        </View>

        {/* About blurb */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About Aangan Stay</Text>
          <Text style={styles.body}>
            Aangan Stay connects travellers with verified homestay hosts across India.
            Every price is all-inclusive in rupees — no hidden fees, no surprises.
            Hosts are government-ID verified, and payments happen securely via UPI
            and cards through Razorpay.
          </Text>
          <Text style={[styles.body, { marginTop: 12 }]}>
            Whether it's a Himalayan cabin, a Goan villa, or a heritage haveli —
            Aangan Stay helps you find a home away from home.
          </Text>
        </View>

        {/* Quick links */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <LinkRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => openWeb(`${WEB_BASE}/legal/terms`)}
          />
          <LinkRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => openWeb(`${WEB_BASE}/legal/privacy`)}
          />
          <LinkRow
            icon="close-circle-outline"
            label="Cancellation Policy"
            onPress={() => openWeb(`${WEB_BASE}/legal/cancellation`)}
          />
          <LinkRow
            icon="cash-outline"
            label="Refund Policy"
            onPress={() => openWeb(`${WEB_BASE}/legal/refunds`)}
          />
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <LinkRow
            icon="mail-outline"
            label={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>

        {/* Footer */}
        <Text style={styles.copyright}>{"©"} 2026 {COMPANY}</Text>
        <Text style={styles.copyright}>CIN {COMPANY_CIN}</Text>
        <Text style={styles.copyright}>{COMPANY_OFFICE}</Text>
        <Text style={styles.motto}>अपना आँगन, सारे जहाँ में</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={Colors.terra} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={Colors.charcoal3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 16 },
  hero: { alignItems: "center", paddingTop: 24, paddingBottom: 28 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.card,
  },
  logoText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  appName: { fontSize: 28, fontWeight: "800", color: Colors.charcoal, marginTop: 16 },
  tagline: { fontSize: 14, color: Colors.charcoal2, marginTop: 4, textAlign: "center" },
  version: { fontSize: 12, color: Colors.charcoal3, marginTop: 8 },
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 20,
    marginBottom: 16,
    ...Shadows.card,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.charcoal, marginBottom: 12 },
  body: { fontSize: 14, color: Colors.charcoal2, lineHeight: 22 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    gap: 12,
  },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  copyright: { textAlign: "center", fontSize: 11, color: Colors.charcoal3, marginTop: 8 },
  motto: { textAlign: "center", fontSize: 12, color: Colors.charcoal3, marginTop: 4 },
});
