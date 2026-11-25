// The blog: the featured story, then every story newest first, filtered by
// section or a search. Same posts as aanganstay.com/blog.
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { CATEGORIES, PAGE_SIZE, fetchPosts, type BlogCard } from "@/lib/blog";
import { FeaturedPost, PostRow } from "@/components/blog/PostCard";

export default function BlogScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string | null>(
    CATEGORIES.some((c) => c.key === params.category) ? params.category! : null);
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [featured, setFeatured] = useState<BlogCard | null>(null);
  const [posts, setPosts] = useState<BlogCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const req = useRef(0);

  const load = useCallback(async () => {
    const id = ++req.current;
    setError("");
    try {
      const r = await fetchPosts({ category, q });
      if (id !== req.current) return;
      setFeatured(r.featured);
      setPosts(r.posts);
      setTotal(r.total);
    } catch (e: any) {
      if (id === req.current) setError(e?.message || "Couldn't load stories.");
    }
  }, [category, q]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const loadMore = async () => {
    if (more || loading || posts.length >= total) return;
    setMore(true);
    try {
      const r = await fetchPosts({ category, q, offset: posts.length });
      setPosts((p) => [...p, ...r.posts.filter((x) => !p.some((y) => y.slug === x.slug))]);
    } catch {} finally {
      setMore(false);
    }
  };

  const filtered = !!category || !!q;
  const lead = !filtered ? featured : null;
  const list = posts.filter((p) => p.slug !== lead?.slug);

  const header = (
    <View>
      <View style={styles.masthead}>
        <Text style={styles.kicker}>THE AANGAN BLOG</Text>
        <Text style={styles.title}>Stories from India&apos;s homes</Text>
        <Text style={styles.sub}>Travel guides, homestay stories, food and festivals, from the people who know them.</Text>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={Colors.charcoal3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setQ(query.trim())}
          placeholder="Search stories"
          placeholderTextColor={Colors.charcoal3}
          returnKeyType="search"
          style={styles.searchInput}
          accessibilityLabel="Search stories"
        />
        {!!query && (
          <TouchableOpacity onPress={() => { setQuery(""); setQ(""); }} accessibilityLabel="Clear search" hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={Colors.charcoal3} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ key: null as string | null, label: "All stories" }, ...CATEGORIES].map((c) => {
          const on = category === c.key;
          return (
            <TouchableOpacity key={c.key ?? "all"} onPress={() => setCategory(c.key)} style={[styles.chip, on && styles.chipOn]}
                              accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {lead && <View style={styles.pad}><FeaturedPost post={lead} /></View>}
      {list.length > 0 && (
        <Text style={[styles.kicker, styles.pad, { marginTop: 28 }]}>
          {q ? `${total} ${total === 1 ? "STORY" : "STORIES"} FOR “${q.toUpperCase()}”`
             : category ? CATEGORIES.find((c) => c.key === category)!.label.toUpperCase() : "LATEST STORIES"}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Blog", headerBackTitle: "Back", headerShadowVisible: false,
                               headerStyle: { backgroundColor: Colors.cream }, headerTintColor: Colors.charcoal }} />
      <FlatList
        data={loading ? [] : list}
        keyExtractor={(p) => p.slug}
        renderItem={({ item }) => <View style={styles.pad}><PostRow post={item} /></View>}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={Colors.terra} style={{ marginTop: 40 }} />
          : error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Couldn&apos;t load stories</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !lead ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{filtered ? "No stories here yet" : "Our first stories are on their way"}</Text>
              <Text style={styles.emptyText}>
                {filtered ? "Try another section, or a different search." : "Check back soon for guides, homestay stories and festival picks."}
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={more ? <ActivityIndicator color={Colors.terra} style={{ marginVertical: 20 }} /> : <View style={{ height: 32 }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        initialNumToRender={PAGE_SIZE}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.terra}
                                        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  pad: { paddingHorizontal: 20 },
  masthead: { paddingHorizontal: 20, paddingTop: 8 },
  kicker: { fontFamily: Fonts.regular, fontSize: 10.5, fontWeight: "800", letterSpacing: 2, color: Colors.terra },
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, fontWeight: "700", color: Colors.charcoal, letterSpacing: -0.6, marginTop: 6 },
  sub: { fontFamily: Fonts.regular, fontSize: 14.5, lineHeight: 21, color: Colors.charcoal2, marginTop: 8 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 18, paddingHorizontal: 14,
            height: 44, borderRadius: Radius.full, backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: Colors.charcoal },
  chips: { paddingHorizontal: 20, gap: 8, paddingVertical: 16 },
  chip: { paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: Radius.full, borderWidth: 1,
          borderColor: Colors.edgeStrong, backgroundColor: Colors.paper },
  chipOn: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  chipText: { fontFamily: Fonts.regular, fontSize: 13.5, fontWeight: "700", color: Colors.charcoal },
  chipTextOn: { color: Colors.paper },
  empty: { alignItems: "center", paddingHorizontal: 32, paddingTop: 40 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: "700", color: Colors.charcoal, textAlign: "center" },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.charcoal2, textAlign: "center", marginTop: 8 },
  retry: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.terra },
  retryText: { fontFamily: Fonts.regular, fontSize: 14, fontWeight: "700", color: Colors.paper },
});
