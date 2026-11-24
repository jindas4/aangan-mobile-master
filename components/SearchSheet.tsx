// Search, step by step — the app's version of the website's search sheet
// (frontend/components/v2/SearchBar.tsx).
//
//   Where → When → Who, then optional Filters. One step is open at a time;
//   the others fold into a one-line summary you can tap to reopen. Picking a
//   place moves on to dates, picking check-out moves on to guests. The button
//   counts matching stays as you go.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ScrollView,
  LayoutAnimation, Platform, UIManager, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Scene } from "@/lib/api";
import { Colors, Fonts } from "@/constants/Colors";
import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { ALL_LOCAL_DESTINATIONS, WEEKEND_GETAWAYS, type Suggestion } from "@/lib/searchPlaces";
import { shortDate } from "@/lib/format";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type RuleKey = "couples" | "local_id" | "pet_friendly" | "alcohol";
export interface SearchQuery {
  where: string;
  scene: Scene | null;
  guests: number;
  checkIn: string;
  checkOut: string;
  priceMin: string;
  priceMax: string;
  instant: boolean;
  veg: boolean;
  rules: Partial<Record<RuleKey, boolean>>;
}
export type SearchStep = "where" | "when" | "who" | "filters";

export const EMPTY_QUERY: SearchQuery = {
  where: "", scene: null, guests: 1, checkIn: "", checkOut: "",
  priceMin: "", priceMax: "", instant: false, veg: false, rules: {},
};

/** /api/listings query string for a search. */
export function queryString(q: SearchQuery, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams();
  if (q.where.trim()) qs.set("where", q.where.trim());
  if (q.scene) qs.set("scene", q.scene);
  if (q.guests > 1) qs.set("guests", String(q.guests));
  if (q.instant) qs.set("instant", "true");
  if (q.veg) qs.set("veg", "true");
  for (const [k, on] of Object.entries(q.rules)) if (on) qs.set(k, "true");
  if (q.checkIn && q.checkOut) { qs.set("start_date", q.checkIn); qs.set("end_date", q.checkOut); }
  if (q.priceMin.trim()) qs.set("price_min", q.priceMin.trim());
  if (q.priceMax.trim()) qs.set("price_max", q.priceMax.trim());
  for (const [k, v] of Object.entries(extra)) qs.set(k, v);
  return qs.toString();
}

export function filterCount(q: SearchQuery): number {
  return (q.priceMin || q.priceMax ? 1 : 0) + (q.scene ? 1 : 0) + (q.instant ? 1 : 0) + (q.veg ? 1 : 0)
    + Object.values(q.rules).filter(Boolean).length;
}

