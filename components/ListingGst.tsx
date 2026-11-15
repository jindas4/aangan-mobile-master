import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { Button } from "@/components/Button";

// The GST question in the new-listing flow (same as the website's ListingGst).
//
// What decides who supplies the stay is whether the host is LIABLE to register
// (total turnover on their PAN over ₹20 lakh this financial year; ₹10 lakh in
// Nagaland, Manipur, Mizoram and Tripura), not whether they are registered.
// Under the limit, Aangan invoices guests and pays the GST. Over it, the host
// is the supplier; that isn't built yet, so the listing waits for us.
// Composition taxpayers can't sell through a platform that collects TCS.
// Answers are per tax year: hosts confirm again every April.

type Gstin = { id: number; gstin: string; state_code: string; status: "verified" | "format_ok" | "inactive" };
type Profile = {
  answered: boolean; gst_registered: boolean; fy_label: string; turnover_current: boolean;
  turnover_over_threshold: boolean | null; turnover_over_10l: boolean | null; last_turnover_fy: string | null;
  composition: boolean | null; composition_on_gst_network: boolean; gstins: Gstin[];
};
/** unanswered: the turnover question for this tax year · liable / composition: can't go live yet. */
export type GstStatus = "loading" | "unanswered" | "ok" | "liable" | "composition";

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const TEN_LAKH_STATES = new Set(["13", "14", "15", "16"]);

function statusFor(p: Profile | null, stateCode: string): GstStatus {
  if (!p) return "loading";
  if (p.composition || p.composition_on_gst_network) return "composition";
  const over = TEN_LAKH_STATES.has(stateCode) ? p.turnover_over_10l : p.turnover_over_threshold;
  if (over === null || over === undefined) return "unanswered";
  return over ? "liable" : "ok";
}

