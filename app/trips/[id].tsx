// A guest's view of one of their bookings: the stay, what they paid, the
// cancellation terms, and what they can do next. Opened from the Journeys tab.
import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, BookingWithListing, CancelResponse } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { inr, fullDate } from "@/lib/format";
import { Button } from "@/components/Button";
import { RemoteImage } from "@/components/RemoteImage";
import { CancelBookingModal } from "@/components/CancelBookingModal";
import { WriteReviewModal } from "@/components/WriteReviewModal";
import { policyLine } from "@/components/CancellationChoice";

const STATUS: Record<string, { label: string; color: string; note: string }> = {
  pending: { label: "Awaiting host", color: Colors.mustard, note: "The host hasn't accepted yet. You'll be told as soon as they do." },
  confirmed: { label: "Confirmed", color: Colors.success, note: "You're booked. Message the host to arrange your arrival." },
  completed: { label: "Completed", color: Colors.aanganDeep, note: "We hope you enjoyed your stay." },
  cancelled: { label: "Cancelled", color: Colors.error, note: "This booking was cancelled." },
  refunded: { label: "Refunded", color: Colors.charcoal2, note: "This booking was cancelled and refunded in full." },
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setBooking(await api<BookingWithListing>(`/api/bookings/${id}`));
    } catch {
      setBooking(null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const messageHost = () => {
    if (!booking) return;
    api<{ id: number }>(`/api/conversations/start/${booking.listing_id}`, { method: "POST" })
      .then((c) => router.push(`/messages/${c.id}`))
      .catch((e: any) => Alert.alert("Messaging unavailable", e.message || "Could not start conversation."));
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Booking details</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {header}
        <View style={styles.center}><Text style={styles.muted}>Loading…</Text></View>
      </SafeAreaView>
    );
  }
  if (!booking) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {header}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.charcoal3} />
          <Text style={styles.emptyText}>We couldn't find that booking</Text>
          <Button title="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const b = booking;
  const st = STATUS[b.status] ?? STATUS.pending;
  const credits = b.credits_inr ?? 0;
  const canCancel = b.status === "pending" || b.status === "confirmed";
  const canReview = b.status === "confirmed" || b.status === "completed";
  const active = b.status !== "cancelled" && b.status !== "refunded";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />}
      >
        <View style={[styles.statusBanner, { backgroundColor: st.color + "18" }]}>
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            <Text style={styles.statusNote}>{st.note}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => router.push(`/listing/${b.listing_id}`)}>
          <View style={styles.listingRow}>
            {b.listing_image ? (
              <RemoteImage url={b.listing_image} size="thumb" style={styles.listingThumb} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.listingThumb, styles.listingThumbPlaceholder]}>
                <Ionicons name="home" size={20} color={Colors.aanganDeep} />
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle}>{b.listing_title}</Text>
              <Text style={styles.listingMeta}>{[b.listing_area, b.listing_city].filter(Boolean).join(", ")}</Text>
              {!!b.host_name && <Text style={styles.listingMeta}>Hosted by {b.host_name}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.charcoal3} />
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your stay</Text>
          <DetailRow icon="calendar-outline" label="Check-in" value={fullDate(b.start_date)} />
          <DetailRow icon="calendar-outline" label="Check-out" value={fullDate(b.end_date)} />
          <DetailRow icon="moon-outline" label="Nights" value={String(b.nights)} />
          <DetailRow icon="people-outline" label="Guests" value={String(b.guests)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you paid</Text>
          <PriceRow label={`${inr(b.nightly_inr)} × ${b.nights} night${b.nights === 1 ? "" : "s"}`} value={inr(b.nightly_inr * b.nights)} />
          <PriceRow label="Cleaning fee" value={inr(b.cleaning_inr)} />
          <PriceRow label="Service fee" value={inr(b.service_inr)} />
          <PriceRow label="Taxes" value={inr(b.tax_inr)} />
          <View style={styles.divider} />
          <PriceRow label="Total" value={inr(b.total_inr)} bold />
          {credits > 0 && <PriceRow label="Credits applied" value={`− ${inr(credits)}`} />}
          {credits > 0 && <PriceRow label="You paid" value={inr(b.total_inr - credits)} bold />}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cancellation</Text>
          <Text style={[styles.policy, b.cancellation_policy === "non_refundable" && styles.policyStrict]}>
            {policyLine(b.cancellation_policy)}
          </Text>
          <Text style={styles.policyNote}>If the host cancels, you are always refunded in full.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reference</Text>
          <DetailRow icon="receipt-outline" label="Booking ID" value={`#${b.id}`} />
          <DetailRow icon="time-outline" label="Booked on" value={fullDate(b.created_at)} />
        </View>

        <View style={styles.actions}>
          {active && <Button title="Message host" onPress={messageHost} full />}
          {canReview && <Button title="Write a review" onPress={() => setReviewing(true)} variant="outline" full style={{ marginTop: 10 }} />}
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelling(true)}>
              <Text style={styles.cancelBtnText}>Cancel booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {cancelling && (
        <CancelBookingModal
          bookingId={b.id}
          onClose={() => setCancelling(false)}
          onCancelled={(_r: CancelResponse) => {
            setCancelling(false);
            load();
          }}
        />
      )}
      {reviewing && (
        <WriteReviewModal
          bookingId={b.id}
          listingTitle={b.listing_title}
          onClose={() => setReviewing(false)}
          onPosted={() => setReviewing(false)}
        />
      )}
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={Colors.charcoal2} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, bold && styles.priceBold]}>{label}</Text>
      <Text style={[styles.priceValue, bold && styles.priceBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: Colors.charcoal2, fontSize: 14 },
  emptyText: { color: Colors.charcoal2, fontSize: 16, marginTop: 12, textAlign: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.edge,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal },
  statusBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, margin: 16, padding: 12, borderRadius: Radius.md },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  statusText: { fontSize: 15, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusNote: { fontSize: 13, color: Colors.charcoal2, marginTop: 3, lineHeight: 18 },
  card: {
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: Colors.paper, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.edge,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal, marginBottom: 10 },
  listingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  listingThumb: { width: 64, height: 64, borderRadius: Radius.md },
  listingThumbPlaceholder: { backgroundColor: Colors.warmBg, alignItems: "center", justifyContent: "center" },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 15.5, fontWeight: "700", color: Colors.charcoal },
  listingMeta: { fontSize: 13, color: Colors.charcoal2, marginTop: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.edge },
  detailLabel: { flex: 1, fontSize: 14, color: Colors.charcoal2 },
  detailValue: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  priceLabel: { fontSize: 14, color: Colors.charcoal2 },
  priceValue: { fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  priceBold: { fontSize: 16, fontWeight: "800", color: Colors.charcoal },
  divider: { height: 1, backgroundColor: Colors.edge, marginVertical: 8 },
  policy: { fontSize: 13.5, lineHeight: 19, color: Colors.charcoal2 },
  policyStrict: { color: Colors.error, fontWeight: "700" },
  policyNote: { fontSize: 12.5, color: Colors.charcoal3, marginTop: 8 },
  actions: { marginHorizontal: 16, marginTop: 4 },
  cancelBtn: {
    marginTop: 10, minHeight: 46, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.error,
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14.5, fontWeight: "700", color: Colors.error },
});
