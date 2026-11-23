// A host's prices by night: weekday (base) price is the listing's price; this
// edits the weekend price, which nights count as the weekend, and special
// prices for dates (festivals, holidays, seasons). Same rules as the website's
// components/NightPricesEditor.tsx; maths in lib/nightPrices.ts.
//
// `NightPricesEditor` is the form; `HostNightPrices` is the card on the host's
// listing screen that shows and saves it.
import { useState } from "react";
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, type ListingFull } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { inr } from "@/lib/format";
import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import {
  addDays, DAY_SHORT, DEFAULT_WEEKEND_DAYS, holidayPicks, periodDates, periodsError, weekendDaysLabel,
  type PricePeriod,
} from "@/lib/nightPrices";

export interface NightPricesValue {
  weekendOn: boolean;
  weekendPrice: string;
  weekendDays: number[];
  periods: (Omit<PricePeriod, "price_inr"> & { price: string })[];
}

export const EMPTY_NIGHT_PRICES: NightPricesValue = {
  weekendOn: false, weekendPrice: "", weekendDays: [...DEFAULT_WEEKEND_DAYS], periods: [],
};

export function nightPricesFromListing(l: Pick<ListingFull, "weekend_price_inr" | "weekend_days" | "price_periods">): NightPricesValue {
  return {
    weekendOn: !!l.weekend_price_inr,
    weekendPrice: l.weekend_price_inr ? String(l.weekend_price_inr) : "",
    weekendDays: l.weekend_days?.length ? [...l.weekend_days] : [...DEFAULT_WEEKEND_DAYS],
    periods: (l.price_periods || []).map((p) => ({ label: p.label, start_date: p.start_date, end_date: p.end_date, price: String(p.price_inr) })),
  };
}

const toPeriods = (v: NightPricesValue): PricePeriod[] =>
  v.periods.map((p) => ({ label: p.label.trim(), start_date: p.start_date, end_date: p.end_date,
                          price_inr: Math.round(Number(p.price) || 0) }));

export function nightPricesPayload(v: NightPricesValue) {
  return {
    weekend_price_inr: v.weekendOn ? Math.round(Number(v.weekendPrice) || 0) : 0,     // 0 = none
    weekend_days: v.weekendDays,
    price_periods: toPeriods(v),
  };
}

export function nightPricesError(v: NightPricesValue): string | null {
  if (v.weekendOn) {
    const n = Number(v.weekendPrice);
    if (!Number.isInteger(n) || n <= 0) return "Enter the weekend price per night in whole rupees.";
    if (!v.weekendDays.length) return "Choose which nights are the weekend.";
  }
  return periodsError(toPeriods(v));
}

const todayIso = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);   // India

