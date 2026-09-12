import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ListingCard as LC } from "@/lib/api";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { inr, imageUrl } from "@/lib/format";
import { RemoteImage } from "@/components/RemoteImage";
import { useWishlist } from "@/lib/auth";

const CARD_WIDTH = (Dimensions.get("window").width - 48) / 2;

interface Props {
  listing: LC;
  wide?: boolean;
}

export function ListingCardItem({ listing, wide }: Props) {
  const router = useRouter();
  const wishlist = useWishlist();
  const isWished = wishlist.has(listing.id);
  const img = listing.images?.[0];
  const imgSrc = img ? imageUrl(img.url) : null;
  const w = wide ? Dimensions.get("window").width - 32 : CARD_WIDTH;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/listing/${listing.id}`)}
      style={[styles.card, { width: w }]}
      testID="listing-card"
      accessibilityLabel={`${listing.title}, ${inr(listing.price_inr)} per night`}
    >
      {/* Photo with overlays */}
      <View style={[styles.imageWrap, { width: w, height: w * 0.67 }]}>
        {imgSrc ? (
          <RemoteImage
            url={img!.url}
            size="medium"
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        {/* Gradient scrim */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.45)"]}
          locations={[0.3, 0.6, 1]}
          style={styles.scrim}
          pointerEvents="none"
        />
        {/* Location overlay */}
        <View style={styles.locationRow}>
          <Text style={styles.cityOverlay} numberOfLines={1}>
            {listing.city}
          </Text>
          <Text style={styles.dotOverlay}>·</Text>
          <Text style={styles.areaOverlay} numberOfLines={1}>
            {listing.area}
          </Text>
        </View>
        {/* Rating badge */}
        {listing.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={8} color="#FACC15" />
            <Text style={styles.ratingText}>{listing.rating.toFixed(1)}</Text>
          </View>
        )}
        {/* Heart button */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            wishlist.toggle(listing.id);
          }}
          hitSlop={8}
        >
          <Ionicons
            name={isWished ? "heart" : "heart-outline"}
            size={16}
            color={isWished ? Colors.terra : Colors.charcoal}
          />
        </TouchableOpacity>
      </View>

      {/* Info below */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{inr(listing.price_inr)}</Text>
          <Text style={styles.perNight}> / night</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  imageWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.edge,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: Colors.edge,
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  locationRow: {
    position: "absolute",
    bottom: 8,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityOverlay: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.95)",
  },
  dotOverlay: {
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
  },
  areaOverlay: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.75)",
    flexShrink: 1,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 8,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  title: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  perNight: {
    fontFamily: Fonts.regular,
    fontSize: 10.5,
    color: Colors.charcoal3,
  },
});
