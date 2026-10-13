// Shown under the price fields when a host creates or edits a listing: what
// one booking pays them after Aangan Stay's fee, the GST on it and TDS.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Radius } from "@/constants/Colors";
import { inr, inr2, gstPct, hostPayoutEstimate, HOST_FEE_PCT, HOST_FEE_DIRECT_PCT, HostPayoutEstimate } from "@/lib/format";

const MAX_NIGHTS = 90;

function Column({ title, tag, e, highlight }: { title: string; tag: string; e: HostPayoutEstimate; highlight?: boolean }) {
  const line = (label: string, value: string, bold = false) => (
    <View style={styles.line}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
  return (
    <View style={[styles.col, highlight && styles.colOn]}>
      <View style={styles.colHead}>
        <Text style={styles.colTitle}>{title}</Text>
        <View style={[styles.tag, highlight && styles.tagOn]}>
          <Text style={[styles.tagText, highlight && styles.tagTextOn]}>{tag}</Text>
        </View>
      </View>
      {line("Your earnings", inr2(e.earnings))}
      {line(`Aangan Stay fee (${e.feePct}%)`, `− ${inr2(e.fee)}`)}
      {line("GST on the fee (18%)", `− ${inr2(e.feeGst)}`)}
      {line("TDS (0.1%)", `− ${inr2(e.tds)}`)}
      <View style={styles.rule} />
      {line("You receive", inr2(e.payout), true)}
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
      <Text style={styles.sub}>
        {inr(price)} × {nights} night{nights === 1 ? "" : "s"}{cleaning > 0 ? ` + ${inr(cleaning)} cleaning` : ""} = {inr(m.earnings)}
      </Text>
      <View style={styles.stepper} accessibilityLabel="Length of stay">
        <TouchableOpacity onPress={() => setNights((n) => Math.max(1, n - 1))} disabled={nights <= 1} activeOpacity={0.7}
                          accessibilityRole="button" accessibilityLabel="One night fewer" hitSlop={8}
                          style={[styles.stepBtn, nights <= 1 && styles.stepBtnOff]}>
          <Text style={styles.stepSign}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">{nights} night{nights === 1 ? "" : "s"}</Text>
        <TouchableOpacity onPress={() => setNights((n) => Math.min(MAX_NIGHTS, n + 1))} disabled={nights >= MAX_NIGHTS} activeOpacity={0.7}
                          accessibilityRole="button" accessibilityLabel="One night more" hitSlop={8}
                          style={[styles.stepBtn, nights >= MAX_NIGHTS && styles.stepBtnOff]}>
          <Text style={styles.stepSign}>+</Text>
        </TouchableOpacity>
      </View>
      <Column title="Guest finds you on Aangan Stay" tag={`${HOST_FEE_PCT}% fee`} e={m} />
      <Column title="Guest books through your own link" tag={`${HOST_FEE_DIRECT_PCT}% fee · about half`} e={d} highlight />
      <View style={styles.slogan}>
        <Text style={styles.sloganText}>
          Bring your own guests, pay about half the fee. On this booking you keep {inr2(d.payout - m.payout)} more through your own link.
        </Text>
      </View>
      <Text style={styles.note}>
        The guest pays {inr(m.guestPays)} either way, including {gstPct(price)}% GST on the stay, and no service fee.
        TDS is income tax paid in your name; you can claim it in your tax return.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, padding: 14, marginTop: 4, marginBottom: 12, backgroundColor: Colors.cream },
  title: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper, alignItems: "center", justifyContent: "center" },
  stepBtnOff: { opacity: 0.4 },
  stepSign: { fontSize: 20, fontWeight: "600", color: Colors.charcoal, lineHeight: 22 },
  stepValue: { minWidth: 84, textAlign: "center", fontSize: 14, fontWeight: "700", color: Colors.charcoal, fontVariant: ["tabular-nums"] },
  sub: { fontSize: 12.5, color: Colors.charcoal3, marginTop: 3 },
  col: { marginTop: 12, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  colOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  colHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  colTitle: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal, flexShrink: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: Colors.line },
  tagOn: { backgroundColor: Colors.terra },
  tagText: { fontSize: 11, fontWeight: "700", color: Colors.charcoal2 },
  tagTextOn: { color: "#fff" },
  slogan: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.warmBg },
  sloganText: { fontSize: 13, fontWeight: "600", color: Colors.charcoal, lineHeight: 18 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 },
  label: { flex: 1, fontSize: 13, color: Colors.charcoal2 },
  value: { fontSize: 13, color: Colors.charcoal2, fontVariant: ["tabular-nums"] },
  bold: { fontWeight: "700", color: Colors.charcoal, fontSize: 14 },
  rule: { height: 1, backgroundColor: Colors.line, marginVertical: 4 },
  note: { fontSize: 12, color: Colors.charcoal3, marginTop: 12, lineHeight: 17 },
});
