import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { api, ListingCard as LC, CmsBanner, CmsCollection, WEB_BASE } from "@/lib/api";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { ListingCardItem } from "@/components/ListingCard";

interface CollectionWithItems {
  collection: CmsCollection;
  items: LC[];
}

export default function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [listings, setListings] = useState<LC[]>([]);
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [collections, setCollections] = useState<CollectionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHome = useCallback(async () => {
    const [listingsRes, bannersRes, collectionsRes] = await Promise.all([
      // Newest first, matching the website: rating-first ordering hid new homes.
      api<LC[]>("/api/listings?limit=12&sort=newest").catch(() => []),
      api<CmsBanner[]>("/api/cms/banners").catch(() => []),
      api<CmsCollection[]>("/api/cms/collections").catch(() => []),
    ]);
    setListings(listingsRes);
    setBanners(bannersRes);

    const withItems = await Promise.all(
      collectionsRes.map(async (c) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(c.filters || {})) {
          if (v !== null && v !== undefined && v !== "") qs.set(k, String(v));
        }
        qs.set("limit", "4");
        const items = await api<LC[]>(`/api/listings?${qs.toString()}`).catch(() => []);
        return { collection: c, items };
      })
    );
    setCollections(withItems.filter((c) => c.items.length > 0));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchHome().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHome();
    setRefreshing(false);
  }, [fetchHome]);

  const openBanner = async (b: CmsBanner) => {
    if (!b.link_url) return;
    const url = b.link_url.startsWith("http") ? b.link_url : `${WEB_BASE}${b.link_url}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />
        }
      >
        {/* CMS banners */}
        {banners.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.banner}
            activeOpacity={b.link_url ? 0.85 : 1}
            disabled={!b.link_url}
            onPress={() => openBanner(b)}
          >
            <Text style={styles.bannerTitle}>{b.title}</Text>
            {b.body && <Text style={styles.bannerBody}>{b.body}</Text>}
            {b.link_url && b.link_label && <Text style={styles.bannerLink}>{b.link_label}</Text>}
          </TouchableOpacity>
        ))}

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/search")}
          activeOpacity={0.9}
          testID="search-bar"
          accessibilityLabel="Where to?"
        >
          <Ionicons name="search" size={18} color={Colors.terra} />
          <View style={styles.searchTextWrap}>
            <Text style={styles.searchTitle} testID="search-title" accessibilityLabel="Where to?">Where to?</Text>
            <Text style={styles.searchSub}>Anywhere · Any week · Add guests</Text>
          </View>
          <View style={styles.searchBtn}>
            <Ionicons name="search" size={16} color={Colors.paper} />
          </View>
        </TouchableOpacity>

        {/* Hero — mirrors web's homepage headline */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>NEWEST STAYS</Text>
          <Text style={styles.heroTitle}>Real homes, real hosts, all over India</Text>
          <Text style={styles.heroSubtitle}>
            Phone-verified hosts, UPI payments, all-inclusive pricing in ₹ — no hidden fees, ever.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>More stays coming soon</Text>
            <Text style={styles.emptyText}>
              Our hosts are getting set up. Check back shortly for the freshest listings across India.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {listings.map((listing) => (
              <ListingCardItem key={listing.id} listing={listing} />
            ))}
          </View>
        )}

        {/* CMS collections */}
        {collections.map(({ collection, items }) => (
          <View key={collection.id} style={styles.section}>
            <Text style={styles.sectionKicker}>COLLECTION</Text>
            <Text style={styles.sectionTitle}>{collection.title}</Text>
            {collection.subtitle && <Text style={styles.sectionSubtitle}>{collection.subtitle}</Text>}
            <View style={styles.grid}>
              {items.map((listing) => (
                <ListingCardItem key={listing.id} listing={listing} />
              ))}
            </View>
          </View>
        ))}

        {/* Host nudge */}
        <TouchableOpacity
          style={styles.hostNudge}
          activeOpacity={0.9}
          onPress={() => router.push("/host")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.hostTitle}>Got a spare room with a view?</Text>
            <Text style={styles.hostSub}>
              List it on Aangan Stay — zero commission, forever.
            </Text>
          </View>
          <View style={styles.hostArrow}>
            <Ionicons name="arrow-forward" size={18} color={Colors.paper} />
          </View>
        </TouchableOpacity>

        <View style={{ height: tabBarHeight + 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const W = Dimensions.get("window").width;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  banner: {
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bannerTitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.paper,
  },
  bannerBody: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  bannerLink: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    fontWeight: "800",
    color: Colors.gold,
    marginTop: 4,
    textDecorationLine: "underline",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 10,
    backgroundColor: Colors.paper,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  searchTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  searchTitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  searchSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.charcoal2,
    marginTop: 1,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  heroKicker: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.terra,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.charcoal,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.charcoal2,
    marginTop: 10,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionKicker: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.terra,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.charcoal2,
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  loadingWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  skeleton: {
    width: (W - 48) / 2,
    height: ((W - 48) / 2) * 0.7 + 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.edge,
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.charcoal2,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 19,
  },
  hostNudge: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 32,
    padding: 20,
    borderRadius: Radius.lg,
    backgroundColor: Colors.charcoal,
  },
  hostTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.paper,
    lineHeight: 22,
  },
  hostSub: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  hostArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
