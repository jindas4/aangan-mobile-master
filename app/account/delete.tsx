import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Radius } from "@/constants/Colors";
import { GlassHeader } from "@/components/GlassHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";

interface DeletionStatus {
  requested_at: string | null;
  execute_at: string | null;
  days_remaining: number | null;
  blockers: string[];
  grace_days: number;
}

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export default function AccountDeleteScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<"req" | "cancel" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<DeletionStatus>("/api/me/account/deletion");
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (!user) {
    router.replace("/login");
    return null;
  }

  const requesting = status?.requested_at != null;
  const hasBlockers = (status?.blockers?.length || 0) > 0;

  const submit = async () => {
    setBusy("req");
    setErr(null);
    try {
      const r = await api<{ ok: boolean; blockers: string[] }>("/api/me/account/deletion", { method: "POST" });
      if (!r.ok) setErr(r.blockers.join(" · "));
      await load();
    } catch (e: any) {
      setErr(e.message || "Could not request deletion");
    } finally {
      setBusy(null);
    }
  };

  const cancelDeletion = async () => {
    setBusy("cancel");
    setErr(null);
    try {
      await api("/api/me/account/deletion", { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e.message || "Could not cancel deletion");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.safe}>
      <GlassHeader title="Delete account" />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.terra} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.subtitle}>
            You have the right under the Digital Personal Data Protection Act, 2023 to withdraw consent and erase
            your personal data. This is what happens when you request deletion.
          </Text>

          <Card title="What gets erased">
            <Bullet text="Your name, phone, email, avatar, and social sign-in ids" />
            <Bullet text="Your bank / UPI details on file" />
            <Bullet text="The contents of your in-app messages and reviews" />
            <Bullet text="Your PAN / Aadhaar KYC references" />
          </Card>

          <Card title="What is retained (and why)">
            <Bullet text="Booking records + GST invoices — required by tax law for 7 years" />
            <Bullet text="Payout records — required for financial audit" />
            <Bullet text="Anonymised entries in our audit log — required for regulatory review" />
            <Text style={styles.cardFootnote}>
              These rows will no longer identify you — they'll show "[deleted user]" where your name used to be.
            </Text>
          </Card>

          {hasBlockers && !requesting && (
            <View style={styles.blockersBox}>
              <Text style={styles.blockersTitle}>Can't delete right now</Text>
              {status!.blockers.map((b, i) => (
                <Bullet key={i} text={b} />
              ))}
            </View>
          )}

          {requesting ? (
            <View style={styles.scheduledCard}>
              <Text style={styles.kicker}>DELETION SCHEDULED</Text>
              <Text style={styles.scheduledTitle}>
                {status?.days_remaining === 0
                  ? "Executing shortly."
                  : `Your account will be deleted in ${status?.days_remaining} day${status?.days_remaining === 1 ? "" : "s"}.`}
              </Text>
              <Text style={styles.scheduledSub}>
                Change your mind? You can cancel any time before the deadline.
              </Text>
              {err && <Text style={styles.errorText}>{err}</Text>}
              <Button
                title={busy === "cancel" ? "Cancelling…" : "Cancel deletion request"}
                onPress={cancelDeletion}
                disabled={busy !== null}
                loading={busy === "cancel"}
                full
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={[styles.confirmCard, hasBlockers && styles.confirmCardDisabled]}>
              <Text style={styles.confirmTitle}>Confirm deletion</Text>
              <Text style={styles.confirmBody}>
                After you confirm, your account enters a {status?.grace_days ?? 7}-day grace window. You can log in
                and cancel at any time during that period. After the window closes, deletion is irreversible.
              </Text>
              <Text style={styles.fieldLabel}>
                Type <Text style={styles.confirmPhrase}>{CONFIRM_PHRASE}</Text> to enable the button
              </Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                editable={!hasBlockers}
                autoCapitalize="characters"
                placeholder={CONFIRM_PHRASE}
                placeholderTextColor={Colors.charcoal3}
                style={styles.input}
              />
              {err && <Text style={styles.errorText}>{err}</Text>}
              <Button
                title={busy === "req" ? "Requesting deletion…" : "Delete my account"}
                onPress={submit}
                disabled={confirmText !== CONFIRM_PHRASE || busy !== null || hasBlockers}
                loading={busy === "req"}
                full
                style={{ marginTop: 16 }}
              />
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{"•"}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.charcoal, marginBottom: 8 },
  subtitle: { fontSize: 13.5, color: Colors.charcoal2, lineHeight: 20, marginBottom: 20 },
  card: {
    padding: 16, marginBottom: 14,
    backgroundColor: Colors.paper, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.edge,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.charcoal, marginBottom: 8 },
  cardFootnote: { fontSize: 11.5, color: Colors.charcoal3, marginTop: 8 },
  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  bulletDot: { fontSize: 13, color: Colors.charcoal2 },
  bulletText: { flex: 1, fontSize: 13, color: Colors.charcoal2, lineHeight: 19 },
  blockersBox: {
    padding: 16, marginBottom: 14,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  blockersTitle: { fontSize: 15, fontWeight: "800", color: "#B91C1C", marginBottom: 8 },
  scheduledCard: {
    padding: 20, marginBottom: 14,
    backgroundColor: Colors.paper, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.edge,
  },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: Colors.charcoal3, marginBottom: 4 },
  scheduledTitle: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  scheduledSub: { fontSize: 13, color: Colors.charcoal2, marginTop: 10, lineHeight: 19 },
  confirmCard: {
    padding: 20, marginBottom: 14,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.terra,
    backgroundColor: Colors.warmBg,
  },
  confirmCardDisabled: { opacity: 0.6, borderColor: Colors.edge, backgroundColor: Colors.paper },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: Colors.charcoal, marginBottom: 8 },
  confirmBody: { fontSize: 13, color: Colors.charcoal2, lineHeight: 19, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 8 },
  confirmPhrase: { fontFamily: "Inter", color: Colors.terra, fontWeight: "800" },
  input: {
    height: 48, paddingHorizontal: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
    fontSize: 14, color: Colors.charcoal, fontWeight: "600",
  },
  errorText: { fontSize: 12.5, color: Colors.error, marginTop: 10, fontWeight: "600" },
});
