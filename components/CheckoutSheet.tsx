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
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api, BookingWithListing, PaymentInitResponse, PaymentConfirmResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { inr, imageUrl, parseDate } from "@/lib/format";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";

// The guest picks how to pay inside Cashfree's own secure window (real UPI
// apps, banks, card networks), so we only list the options — no picker.
const METHODS: { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; ink: string }[] = [
  { label: "UPI", icon: "phone-portrait-outline", tint: "#FFF7ED", ink: "#B45309" },
  { label: "Card", icon: "card-outline", tint: "#CFFAFE", ink: "#0E7490" },
  { label: "Net banking", icon: "business-outline", tint: "#DCFCE7", ink: "#15803D" },
  { label: "Wallets", icon: "wallet-outline", tint: "#F3E8FF", ink: "#7E22CE" },
];
// "2026-11-25" → "Wed, 25 Nov"; with n, that many days earlier.
function dayLabel(iso: string, n = 0): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
// "14:00" → "2:00 pm"
function clock(hhmm?: string | null): string {
  const [h, m] = (hhmm || "").split(":").map(Number);
  if (isNaN(h)) return hhmm || "";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
// Same tiers as the server (services/refunds.py): full 7+ days before
// check-in, 50% from 3 to 6 days, none after; none when non-refundable.
function refundNote(policy: string | null | undefined, startIso: string): { title: string; sub: string; good: boolean } {
  if (policy === "non_refundable") {
    return { title: "Non-refundable", sub: "The host offers this stay without refunds if you cancel.", good: false };
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((+parseDate(startIso) - +today) / 86400000);
  if (days >= 7) return { title: `Free cancellation until ${dayLabel(startIso, 7)}`,
    sub: `Cancel by then for a full refund. After that, 50% back until ${dayLabel(startIso, 3)}.`, good: true };
  if (days >= 3) return { title: `50% refund until ${dayLabel(startIso, 3)}`,
    sub: "Cancel by then to get half back. After that there's no refund.", good: true };
  return { title: "No refund if you cancel",
    sub: "Check-in is less than 3 days away. If the host cancels, you're always refunded in full.", good: false };
}
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
  const [booking, setBooking] = useState<BookingWithListing | null>(null);
  useEffect(() => {
    api<BookingWithListing>(`/api/bookings/${bookingId}`).then(setBooking).catch(() => {});
  }, [bookingId]);
  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const host = booking?.host_name?.split(/\s+/)[0] || "your host";
  const photo = booking?.listing_image ? imageUrl(booking.listing_image) : "";
  const refund = booking ? refundNote(booking.cancellation_policy ?? cancellationPolicy, booking.start_date) : null;

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
      <Text style={styles.hello}>{firstName ? `Almost there, ${firstName}` : "Almost there"}</Text>
      {holdLost ? (
        <Text style={styles.errorText}>
          These dates were released because checkout was open too long, and someone else has booked them. Please close this and choose other dates.
        </Text>
      ) : (
        <View style={styles.heldPill}>
          <View style={styles.heldDot} />
          <Text style={styles.heldText}>Your dates are held while you pay</Text>
        </View>
      )}

      {booking ? (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            {photo ? <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardKicker} numberOfLines={1}>
                {[booking.listing_area, booking.listing_city].filter(Boolean).join(", ")}
              </Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{booking.listing_title}</Text>
              {booking.host_name ? <Text style={styles.cardSub}>Hosted by {booking.host_name}</Text> : null}
            </View>
          </View>
          <View style={styles.ends}>
            <View style={styles.end}>
              <Text style={styles.endLabel}>CHECK-IN</Text>
              <Text style={styles.endDate}>{dayLabel(booking.start_date)}</Text>
              <Text style={styles.endTime}>{clock(booking.checkin_time)}</Text>
            </View>
            <View style={[styles.end, styles.endRight]}>
              <Text style={styles.endLabel}>CHECK-OUT</Text>
              <Text style={styles.endDate}>{dayLabel(booking.end_date)}</Text>
              <Text style={styles.endTime}>{clock(booking.checkout_time)}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.cardSub}>
              {booking.nights} night{booking.nights === 1 ? "" : "s"} · {booking.guests} traveller{booking.guests === 1 ? "" : "s"} · all-inclusive
            </Text>
            <Text style={styles.total}>{inr(totalInr)}</Text>
          </View>
        </View>
      ) : stayLine ? <Text style={styles.cardSub}>{stayLine}</Text> : null}

      <Text style={styles.fieldLabel}>WHAT HAPPENS NEXT</Text>
      <Step n={1} title={`Pay ${inr(totalInr)} securely`}>
        <Text style={styles.stepSub}>Cashfree Payments' secure window opens. Pay there with any of these:</Text>
        <View style={styles.methodGrid}>
          {METHODS.map((m) => (
            <View key={m.label} style={styles.methodChip}>
              <View style={[styles.methodIcon, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={13} color={m.ink} />
              </View>
              <Text style={styles.methodLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </Step>
      {instantBook ? (
        <Step n={2} title="You're booked, instantly">
          <Text style={styles.stepSub}>Your confirmation and GST invoice appear in Trips, and you can message {host} straight away.</Text>
        </Step>
      ) : (
        <Step n={2} title={`${host[0].toUpperCase()}${host.slice(1)} accepts your request`}>
          <Text style={styles.stepSub}>Within 24 hours (sooner if check-in is close). If they don't, you're refunded in full, automatically.</Text>
        </Step>
      )}
      {booking && (
        <Step n={3} last title={`Check in on ${dayLabel(booking.start_date)}`}>
          <Text style={styles.stepSub}>From {clock(booking.checkin_time)}. Carry a photo ID for every adult guest.</Text>
        </Step>
      )}

      {refund && (
        <View style={[styles.refund, refund.good ? styles.refundGood : styles.refundStrict]}>
          <Ionicons name={refund.good ? "shield-checkmark-outline" : "calendar-outline"} size={20}
                    color={refund.good ? "#15803D" : Colors.terraDeep} />
          <View style={{ flex: 1 }}>
            <Text style={styles.refundTitle}>{refund.title}</Text>
            <Text style={styles.stepSub}>{refund.sub}</Text>
          </View>
        </View>
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
      <View style={styles.lockRow}>
        <Ionicons name="lock-closed" size={12} color={Colors.terraDeep} />
        <Text style={styles.lockText}>Your payment details go only to Cashfree Payments, never to Aangan Stay.</Text>
      </View>
    </GlassSheet>
  );
}

function Step({ n, title, last, children }: { n: number; title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
        {!last && <View style={styles.stepLine} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hello: { fontFamily: Fonts.display, fontSize: 24, fontWeight: "700", color: Colors.charcoal },
  heldPill: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.vegSoft,
  },
  heldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.veg },
  heldText: { fontSize: 12.5, fontWeight: "600", color: "#166534" },
  card: {
    marginTop: 16, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 68, height: 68, borderRadius: 12 },
  thumbEmpty: { backgroundColor: Colors.terraTint },
  cardKicker: { fontSize: 10.5, fontWeight: "700", letterSpacing: 1.2, color: Colors.terraDeep, textTransform: "uppercase" },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, fontWeight: "700", color: Colors.charcoal, marginTop: 2 },
  cardSub: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  ends: { flexDirection: "row", marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.edge },
  end: { flex: 1, paddingHorizontal: 12, paddingVertical: 9 },
  endRight: { borderLeftWidth: 1, borderLeftColor: Colors.edge },
  endLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, color: Colors.charcoal3 },
  endDate: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal, marginTop: 2 },
  endTime: { fontSize: 12, color: Colors.charcoal2 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  total: { fontFamily: Fonts.display, fontSize: 22, fontWeight: "800", color: Colors.charcoal },
  fieldLabel: {
    fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, color: Colors.terraDeep,
    marginTop: 20, marginBottom: 10,
  },
  step: { flexDirection: "row", gap: 12 },
  stepRail: { alignItems: "center", width: 26 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.terra, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
  stepLine: { flex: 1, width: 1, backgroundColor: Colors.edgeStrong, marginTop: 4 },
  stepTitle: { fontSize: 14.5, fontWeight: "700", color: Colors.charcoal, marginTop: 3 },
  stepSub: { fontSize: 12.5, lineHeight: 18, color: Colors.charcoal2, marginTop: 2 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, paddingRight: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
  methodIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 12.5, fontWeight: "600", color: Colors.charcoal },
  refund: { flexDirection: "row", gap: 10, marginTop: 16, padding: 12, borderRadius: 14, borderWidth: 1 },
  refundGood: { backgroundColor: "#F0FDF4", borderColor: Colors.vegSoft },
  refundStrict: { backgroundColor: Colors.terraTint, borderColor: "#FED7AA" },
  refundTitle: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  errorText: { fontSize: 13, color: Colors.error, marginTop: 12, fontWeight: "600" },
  lockRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 },
  lockText: { fontSize: 11.5, color: Colors.charcoal3, flexShrink: 1 },
});