export function ListingGst({ stateCode, stateName, inputStyle, onStatus }: {
  stateCode: string; stateName: string; inputStyle: any; onStatus?: (s: GstStatus) => void;
}) {
  const [p, setP] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [showGstin, setShowGstin] = useState(false);
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Re-read on focus, so answers given on the verification screen show here.
  useFocusEffect(useCallback(() => {
    api<Profile>("/api/kyc/gst").then((x) => { setP(x); setFailed(false); }).catch(() => setFailed(true));
  }, []));
  useEffect(() => { setErr(null); }, [stateCode]);
  const status = statusFor(p, stateCode);
  // If the profile didn't load, don't trap the host here; the server checks again before going live.
  useEffect(() => { onStatus?.(failed && !p ? "ok" : status); }, [status, failed, p, onStatus]);

  if (!p || !stateCode) return null;
  const place = stateName || "this state";
  const ten = TEN_LAKH_STATES.has(stateCode);
  const lakh = ten ? 10 : 20;
  const over = ten ? p.turnover_over_10l : p.turnover_over_threshold;
  const onFile = p.gstins.find((g) => g.state_code === stateCode && g.status !== "inactive");
  const renewing = !p.turnover_current && !!p.last_turnover_fy;

  const run = async (fn: () => Promise<Profile>) => {
    setBusy(true); setErr(null);
    try { setP(await fn()); return true; }
    catch (e: any) { setErr(e.message); return false; }
    finally { setBusy(false); }
  };
  const declare = (body: Record<string, boolean>) => run(() => api<Profile>("/api/kyc/gst", { method: "PUT", body }));
  const answer = (yes: boolean) => declare(ten ? { turnover_over_10l: yes } : { turnover_over_threshold: yes });
  const clean = gstin.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  const wrongState = /^\d{2}/.test(clean) && clean.slice(0, 2) !== stateCode;
  const ok = GSTIN_RE.test(clean) && !wrongState;
  const add = async () => { if (ok && await run(() => api<Profile>("/api/kyc/gst/gstins", { method: "POST", body: { gstin: clean } }))) setGstin(""); };
  const pill = (on: boolean, label: string, onPress: () => void) => (
    <TouchableOpacity key={label} onPress={onPress} disabled={busy} style={[styles.pill, on && styles.pillOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.pillText, on && { color: Colors.terra }]}>{label}</Text>
    </TouchableOpacity>
  );

  const gstinBlock = onFile ? (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>Your GSTIN for {place}: <Text style={styles.mono}>{onFile.gstin}</Text></Text>
        <Text style={styles.hint}>{onFile.status === "verified" ? "Verified with the GST network." : "Format checked. We'll confirm it with the GST network."}</Text>
      </View>
    </View>
  ) : (
    <View style={{ marginTop: 10, gap: 8 }}>
      <TextInput value={clean} onChangeText={setGstin} placeholder={`${stateCode}ABCDE1234F1Z5`} placeholderTextColor={Colors.charcoal3}
                 autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={add}
                 style={[inputStyle, styles.monoInput]} accessibilityLabel={`GSTIN for ${place}`} />
      <Text style={[styles.hint, wrongState && { color: Colors.error, fontWeight: "700" }]}>
        {wrongState
          ? `A ${place} GSTIN starts with ${stateCode}. This one is for another state; add the one registered in ${place}.`
          : "15 characters, from your GST certificate. We check it with the GST network."}
      </Text>
      <Button title={busy ? "Checking…" : "Check and add"} onPress={add} disabled={busy || !ok} />
    </View>
  );

  const compositionBlock = (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.q2}>Are you under the GST composition scheme?</Text>
      {p.composition_on_gst_network
        ? <Text style={styles.body}>The GST network lists your registration as composition.</Text>
        : <View style={styles.pills}>
            {pill(p.composition === false, "No", () => declare({ composition: false }))}
            {pill(p.composition === true, "Yes, composition", () => declare({ composition: true }))}
          </View>}
      {status === "composition" && (
        <Text style={styles.warn} accessibilityRole="alert">
          Under composition you can't take bookings through an online platform (Section 10(2A) of the CGST Act). Opt out with
          form GST CMP-04 on the GST portal, then change this answer. You can still save this listing as a draft.
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.card} testID="listing-gst">
      {renewing && <Text style={styles.kicker}>NEW FINANCIAL YEAR: PLEASE CONFIRM</Text>}
      <Text style={styles.q}>This financial year ({p.fy_label}), is your total turnover over ₹{lakh} lakh, or likely to be?</Text>
      <Text style={styles.hint}>
        Count everything on your PAN across India: all your properties, other booking sites, direct bookings and any other business.
        {ten ? ` The limit is ₹10 lakh for properties in ${place}.` : ""} Most homestays are well under.
      </Text>
      <View style={styles.pills}>
        {pill(over === false, `No, ₹${lakh} lakh or less`, () => answer(false))}
        {pill(over === true, `Yes, over ₹${lakh} lakh`, () => answer(true))}
      </View>

      {over === false && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={[styles.body, { flex: 1 }]}>Aangan Stay invoices your guests and pays the GST on these stays. You don't need a GSTIN to list.</Text>
          </View>
          {onFile || showGstin || status === "composition" ? (
            <>
              {gstinBlock}
              <Text style={styles.hint}>It goes on our fee invoices to you, so you can see the GST we charge.</Text>
              {compositionBlock}
            </>
          ) : (
            <TouchableOpacity onPress={() => setShowGstin(true)} style={{ marginTop: 8 }}>
              <Text style={styles.link}>Registered for GST anyway? Add your GSTIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {over === true && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.body}>
            Then GST law makes you the supplier of stays here: guests get invoices in your name, with your {place} GSTIN, and
            Aangan Stay collects 0.5% TCS. We're finishing this setup. Complete your listing and save it, and we'll contact you to take it live.
          </Text>
          {gstinBlock}
          {compositionBlock}
        </View>
      )}

      {over !== null && (
        <Text style={[styles.hint, { marginTop: 12 }]}>
          If your turnover crosses the limit or your GST registration changes, update it on the verification screen within 7 days.
        </Text>
      )}
      {!!err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 4, marginBottom: 12, padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: Colors.terra, marginBottom: 6 },
  q: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  q2: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal },
  hint: { fontSize: 12, lineHeight: 17, color: Colors.charcoal3, marginTop: 4 },
  body: { fontSize: 13.5, lineHeight: 19, color: Colors.charcoal2 },
  mono: { fontWeight: "800", color: Colors.charcoal, letterSpacing: 0.8 },
  monoInput: { letterSpacing: 1, fontVariant: ["tabular-nums"] },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper },
  pillOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  pillText: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal2 },
  link: { fontSize: 13.5, fontWeight: "700", color: Colors.terraDeep, textDecorationLine: "underline" },
  warn: { marginTop: 8, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.terraTint, fontSize: 12.5, lineHeight: 17, color: Colors.terraDeep, fontWeight: "600" },
  err: { fontSize: 12.5, color: Colors.error, marginTop: 8 },
});
