import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { api, BookingWithListing, CancelResponse } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { inr, fullDate, imageUrl } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { CancelBookingModal } from "@/components/CancelBookingModal";
import { WriteReviewModal } from "@/components/WriteReviewModal";

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.success,
  pending: Colors.mustard,
  cancelled: Colors.error,
  completed: Colors.charcoal2,
  refunded: Colors.charcoal3,
};

export default function TripsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<{ id: string; title: string } | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api<BookingWithListing[]>("/api/bookings");
      setBookings(data);
    } catch {
      setBookings([]);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.header}>Trips</Text>
        <EmptyState
          icon="airplane-outline"
          title="Log in to see your trips"
          subtitle="Your upcoming and past bookings will appear here."
        />
        <View style={styles.loginWrap}>
          <Button title="Log in" onPress={() => router.push("/login")} full />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.header}>Trips</Text>
      {bookings.length === 0 && !loading ? (
        <EmptyState
          icon="airplane-outline"
          title="No trips yet"
          subtitle="When you book a stay, it will show up here."
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancelPress={() => setCancelBookingId(item.id)}
              onReviewPress={() => setReviewBooking({ id: item.id, title: item.listing_title })}
            />
          )}
        />
      )}

      {cancelBookingId && (
        <CancelBookingModal
          bookingId={cancelBookingId}
          onClose={() => setCancelBookingId(null)}
          onCancelled={(r: CancelResponse) => {
            setCancelBookingId(null);
            fetchBookings();
          }}
        />
      )}

      {reviewBooking && (
        <WriteReviewModal
          bookingId={reviewBooking.id}
          listingTitle={reviewBooking.title}
          onClose={() => setReviewBooking(null)}
          onPosted={() => {
            setReviewBooking(null);
            fetchBookings();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  onCancelPress,
  onReviewPress,
}: {
  booking: BookingWithListing;
  onCancelPress: () => void;
  onReviewPress: () => void;
}) {
  const router = useRouter();
  const statusColor = STATUS_COLORS[booking.status] || Colors.charcoal2;

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/listing/${booking.listing_id}`)}
    >
      {booking.listing_image && (
        <Image
          source={{ uri: imageUrl(booking.listing_image) }}
          style={styles.bookingImage}
          contentFit="cover"
        />
      )}
      <View style={styles.bookingInfo}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTitle} numberOfLines={1}>
            {booking.listing_title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingCity}>
          {booking.listing_city} · {booking.listing_area}
        </Text>
        <Text style={styles.bookingDates}>
          {fullDate(booking.start_date)} → {fullDate(booking.end_date)}
        </Text>
        <View style={styles.bookingFooter}>
          <Text style={styles.bookingNights}>{booking.nights} nights</Text>
          <Text style={styles.bookingTotal}>{inr(booking.total_inr)}</Text>
        </View>

        {(() => {
          const canCancel = booking.status === "pending" || booking.status === "confirmed";
          const canReview = booking.status === "confirmed" || booking.status === "completed";
          if (!canCancel && !canReview) return null;
          return (
            <View style={styles.actionRow}>
              {canCancel && (
                <TouchableOpacity style={styles.actionBtn} onPress={onCancelPress}>
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {canReview && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onReviewPress}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Write a review</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.charcoal,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loginWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  bookingCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: "hidden",
    marginBottom: 16,
  },
  bookingImage: {
    width: "100%",
    height: 160,
  },
  bookingInfo: {
    padding: 14,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bookingCity: {
    fontSize: 12,
    color: Colors.charcoal2,
    marginBottom: 6,
  },
  bookingDates: {
    fontSize: 13,
    color: Colors.charcoal,
    fontWeight: "600",
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  bookingNights: {
    fontSize: 12,
    color: Colors.charcoal2,
  },
  bookingTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.warmBg,
    borderColor: Colors.terra,
  },
  actionBtnTextPrimary: {
    color: Colors.terra,
  },
});