export function datesSummary(q: SearchQuery): string {
  if (q.checkIn && q.checkOut) return `${shortDate(q.checkIn)} – ${shortDate(q.checkOut)}`;
  if (q.checkIn) return `From ${shortDate(q.checkIn)}`;
  return "Any week";
}
export const guestsSummary = (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`;

const SCENES: { label: string; value: Scene }[] = [
  { label: "Mountains", value: "mountain" }, { label: "Beaches", value: "beach" },
  { label: "Heritage", value: "heritage" }, { label: "Forests", value: "forest" },
  { label: "Backwaters", value: "backwater" }, { label: "Desert", value: "desert" },
  { label: "Lakes", value: "lake" }, { label: "City", value: "city" },
];
const PRICE_PRESETS = [
  { label: "Under ₹3,000", min: "", max: "3000" },
  { label: "₹3,000–6,000", min: "3000", max: "6000" },
  { label: "₹6,000–10,000", min: "6000", max: "10000" },
  { label: "₹10,000+", min: "10000", max: "" },
];
const MUSTS: { key: "instant" | "veg" | RuleKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "instant", label: "Instant book", icon: "flash-outline" },
  { key: "veg", label: "Veg kitchen", icon: "leaf-outline" },
  { key: "couples", label: "Couples welcome", icon: "heart-outline" },
  { key: "local_id", label: "Local ID accepted", icon: "card-outline" },
  { key: "pet_friendly", label: "Pets welcome", icon: "paw-outline" },
  { key: "alcohol", label: "Alcohol allowed", icon: "wine-outline" },
];
const HUBS = Object.keys(WEEKEND_GETAWAYS);

// Remembered for this app session.
let recentPlaces: string[] = [];
let lastHub = HUBS[0];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Friday → Sunday of this weekend (weeksAhead 0) or a later one. */
function weekend(weeksAhead: number): [string, string] {
  // On Sat/Sun "this weekend" is the one already under way: today → Sunday.
  const today = new Date();
  const day = today.getDay();
  const fri = new Date(today);
  fri.setDate(today.getDate() + (day === 0 ? -2 : day === 6 ? -1 : 5 - day) + 7 * weeksAhead);
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const todayK = keyOf(today);
  const start = keyOf(fri) < todayK ? todayK : keyOf(fri);
  return [start, keyOf(sun) > start ? keyOf(sun) : keyOf(new Date(sun.getTime() + 86_400_000))];
}

const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, "easeInEaseOut", "opacity"));

export function SearchSheet({ visible, initial, startStep, onClose, onApply }: {
  visible: boolean;
  initial: SearchQuery;
  startStep: SearchStep;
  onClose: () => void;
  onApply: (q: SearchQuery) => void;
}) {
  const [q, setQ] = useState<SearchQuery>(initial);
  const [step, setStepRaw] = useState<SearchStep>(startStep);
  const setStep = (s: SearchStep) => { animate(); setStepRaw(s); };
  const set = (patch: Partial<SearchQuery>) => setQ((s) => ({ ...s, ...patch }));

  // Start from the current search each time the sheet opens.
  useEffect(() => { if (visible) { setQ(initial); setStepRaw(startStep); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const [count, setCount] = useState<number | null>(null);
  const qs = queryString(q, { limit: "100" });
  useEffect(() => {
    if (!visible) return;
    let live = true;
    const h = setTimeout(() => {
      api<unknown[]>(`/api/listings?${qs}`)
        .then((r) => { if (live) setCount(Array.isArray(r) ? r.length : null); })
        .catch(() => { if (live) setCount(null); });
    }, 350);
    return () => { live = false; clearTimeout(h); };
  }, [qs, visible]);

  const apply = () => {
    if (q.where.trim()) recentPlaces = [q.where.trim(), ...recentPlaces.filter((p) => p.toLowerCase() !== q.where.trim().toLowerCase())].slice(0, 4);
    onApply(q);
  };
  const label = count === null ? "Search" : count === 0 ? "No stays match" : `Show ${count >= 100 ? "100+" : count} stay${count === 1 ? "" : "s"}`;
  const nFilters = filterCount(q);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.top}>
          <TouchableOpacity onPress={onClose} style={s.close} accessibilityLabel="Close search" hitSlop={8}>
            <Ionicons name="close" size={20} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={s.topTitle}>FIND A STAY</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <StepCard open={step === "where"} onOpen={() => setStep("where")} title="Where to?" label="Where" summary={q.where || "Anywhere"}>
              <WherePanel value={q.where} onChange={(v) => set({ where: v })} onPick={(v) => { set({ where: v }); setStep("when"); }} />
            </StepCard>
            <StepCard open={step === "when"} onOpen={() => setStep("when")} title="When's your trip?" label="When" summary={datesSummary(q)}>
              <WhenPanel q={q} set={set} onDone={() => setStep("who")} />
            </StepCard>
            <StepCard open={step === "who"} onOpen={() => setStep("who")} title="Who's coming?" label="Who" summary={guestsSummary(q.guests)}>
              <View style={s.whoRow}>
                <View>
                  <Text style={s.whoTitle}>Guests</Text>
                  <Text style={s.whoSub}>Adults and children</Text>
                </View>
                <View style={s.stepper}>
                  <RoundBtn icon="remove" label="Fewer guests" disabled={q.guests <= 1} onPress={() => set({ guests: Math.max(1, q.guests - 1) })} />
                  <Text style={s.stepVal}>{q.guests}</Text>
                  <RoundBtn icon="add" label="More guests" disabled={q.guests >= 16} onPress={() => set({ guests: Math.min(16, q.guests + 1) })} />
                </View>
              </View>
            </StepCard>
            <StepCard open={step === "filters"} onOpen={() => setStep("filters")} title="Filters" label="Filters"
                      summary={nFilters ? `${nFilters} selected` : "Price, setting, must-haves"} muted={!nFilters}>
              <FiltersPanel q={q} set={set} />
            </StepCard>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={() => setQ({ ...EMPTY_QUERY })} hitSlop={8}>
              <Text style={s.clear}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={apply} style={[s.go, count === 0 && s.goEmpty]} testID="search-apply" accessibilityRole="button">
              <Ionicons name="search" size={17} color={Colors.paper} />
              <Text style={s.goLabel}>{label}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function StepCard({ open, onOpen, title, label, summary, muted, children }: {
  open: boolean; onOpen: () => void; title: string; label: string; summary: string; muted?: boolean; children: React.ReactNode;
}) {
  if (!open) {
    return (
      <TouchableOpacity style={s.folded} onPress={onOpen} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${label}: ${summary}`}>
        <Text style={s.foldedLabel}>{label}</Text>
        <Text style={[s.foldedValue, muted && { color: Colors.charcoal3 }]} numberOfLines={1}>{summary}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

