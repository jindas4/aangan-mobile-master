import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { RemoteImage } from "@/components/RemoteImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ListingFull, Review, AvailabilityResponse, CalendarResponse, WEB_BASE } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { AMENITY_ICON_MAP } from "@/constants/Amenities";
import { inr, imageUrl, shortDate } from "@/lib/format";
import { useAuth, useWishlist } from "@/lib/auth";
import { Button } from "@/components/Button";
import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { GlassSheet } from "@/components/GlassSheet";
import { CheckoutSheet } from "@/components/CheckoutSheet";
import { GlassSurface } from "@/components/GlassSurface";
import { ReportSheet } from "@/components/ReportSheet";
import { reportContent, ReportTarget } from "@/lib/moderation";
import { PhotoViewer } from "@/components/PhotoViewer";

const W = Dimensions.get("window").width;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const wishlist = useWishlist();
  const isWished = wishlist.has(id!);

  const [listing, setListing] = useState<ListingFull | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Booking state
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [report, setReport] = useState<{ type: ReportTarget; id: string; title: string } | null>(null);

  const submitReport = async (reason: string, detail?: string) => {
    if (!report) return;
    await reportContent(report.type, report.id, reason, detail);
    setReport(null);
    Alert.alert("Report received", "Thanks — our team will review this within 24 hours.");
  };
  const [guests, setGuests] = useState(1);
  const [quote, setQuote] = useState<AvailabilityResponse | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api<ListingFull>(`/api/listings/${id}`).catch(() => null),
      api<Review[]>(`/api/listings/${id}/reviews`).catch(() => []),
      api<CalendarResponse>(`/api/listings/${id}/calendar`).catch(() => null),
    ]).then(([l, r, c]) => {
      setListing(l);
      setReviews(r);
      setCalendar(c);
      setLoading(false);
    });
  }, [id]);

  const onShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out ${listing.title} on Aangan!\n${WEB_BASE}/listing/${listing.id}`,
      });
    } catch {}
  };

  useEffect(() => {
    if (!checkIn || !checkOut || !listing) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingAvailability(true);
      setAvailabilityError(null);
      try {
        const q = await api<AvailabilityResponse>(`/api/listings/${listing.id}/availability`, {
          method: "POST",
          body: { start_date: checkIn, end_date: checkOut },
        });
        if (!cancelled) setQuote(q);
      } catch (e: any) {
        if (!cancelled) {
          setQuote(null);
          setAvailabilityError(e.message || "Could not check availability.");
        }
      } finally {
        if (!cancelled) setCheckingAvailability(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, listing]);

  const bookNow = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!listing || !quote || !quote.available) return;
    setBooking(true);
    try {
      // Creates the booking in `pending`. It is NOT a confirmed stay until
      // payment is captured, so hand off to checkout rather than declaring
      // success here.
      const res = await api<{ id: string }>(`/api/bookings`, {
        method: "POST",
        body: {
          listing_id: listing.id,
          start_date: checkIn,
          end_date: checkOut,
          guests,
        },
      });
      setCheckoutBookingId(res.id);
    } catch (e: any) {
      const detail = e?.body?.detail;
      const isVerification = detail?.reason === "verification_required" || (e.message || "").toLowerCase().includes("verify");
      if (isVerification) {
        Alert.alert(
          "Verification needed",
          "Complete verification before booking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Verify now",
              onPress: () => router.push(user?.is_host ? "/host/verify" : "/account/verify"),
            },
          ],
        );
      } else {
        Alert.alert("Booking failed", e.message || "Something went wrong.");
      }
    } finally {
      setBooking(false);
    }
  };

  const onPaid = (bookingStatus: string) => {
    setCheckoutBookingId(null);
    const confirmed = bookingStatus === "confirmed";
    Alert.alert(
      confirmed ? "Booking confirmed!" : "Payment received",
      confirmed
        ? "Your stay is booked. The host has been notified."
        : "The host has 24 hours to confirm your stay. You'll be notified as soon as they do.",
      [{ text: "View trips", onPress: () => router.push("/(tabs)/trips") }],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Listing not found</Text>
          <Button title="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const images = listing.images?.length ? listing.images : [];

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))
            }
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index: i }) => (
              <TouchableOpacity activeOpacity={0.9} onPress={() => { setImgIndex(i); setViewerOpen(true); }}>
                <RemoteImage
                  url={item.url}
                  size="large"
                  style={styles.carouselImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<View style={[styles.carouselImage, { backgroundColor: Colors.edge }]} />}
          />
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          {/* Back button overlay */}
          <SafeAreaView style={styles.topBar} edges={["top"]}>
            <GlassSurface style={styles.topBtn}>
              <TouchableOpacity style={styles.topBtnHit} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </GlassSurface>
            <View style={styles.topRight}>
              <GlassSurface style={styles.topBtn}>
                <TouchableOpacity style={styles.topBtnHit} onPress={onShare}>
                  <Ionicons name="share-outline" size={20} color={Colors.charcoal} />
                </TouchableOpacity>
              </GlassSurface>
              <GlassSurface style={styles.topBtn}>
                <TouchableOpacity
                  style={styles.topBtnHit}
                  onPress={() => wishlist.toggle(listing.id)}
                >
                  <Ionicons
                    name={isWished ? "heart" : "heart-outline"}
                    size={20}
                    color={isWished ? Colors.terra : Colors.charcoal}
                  />
                </TouchableOpacity>
              </GlassSurface>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* Title section */}
          <Text style={styles.kicker}>
            {listing.city} · {listing.area}
          </Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {listing.guests} guests · {listing.bedrooms} bed · {listing.baths} bath
            </Text>
            {listing.rating > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Text style={styles.ratingText}>
                  {listing.rating.toFixed(2)} · {listing.reviews_count} reviews
                </Text>
              </View>
            )}
          </View>

          {/* Host card */}
          <View style={styles.hostCard}>
            <View style={styles.hostCardTop}>
              <View style={styles.hostAvatar}>
                <Text style={styles.hostAvatarText}>
                  {(listing.host?.name?.[0] || "H").toUpperCase()}
                </Text>
              </View>
              <View style={styles.hostInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.hostName}>
                    Hosted by {listing.host?.name || "Host"}
                  </Text>
                  {listing.host?.superhost && (
                    <View style={styles.superhostBadge}>
                      <Ionicons name="star" size={10} color={Colors.terra} />
                      <Text style={styles.superhostText}>Superhost</Text>
                    </View>
                  )}
                </View>
                <View style={styles.hostMeta}>
                  {listing.host?.fully_verified && (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="shield-checkmark" size={12} color={Colors.aanganDeep} />
                      <Text style={styles.verifiedLabel}>Verified</Text>
                    </View>
                  )}
                  {listing.host?.host_languages && (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="language-outline" size={12} color={Colors.charcoal2} />
                      <Text style={styles.hostMetaText}>{listing.host.host_languages}</Text>
                    </View>
                  )}
                  {listing.host?.host_response_time && (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.charcoal2} />
                      <Text style={styles.hostMetaText}>
                        Responds {listing.host.host_response_time.replace(/_/g, " ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {listing.host?.host_bio && (
              <Text style={styles.hostBio} numberOfLines={3}>
                {listing.host.host_bio}
              </Text>
            )}
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => {
                if (!user) { router.push("/login"); return; }
                api<{ id: number }>(`/api/conversations/start/${listing.id}`, { method: "POST" })
                  .then((c) => router.push(`/messages/${c.id}`))
                  .catch((e: any) =>
                    Alert.alert("Messaging unavailable", e.message || "Could not start conversation."),
                  );
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.terra} />
              <Text style={styles.messageBtnText}>Message host</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Amenities */}
          {listing.amenities?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What this place offers</Text>
              <View style={styles.amenGrid}>
                {listing.amenities.map((a) => (
                  <View key={a} style={styles.amenItem}>
                    <Ionicons
                      name={(AMENITY_ICON_MAP[a] || "checkmark-circle") as any}
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.amenText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tags */}
          {listing.tags?.length > 0 && (
            <View style={styles.tagRow}>
              {listing.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Reviews ({reviews.length})
              </Text>
              {reviews.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{r.author_name || "Guest"}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < r.rating ? "star" : "star-outline"}
                          size={12}
                          color={Colors.gold}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewBody}>{r.body}</Text>
                  {user && (
                    <TouchableOpacity
                      onPress={() =>
                        setReport({ type: "review", id: String(r.id), title: "Report review" })
                      }
                      hitSlop={6}
                    >
                      <Text style={styles.reportLink}>Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Report listing — UGC safety (App Store Guideline 1.2) */}
          <TouchableOpacity
            style={styles.reportListingRow}
            onPress={() =>
              user
                ? setReport({ type: "listing", id: id!, title: "Report this listing" })
                : router.push("/login")
            }
            activeOpacity={0.7}
          >
            <Ionicons name="flag-outline" size={15} color={Colors.charcoal3} />
            <Text style={styles.reportListingText}>Report this listing</Text>
          </TouchableOpacity>

          {/* Booking section */}
          <View style={styles.bookingSection}>
            <Text style={styles.sectionTitle} testID="reserve-title" accessibilityLabel="Reserve">Reserve</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{inr(listing.price_inr)}</Text>
              <Text style={styles.priceNight}> / night</Text>
            </View>

            <TouchableOpacity style={styles.dateRow} onPress={() => setDatePickerOpen(true)} activeOpacity={0.8} testID="date-picker-btn" accessibilityLabel="Select dates">
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>CHECK-IN</Text>
                <Text style={styles.dateValue}>{checkIn ? shortDate(checkIn) : "Add date"}</Text>
              </View>
              <View style={[styles.dateField, styles.dateFieldRight]}>
                <Text style={styles.dateLabel}>CHECK-OUT</Text>
                <Text style={styles.dateValue}>{checkOut ? shortDate(checkOut) : "Add date"}</Text>
              </View>
            </TouchableOpacity>

            {datePickerOpen && (
              <GlassSheet onClose={() => setDatePickerOpen(false)} title="Select dates">
                  <DateRangeCalendar
                    unavailable={calendar?.unavailable ?? []}
                    minNights={calendar?.min_nights ?? 1}
                    value={{ checkIn, checkOut }}
                    onChange={(v) => {
                      setCheckIn(v.checkIn);
                      setCheckOut(v.checkOut);
                    }}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setCheckIn("");
                        setCheckOut("");
                      }}
                      style={styles.modalClearBtn}
                    >
                      <Text style={styles.modalClearLabel}>Clear</Text>
                    </TouchableOpacity>
                    <Button
                      title="Apply"
                      onPress={() => setDatePickerOpen(false)}
                      disabled={!checkIn || !checkOut}
                      style={{ flex: 1 }}
                    />
                  </View>
              </GlassSheet>
            )}

            <View style={styles.guestRow}>
              <Text style={styles.guestLabel}>Guests</Text>
              <View style={styles.guestControls}>
                <TouchableOpacity
                  onPress={() => setGuests(Math.max(1, guests - 1))}
                  style={styles.guestBtn}
                >
                  <Ionicons name="remove" size={18} color={Colors.charcoal} />
                </TouchableOpacity>
                <Text style={styles.guestCount}>{guests}</Text>
                <TouchableOpacity
                  onPress={() => setGuests(Math.min(listing.guests, guests + 1))}
                  style={styles.guestBtn}
                >
                  <Ionicons name="add" size={18} color={Colors.charcoal} />
                </TouchableOpacity>
              </View>
            </View>

            {availabilityError && (
              <Text style={styles.availabilityError}>{availabilityError}</Text>
            )}
            {quote && !quote.available && !checkingAvailability && (
              <Text style={styles.availabilityError}>
                {quote.nights < quote.min_nights
                  ? `This stay needs at least ${quote.min_nights} nights.`
                  : "These dates aren't available."}
              </Text>
            )}

            {quote && quote.available && (
              <View style={styles.quoteCard}>
                <QuoteLine label={`${inr(quote.nightly_inr)} × ${quote.nights} nights`} value={inr(quote.nightly_inr * quote.nights)} />
                <QuoteLine label="Cleaning fee" value={inr(quote.cleaning_inr)} />
                <QuoteLine label="Service fee" value={inr(quote.service_inr)} />
                <QuoteLine label="Taxes" value={inr(quote.tax_inr)} />
                <View style={styles.quoteDivider} />
                <QuoteLine label="Total" value={inr(quote.total_inr)} bold />
              </View>
            )}

            <Button
              title={
                booking ? "Booking…" :
                checkingAvailability ? "Checking…" :
                !checkIn || !checkOut ? "Select dates" :
                quote?.available ? "Continue to payment" : "Not available"
              }
              onPress={bookNow}
              loading={booking || checkingAvailability}
              disabled={!checkIn || !checkOut || checkingAvailability || !quote?.available}
              full
              size="lg"
              testID="book-button"
              style={{ marginTop: 16 }}
            />
          </View>

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>

      {checkoutBookingId && quote && (
        <CheckoutSheet
          bookingId={checkoutBookingId}
          totalInr={quote.total_inr}
          onClose={() => setCheckoutBookingId(null)}
          onPaid={onPaid}
        />
      )}

      <ReportSheet
        visible={!!report}
        title={report?.title}
        onClose={() => setReport(null)}
        onSubmit={submitReport}
      />

      <PhotoViewer
        images={images}
        visible={viewerOpen}
        initialIndex={imgIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setImgIndex}
      />
    </View>
  );
}

function QuoteLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.quoteLine}>
      <Text style={[styles.quoteLabel, bold && styles.quoteBold]}>{label}</Text>
      <Text style={[styles.quoteValue, bold && styles.quoteBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.charcoal2,
  },
  carouselImage: {
    width: W,
    height: W * 0.75,
  },
  dots: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 18,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  topRight: {
    flexDirection: "row",
    gap: 8,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  topBtnHit: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.charcoal2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.charcoal,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    color: Colors.charcoal2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  hostCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  hostCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.aanganSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.aanganDeep,
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  verifiedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.aanganDeep,
  },
  hostMeta: {
    gap: 2,
    marginTop: 2,
  },
  hostMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.charcoal2,
  },
  hostBio: {
    fontSize: 13,
    color: Colors.charcoal2,
    lineHeight: 20,
    marginTop: 12,
  },
  superhostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.warmBg,
  },
  superhostText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.terra,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.terra,
    marginTop: 14,
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.terra,
  },
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.charcoal,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.charcoal2,
    lineHeight: 24,
  },
  amenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  amenItem: {
    width: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amenText: {
    fontSize: 14,
    color: Colors.charcoal,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.warmBg,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.charcoal2,
  },
  reviewCard: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewBody: {
    fontSize: 13,
    color: Colors.charcoal2,
    lineHeight: 20,
  },
  reportLink: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.charcoal3,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  reportListingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
  },
  reportListingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal3,
    textDecorationLine: "underline",
  },
  bookingSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  priceNight: {
    fontSize: 14,
    color: Colors.charcoal2,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateField: {
    flex: 1,
    height: 64,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  dateFieldRight: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.charcoal3,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  availabilityError: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.error,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  modalClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClearLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal2,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  guestLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  guestControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  guestBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    minWidth: 20,
    textAlign: "center",
  },
  quoteCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  quoteLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  quoteLabel: {
    fontSize: 14,
    color: Colors.charcoal2,
  },
  quoteValue: {
    fontSize: 14,
    color: Colors.charcoal,
    fontWeight: "600",
  },
  quoteBold: {
    fontWeight: "800",
    fontSize: 16,
    color: Colors.charcoal,
  },
  quoteDivider: {
    height: 1,
    backgroundColor: Colors.edge,
    marginVertical: 8,
  },
});
