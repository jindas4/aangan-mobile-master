import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api, RefundQuoteResponse, CancelResponse } from "@/lib/api";
import { inr } from "@/lib/format";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";

const TIER_COLORS: Record<string, { bg: string; fg: string }> = {
  free: { bg: "#DCFCE7", fg: "#166534" },
  host_full: { bg: "#DCFCE7", fg: "#166534" },
  half: { bg: "#FEF3C7", fg: "#92400E" },
  none: { bg: "#FEE2E2", fg: "#991B1B" },
};

const TIER_LABELS: Record<string, string> = {
  free: "Free cancellation",
  half: "Partial refund",
  host_full: "Full refund (host-initiated)",
  none: "No refund",
};

interface Props {
  bookingId: string;
  onClose: () => void;
  onCancelled: (r: CancelResponse) => void;
}

export function CancelBookingModal({ bookingId, onClose, onCancelled }: Props) {
  const [quote, setQuote] = useState<RefundQuoteResponse | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<RefundQuoteResponse>(`/api/bookings/${bookingId}/refund-quote`)
      .then(setQuote)
      .catch((e: any) => setErr(e.message || "Could not compute refund"));
  }, [bookingId]);

  const confirmCancel = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<CancelResponse>(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: { reason },
      });
      onCancelled(r);
    } catch (e: any) {
      setErr(e.message || "Could not cancel booking");
    } finally {
      setBusy(false);
    }
  };

  const tier = TIER_COLORS[quote?.tier || "none"];

  return (
    <GlassSheet onClose={onClose} title="Cancel booking">
          {!quote ? (
            <View style={styles.loadingWrap}>
              {err ? <Text style={styles.errorText}>{err}</Text> : <ActivityIndicator color={Colors.terra} />}
            </View>
          ) : (
            <>
              <View style={[styles.tierCard, { backgroundColor: tier.bg }]}>
                <Text style={[styles.tierLabel, { color: tier.fg }]}>{TIER_LABELS[quote.tier] || "Refund"}</Text>
                <Text style={[styles.tierAmount, { color: tier.fg }]}>
                  {inr(quote.refund_inr)} back · {quote.refund_pct}% of {inr(quote.total_inr)}
                </Text>
                <Text style={[styles.tierNote, { color: tier.fg }]}>{quote.note}</Text>
              </View>

              <Text style={styles.fieldLabel}>Reason (optional)</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Plans changed, family emergency, etc."
                placeholderTextColor={Colors.charcoal3}
                style={styles.textArea}
              />

              {err && <Text style={styles.errorText}>{err}</Text>}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                  <Text style={styles.ghostBtnText}>Never mind</Text>
                </TouchableOpacity>
                <Button title={busy ? "Cancelling…" : "Confirm cancel"} onPress={confirmCancel} loading={busy} disabled={busy} style={{ flex: 1 }} />
              </View>
              <Text style={styles.helperText}>Refunds usually settle in 5–7 working days to the same UPI / card.</Text>
            </>
          )}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  tierCard: { borderRadius: Radius.md, padding: 16, marginBottom: 20 },
  tierLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  tierAmount: { fontFamily: Fonts.display, fontSize: 20, fontWeight: "700" },
  tierNote: { fontSize: 12.5, fontWeight: "600", marginTop: 6, opacity: 0.9 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 8 },
  textArea: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    fontSize: 14,
    color: Colors.charcoal,
  },
  errorText: { fontSize: 13, color: Colors.error, marginTop: 10, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  ghostBtn: {
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
  },
  ghostBtnText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  helperText: { fontSize: 11.5, color: Colors.charcoal3, textAlign: "center", marginTop: 12 },
});
