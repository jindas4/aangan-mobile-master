// Payment step between creating a booking and telling the guest it worked.
//
// Mirrors web's CheckoutModal: pick a method, then POST /payments/init.
//
//   · Backend in PAYMENTS_DEV_MODE → `razorpay_key` comes back null; we call
//     /payments/confirm directly and the backend captures locally.
//   · Live mode → `razorpay_key` + `razorpay_order_id` come back; we open the
//     native Razorpay checkout (UPI/card/wallet/netbanking inside the SDK),
//     then POST /payments/confirm with the returned payment id + signature.
//     The backend verifies the signature; the Razorpay webhook remains the
//     source of truth and reconciles asynchronously.
//
// react-native-razorpay is a native module — required lazily so Expo Go
// (where it isn't linked) still runs the dev-mode path.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api, PaymentInitResponse, PaymentConfirmResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/format";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";

type Method = "upi" | "card" | "wallet" | "netbanking";

const METHODS: { key: Method; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm, BHIM", icon: "phone-portrait-outline" },
  { key: "card", label: "Credit / Debit card", sub: "Visa, Mastercard, RuPay", icon: "card-outline" },
  { key: "wallet", label: "Wallets", sub: "Paytm, Amazon Pay", icon: "wallet-outline" },
  { key: "netbanking", label: "Netbanking", sub: "All major banks", icon: "business-outline" },
];

interface Props {
  bookingId: string;
  totalInr: number;
  onClose: () => void;
  /** Called with the booking status the server reported after payment. */
  onPaid: (bookingStatus: string) => void;
}

export function CheckoutSheet({ bookingId, totalInr, onClose, onPaid }: Props) {
  const [method, setMethod] = useState<Method>("upi");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const user = useAuth((s) => s.user);

  const pay = async () => {
    setBusy(true);
    setErr(null);
    try {
      const init = await api<PaymentInitResponse>("/api/payments/init", {
        method: "POST",
        body: { booking_id: bookingId, method },
      });

      let confirmBody: Record<string, unknown> = {
        payment_id: init.payment_id,
        method_detail: method,
      };

      if (init.razorpay_key && init.razorpay_order_id) {
        // Live mode — hand off to the native Razorpay checkout.
        let RazorpayCheckout: any;
        try {
          RazorpayCheckout = require("react-native-razorpay").default;
        } catch {
          throw new Error(
            "Payments need the full Aangan app build. Please update the app and try again.",
          );
        }
        let rzp: { razorpay_payment_id: string; razorpay_signature: string };
        try {
          rzp = await RazorpayCheckout.open({
            key: init.razorpay_key,
            order_id: init.razorpay_order_id,
            amount: init.amount_inr * 100, // paise
            currency: "INR",
            name: "Aangan",
            description: `Booking ${bookingId}`,
            prefill: {
              contact: user?.phone ?? undefined,
              email: user?.email ?? undefined,
              name: user?.name ?? undefined,
            },
            theme: { color: Colors.terra },
            notes: { booking_id: bookingId },
          });
        } catch (e: any) {
          // SDK rejects on user-cancel too — don't show a scary error for that.
          const cancelled = e?.code === 0 || /cancell/i.test(e?.description || e?.message || "");
          if (cancelled) {
            setBusy(false);
            return;
          }
          throw new Error(e?.description || "Payment failed. You have not been charged.");
        }
        confirmBody = {
          ...confirmBody,
          razorpay_payment_id: rzp.razorpay_payment_id,
          razorpay_signature: rzp.razorpay_signature,
        };
      }

      const res = await api<PaymentConfirmResponse>("/api/payments/confirm", {
        method: "POST",
        body: confirmBody,
      });
      if (res.status === "failed") {
        throw new Error("Payment verification failed. If you were charged, it will be auto-refunded.");
      }
      onPaid(res.booking_status);
    } catch (e: any) {
      setErr(e.message || "Payment failed. You have not been charged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSheet onClose={onClose} title="Confirm & pay">
      <Text style={styles.total}>{inr(totalInr)}</Text>
      <Text style={styles.totalSub}>All-inclusive · charged in ₹</Text>

      <Text style={styles.fieldLabel}>Pay with</Text>
      {METHODS.map((m) => {
        const on = method === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            style={[styles.method, on && styles.methodOn]}
            onPress={() => setMethod(m.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={m.icon} size={20} color={on ? Colors.terra : Colors.charcoal2} />
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodSub}>{m.sub}</Text>
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {err && <Text style={styles.errorText}>{err}</Text>}

      <Button
        title={busy ? "Processing…" : `Pay ${inr(totalInr)}`}
        onPress={pay}
        loading={busy}
        disabled={busy}
        full
        size="lg"
        style={{ marginTop: 20 }}
      />
      <Text style={styles.helperText}>
        You won't be charged until the host confirms your stay.
      </Text>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  total: { fontFamily: Fonts.display, fontSize: 30, fontWeight: "800", color: Colors.charcoal },
  totalSub: { fontSize: 12.5, color: Colors.charcoal2, marginTop: 2 },
  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: Colors.charcoal2,
    marginTop: 20, marginBottom: 10,
  },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  methodOn: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 14.5, fontWeight: "700", color: Colors.charcoal },
  methodSub: { fontSize: 12, color: Colors.charcoal3, marginTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.edgeStrong,
    alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: Colors.terra },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.terra },
  errorText: { fontSize: 13, color: Colors.error, marginTop: 12, fontWeight: "600" },
  helperText: {
    fontSize: 11.5, color: Colors.charcoal3,
    textAlign: "center", marginTop: 12,
  },
});
