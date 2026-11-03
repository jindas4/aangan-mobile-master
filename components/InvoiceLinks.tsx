// The booking's GST invoice (and credit notes from refunds, printed under it).
// The phone's browser has no sign-in, so we ask the API for a link that works
// for 10 minutes and open that. Shown whenever an invoice exists — refunded
// bookings included.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { api, API_BASE } from "@/lib/api";
import { Colors } from "@/constants/Colors";

export function InvoiceLinks({ bookingId, invoiceNumber, creditNotes }: {
  bookingId: string; invoiceNumber?: string | null; creditNotes?: string[];
}) {
  const [busy, setBusy] = useState(false);
  if (!invoiceNumber) return null;

  const open = async () => {
    setBusy(true);
    try {
      const r = await api<{ path: string }>(`/api/invoices/booking/${bookingId}/link`, { method: "POST" });
      await WebBrowser.openBrowserAsync(`${API_BASE}${r.path}`);
    } catch (e: any) {
      Alert.alert("Couldn't open the invoice", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={open} disabled={busy} style={styles.row} accessibilityRole="link">
        <Ionicons name="document-text-outline" size={16} color={Colors.terra} />
        <Text style={styles.link}>
          {busy ? "Opening…" : `View GST invoice${creditNotes?.length ? " and credit note" + (creditNotes.length > 1 ? "s" : "") : ""}`}
        </Text>
      </TouchableOpacity>
      <Text style={styles.numbers}>
        Invoice {invoiceNumber}
        {creditNotes?.map((n) => ` · Credit note ${n}`).join("")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.edge, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { fontSize: 13.5, fontWeight: "700", color: Colors.terra },
  numbers: { fontSize: 12, color: Colors.charcoal3 },
});
