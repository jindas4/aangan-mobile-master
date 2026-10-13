// Shown under the price fields when a host creates or edits a listing: what
// one booking pays them after Aangan Stay's fee, the GST on it and TDS.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Radius } from "@/constants/Colors";
import { inr, hostPayoutEstimate, HOST_FEE_PCT, HOST_FEE_DIRECT_PCT, HostPayoutEstimate } from "@/lib/format";

const NIGHTS = [1, 2, 3, 7];

function Column({ title, e }: { title: string; e: HostPayoutEstimate }) {
  const line = (label: string, value: string, bold = false) => (
    <View style={styles.line}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
  return (
    <View style={styles.col}>
      <Text style={styles.colTitle}>{title}</Text>
      {line("Your earnings", inr(e.earnings))}
      {line(`Aangan Stay fee (${e.feePct}%)`, `− ${inr(e.fee)}`)}
      {line("GST on the fee (18%)", `− ${inr(e.feeGst)}`)}
      {line("TDS (0.1%)", `− ${inr(e.tds)}`)}
      <View style={styles.rule} />
      {line("You receive", inr(e.payout), true)}
    </View>
  );
}

export function PayoutPreview({ price, cleaning }: { price: number; cleaning: number }) {
  const [nights, setNights] = useState(2);
  if (!(price > 0)) return null;
  const m = hostPayoutEstimate(price, cleaning, nights);
  const d = hostPayoutEstimate(price, cleaning, nights, HOST_FEE_DIRECT_PCT);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>What you receive for a booking</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Length of stay">
        {NIGHTS.map((n) => {
          const on = nights === n;
          return (
            <TouchableOpacity key={n} onPress={() => setNights(n)} activeOpacity={0.8}
                              accessibilityRole="radio" accessibilityState={{ selected: on }}
                              style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{n} night{n === 1 ? "" : "s"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Column title="Guest finds you on Aangan Stay" e={m} />
      <Column title="Guest uses your own link" e={d} />
      <Text style={styles.note}>
        The guest pays {inr(m.guestPays)} including 12% GST on the stay, and no service fee.
        TDS is income tax paid in your name; you can claim it in your tax return.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, padding: 14, marginTop: 4, marginBottom: 12, backgroundColor: Colors.cream },
  title: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  chipOn: { backgroundColor: Colors.terra, borderColor: Colors.terra },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.charcoal },
  chipTextOn: { color: "#fff" },
  col: { marginTop: 14 },
  colTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: Colors.charcoal3, marginBottom: 4 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 },
  label: { flex: 1, fontSize: 13, color: Colors.charcoal2 },
  value: { fontSize: 13, color: Colors.charcoal2, fontVariant: ["tabular-nums"] },
  bold: { fontWeight: "700", color: Colors.charcoal, fontSize: 14 },
  rule: { height: 1, backgroundColor: Colors.line, marginVertical: 4 },
  note: { fontSize: 12, color: Colors.charcoal3, marginTop: 12, lineHeight: 17 },
});