function RoundBtn({ icon, label, onPress, disabled }: { icon: "add" | "remove"; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityLabel={label}
                      style={[s.round, disabled && { opacity: 0.3 }]}>
      <Ionicons name={icon} size={18} color={Colors.charcoal} />
    </TouchableOpacity>
  );
}

function Row({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
      <View style={s.rowIcon}><Ionicons name={icon} size={20} color={Colors.charcoal2} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={s.rowSub} numberOfLines={1}>{sub}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function WherePanel({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (v: string) => void }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [hub, setHub] = useState(lastHub);
  const q = value.trim();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!q) { setItems([]); return; }
    const lq = q.toLowerCase();
    const local = ALL_LOCAL_DESTINATIONS.filter((d) => d.label.toLowerCase().includes(lq) || d.sub.toLowerCase().includes(lq))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(lq)) - Number(a.label.toLowerCase().startsWith(lq)));
    setItems(local.slice(0, 8));
    let live = true;
    const h = setTimeout(async () => {
      try {
        const r = await api<{ suggestions: Suggestion[] }>(`/api/listings/suggest?q=${encodeURIComponent(q)}`);
        const merged = [...(r.suggestions || [])];
        for (const l of local) if (!merged.some((m) => m.value.toLowerCase() === l.value.toLowerCase())) merged.push(l);
        if (live) setItems(merged.slice(0, 8));
      } catch { /* keep local matches */ }
    }, 200);
    return () => { live = false; clearTimeout(h); };
  }, [q]);

  return (
    <View>
      <View style={s.input}>
        <Ionicons name="search" size={18} color={Colors.charcoal2} />
        <TextInput ref={inputRef} value={value} onChangeText={onChange} placeholder="Search a place or a stay"
                   placeholderTextColor={Colors.charcoal3} style={s.inputText} autoFocus returnKeyType="next"
                   onSubmitEditing={() => q && onPick(q)} accessibilityLabel="Destination" />
        {!!value && (
          <TouchableOpacity onPress={() => { onChange(""); inputRef.current?.focus(); }} hitSlop={8} accessibilityLabel="Clear destination">
            <Ionicons name="close-circle" size={20} color={Colors.charcoal3} />
          </TouchableOpacity>
        )}
      </View>

      {q ? (
        <View style={{ marginTop: 8 }}>
          {items.map((it, i) => (
            <Row key={`${it.kind}-${it.value}-${i}`} icon={it.kind === "listing" ? "home-outline" : "location-outline"}
                 title={it.label} sub={it.kind === "listing" ? `Stay · ${it.sub}` : it.sub} onPress={() => onPick(it.value)} />
          ))}
          <Row icon="search-outline" title={`Search “${q}”`} sub="Everything that matches" onPress={() => onPick(q)} />
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {recentPlaces.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={s.kicker}>RECENT</Text>
              {recentPlaces.map((p) => <Row key={p} icon="time-outline" title={p} onPress={() => onPick(p)} />)}
            </View>
          )}
          <View style={s.hubHead}>
            <Text style={s.kicker}>WEEKEND TRIPS</Text>
            <View style={s.hubs}>
              {HUBS.map((h) => (
                <TouchableOpacity key={h} onPress={() => { lastHub = h; setHub(h); }}
                                  style={[s.hub, h === hub && s.hubOn]} accessibilityState={{ selected: h === hub }}>
                  <Text style={[s.hubLabel, h === hub && { color: Colors.charcoal }]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {WEEKEND_GETAWAYS[hub].map((g) => (
            <Row key={g.name} icon="location-outline" title={g.name} sub={`${g.hours} from ${hub}`} onPress={() => onPick(g.name)} />
          ))}
          <Row icon="compass-outline" title="Anywhere in India" sub="Browse every stay" onPress={() => onPick("")} />
        </View>
      )}
    </View>
  );
}

function WhenPanel({ q, set, onDone }: { q: SearchQuery; set: (p: Partial<SearchQuery>) => void; onDone: () => void }) {
  const [thisWk, nextWk] = useMemo(() => [weekend(0), weekend(1)], []);
  const quick: { label: string; range: [string, string] | null }[] = [
    { label: "This weekend", range: thisWk }, { label: "Next weekend", range: nextWk }, { label: "Any week", range: null },
  ];
  const isOn = (r: [string, string] | null) => (r ? q.checkIn === r[0] && q.checkOut === r[1] : !q.checkIn && !q.checkOut);
  const nights = q.checkIn && q.checkOut
    ? Math.round((new Date(q.checkOut).getTime() - new Date(q.checkIn).getTime()) / 86_400_000) : 0;
  return (
    <View>
      <View style={s.quickRow}>
        {quick.map(({ label, range }) => (
          <TouchableOpacity key={label} style={[s.quick, isOn(range) && s.quickOn]}
                            onPress={() => { set({ checkIn: range?.[0] || "", checkOut: range?.[1] || "" }); if (range) setTimeout(onDone, 250); }}>
            <Text style={[s.quickLabel, isOn(range) && { color: Colors.paper }]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <DateRangeCalendar unavailable={[]} minNights={1} value={{ checkIn: q.checkIn, checkOut: q.checkOut }}
                         onChange={(v) => { set({ checkIn: v.checkIn, checkOut: v.checkOut }); if (v.checkIn && v.checkOut) setTimeout(onDone, 350); }} />
      <Text style={s.whenNote}>
        {nights > 0 ? `${shortDate(q.checkIn)} → ${shortDate(q.checkOut)} · ${nights} night${nights === 1 ? "" : "s"}`
          : q.checkIn ? "Now pick your check-out day" : "Pick check-in, then check-out"}
      </Text>
    </View>
  );
}

function Chip({ on, label, icon, onPress }: { on: boolean; label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
      {icon && <Ionicons name={icon} size={15} color={on ? Colors.paper : Colors.terra} />}
      <Text style={[s.chipLabel, on && { color: Colors.paper }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FiltersPanel({ q, set }: { q: SearchQuery; set: (p: Partial<SearchQuery>) => void }) {
  const preset = (p: { min: string; max: string }) => q.priceMin === p.min && q.priceMax === p.max;
  const isOn = (k: (typeof MUSTS)[number]["key"]) => (k === "instant" ? q.instant : k === "veg" ? q.veg : !!q.rules[k]);
  const toggle = (k: (typeof MUSTS)[number]["key"]) => {
    if (k === "instant") set({ instant: !q.instant });
    else if (k === "veg") set({ veg: !q.veg });
    else set({ rules: { ...q.rules, [k]: !q.rules[k] } });
  };
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={s.kicker}>PRICE PER NIGHT</Text>
        <View style={s.wrap}>
          {PRICE_PRESETS.map((p) => (
            <Chip key={p.label} label={p.label} on={preset(p)}
                  onPress={() => set(preset(p) ? { priceMin: "", priceMax: "" } : { priceMin: p.min, priceMax: p.max })} />
          ))}
        </View>
        <View style={s.priceRow}>
          <View style={s.money}><Text style={s.rupee}>₹</Text>
            <TextInput value={q.priceMin} onChangeText={(t) => set({ priceMin: t.replace(/\D/g, "") })} keyboardType="number-pad"
                       placeholder="Min" placeholderTextColor={Colors.charcoal3} style={s.moneyText} accessibilityLabel="Minimum price" /></View>
          <Text style={{ color: Colors.charcoal3 }}>–</Text>
          <View style={s.money}><Text style={s.rupee}>₹</Text>
            <TextInput value={q.priceMax} onChangeText={(t) => set({ priceMax: t.replace(/\D/g, "") })} keyboardType="number-pad"
                       placeholder="Max" placeholderTextColor={Colors.charcoal3} style={s.moneyText} accessibilityLabel="Maximum price" /></View>
        </View>
      </View>
      <View>
        <Text style={s.kicker}>SETTING</Text>
        <View style={s.wrap}>
          {SCENES.map((sc) => <Chip key={sc.value} label={sc.label} on={q.scene === sc.value} onPress={() => set({ scene: q.scene === sc.value ? null : sc.value })} />)}
        </View>
      </View>
      <View>
        <Text style={s.kicker}>MUST-HAVES</Text>
        <View style={s.wrap}>
          {MUSTS.map((m) => <Chip key={m.key} label={m.label} icon={m.icon} on={isOn(m.key)} onPress={() => toggle(m.key)} />)}
        </View>
      </View>
    </View>
  );
}

const SHEET_BG = "#F7F4EF";
const TILE = "#F1ECE4";
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHEET_BG },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.edge, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 12.5, fontWeight: "800", letterSpacing: 1.8, color: Colors.charcoal3 },
  body: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  folded: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16,
    height: 58, paddingHorizontal: 20, borderRadius: 22, backgroundColor: Colors.paper,
    shadowColor: "#1F2937", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  foldedLabel: { fontSize: 14, fontWeight: "600", color: Colors.charcoal2 },
  foldedValue: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  card: {
    padding: 20, borderRadius: 22, backgroundColor: Colors.paper,
    shadowColor: "#1F2937", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  cardTitle: { fontFamily: Fonts.display, fontSize: 25, color: Colors.charcoal },
  input: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 54, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 2, borderColor: Colors.charcoal, backgroundColor: Colors.paper,
  },
  inputText: { flex: 1, fontSize: 16, fontWeight: "600", color: Colors.charcoal, fontFamily: Fonts.regular },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 7 },
  rowIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: TILE, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  rowSub: { fontSize: 13, color: Colors.charcoal3, marginTop: 1 },
  kicker: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1.2, color: Colors.charcoal3, marginBottom: 8 },
  hubHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  hubs: { flexDirection: "row", padding: 2, borderRadius: 999, backgroundColor: TILE, marginBottom: 8 },
  hub: { paddingHorizontal: 9, height: 28, borderRadius: 999, justifyContent: "center" },
  hubOn: { backgroundColor: Colors.paper, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  hubLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2 },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quick: { flex: 1, height: 40, borderRadius: 999, borderWidth: 1, borderColor: Colors.edge, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  quickOn: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  quickLabel: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal },
  whenNote: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.edge, fontSize: 13.5, fontWeight: "600", color: Colors.charcoal2 },
  whoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  whoTitle: { fontSize: 16, fontWeight: "700", color: Colors.charcoal },
  whoSub: { fontSize: 13, color: Colors.charcoal3, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepVal: { width: 24, textAlign: "center", fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.edge, alignItems: "center", justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper },
  chipOn: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  chipLabel: { fontSize: 13.5, fontWeight: "700", color: Colors.charcoal },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  money: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.edge, backgroundColor: Colors.paper },
  rupee: { fontWeight: "700", color: Colors.charcoal3 },
  moneyText: { flex: 1, fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.paper, borderTopWidth: 1, borderTopColor: Colors.edge,
  },
  clear: { fontSize: 14, fontWeight: "700", color: Colors.charcoal, textDecorationLine: "underline" },
  go: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingLeft: 20, paddingRight: 24, borderRadius: 999, backgroundColor: Colors.terra },
  goEmpty: { backgroundColor: Colors.charcoal2 },
  goLabel: { color: Colors.paper, fontSize: 15, fontWeight: "800" },
});
