import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ListingCard as LC, Scene } from "@/lib/api";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { ListingCardItem } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { GlassSheet } from "@/components/GlassSheet";
import { shortDate } from "@/lib/format";

const PAGE = 40;

type Sort = "recommended" | "price_asc" | "price_desc" | "rating" | "newest";
const SORTS: { label: string; value: Sort }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
  { label: "Top rated", value: "rating" },
  { label: "Newest", value: "newest" },
];

const SCENES: { label: string; value: Scene }[] = [
  { label: "Mountains", value: "mountain" },
  { label: "Beaches", value: "beach" },
  { label: "Heritage", value: "heritage" },
  { label: "Forests", value: "forest" },
  { label: "Backwaters", value: "backwater" },
  { label: "Desert", value: "desert" },
  { label: "Lakes", value: "lake" },
  { label: "City", value: "city" },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scene?: string; where?: string }>();

  const [where, setWhere] = useState(params.where ?? "");
  const [scene, setScene] = useState<Scene | null>((params.scene as Scene) ?? null);
  const [guests, setGuests] = useState(1);
  const [instant, setInstant] = useState(false);
  const [veg, setVeg] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");

  const [results, setResults] = useState<LC[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mayHaveMore, setMayHaveMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildQuery = useCallback((offset: number) => {
    const qs = new URLSearchParams();
    if (where) qs.set("where", where);
    if (scene) qs.set("scene", scene);
    if (guests > 1) qs.set("guests", String(guests));
    if (instant) qs.set("instant", "true");
    if (veg) qs.set("veg", "true");
    if (checkIn && checkOut) {
      qs.set("start_date", checkIn);
      qs.set("end_date", checkOut);
    }
    if (priceMin.trim()) qs.set("price_min", priceMin.trim());
    if (priceMax.trim()) qs.set("price_max", priceMax.trim());
    if (sort !== "recommended") qs.set("sort", sort);
    qs.set("limit", String(PAGE));
    if (offset > 0) qs.set("offset", String(offset));
    return qs;
  }, [where, scene, guests, instant, veg, checkIn, checkOut, priceMin, priceMax, sort]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<LC[]>(`/api/listings?${buildQuery(0).toString()}`);
      setResults(data);
      setMayHaveMore(data.length === PAGE);
    } catch {
      setResults([]);
      setMayHaveMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !mayHaveMore || !results) return;
    setLoadingMore(true);
    try {
      const more = await api<LC[]>(`/api/listings?${buildQuery(results.length).toString()}`);
      const seen = new Set(results.map((r) => r.id));
      setResults([...results, ...more.filter((m) => !seen.has(m.id))]);
      setMayHaveMore(more.length === PAGE);
    } catch {
      setMayHaveMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, loadingMore, mayHaveMore, results]);

  // Auto-run once on mount (covers arriving from the mood picker / map with
  // params already set), then only on explicit "Search" press after that.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.charcoal3} />
        <TextInput
          value={where}
          onChangeText={setWhere}
          placeholder="City, area, or country"
          placeholderTextColor={Colors.charcoal3}
          style={styles.searchInput}
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SCENES}
        keyExtractor={(s) => s.value}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => {
          const active = scene === item.value;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setScene(active ? null : item.value)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.filterRow}>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => setGuests((g) => Math.max(1, g - 1))} style={styles.stepBtn}>
            <Ionicons name="remove" size={16} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.stepValue}>{guests} guest{guests > 1 ? "s" : ""}</Text>
          <TouchableOpacity onPress={() => setGuests((g) => g + 1)} style={styles.stepBtn}>
            <Ionicons name="add" size={16} color={Colors.charcoal} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.toggle, instant && styles.toggleActive]}
          onPress={() => setInstant((v) => !v)}
        >
          <Text style={[styles.toggleLabel, instant && styles.toggleLabelActive]}>Instant book</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggle, veg && styles.toggleActive]} onPress={() => setVeg((v) => !v)}>
          <Text style={[styles.toggleLabel, veg && styles.toggleLabelActive]}>Veg kitchen</Text>
        </TouchableOpacity>
      </View>

      {/* dates + price */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.toggle, !!checkIn && styles.toggleDates]} onPress={() => setDatesOpen(true)}>
          <Text style={styles.toggleLabel}>
            {checkIn && checkOut ? `${shortDate(checkIn)} → ${shortDate(checkOut)}` : "📅 Add dates"}
          </Text>
        </TouchableOpacity>
        {!!checkIn && (
          <TouchableOpacity onPress={() => { setCheckIn(""); setCheckOut(""); }} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.charcoal3} />
          </TouchableOpacity>
        )}
        <TextInput
          value={priceMin}
          onChangeText={(t) => setPriceMin(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="₹ min"
          placeholderTextColor={Colors.charcoal3}
          style={styles.priceInput}
        />
        <TextInput
          value={priceMax}
          onChangeText={(t) => setPriceMax(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="₹ max"
          placeholderTextColor={Colors.charcoal3}
          style={styles.priceInput}
        />
      </View>

      {/* sort */}
      <View style={styles.filterRow}>
        {SORTS.map((s) => {
          const active = sort === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.toggle, active && styles.sortActive]}
              onPress={() => setSort(s.value)}
            >
              <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {datesOpen && (
        <GlassSheet onClose={() => setDatesOpen(false)} title="Select dates">
          <DateRangeCalendar
            unavailable={[]}
            minNights={1}
            value={{ checkIn, checkOut }}
            onChange={(v) => {
              setCheckIn(v.checkIn);
              setCheckOut(v.checkOut);
              if (v.checkIn && v.checkOut) setDatesOpen(false);
            }}
          />
        </GlassSheet>
      )}

      <TouchableOpacity style={styles.searchAction} onPress={runSearch}>
        <Text style={styles.searchActionLabel}>Search</Text>
      </TouchableOpacity>

      {loading ? (
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCardItem listing={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.terra} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 18, fontWeight: "700", color: Colors.charcoal },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.charcoal, fontFamily: Fonts.regular },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  chipActive: { backgroundColor: Colors.terra, borderColor: Colors.terra },
  chipLabel: { fontSize: 13, fontWeight: "700", color: Colors.charcoal },
  chipLabelActive: { color: Colors.paper },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.warmBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 13, fontWeight: "700", color: Colors.charcoal },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  toggleActive: { backgroundColor: Colors.veg, borderColor: Colors.veg },
  toggleDates: { borderColor: Colors.terra },
  sortActive: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  priceInput: {
    width: 84,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  toggleLabel: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal },
  toggleLabelActive: { color: Colors.paper },
  searchAction: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.terra,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  searchActionLabel: { color: Colors.paper, fontSize: 14, fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 16 },
});
