// The host's choice of what a guest gets back on cancelling. Used when creating
// and when editing a listing. The policy is copied onto each booking as it is
// made, so changing it only affects future bookings.
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Radius } from "@/constants/Colors";

export type CancellationPolicy = "flexible" | "non_refundable";

const POLICIES: { value: CancellationPolicy; title: string; body: string }[] = [
  {
    value: "flexible",
    title: "Refundable (standard rules)",
    body: "Full refund 7 or more days before check-in, 50% from 3 to 6 days before, nothing after that. Guests book more easily.",
  },
  {
    value: "non_refundable",
    title: "Non-refundable",
    body: "A guest who cancels gets no money back and you are paid in full. If you cancel, the guest is always refunded in full.",
  },
];

/** One line for guests, shown on the listing and before paying. */
export function policyLine(policy?: string | null): string {
  return policy === "non_refundable"
    ? "Non-refundable — no money back if you cancel this booking."
    : "Free cancellation up to 7 days before check-in · 50% back up to 3 days before.";
}

export function CancellationChoice({ value, onChange }: { value: CancellationPolicy; onChange: (v: CancellationPolicy) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Cancellation policy">
      {POLICIES.map((p) => {
        const on = value === p.value;
        return (
          <TouchableOpacity
            key={p.value}
            onPress={() => onChange(p.value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.option, on && styles.optionOn]}
          >
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.body}>{p.body}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row", gap: 12, padding: 14, marginBottom: 10,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
  optionOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  radio: {
    width: 20, height: 20, borderRadius: 10, marginTop: 2,
    borderWidth: 2, borderColor: Colors.edgeStrong, alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: Colors.terra },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.terra },
  title: { fontSize: 14.5, fontWeight: "700", color: Colors.charcoal },
  body: { fontSize: 12.5, lineHeight: 18, color: Colors.charcoal2, marginTop: 3 },
});
