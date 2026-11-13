import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { Button } from "@/components/Button";

// "Are you registered for GST in <state>?" — asked in the new-listing flow
// once the property's state is known (same as the website's ListingGst). A
// GSTIN belongs to one state, so the question is per state; hosts who already
// gave us a GSTIN for it just see it confirmed. HostGst on the verification
// screen stays the place to manage GSTINs later.

type Gstin = { id: number; gstin: string; state_code: string; status: "verified" | "format_ok" | "inactive" };
type Profile = { answered: boolean; gst_registered: boolean; turnover_over_threshold: boolean | null; gstins: Gstin[] };

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function ListingGst({ stateCode, stateName, inputStyle }: { stateCode: string; stateName: string; inputStyle: any }) {
  const [p, setP] = useState<Profile | null>(null);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Re-read on focus, so a GSTIN added on the verification screen shows here.
  useFocusEffect(useCallback(() => { api<Profile>("/api/kyc/gst").then(setP).catch(() => setP(null)); }, []));
  useEffect(() => {
    if (p && choice === null && p.answered && !p.gst_registered && p.gstins.length === 0) setChoice("no");
  }, [p, choice]);
  useEffect(() => { setErr(null); }, [stateCode]);

  if (!p || !stateCode) return null;
  const place = stateName || "this state";
  const onFile = p.gstins.find((g) => g.state_code === stateCode);

  if (onFile) {
    return (
      <View style={[styles.card, { flexDirection: "row", gap: 10 }]}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.body}>Your GSTIN for {place}, <Text style={styles.mono}>{onFile.gstin}</Text>, will go on invoices for stays here.</Text>
          <Text style={styles.hint}>{onFile.status === "verified" ? "Verified with the GST network." : "Format checked. We'll confirm it with the GST network."}</Text>
        </View>
      </View>
    );
  }

  const run = async (fn: () => Promise<Profile>) => {
    setBusy(true); setErr(null);
    try { setP(await fn()); return true; }
    catch (e: any) { setErr(e.message); return false; }
    finally { setBusy(false); }
  };
  const answer = async (yes: boolean) => {
    setChoice(yes ? "yes" : "no");
    // "No" only means "not in this state" for a host with GSTINs elsewhere.
    if (yes && !p.gst_registered) await run(() => api<Profile>("/api/kyc/gst", { method: "PUT", body: { gst_registered: true, turnover_over_threshold: p.turnover_over_threshold } }));
    if (!yes && p.gstins.length === 0 && (!p.answered || p.gst_registered))
      await run(() => api<Profile>("/api/kyc/gst", { method: "PUT", body: { gst_registered: false, turnover_over_threshold: p.turnover_over_threshold } }));
  };
  const clean = gstin.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  const wrongState = /^\d{2}/.test(clean) && clean.slice(0, 2) !== stateCode;
  const ok = GSTIN_RE.test(clean) && !wrongState;
  const add = async () => { if (ok && await run(() => api<Profile>("/api/kyc/gst/gstins", { method: "POST", body: { gstin: clean } }))) setGstin(""); };
  const pill = (on: boolean, label: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} disabled={busy} style={[styles.pill, on && styles.pillOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.pillText, on && { color: Colors.terra }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.card} testID="listing-gst">
      <Text style={styles.q}>Are you registered for GST in {place}?</Text>
      <Text style={styles.hint}>Most homestays aren't, and that's fine. If you are, your GSTIN goes on invoices for stays here.</Text>
      <View style={styles.pills}>
        {pill(choice === "no", "No, I'm not", () => answer(false))}
        {pill(choice === "yes", "Yes, I'm registered", () => answer(true))}
      </View>
      {choice === "yes" && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <TextInput value={clean} onChangeText={setGstin} placeholder={`${stateCode}ABCDE1234F1Z5`} placeholderTextColor={Colors.charcoal3}
                     autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={add}
                     style={[inputStyle, styles.monoInput]} accessibilityLabel={`GSTIN for ${place}`} />
          <Text style={[styles.hint, wrongState && { color: Colors.error, fontWeight: "700" }]}>
            {wrongState
              ? `A ${place} GSTIN starts with ${stateCode}. This one is for another state; add the one registered in ${place}.`
              : "15 characters, from your GST certificate. We check it with the GST network now; you can also add it later from host verification."}
          </Text>
          <Button title={busy ? "Checking…" : "Check and add"} onPress={add} disabled={busy || !ok} />
        </View>
      )}
      {!!err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 4, marginBottom: 12, padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper },
  q: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  hint: { fontSize: 12, lineHeight: 17, color: Colors.charcoal3, marginTop: 4 },
  body: { fontSize: 13.5, lineHeight: 19, color: Colors.charcoal2 },
  mono: { fontWeight: "800", color: Colors.charcoal, letterSpacing: 0.8 },
  monoInput: { letterSpacing: 1, fontVariant: ["tabular-nums"] },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper },
  pillOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  pillText: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal2 },
  err: { fontSize: 12.5, color: Colors.error, marginTop: 8 },
});
