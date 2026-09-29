// "Invite & earn" card for the Account tab.
//
// Mirrors the web ReferralCard: shareable code, WhatsApp-first sharing (the
// growth loop that works in India), spendable balance + pending rewards, and
// manual code entry for friends' codes.
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Colors, Radius, Shadows } from "@/constants/Colors";
import { api, ApiError, ReferralMe } from "@/lib/api";
import { inr } from "@/lib/format";

export function ReferralCard() {
  const [data, setData] = useState<ReferralMe | null>(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ReferralMe>("/api/referrals/me").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const shareText =
    `I use Aangan Stay for real homestays across India — verified hosts, UPI, ` +
    `all-inclusive ₹ pricing. Use my code ${data.code} for ₹${data.referee_bonus_inr} ` +
    `off your first stay: ${data.share_url}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(data.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = async () => {
    const waUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) Linking.openURL(waUrl);
    else Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  };

  const apply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await api<ReferralMe>("/api/referrals/apply", {
        method: "POST",
        body: { code: code.trim() },
      });
      setData(res);
      setCode("");
      setMsg({ ok: true, text: `₹${res.referee_bonus_inr} credit added — auto-applies on your first booking.` });
    } catch (e) {
      const detail =
        e instanceof ApiError ? (e.body?.detail?.message as string | undefined) : undefined;
      setMsg({ ok: false, text: detail || "That code couldn't be applied." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>INVITE & EARN</Text>
      <Text style={styles.title}>Give ₹{data.referee_bonus_inr}, get ₹{data.referrer_reward_inr}</Text>
      <Text style={styles.body}>
        Friends get ₹{data.referee_bonus_inr} off their first stay. You get ₹{data.referrer_reward_inr} in
        travel credit when they complete it.
      </Text>

      <View style={styles.codeRow}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{data.code}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={copyLink} accessibilityLabel="Copy referral link">
          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={Colors.aanganDeep} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={shareWhatsApp} accessibilityLabel="Share on WhatsApp">
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text style={styles.waText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balances}>
        <View>
          <Text style={styles.balanceValue}>{inr(data.balance_inr)}</Text>
          <Text style={styles.balanceLabel}>TRAVEL CREDIT</Text>
        </View>
        {data.pending_inr > 0 && (
          <View>
            <Text style={[styles.balanceValue, { color: Colors.gold }]}>{inr(data.pending_inr)}</Text>
            <Text style={styles.balanceLabel}>ON THE WAY</Text>
          </View>
        )}
      </View>
      <Text style={styles.note}>
        Credits auto-apply on bookings of {inr(data.min_booking_inr)} or more.
      </Text>

      <View style={styles.applyRow}>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder="Have a code?"
          placeholderTextColor={Colors.charcoal3}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.applyBtn, (!code.trim() || busy) && { opacity: 0.4 }]}
          onPress={apply}
          disabled={!code.trim() || busy}
        >
          <Text style={styles.applyText}>{busy ? "…" : "Apply"}</Text>
        </TouchableOpacity>
      </View>
      {msg && (
        <Text style={[styles.msg, { color: msg.ok ? Colors.aanganDeep : "#C2410C" }]}>{msg.text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 18,
    marginTop: 20,
    ...Shadows.card,
  },
  kicker: {
    fontSize: 10.5, fontWeight: "800", letterSpacing: 1.5,
    color: Colors.terra, marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: "800", color: Colors.charcoal },
  body: { fontSize: 13, color: Colors.charcoal2, marginTop: 4, lineHeight: 18 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  codeBox: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.cream, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.edge,
  },
  codeText: { fontSize: 16, fontWeight: "800", letterSpacing: 2, color: Colors.charcoal },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: "rgba(27,39,80,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  waBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#25D366", borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  waText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  balances: {
    flexDirection: "row", gap: 28, marginTop: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.edge,
  },
  balanceValue: { fontSize: 20, fontWeight: "800", color: Colors.charcoal },
  balanceLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3, marginTop: 2 },
  note: { fontSize: 11.5, color: Colors.charcoal3, marginTop: 8 },
  applyRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  input: {
    flex: 1, maxWidth: 180,
    borderWidth: 1.5, borderColor: Colors.edge, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, fontWeight: "700", letterSpacing: 1, color: Colors.charcoal,
    backgroundColor: Colors.cream,
  },
  applyBtn: {
    backgroundColor: Colors.charcoal, borderRadius: Radius.md,
    paddingHorizontal: 16, justifyContent: "center",
  },
  applyText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  msg: { fontSize: 12, fontWeight: "600", marginTop: 8 },
});
