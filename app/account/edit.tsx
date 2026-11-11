import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Radius } from "@/constants/Colors";
import { GlassHeader } from "@/components/GlassHeader";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";

export default function AccountEditScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [marketing, setMarketing] = useState(!!user?.marketing_opt_in);
  const [savingMarketing, setSavingMarketing] = useState(false);

  // Saved straight away, like a settings switch.
  const toggleMarketing = async (on: boolean) => {
    setMarketing(on);
    setSavingMarketing(true);
    try {
      await updateProfile({ marketing_opt_in: on });
    } catch (e: any) {
      setMarketing(!on);
      Alert.alert("Couldn't save", e.message || "Please try again.");
    } finally {
      setSavingMarketing(false);
    }
  };

  if (!user) {
    router.replace("/login");
    return null;
  }

  const valid = name.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <GlassHeader title="Personal info" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.charcoal3}
            style={styles.input}
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={Colors.charcoal3}
            style={styles.input}
          />
          {user.phone && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Phone</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>{user.phone}</Text>
              </View>
              <Text style={styles.helperText}>Phone numbers can't be changed here.</Text>
            </>
          )}

          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Travel ideas & offers</Text>
              <Text style={styles.helperText}>
                {user.email
                  ? "Occasional emails with new homes, places to go and offers. Booking confirmations and receipts are always sent."
                  : "Add an email to get occasional travel ideas and offers."}
              </Text>
            </View>
            <Switch
              value={marketing}
              onValueChange={toggleMarketing}
              disabled={savingMarketing || !user.email}
              trackColor={{ true: Colors.terra, false: Colors.edgeStrong }}
              accessibilityLabel="Email me travel ideas and offers"
            />
          </View>

          <Button
            title={saving ? "Saving…" : "Save changes"}
            onPress={save}
            disabled={!valid || saving}
            loading={saving}
            full
            size="lg"
            style={{ marginTop: 28 }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 6 },
  input: {
    height: 48, paddingHorizontal: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
    fontSize: 15, color: Colors.charcoal, fontWeight: "600", justifyContent: "center",
  },
  inputDisabled: { backgroundColor: Colors.warmBg },
  disabledText: { fontSize: 15, color: Colors.charcoal2, fontWeight: "600" },
  helperText: { fontSize: 11.5, color: Colors.charcoal3, marginTop: 6 },
  prefRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24,
    padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
  prefTitle: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
});
