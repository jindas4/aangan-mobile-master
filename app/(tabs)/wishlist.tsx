import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { api, ListingCard as LC } from "@/lib/api";
import { Colors } from "@/constants/Colors";
import { useAuth, useWishlist } from "@/lib/auth";
import { ListingCardItem } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

export default function WishlistScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const wishIds = useWishlist((s) => s.ids);
  const [listings, setListings] = useState<LC[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlistListings = useCallback(async () => {
    if (!user || wishIds.size === 0) {
      setListings([]);
      return;
    }
    try {
      const all = await api<LC[]>("/api/listings?limit=50");
      setListings(all.filter((l) => wishIds.has(l.id)));
    } catch {
      setListings([]);
    }
  }, [user, wishIds]);

  useEffect(() => {
    setLoading(true);
    fetchWishlistListings().finally(() => setLoading(false));
  }, [fetchWishlistListings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlistListings();
    setRefreshing(false);
  }, [fetchWishlistListings]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.header}>Wishlist</Text>
        <EmptyState
          icon="heart-outline"
          title="Log in to see your wishlist"
          subtitle="Save your favourite stays and access them anywhere."
        />
        <View style={styles.loginWrap}>
          <Button title="Log in" onPress={() => router.push("/login")} full />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.header}>Wishlist</Text>
      {listings.length === 0 && !loading ? (
        <EmptyState
          icon="heart-outline"
          title="No saved stays yet"
          subtitle="Tap the heart on any listing to save it here."
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />
          }
          renderItem={({ item }) => <ListingCardItem listing={item} />}
        />
      )}
    </SafeAreaView>
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
  },
  row: {
    gap: 16,
  },
  loginWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
});
