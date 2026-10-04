import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Dimensions,
  FlatList,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { RemoteImage } from "@/components/RemoteImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ListingFull, BookingWithListing, WEB_BASE } from "@/lib/api";
import { verificationMissing, describeMissing } from "@/lib/hostVerification";
import { Colors, Radius } from "@/constants/Colors";
import { AMENITIES } from "@/constants/Amenities";
import { inr, fullDate, imageUrl } from "@/lib/format";
import { Button } from "@/components/Button";
import { PhotoViewer } from "@/components/PhotoViewer";

const W = Dimensions.get("window").width;

export default function ManageListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingFull | null>(null);
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCleaning, setEditCleaning] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGuests, setEditGuests] = useState("");
  const [editBedrooms, setEditBedrooms] = useState("");
  const [editBaths, setEditBaths] = useState("");
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [l, b] = await Promise.all([
      api<ListingFull>(`/api/listings/host/mine/${id}`).catch(() => null),
      api<BookingWithListing[]>(`/api/bookings/host?listing_id=${id}`).catch(() => []),
    ]);
    setListing(l);
    setBookings(b);
    if (l) {
      setEditTitle(l.title);
      setEditPrice(String(l.price_inr));
      setEditCleaning(String(l.cleaning_fee_inr ?? 0));
      setEditDescription(l.description || "");
      setEditGuests(String(l.guests));
      setEditBedrooms(String(l.bedrooms));
      setEditBaths(String(l.baths));
      setEditAmenities(l.amenities || []);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const isDraft = listing?.published === false;

  const togglePublish = async () => {
    if (!listing || toggling) return;
    const next = !listing.published;
    setToggling(true);
    try {
      const updated = await api<ListingFull>(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body: { published: next },
      });
      setListing(updated);
      Alert.alert(next ? "Listing published" : "Listing unpublished",
        next ? "It's now live and visible in search."
             : "It's now a draft — hidden from guests until you publish again.");
    } catch (e: any) {
      const missing = next ? verificationMissing(e) : null;
      if (missing) {
        Alert.alert(
          "Verify to publish",
          `Your draft is saved and private. Before it can go live, ${describeMissing(missing)}.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Verify now", onPress: () => router.push("/host/verify") },
          ],
        );
      } else {
        const msg = e?.body?.detail?.message || e?.message || "Could not update. Please try again.";
        Alert.alert(next ? "Can't publish yet" : "Error", msg);
      }
    } finally {
      setToggling(false);
    }
  };

  const saveEdits = async () => {
    if (!listing || saving) return;
    setSaving(true);
    try {
      const updated = await api<ListingFull>(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body: {
          title: editTitle.trim(),
          price_inr: parseInt(editPrice) || listing.price_inr,
          cleaning_fee_inr: editCleaning === "" ? listing.cleaning_fee_inr : Math.max(parseInt(editCleaning) || 0, 0),
          description: editDescription.trim(),
          guests: parseInt(editGuests) || listing.guests,
          bedrooms: parseInt(editBedrooms) || listing.bedrooms,
          baths: parseInt(editBaths) || listing.baths,
          amenities: editAmenities,
        },
      });
      setListing(updated);
      setEditing(false);
      Alert.alert("Saved", "Your listing has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = () => {
    if (!listing) return;
    Alert.alert(
      "Delete listing",
      "This will permanently remove your listing and it cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/listings/${listing.id}`, { method: "DELETE" });
              Alert.alert("Deleted", "Your listing has been removed.");
              router.replace("/host");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Could not delete listing.");
            }
          },
        },
      ],
    );
  };

  const onShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out my listing: ${listing.title}\n${WEB_BASE}/p/${listing.slug}`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: Colors.charcoal2 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: Colors.charcoal2 }}>Listing not found</Text>
          <Button title="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const images = listing.images?.filter((i) => i.url && i.url.startsWith("http")) || [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{listing.title}</Text>
        {/* Drafts have no public page yet — keep the header balanced without a share action. */}
        {isDraft ? (
          <View style={styles.backBtn} />
        ) : (
          <TouchableOpacity onPress={onShare} style={styles.backBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.charcoal} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />}
      >
        {/* Photo carousel */}
        {images.length > 0 && (
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
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
                ))}
              </View>
            )}
            <View style={styles.imgCount}>
              <Text style={styles.imgCountText}>{imgIndex + 1}/{images.length}</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Draft banner */}
          {isDraft && (
            <View style={styles.draftBanner}>
              <Ionicons name="document-outline" size={18} color={Colors.terra} />
              <Text style={styles.draftBannerText}>
                This listing is a draft — hidden from guests until you publish.
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isDraft ? styles.publishBtnLive : styles.publishBtnDraft, toggling && { opacity: 0.5 }]}
              onPress={togglePublish}
              disabled={toggling}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDraft ? "rocket-outline" : "eye-off-outline"}
                size={16}
                color={isDraft ? Colors.paper : Colors.charcoal}
              />
              <Text style={[styles.actionBtnText, { color: isDraft ? Colors.paper : Colors.charcoal }]}>
                {toggling ? "Wait…" : isDraft ? "Publish" : "Unpublish"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => setEditing(!editing)}
              activeOpacity={0.8}
            >
              <Ionicons name={editing ? "close-outline" : "create-outline"} size={16} color={Colors.terra} />
              <Text style={[styles.actionBtnText, { color: Colors.terra }]}>
                {editing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={deleteListing}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>

          {/* URL card — only once the listing is live */}
          {!isDraft && (
            <View style={styles.urlCard}>
              <Text style={styles.urlLabel}>YOUR PAGE</Text>
              <Text style={styles.urlText}>{WEB_BASE.replace(/^https?:\/\//, "")}/p/{listing.slug}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
                <Ionicons name="share-social-outline" size={16} color={Colors.paper} />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Edit mode */}
          {editing ? (
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Edit listing</Text>
              <EditField label="Title" value={editTitle} onChangeText={setEditTitle} />
              <EditField label="Price per night (₹)" value={editPrice} onChangeText={setEditPrice} keyboardType="number-pad" />
              <EditField label="Cleaning fee (₹/stay — goes to you)" value={editCleaning} onChangeText={setEditCleaning} keyboardType="number-pad" />
              <View style={styles.editRow}>
                <EditField label="Guests" value={editGuests} onChangeText={setEditGuests} keyboardType="number-pad" style={{ flex: 1 }} />
                <EditField label="Bedrooms" value={editBedrooms} onChangeText={setEditBedrooms} keyboardType="number-pad" style={{ flex: 1 }} />
                <EditField label="Baths" value={editBaths} onChangeText={setEditBaths} keyboardType="number-pad" style={{ flex: 1 }} />
              </View>
              <EditField label="Description" value={editDescription} onChangeText={setEditDescription} multiline />
              <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>Amenities</Text>
              <View style={styles.amenEditGrid}>
                {AMENITIES.map((a) => {
                  const selected = editAmenities.includes(a.key);
                  return (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() =>
                        setEditAmenities((prev) =>
                          selected ? prev.filter((x) => x !== a.key) : [...prev, a.key],
                        )
                      }
                      style={[styles.amenEditChip, selected && styles.amenEditChipActive]}
                    >
                      <Ionicons
                        name={a.icon as any}
                        size={15}
                        color={selected ? Colors.terra : Colors.charcoal2}
                      />
                      <Text style={[styles.amenEditText, selected && styles.amenEditTextActive]}>
                        {a.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {editAmenities
                  .filter((a) => !AMENITIES.some((p) => p.key === a))
                  .map((a) => (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setEditAmenities((prev) => prev.filter((x) => x !== a))}
                      style={[styles.amenEditChip, styles.amenEditChipActive]}
                    >
                      <Ionicons name="close-circle" size={15} color={Colors.terra} />
                      <Text style={[styles.amenEditText, styles.amenEditTextActive]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              <View style={styles.customAmenRow}>
                <TextInput
                  value={customAmenity}
                  onChangeText={setCustomAmenity}
                  placeholder="Add custom amenity…"
                  placeholderTextColor={Colors.charcoal3}
                  style={[styles.editInput, { flex: 1 }]}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const val = customAmenity.trim();
                    if (val && !editAmenities.includes(val)) {
                      setEditAmenities((prev) => [...prev, val]);
                      setCustomAmenity("");
                    }
                  }}
                />
                <TouchableOpacity
                  style={[styles.addAmenBtn, !customAmenity.trim() && { opacity: 0.4 }]}
                  onPress={() => {
                    const val = customAmenity.trim();
                    if (val && !editAmenities.includes(val)) {
                      setEditAmenities((prev) => [...prev, val]);
                      setCustomAmenity("");
                    }
                  }}
                  disabled={!customAmenity.trim()}
                >
                  <Ionicons name="add" size={20} color={Colors.paper} />
                </TouchableOpacity>
              </View>
              <Button
                title={saving ? "Saving…" : "Save changes"}
                onPress={saveEdits}
                loading={saving}
                disabled={saving || !editTitle.trim() || !editPrice.trim()}
                full
                size="lg"
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <>
              {/* Quick stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{inr(listing.price_inr)}</Text>
                  <Text style={styles.statLabel}>per night</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{listing.rating > 0 ? listing.rating.toFixed(1) : "—"}</Text>
                  <Text style={styles.statLabel}>rating</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{listing.reviews_count}</Text>
                  <Text style={styles.statLabel}>reviews</Text>
                </View>
              </View>

              {/* Description */}
              {listing.description ? (
                <View style={styles.descSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descText}>{listing.description}</Text>
                </View>
              ) : null}

              {/* Property details */}
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailGrid}>
                <DetailItem label="Type" value={listing.type} />
                <DetailItem label="Guests" value={String(listing.guests)} />
                <DetailItem label="Bedrooms" value={String(listing.bedrooms)} />
                <DetailItem label="Baths" value={String(listing.baths)} />
                <DetailItem label="Scene" value={listing.scene} />
                <DetailItem label="Location" value={`${listing.city}, ${listing.area}`} />
              </View>

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Amenities</Text>
                  <View style={styles.amenGrid}>
                    {listing.amenities.map((a) => (
                      <View key={a} style={styles.amenItem}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        <Text style={styles.amenText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* Bookings */}
          {bookings.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Bookings</Text>
              {bookings.map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingDate}>
                      {fullDate(b.start_date)} → {fullDate(b.end_date)}
                    </Text>
                    <Text style={styles.bookingMeta}>
                      {b.nights} nights · {b.guests} guests · {b.status}
                    </Text>
                  </View>
                  <Text style={styles.bookingTotal}>{inr(b.total_inr)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>

      <PhotoViewer
        images={images}
        visible={viewerOpen}
        initialIndex={imgIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setImgIndex}
      />
    </SafeAreaView>
  );
}

function EditField({ label, value, onChangeText, keyboardType, multiline, style }: {
  label: string; value: string; onChangeText: (t: string) => void;
  keyboardType?: "number-pad" | "default"; multiline?: boolean; style?: any;
}) {
  return (
    <View style={[styles.editField, style]}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.editInput, multiline && { height: 100 }]}
      />
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  content: { padding: 16 },

  // Photo carousel
  carouselImage: { width: W, height: W * 0.65 },
  dots: {
    position: "absolute", bottom: 12, alignSelf: "center",
    flexDirection: "row", gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 18 },
  imgCount: {
    position: "absolute", bottom: 12, right: 12,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  imgCountText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // Draft banner
  draftBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, marginBottom: 12, borderRadius: Radius.md,
    backgroundColor: Colors.warmBg, borderWidth: 1, borderColor: Colors.terraSoft,
  },
  draftBannerText: { flex: 1, fontSize: 13, color: Colors.charcoal, lineHeight: 18 },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, height: 44, borderRadius: Radius.md,
  },
  publishBtnLive: { backgroundColor: Colors.terra },
  publishBtnDraft: { backgroundColor: Colors.paper, borderWidth: 1.5, borderColor: Colors.edge },
  editBtn: { backgroundColor: Colors.paper, borderWidth: 1.5, borderColor: Colors.terra },
  deleteBtn: { flex: 0, width: 44, backgroundColor: Colors.paper, borderWidth: 1.5, borderColor: Colors.edge },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  // URL card
  urlCard: {
    padding: 20, borderRadius: Radius.lg,
    backgroundColor: Colors.aanganDeep, alignItems: "center", marginBottom: 16,
  },
  urlLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: Colors.mustard, marginBottom: 6 },
  urlText: { fontSize: 18, fontWeight: "800", color: Colors.paper },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 14, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radius.full, backgroundColor: Colors.terra,
  },
  shareBtnText: { fontSize: 14, fontWeight: "700", color: Colors.paper },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: {
    flex: 1, padding: 14, borderRadius: Radius.md,
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  statLabel: { fontSize: 11, color: Colors.charcoal2, marginTop: 2 },

  // Description
  descSection: { marginBottom: 16 },
  descText: { fontSize: 14, color: Colors.charcoal2, lineHeight: 22 },

  // Details
  sectionTitle: { fontSize: 18, fontWeight: "800", color: Colors.charcoal, marginBottom: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: {
    width: "47%", padding: 12, borderRadius: Radius.md,
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge,
  },
  detailLabel: { fontSize: 11, fontWeight: "700", color: Colors.charcoal3, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: "700", color: Colors.charcoal, marginTop: 4 },

  // Amenities
  amenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  amenItem: { width: "46%", flexDirection: "row", alignItems: "center", gap: 8 },
  amenText: { fontSize: 14, color: Colors.charcoal },

  // Edit mode
  editSection: { marginTop: 8 },
  editRow: { flexDirection: "row", gap: 12 },
  editField: { marginBottom: 14 },
  editLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 6 },
  editInput: {
    height: 48, paddingHorizontal: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
    fontSize: 15, color: Colors.charcoal, fontWeight: "600",
  },

  // Bookings
  bookingRow: {
    flexDirection: "row", alignItems: "center",
    padding: 14, marginBottom: 8,
    backgroundColor: Colors.paper, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.edge,
  },
  bookingDate: { fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  bookingMeta: { fontSize: 12, color: Colors.charcoal2, marginTop: 2 },
  bookingTotal: { fontSize: 16, fontWeight: "800", color: Colors.charcoal },
  amenEditGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenEditChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
  amenEditChipActive: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  amenEditText: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal2 },
  amenEditTextActive: { color: Colors.terra },
  customAmenRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  addAmenBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.terra, alignItems: "center", justifyContent: "center",
  },
});
