// On the host pitch screen: a visitor types the price they have in mind and
// sees what a booking would pay them, before becoming a host.
import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors, Radius } from "@/constants/Colors";
import { PayoutPreview } from "@/components/PayoutPreview";

export function EarningsCalculator() {
  const [price, setPrice] = useState("3000");
  const [cleaning, setCleaning] = useState("500");
  return (
    <View>
      <Text style={styles.heading}>See what you would earn</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Price per night (₹)</Text>
          <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" style={styles.input}
                     accessibilityLabel="Price per night in rupees" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Cleaning fee per stay (₹)</Text>
          <TextInput value={cleaning} onChangeText={setCleaning} keyboardType="number-pad" style={styles.input}
                     accessibilityLabel="Cleaning fee per stay in rupees" />
        </View>
      </View>
      <PayoutPreview price={Math.max(parseInt(price) || 0, 0)} cleaning={Math.max(parseInt(cleaning) || 0, 0)} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: "800", color: Colors.charcoal, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, marginBottom: 8 },
  label: { fontSize: 11.5, fontWeight: "700", color: Colors.charcoal3, marginBottom: 5 },
  input: { height: 48, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, paddingHorizontal: 12, fontSize: 16, fontWeight: "600", color: Colors.charcoal, backgroundColor: Colors.paper },
});
