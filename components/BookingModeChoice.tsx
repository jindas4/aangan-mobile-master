// How guests book a listing: confirmed at payment, or the host approves each
// request (backend services/booking_requests.py — 24 hours to answer).
// Same look as CancellationChoice, which sits next to it.
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Radius } from "@/constants/Colors";

const MODES: { value: boolean; title: string; body: string }[] = [
  { value: true, title: "Instant booking",
    body: "Guests are confirmed the moment they pay. Most guests prefer this, and it gets you more bookings." },
  { value: false, title: "Approve each request",
    body: "Guests pay, then you accept or decline within 24 hours. If you decline or don't answer, they're refunded in full." },
];

export function BookingModeChoice({ value, onChange }: { value: boolean; onChange: (instant: boolean) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How guests book">
      {MODES.map((m) => {
        const on = value === m.value;
        return (
          <TouchableOpacity key={String(m.value)} onPress={() => onChange(m.value)} activeOpacity={0.8}
                            accessibilityRole="radio" accessibilityState={{ selected: on }}
                            style={[styles.option, on && styles.optionOn]}>
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{m.title}</Text>
              <Text style={styles.body}>{m.body}</Text>
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
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.edgeStrong, marginTop: 2, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: Colors.terra },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.terra },
  title: { fontSize: 14.5, fontWeight: "700", color: Colors.charcoal },
  body: { fontSize: 12.5, lineHeight: 18, color: Colors.charcoal2, marginTop: 3 },
});
