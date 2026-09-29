import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { RemoteImage } from "@/components/RemoteImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ListingCard as LC, BookingWithListing, HostAnalytics } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { inr, imageUrl } from "@/lib/format";
import { Button } from "@/components/Button";
import { ShareKit } from "@/components/ShareKit";

export default function HostDashboardScreen() {
  const router = useRouter();
  const { user, becomeHost } = useAuth();
  const [listings, setListings] = useState<LC[]>([]);
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [l, b, a] = await Promise.all([
        api<LC[]>("/api/listings/host/mine").catch(() => []),
        api<BookingWithListing[]>("/api/bookings/host").catch(() => []),
        api<HostAnalytics>("/api/host/analytics").catch(() => null),
      ]);
      setListings(l);
      setBookings(b);
      setAnalytics(a);
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.is_host) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.is_host, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.pitchWrap}>
          <Text style={styles.pitchTitle}>Get your own booking website</Text>
          <Text style={styles.pitchSub}>List your home, earn in ₹. 0% commission forever.</Text>
          <Button title="Log in to start" onPress={() => router.push("/login")} full style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user.is_host) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.pitchWrap}>
          <Text style={styles.pitchKicker}>FOR HOMEOWNERS</Text>
          <Text style={styles.pitchTitle}>A booking website for your home. In 5 minutes.</Text>
          <Text style={styles.pitchSub}>
            Every home on Aangan Stay gets a shareable page at aanganstay.com/p/your-home.{"\n"}
            Post it on WhatsApp, Instagram, anywhere.{"\n"}
            0% commission — forever.
          </Text>
          <View style={styles.pitchFeatures}>
            <FeatureItem icon="link-outline" title="Your own URL" sub="aanganstay.com/p/your-home" />
            <FeatureItem icon="cash-outline" title="0% commission" sub="UPI, ₹, in your bank" />
            <FeatureItem icon="calendar-outline" title="Calendar + bookings" sub="Manage availability" />
          </View>
          <Button
            title="Become a host"
            onPress={async () => {
              try {
                await becomeHost();
                router.push("/host/profile");
              } catch (e: any) {
                Alert.alert("Something went wrong", e?.message || "Please try again.");
              }
            }}
            full
            size="lg"
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />}
      >
        <Text style={styles.dashTitle}>Host Studio</Text>

        {/* Analytics cards */}
        {analytics && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <StatCard label="Earnings" value={inr(analytics.all_time?.revenue_inr)} icon="cash-outline" />
            <StatCard label="Bookings" value={String(analytics.all_time?.bookings ?? 0)} icon="calendar-outline" />
            <StatCard label="This month" value={inr(analytics.this_month?.revenue_inr)} icon="trending-up-outline" />
            <StatCard label="Upcoming" value={String(analytics.upcoming_checkins_7d ?? 0)} icon="calendar-outline" />
          </ScrollView>
        )}

        {/* Listings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} testID="your-homes" accessibilityLabel="Your homes">Your listings</Text>
          <TouchableOpacity onPress={() => router.push("/host/new")} style={styles.addBtn}>
            <Ionicons name="add" size={20} color={Colors.terra} />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {listings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="home-outline" size={32} color={Colors.charcoal3} />
            <Text style={styles.emptyText}>No listings yet</Text>
            <Button title="List your first property" onPress={() => router.push("/host/new")} style={{ marginTop: 12 }} />
          </View>
        ) : (
          listings.map((l) => (
            <View key={l.id} style={styles.listingCard}>
              <TouchableOpacity
                style={styles.listingRow}
                onPress={() => router.push(`/host/listings/${l.id}`)}
              >
                <View style={styles.listingIcon}>
                  {l.images?.[0]?.url && l.images[0].url.startsWith("http") ? (
                    <RemoteImage url={l.images[0].url} size="thumb" style={styles.listingThumb} contentFit="cover" transition={200} />
                  ) : (
                    <Ionicons name="home" size={20} color={Colors.aanganDeep} />
                  )}
                </View>
                <View style={styles.listingInfo}>
                  <View style={styles.listingTitleRow}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                    {l.published === false && (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>DRAFT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.listingMeta}>{l.city} · {inr(l.price_inr)}/night</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.charcoal3} />
              </TouchableOpacity>
              <View style={styles.shareRow}>
                <ShareKit slug={l.slug} title={l.title} city={l.city} />
              </View>
            </View>
          ))
        )}

        {/* Recent bookings */}
        {bookings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: 24 }]} testID="recent-bookings" accessibilityLabel="Recent bookings">
              Recent bookings
            </Text>
            {bookings.slice(0, 5).map((b) => (
              <TouchableOpacity key={b.id} style={styles.bookingRow} onPress={() => router.push(`/host/bookings/${b.id}`)}>
                <View style={styles.bookingLeft}>
                  <Text style={styles.bookingGuest}>
                    {b.listing_title}
                  </Text>
                  <Text style={styles.bookingDates}>
                    {b.start_date} → {b.end_date}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View>
                    <Text style={styles.bookingAmount}>{inr(b.total_inr)}</Text>
                    <Text style={[styles.bookingStatus, { color: b.status === "confirmed" ? Colors.success : Colors.charcoal2 }]}>
                      {b.status}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.charcoal3} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} testID="host-header" accessibilityLabel="Aangan Stay for Hosts">Aangan Stay for Hosts</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={Colors.terra} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureItem({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color={Colors.aanganDeep} />
      </View>
      <View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  pitchWrap: { padding: 24 },
  pitchKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: Colors.terra, marginBottom: 8 },
  pitchTitle: { fontSize: 26, fontWeight: "800", color: Colors.charcoal, lineHeight: 32, letterSpacing: -0.3 },
  pitchSub: { fontSize: 14, color: Colors.charcoal2, marginTop: 10, lineHeight: 22 },
  pitchFeatures: { marginTop: 24, gap: 16 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.aanganSoft, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  featureSub: { fontSize: 12, color: Colors.charcoal2, marginTop: 1 },
  dashTitle: { fontSize: 28, fontWeight: "800", color: Colors.charcoal, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  statsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  statCard: {
    width: 120, padding: 14, borderRadius: Radius.md,
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge,
    alignItems: "flex-start", gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.charcoal },
  statLabel: { fontSize: 11, fontWeight: "700", color: Colors.charcoal2, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginTop: 24, marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addText: { fontSize: 14, fontWeight: "700", color: Colors.terra },
  emptyCard: {
    margin: 16, padding: 32, borderRadius: Radius.lg,
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: Colors.charcoal2, marginTop: 8 },
  listingCard: {
    borderBottomWidth: 1, borderBottomColor: Colors.edge,
  },
  listingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  shareRow: {
    paddingHorizontal: 16, paddingBottom: 12,
  },
  listingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.aanganSoft, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" },
  listingThumb: { width: 40, height: 40 },
  listingInfo: { flex: 1 },
  listingTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  listingTitle: { fontSize: 15, fontWeight: "700", color: Colors.charcoal, flexShrink: 1 },
  listingMeta: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  draftBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warmBg,
    borderWidth: 1,
    borderColor: Colors.terraSoft,
  },
  draftBadgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.5, color: Colors.terra },
  bookingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.edge,
  },
  bookingLeft: { flex: 1 },
  bookingGuest: { fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  bookingDates: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  bookingAmount: { fontSize: 15, fontWeight: "800", color: Colors.charcoal, textAlign: "right" },
  bookingStatus: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", textAlign: "right", marginTop: 2 },
});
