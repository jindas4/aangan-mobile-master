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
//   · Cashfree (`provider: "cashfree"`) → a payment session id comes back; we
//     open Cashfree's checkout, then POST /payments/confirm, where the backend
//     checks the order with Cashfree. Which gateway is used is a server setting.
//
// react-native-razorpay is a native module — required lazily so Expo Go
// (where it isn't linked) still runs the dev-mode path.
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api, PaymentInitResponse, PaymentConfirmResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { policyLine } from "@/components/CancellationChoice";
import { inr } from "@/lib/format";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";

// The guest picks how to pay inside Cashfree's own secure window (real UPI
// apps, banks, card networks), so we only list the options — no picker.
const METHODS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "UPI (any app or QR)", icon: "phone-portrait-outline" },
  { label: "Debit or credit card", icon: "card-outline" },
  { label: "Net banking", icon: "business-outline" },
  { label: "Wallets", icon: "wallet-outline" },
];
// While checkout is open the dates are held; ping well inside the server's 10 minutes.
const HOLD_PING_MS = 2 * 60 * 1000;

interface Props {
  bookingId: string;
  totalInr: number;
  /** The listing's policy — shown once more before the guest pays. */
  cancellationPolicy?: string | null;
  onClose: () => void;
  /** Called with the booking status the server reported after payment. */
  onPaid: (bookingStatus: string) => void;
  /** False when the host approves each booking (24 hours to answer). */
  instantBook?: boolean;
  /** e.g. "Mon 23 Nov → Thu 26 Nov · 3 nights · 2 guests" */
  stayLine?: string;
}

export function CheckoutSheet({ bookingId, totalInr, cancellationPolicy, onClose, onPaid, instantBook = true, stayLine }: Props) {
  const [busy, setBusy] = useState(false);
  const [holdLost, setHoldLost] = useState(false);
  // Keep the dates held only while this sheet is open (closing it releases them).
  useEffect(() => {
    const timer = setInterval(() => {
      api<{ held: boolean }>(`/api/bookings/${bookingId}/hold`, { method: "POST" })
        .then((r) => { if (!r.held) setHoldLost(true); }).catch(() => {});
    }, HOLD_PING_MS);
    return () => clearInterval(timer);
  }, [bookingId]);
  const [err, setErr] = useState<string | null>(null);
  const user = useAuth((s) => s.user);

  const pay = async () => {
    setBusy(true);
    setErr(null);
    try {
      const init = await api<PaymentInitResponse>("/api/payments/init", {
        method: "POST",
        body: { booking_id: bookingId },
      });

      let confirmBody: Record<string, unknown> = {
        payment_id: init.payment_id,
      };

      let cashfreeOutcome: string | null = null;
      if (init.provider === "cashfree" && init.cashfree_payment_session_id) {
        cashfreeOutcome = await openCashfreeCheckout(
          init.cashfree_payment_session_id,
          init.cashfree_order_id ?? init.payment_id,
          init.cashfree_mode,
        );
      } else if (init.razorpay_key && init.razorpay_order_id) {
        // Live mode — hand off to the native Razorpay checkout.
        let RazorpayCheckout: any;
        try {
          RazorpayCheckout = require("react-native-razorpay").default;
        } catch {
          throw new Error(
            "Payments need the full Aangan Stay app build. Please update the app and try again.",
          );
        }
        let rzp: { razorpay_payment_id: string; razorpay_signature: string };
        try {
          rzp = await RazorpayCheckout.open({
            key: init.razorpay_key,
            order_id: init.razorpay_order_id,
            amount: init.amount_inr * 100, // paise
            currency: "INR",
            name: "Aangan Stay",
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
      if (res.status !== "captured") {
        // Cashfree says the order is still unpaid. Closing the page is not an error.
        if (cashfreeOutcome === "cancelled") return;
        throw new Error("Payment was not completed. You have not been charged — please try again.");
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
      {stayLine ? <Text style={styles.stayLine}>{stayLine}</Text> : null}

      <Text style={styles.fieldLabel}>How you'll pay</Text>
      <Text style={styles.methodSub}>
        When you press Pay, Cashfree Payments' secure window opens. Choose how to pay there:
      </Text>
      <View style={styles.methodGrid}>
        {METHODS.map((m) => (
          <View key={m.label} style={styles.methodChip}>
            <Ionicons name={m.icon} size={16} color={Colors.charcoal2} />
            <Text style={styles.methodLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.methodSub}>Your payment details go only to Cashfree Payments, never to Aangan Stay.</Text>

      {holdLost && (
        <Text style={styles.errorText}>
          These dates were released because checkout was open too long, and someone else has booked them. Please close this and choose other dates.
        </Text>
      )}
      {err && <Text style={styles.errorText}>{err}</Text>}

      <Button
        title={busy ? "Processing…" : `Pay ${inr(totalInr)}`}
        onPress={pay}
        loading={busy}
        disabled={busy || holdLost}
        full
        size="lg"
        style={{ marginTop: 20 }}
      />
      <Text style={styles.helperText}>
        {instantBook
          ? "Your booking is confirmed as soon as you pay."
          : "The host approves each booking and has up to 24 hours to accept. If they don't, you're refunded in full."}
      </Text>
      <Text style={[styles.helperText, cancellationPolicy === "non_refundable" && styles.strictText]}>
        {policyLine(cancellationPolicy)}
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
  stayLine: { fontSize: 13.5, color: Colors.charcoal2, marginTop: 6 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
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
  strictText: { color: Colors.error, fontWeight: "700", marginTop: 6 },
  errorText: { fontSize: 13, color: Colors.error, marginTop: 12, fontWeight: "600" },
  helperText: {
    fontSize: 11.5, color: Colors.charcoal3,
    textAlign: "center", marginTop: 12,
  },
});
