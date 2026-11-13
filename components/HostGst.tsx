import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { Button } from "@/components/Button";

// GST registration on the host's verification screen (same as the website's
// HostGst). Optional: most home hosts are below the threshold. Hosts who are
// registered add each GSTIN; we check it against their PAN and the GST network.

type Gstin = {
  id: number; gstin: string; state_code: string; state_name: string;
  status: "verified" | "format_ok" | "inactive"; legal_name: string; trade_name: string;
  taxpayer_type: string; gst_status: string; pan_matches: boolean | null; verified_at: string | null;
};
type Profile = { answered: boolean; gst_registered: boolean; turnover_over_threshold: boolean | null; gstins: Gstin[] };

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
  const declare = (gst_registered: boolean) =>
    run(() => api<Profile>("/api/kyc/gst", { method: "PUT", body: { gst_registered, turnover_over_threshold: p.turnover_over_threshold } }));
  const add = async () => {
    if (await run(() => api<Profile>("/api/kyc/gst/gstins", { method: "POST", body: { gstin: clean } }))) setGstin("");
  };
  const remove = (id: number) => run(() => api<Profile>(`/api/kyc/gst/gstins/${id}`, { method: "DELETE" }));

  const choice = (on: boolean, label: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} disabled={busy} style={[styles.choice, on && styles.choiceOn]}
                      accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.card} testID="host-gst">
      <View style={styles.headRow}>
        <Text style={styles.title}>GST registration</Text>
        <Text style={styles.optional}>OPTIONAL</Text>
      </View>
      <Text style={styles.body}>
        Most homestays are below the GST threshold and aren't registered. If you are registered, add your GSTIN
        for each state you have a property in, so your invoices and our fee invoices carry it.
      </Text>
      <View style={styles.choices}>
        {choice(p.answered && !p.gst_registered, "I'm not registered", () => declare(false))}
        {choice(p.gst_registered, "I'm registered for GST", () => declare(true))}
      </View>

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
      {err && <Text style={styles.err}>{err}</Text>}
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
});
