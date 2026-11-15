import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { Button } from "@/components/Button";

// GST on the host's verification screen (same as the website's HostGst). The
// question that matters is turnover: over ₹20 lakh this financial year makes
// the host liable to register and the supplier of their stays. Asked again
// every April. Registered hosts add each GSTIN; we check it against their PAN
// and the GST network.

type Gstin = {
  id: number; gstin: string; state_code: string; state_name: string;
  status: "verified" | "format_ok" | "inactive"; legal_name: string; trade_name: string;
  taxpayer_type: string; gst_status: string; pan_matches: boolean | null; verified_at: string | null;
};
type Profile = {
  answered: boolean; gst_registered: boolean; fy_label: string; turnover_current: boolean;
  turnover_over_threshold: boolean | null; last_turnover_fy: string | null;
  composition: boolean | null; composition_on_gst_network: boolean; gstins: Gstin[];
};

export function HostGst() {
  const [p, setP] = useState<Profile | null>(null);
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api<Profile>("/api/kyc/gst").then(setP).catch(() => {}); }, []);
  if (!p) return null;

  const run = async (fn: () => Promise<Profile>) => {
    setBusy(true); setErr(null);
    try { setP(await fn()); return true; }
    catch (e: any) { setErr(e.message); return false; }
    finally { setBusy(false); }
  };
  const clean = gstin.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  const looksRight = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean);
  const declare = (body: Record<string, boolean>) => run(() => api<Profile>("/api/kyc/gst", { method: "PUT", body }));
  const add = async () => {
    if (await run(() => api<Profile>("/api/kyc/gst/gstins", { method: "POST", body: { gstin: clean } }))) setGstin("");
  };
  const remove = (id: number) => run(() => api<Profile>(`/api/kyc/gst/gstins/${id}`, { method: "DELETE" }));

  const choice = (on: boolean, label: string, onPress: () => void) => (
    <TouchableOpacity key={label} onPress={onPress} disabled={busy} style={[styles.choice, on && styles.choiceOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.card} testID="host-gst">
      <View style={styles.headRow}>
        <Text style={styles.title}>GST</Text>
        <Text style={[styles.optional, { color: p.turnover_current ? Colors.success : Colors.terra }]}>
          {(p.turnover_current ? `CONFIRMED FOR ${p.fy_label}` : p.last_turnover_fy ? `CONFIRM FOR ${p.fy_label}` : "NEEDED TO PUBLISH")}
        </Text>
      </View>
      <Text style={styles.body}>
        This financial year ({p.fy_label}), has your total turnover gone over ₹20 lakh? Count everything on your
        PAN across India: all your properties, other booking sites, direct bookings and any other business. Most homestays
        are well under; then Aangan Stay invoices your guests and pays the GST. We ask again every April.
      </Text>
      <View style={styles.choices}>
        {choice(p.turnover_over_threshold === false, "No, ₹20 lakh or less", () => declare({ turnover_over_threshold: false }))}
        {choice(p.turnover_over_threshold === true, "Yes, over ₹20 lakh", () => declare({ turnover_over_threshold: true }))}
      </View>
      {p.turnover_over_threshold === true && (
        <Text style={styles.meta}>
          GST law then makes you the supplier of your stays: invoices in your name and 0.5% TCS collected by us. We're setting
          this up and will contact you before your listings go live. Add your GSTIN for each state below.
        </Text>
      )}
      <Text style={[styles.meta, { color: Colors.charcoal3, marginBottom: 14 }]}>
        For properties in Nagaland, Manipur, Mizoram or Tripura the limit is ₹10 lakh; we ask about it when you list there.
        If your turnover crosses the limit or your registration changes, update this within 7 days.
      </Text>

      <Text style={styles.sub}>Registered for GST?</Text>
      <View style={styles.choices}>
        {choice(p.answered && !p.gst_registered, "Not registered", () => declare({ gst_registered: false }))}
        {choice(p.gst_registered, "Registered", () => declare({ gst_registered: true }))}
      </View>

      {p.gst_registered && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sub}>Under the composition scheme?</Text>
          {p.composition_on_gst_network
            ? <Text style={styles.meta}>The GST network lists your registration as composition.</Text>
            : <View style={styles.choices}>
                {choice(p.composition === false, "No", () => declare({ composition: false }))}
                {choice(p.composition === true, "Yes, composition", () => declare({ composition: true }))}
              </View>}
          {(p.composition || p.composition_on_gst_network) && (
            <Text style={styles.warn}>
              Under composition you can't supply stays through a platform like ours (Section 10(2A) of the CGST Act). Opt out
              with form GST CMP-04 on the GST portal before your listings go live.
            </Text>
          )}
        </View>
      )}

      {p.gst_registered && (
        <View style={{ gap: 10 }}>
          {p.gstins.map((g) => (
            <View key={g.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gstin}>{g.gstin}</Text>
                <Text style={styles.meta}>
                  {g.state_name}{g.legal_name ? ` · ${g.legal_name}` : ""}{g.taxpayer_type ? ` · ${g.taxpayer_type}` : ""}
                </Text>
                <Text style={[styles.status, g.status === "verified" && { color: Colors.success }]}>
                  {g.status === "verified" ? "VERIFIED WITH THE GST NETWORK" : g.pan_matches ? "FORMAT AND PAN CHECKED" : "FORMAT CHECKED"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(g.id)} disabled={busy} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TextInput value={clean} onChangeText={setGstin} placeholder="06ABCDE1234F1Z5" placeholderTextColor={Colors.charcoal3}
                     autoCapitalize="characters" autoCorrect={false} style={styles.input} accessibilityLabel="GSTIN" />
          <Text style={styles.meta}>15 characters, from your GST certificate. It must be registered to the PAN you verified with us.</Text>
          <Button title={busy ? "Checking…" : "Add GSTIN"} onPress={add} disabled={busy || !looksRight} />
        </View>
      )}
      {!!err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 24, backgroundColor: Colors.paper, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.edge, padding: 16 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  optional: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3 },
  body: { fontSize: 13.5, color: Colors.charcoal2, lineHeight: 20, marginTop: 6, marginBottom: 12 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  choice: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge },
  choiceOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  choiceText: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal2 },
  choiceTextOn: { color: Colors.terra },
  row: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, padding: 12 },
  gstin: { fontSize: 14, fontWeight: "700", color: Colors.charcoal, letterSpacing: 1, fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  status: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, color: Colors.charcoal3, marginTop: 4 },
  remove: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal3 },
  input: { height: 48, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge,
           backgroundColor: Colors.paper, fontSize: 15, color: Colors.charcoal, fontWeight: "600", letterSpacing: 1 },
  err: { fontSize: 12.5, color: Colors.error, marginTop: 10 },
  sub: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal, marginBottom: 8 },
  warn: { marginTop: 4, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.terraTint, fontSize: 12.5, lineHeight: 17, color: Colors.terraDeep, fontWeight: "600" },
});
