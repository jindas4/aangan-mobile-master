import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ListingCard as LC, Scene } from "@/lib/api";
import { Colors, Radius, Shadows } from "@/constants/Colors";
import { ListingCardItem } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import {
  SearchSheet, EMPTY_QUERY, queryString, filterCount, datesSummary, guestsSummary,
  type SearchQuery, type SearchStep,
} from "@/components/SearchSheet";

const PAGE = 40;

type Sort = "recommended" | "price_asc" | "price_desc" | "rating" | "newest";
const SORTS: { label: string; value: Sort }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
  { label: "Top rated", value: "rating" },
  { label: "Newest", value: "newest" },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scene?: string; where?: string; open?: string }>();

  // The search that the results below are for. Changed only through the sheet.
  const [query, setQuery] = useState<SearchQuery>(() => ({
    ...EMPTY_QUERY, where: params.where ?? "", scene: (params.scene as Scene) ?? null,
  }));
  const [sort, setSort] = useState<Sort>("recommended");
  // Arriving from the home search bar opens the sheet on "Where".
  const [sheet, setSheet] = useState<SearchStep | null>(params.open === "1" ? "where" : null);

  const [results, setResults] = useState<LC[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mayHaveMore, setMayHaveMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildQuery = useCallback((offset: number) => {
    const extra: Record<string, string> = { limit: String(PAGE) };
    if (sort !== "recommended") extra.sort = sort;
    if (offset > 0) extra.offset = String(offset);
    return queryString(query, extra);
  }, [query, sort]);

  // Runs whenever the search or the sort changes.
  useEffect(() => {
    let live = true;
    setLoading(true);
    api<LC[]>(`/api/listings?${buildQuery(0)}`)
      .then((data) => { if (live) { setResults(data); setMayHaveMore(data.length === PAGE); } })
      .catch(() => { if (live) { setResults([]); setMayHaveMore(false); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !mayHaveMore || !results) return;
    setLoadingMore(true);
    try {
      const more = await api<LC[]>(`/api/listings?${buildQuery(results.length)}`);
      const seen = new Set(results.map((r) => r.id));
      setResults([...results, ...more.filter((m) => !seen.has(m.id))]);
      setMayHaveMore(more.length === PAGE);
    } catch {
      setMayHaveMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, loading, loadingMore, mayHaveMore, results]);

  const nFilters = filterCount(query);
  const hasDates = !!(query.checkIn && query.checkOut);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={Colors.charcoal} />
        </TouchableOpacity>

        {/* The current search in one line; each part opens its own step. */}
        <View style={styles.pill}>
          <TouchableOpacity style={styles.pillMain} onPress={() => setSheet("where")} testID="search-summary"
                            accessibilityRole="button" accessibilityLabel="Change where">
            <Text style={styles.pillWhere} numberOfLines={1}>{query.where || "Anywhere"}</Text>
          </TouchableOpacity>
          <View style={styles.pillSubRow}>
            <TouchableOpacity onPress={() => setSheet("when")} hitSlop={6} accessibilityLabel="Change dates">
              <Text style={[styles.pillSub, hasDates && styles.pillSubOn]} numberOfLines={1}>{datesSummary(query)}</Text>
            </TouchableOpacity>
            <Text style={styles.pillDot}>·</Text>
            <TouchableOpacity onPress={() => setSheet("who")} hitSlop={6} accessibilityLabel="Change guests">
              <Text style={[styles.pillSub, query.guests > 1 && styles.pillSubOn]} numberOfLines={1}>{guestsSummary(query.guests)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.filterBtn, nFilters > 0 && styles.filterBtnOn]} onPress={() => setSheet("filters")}
                          accessibilityLabel={nFilters ? `Filters, ${nFilters} on` : "Filters"} testID="search-filters">
          <Ionicons name="options-outline" size={19} color={nFilters ? Colors.paper : Colors.charcoal} />
          {nFilters > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{nFilters}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortList} contentContainerStyle={styles.sortRow}>
        {SORTS.map((s) => {
          const active = sort === s.value;
          return (
            <TouchableOpacity key={s.value} style={[styles.sort, active && styles.sortActive]} onPress={() => setSort(s.value)}
                              accessibilityState={{ selected: active }}>
              <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && !results ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={Colors.terra} />
      ) : results && results.length === 0 ? (
        <EmptyState icon="search-outline" title="No stays match yet" subtitle="Try a different place or clear a filter." />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          style={loading ? { opacity: 0.5 } : undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCardItem listing={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.terra} /> : undefined}
        />
      )}

      <SearchSheet
        visible={sheet !== null}
        initial={query}
        startStep={sheet ?? "where"}
        onClose={() => setSheet(null)}
        onApply={(q) => { setQuery(q); setSheet(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 },
  pill: {
    flex: 1, paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge, ...Shadows.pill,
  },
  pillMain: { alignSelf: "stretch" },
  pillWhere: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  pillSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 1 },
  pillSub: { fontSize: 12.5, fontWeight: "600", color: Colors.charcoal3 },
  pillSubOn: { color: Colors.charcoal2 },
  pillDot: { fontSize: 12.5, color: Colors.charcoal3 },
  filterBtn: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge,
  },
  filterBtnOn: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  badge: {
    position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: Colors.terra, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.cream,
  },
  badgeText: { color: Colors.paper, fontSize: 10, fontWeight: "800" },
  sortList: { flexGrow: 0, flexShrink: 0 },
  sortRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: "center" },
  sort: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper },
  sortActive: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  sortLabel: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal },
  sortLabelActive: { color: Colors.paper },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 16 },
});
