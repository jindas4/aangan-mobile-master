import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { GlassHeader } from "@/components/GlassHeader";
import { useAuth } from "@/lib/auth";
import { VerifyWizard } from "@/components/VerifyWizard";

export default function AccountVerifyScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <View style={styles.safe}>
      <GlassHeader title="Verification" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Verify your account</Text>
        <Text style={styles.subtitle}>
          A few quick checks so hosts know it's really you — and refunds go faster.
        </Text>

        <VerifyWizard />

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.charcoal, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.charcoal2, lineHeight: 22, marginBottom: 24 },
});
