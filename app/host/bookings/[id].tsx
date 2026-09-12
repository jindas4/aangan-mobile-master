import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { RemoteImage } from "@/components/RemoteImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, BookingWithListing } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { inr, fullDate, imageUrl } from "@/lib/format";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function HostBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | "cancel" | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    try {
      const b = await api<BookingWithListing>(`/api/bookings/${id}`);
      setBooking(b);
    } catch {
      setBooking(null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchBooking().finally(() => setLoading(false));
  }, [fetchBooking]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooking();
    setRefreshing(false);
  }, [fetchBooking]);

  const accept = async () => {
    if (!booking || busy) return;
    setBusy("accept");
    try {
      await api(`/api/bookings/${booking.id}/accept`, { method: "POST" });
      await fetchBooking();
      Alert.alert("Accepted", "The guest has been notified.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Couldn't accept booking.");
    } finally {
      setBusy(null);
    }
  };

  const doDecline = async () => {
    if (!booking || busy) return;
    setBusy("decline");
    try {
      await api(`/api/bookings/${booking.id}/decline`, { method: "POST", body: {} });
      setShowDecline(false);
      await fetchBooking();
      Alert.alert("Declined", "The booking has been declined and the guest refunded.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Couldn't decline booking.");
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async () => {
    if (!booking || busy) return;
    setBusy("cancel");
    try {
      await api(`/api/bookings/${booking.id}/cancel`, { method: "POST", body: {} });
      setShowCancel(false);
      await fetchBooking();
      Alert.alert("Cancelled", "The booking has been cancelled and the guest refunded.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Couldn't cancel booking.");
    } finally {
      setBusy(null);
    }
  };

  const openMessages = () => {
    if (!booking) return;
    router.push(`/messages/${booking.listing_id}_${booking.guest_id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.charcoal3} />
          <Text style={styles.emptyText}>Booking not found</Text>
          <Button title="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const statusColors: Record<string, string> = {
    pending: Colors.mustard,
    confirmed: Colors.success,
    cancelled: Colors.error,
    completed: Colors.aanganDeep,
    refunded: Colors.charcoal2,
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColors[booking.status] + "18" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[booking.status] }]} />
          <Text style={[styles.statusText, { color: statusColors[booking.status] }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>

        {/* Listing info */}
        <View style={styles.card}>
          <View style={styles.listingRow}>
            {booking.listing_image ? (
              <RemoteImage
                url={booking.listing_image}
                size="thumb"
                style={styles.listingThumb}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.listingThumb, styles.listingThumbPlaceholder]}>
                <Ionicons name="home" size={20} color={Colors.aanganDeep} />
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle}>{booking.listing_title}</Text>
              <Text style={styles.listingMeta}>
                {booking.listing_city}{booking.listing_area ? `, ${booking.listing_area}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Dates & guests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stay details</Text>
          <DetailRow icon="calendar-outline" label="Check-in" value={fullDate(booking.start_date)} />
          <DetailRow icon="calendar-outline" label="Check-out" value={fullDate(booking.end_date)} />
          <DetailRow icon="moon-outline" label="Nights" value={String(booking.nights)} />
          <DetailRow icon="people-outline" label="Guests" value={String(booking.guests)} />
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <PriceRow label={`${inr(booking.nights ? booking.nightly_inr / booking.nights : 0)} × ${booking.nights} nights`} value={inr(booking.nightly_inr)} />
          <PriceRow label="Cleaning fee" value={inr(booking.cleaning_inr)} />
          <PriceRow label="Service fee" value={inr(booking.service_inr)} />
          <PriceRow label="Taxes" value={inr(booking.tax_inr)} />
          <View style={styles.divider} />
          <PriceRow label="Total" value={inr(booking.total_inr)} bold />
        </View>

        {/* Booking ID & payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reference</Text>
          <DetailRow icon="receipt-outline" label="Booking ID" value={`#${booking.id}`} />
          {booking.payment_id && (
            <DetailRow icon="card-outline" label="Payment ID" value={booking.payment_id} />
          )}
          <DetailRow icon="time-outline" label="Booked on" value={fullDate(booking.created_at)} />
        </View>

        {/* Actions */}
        {isPending && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Action needed</Text>
            <Text style={styles.actionHint}>
              This booking is awaiting your response. Accept to confirm or decline to refund the guest.
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => setShowDecline(true)}
                disabled={busy !== null}
              >
                <Text style={styles.declineBtnText}>
                  {busy === "decline" ? "Declining…" : "Decline"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={accept}
                disabled={busy !== null}
              >
                <Text style={styles.acceptBtnText}>
                  {busy === "accept" ? "Accepting…" : "Accept booking"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isConfirmed && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cancel booking</Text>
            <Text style={styles.actionHint}>
              Need to cancel? The guest will receive a full refund since this is a host-initiated cancellation.
            </Text>
            <TouchableOpacity
              style={styles.cancelBookingBtn}
              onPress={() => setShowCancel(true)}
              disabled={busy !== null}
            >
              <Text style={styles.cancelBookingBtnText}>
                {busy === "cancel" ? "Cancelling…" : "Cancel booking"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
      {showCancel && (
        <ConfirmModal
          title="Cancel booking"
          message="Are you sure you want to cancel this confirmed booking? The guest will receive a full refund and will be notified immediately."
          confirmLabel="Cancel booking"
          cancelLabel="Keep it"
          destructive
          busy={busy === "cancel"}
          onConfirm={doCancel}
          onClose={() => setShowCancel(false)}
        />
      )}
      {showDecline && (
        <ConfirmModal
          title="Decline booking"
          message="Are you sure you want to decline this booking? The guest will receive a full refund."
          confirmLabel="Decline booking"
          cancelLabel="Keep it"
          destructive
          busy={busy === "decline"}
          onConfirm={doDecline}
          onClose={() => setShowDecline(false)}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: Colors.charcoal2, fontSize: 14 },
  emptyText: { color: Colors.charcoal2, fontSize: 16, marginTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: Radius.md,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal, marginBottom: 12 },
  listingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  listingThumb: { width: 56, height: 56, borderRadius: Radius.md },
  listingThumbPlaceholder: {
    backgroundColor: Colors.aanganSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal },
  listingMeta: { fontSize: 13, color: Colors.charcoal2, marginTop: 2 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
  },
  detailLabel: { flex: 1, fontSize: 14, color: Colors.charcoal2 },
  detailValue: { fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceLabel: { fontSize: 14, color: Colors.charcoal2 },
  priceValue: { fontSize: 14, color: Colors.charcoal },
  priceBold: { fontWeight: "700", fontSize: 16, color: Colors.charcoal },
  divider: { height: 1, backgroundColor: Colors.edge, marginVertical: 8 },
  actionHint: { fontSize: 13, color: Colors.charcoal2, lineHeight: 18, marginBottom: 14 },
  actionRow: { flexDirection: "row", gap: 10 },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    alignItems: "center",
  },
  declineBtnText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.terra,
    alignItems: "center",
  },
  acceptBtnText: { fontSize: 14, fontWeight: "700", color: Colors.paper },
  cancelBookingBtn: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
  },
  cancelBookingBtnText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
});