export function NightPricesEditor({ value, onChange, basePrice }: {
  value: NightPricesValue; onChange: (v: NightPricesValue) => void; basePrice?: number;
}) {
  const [picking, setPicking] = useState<number | null>(null);     // which special price's dates are being chosen
  const set = (patch: Partial<NightPricesValue>) => onChange({ ...value, ...patch });
  const setPeriod = (i: number, patch: Partial<NightPricesValue["periods"][number]>) =>
    set({ periods: value.periods.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const toggleDay = (d: number) => set({
    weekendDays: value.weekendDays.includes(d) ? value.weekendDays.filter((x) => x !== d) : [...value.weekendDays, d].sort(),
  });
  const today = todayIso();
  const picks = holidayPicks(today).filter((h) => !value.periods.some((p) => p.label === h.label && p.start_date === h.start_date));
  const addPeriod = (p?: { label: string; start_date: string; end_date: string }) => {
    const next = [...value.periods, { label: p?.label ?? "", start_date: p?.start_date ?? "", end_date: p?.end_date ?? "",
                                      price: basePrice ? String(Math.round(basePrice * 1.3)) : "" }];
    set({ periods: next });
    if (!p) setPicking(next.length - 1);
  };
  const err = nightPricesError(value);
  const editing = picking !== null ? value.periods[picking] : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.box, value.weekendOn && styles.boxOn]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boxTitle}>A different price at weekends</Text>
            <Text style={styles.help}>
              {basePrice ? `Weeknights stay at ${inr(basePrice)}. ` : ""}Most homes charge more on Friday and Saturday nights.
            </Text>
          </View>
          <Switch value={value.weekendOn} onValueChange={(on) => set({ weekendOn: on })}
                  trackColor={{ true: Colors.terra, false: Colors.edgeStrong }} />
        </View>
        {value.weekendOn && (
          <View style={{ gap: 10, marginTop: 10 }}>
            <View style={styles.priceRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput value={value.weekendPrice} onChangeText={(t) => set({ weekendPrice: t.replace(/[^0-9]/g, "") })}
                         keyboardType="number-pad" placeholder="e.g. 5500" style={styles.input}
                         accessibilityLabel="Weekend price per night" />
              <Text style={styles.help}>per night</Text>
            </View>
            <Text style={styles.label}>Weekend nights</Text>
            <View style={styles.days}>
              {DAY_SHORT.map((d, i) => {
                const on = value.weekendDays.includes(i);
                return (
                  <TouchableOpacity key={d} onPress={() => toggleDay(i)} style={[styles.day, on && styles.dayOn]}
                                    accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.help}>A night is the date guests check in: "Fri" is Friday to Saturday. Now: {weekendDaysLabel(value.weekendDays)}.</Text>
          </View>
        )}
      </View>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Holidays, festivals and seasons</Text>
        <Text style={styles.help}>A price for particular dates: Diwali, Christmas week, long weekends, peak season. It replaces the weekday and weekend price on those nights.</Text>
        {value.periods.map((p, i) => (
          <View key={i} style={styles.period}>
            <TextInput value={p.label} onChangeText={(t) => setPeriod(i, { label: t })} maxLength={60}
                       placeholder="Name, e.g. Diwali" style={[styles.input, { flex: 0 }]} />
            <TouchableOpacity style={styles.dates} onPress={() => setPicking(i)}>
              <Ionicons name="calendar-outline" size={16} color={Colors.terra} />
              <Text style={styles.datesText}>{p.start_date && p.end_date ? periodDates(p) : "Choose dates"}</Text>
            </TouchableOpacity>
            <View style={styles.priceRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput value={p.price} onChangeText={(t) => setPeriod(i, { price: t.replace(/[^0-9]/g, "") })}
                         keyboardType="number-pad" placeholder="per night" style={styles.input} />
              <Text style={styles.help}>per night</Text>
              <TouchableOpacity onPress={() => set({ periods: value.periods.filter((_, j) => j !== i) })}
                                accessibilityLabel={`Remove ${p.label || "this special price"}`} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.add} onPress={() => addPeriod()}>
          <Text style={styles.addText}>+ Add dates</Text>
        </TouchableOpacity>
        {picks.length > 0 && (
          <View style={styles.picks}>
            {picks.map((h) => (
              <TouchableOpacity key={h.label} style={styles.pick} onPress={() => addPeriod(h)}>
                <Text style={styles.pickText}>{h.label} <Text style={{ color: Colors.charcoal3 }}>{periodDates(h)}</Text></Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.help}>Festival dates change every year, so add them with their dates (e.g. Diwali, Holi, Durga Puja).</Text>
      </View>
      {err && <Text style={styles.err}>{err}</Text>}

      <Modal visible={picking !== null} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.boxTitle}>{editing?.label ? `Dates for ${editing.label}` : "Choose the dates"}</Text>
            <Text style={styles.help}>Tap the first night, then the morning guests leave after the last night.</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {editing && picking !== null && (
                <DateRangeCalendar minDate={today} unavailable={[]} minNights={1}
                                   value={{ checkIn: editing.start_date, checkOut: editing.end_date ? addDays(editing.end_date, 1) : "" }}
                                   onChange={(v) => setPeriod(picking, {
                                     start_date: v.checkIn,
                                     end_date: v.checkOut ? addDays(v.checkOut, -1) : v.checkIn,
                                   })} />
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.add, { backgroundColor: Colors.terra, borderColor: Colors.terra }]} onPress={() => setPicking(null)}>
              <Text style={[styles.addText, { color: Colors.paper }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function HostNightPrices({ listing, onSaved }: { listing: ListingFull; onSaved: (l: ListingFull) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<NightPricesValue>(EMPTY_NIGHT_PRICES);
  const [saving, setSaving] = useState(false);
  const periods = listing.price_periods || [];

  const save = async () => {
    const err = nightPricesError(value);
    if (err) { Alert.alert("Check the prices", err); return; }
    setSaving(true);
    try {
      const updated = await api<ListingFull>(`/api/listings/${listing.id}`, { method: "PATCH", body: nightPricesPayload(value) });
      onSaved(updated);
      setEditing(false);
    } catch (e: any) {
      const d = e?.body?.detail;
      Alert.alert("Couldn't save prices", (typeof d === "object" ? d?.message : d) || e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <TouchableOpacity style={styles.summary} activeOpacity={0.8}
                        onPress={() => { setValue(nightPricesFromListing(listing)); setEditing(true); }}>
        <Ionicons name="pricetags-outline" size={20} color={Colors.terra} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Prices by night</Text>
          <Text style={styles.help}>
            Weeknights {inr(listing.price_inr)}
            {listing.weekend_price_inr ? ` · Weekends ${inr(listing.weekend_price_inr)}` : " · same at weekends"}
            {periods.length ? ` · ${periods.length} special price${periods.length === 1 ? "" : "s"}` : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.charcoal3} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Prices by night</Text>
      <NightPricesEditor value={value} onChange={setValue} basePrice={listing.price_inr} />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setEditing(false)} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.paper} /> : <Text style={styles.saveText}>Save prices</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, padding: 12, gap: 6 },
  boxOn: { borderColor: Colors.terraSoft, backgroundColor: Colors.terraTint },
  boxTitle: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  help: { fontSize: 12.5, color: Colors.charcoal2, lineHeight: 18 },
  label: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rupee: { fontSize: 15, fontWeight: "700", color: Colors.charcoal2 },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.edgeStrong, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 15, fontWeight: "600", color: Colors.charcoal, backgroundColor: Colors.paper,
  },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.edgeStrong },
  dayOn: { backgroundColor: Colors.terra, borderColor: Colors.terra },
  dayText: { fontSize: 13, fontWeight: "700", color: Colors.charcoal2 },
  dayTextOn: { color: Colors.paper },
  period: { gap: 8, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.cream, marginTop: 6 },
  dates: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.edgeStrong, backgroundColor: Colors.paper },
  datesText: { fontSize: 14, fontWeight: "600", color: Colors.charcoal },
  add: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.edgeStrong, marginTop: 8 },
  addText: { fontSize: 13.5, fontWeight: "800", color: Colors.terra },
  picks: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pick: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.edge },
  pickText: { fontSize: 12.5, fontWeight: "600", color: Colors.charcoal2 },
  err: { fontSize: 12.5, fontWeight: "700", color: Colors.error },
  sheetWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 34, gap: 8 },
  summary: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper,
  },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  card: { padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: "center" },
  cancel: { borderWidth: 1, borderColor: Colors.edgeStrong },
  cancelText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  saveBtn: { backgroundColor: Colors.terra },
  saveText: { fontSize: 14, fontWeight: "800", color: Colors.paper },
});
