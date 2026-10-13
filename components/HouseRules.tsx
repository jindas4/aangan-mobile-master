// House rules a guest should know before paying — unmarried couples, local
// ID, alcohol, pets — so nobody is turned away at the door. The editor is used
// when a host creates or edits a listing; the list is shown on the listing.
// true = welcome/allowed, false = not, null = the host has not said.
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Colors } from "@/constants/Colors";

export type Rule = boolean | null;
export interface HouseRulesValue { couples_ok: Rule; local_id_ok: Rule; alcohol_ok: Rule; pet_friendly: boolean }

const RULES: { key: "couples_ok" | "local_id_ok" | "alcohol_ok"; label: string; yes: string; no: string }[] = [
  { key: "couples_ok", label: "Unmarried couples", yes: "Unmarried couples welcome", no: "Married couples and families only" },
  { key: "local_id_ok", label: "Guests with ID from the same city", yes: "Local ID accepted", no: "Local ID not accepted" },
  { key: "alcohol_ok", label: "Alcohol", yes: "Alcohol allowed", no: "No alcohol on the property" },
];

/** The rules a host has stated, as lines for guests. */
export function houseRuleLines(v: Partial<HouseRulesValue>): { text: string; ok: boolean }[] {
  const out: { text: string; ok: boolean }[] = [];
  for (const r of RULES) {
    const val = v[r.key];
    if (val === true) out.push({ text: r.yes, ok: true });
    if (val === false) out.push({ text: r.no, ok: false });
  }
  if (v.pet_friendly) out.push({ text: "Pets welcome", ok: true });
  return out;
}

export function HouseRulesList({ item }: { item: Partial<HouseRulesValue> }) {
  const lines = houseRuleLines(item);
  if (!lines.length) return null;
  return (
    <View>
      {lines.map((l) => (
        <View key={l.text} style={styles.line}>
          <View style={[styles.mark, l.ok ? styles.markOk : styles.markNo]}>
            <Text style={[styles.markText, l.ok && styles.markTextOk]}>{l.ok ? "✓" : "✕"}</Text>
          </View>
          <Text style={styles.lineText}>{l.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function HouseRulesEditor({ value, onChange }: { value: HouseRulesValue; onChange: (v: HouseRulesValue) => void }) {
  return (
    <View>
      {RULES.map((r) => (
        <View key={r.key} style={styles.rule}>
          <Text style={styles.ruleLabel}>{r.label}</Text>
          <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={r.label}>
            {([[r.key === "alcohol_ok" ? "Allowed" : "Welcome", true], ["Not allowed", false], ["Not stated", null]] as [string, Rule][]).map(([label, v]) => {
              const on = value[r.key] === v;
              return (
                <TouchableOpacity key={label} onPress={() => onChange({ ...value, [r.key]: v })} activeOpacity={0.8}
                                  accessibilityRole="radio" accessibilityState={{ selected: on }}
                                  style={[styles.opt, on && styles.optOn]}>
                  <Text style={[styles.optText, on && styles.optTextOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <View style={styles.petRow}>
        <Text style={styles.ruleLabel}>Pets welcome</Text>
        <Switch value={value.pet_friendly} onValueChange={(v) => onChange({ ...value, pet_friendly: v })}
                trackColor={{ true: Colors.terra }} accessibilityLabel="Pets welcome" />
      </View>
      <Text style={styles.note}>
        Guests see these before they book and can filter by them. Stating them clearly means fewer awkward arrivals.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  mark: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  markOk: { backgroundColor: Colors.warmBg },
  markNo: { backgroundColor: Colors.line },
  markText: { fontSize: 11, fontWeight: "700", color: Colors.charcoal2 },
  markTextOk: { color: Colors.terra },
  lineText: { fontSize: 14.5, color: Colors.charcoal2, flex: 1 },
  rule: { marginBottom: 12 },
  ruleLabel: { fontSize: 13.5, fontWeight: "600", color: Colors.charcoal },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  opt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  optOn: { backgroundColor: Colors.terra, borderColor: Colors.terra },
  optText: { fontSize: 12.5, fontWeight: "600", color: Colors.charcoal },
  optTextOn: { color: "#fff" },
  petRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  note: { fontSize: 11.5, color: Colors.charcoal3, lineHeight: 16 },
});
