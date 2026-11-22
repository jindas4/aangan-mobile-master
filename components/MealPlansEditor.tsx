// Meal plans a host offers, each priced per guest per night (backend
// services/meal_plans.py; same rules as the website's MealPlansEditor).
// Room only is the nightly price and is always offered — unless a plan is
// included at ₹0, which then replaces it.
import { View, Text, StyleSheet, Switch, TextInput } from "react-native";
import { Colors } from "@/constants/Colors";
import { inr } from "@/lib/format";
import { mealPlanName, PRICED_MEAL_CODES, type PricedMealCode } from "@/lib/mealPlans";
import type { MealPlanOption } from "@/lib/api";

export type MealPlansValue = Record<PricedMealCode, { on: boolean; price: string }>;

export const EMPTY_MEAL_PLANS: MealPlansValue = {
  CP: { on: false, price: "" }, MAP: { on: false, price: "" }, AP: { on: false, price: "" },
};

const HELP: Record<PricedMealCode, string> = {
  CP: "Morning breakfast for each guest.",
  MAP: "Breakfast and one more meal: lunch or dinner.",
  AP: "Breakfast, lunch and dinner.",
};

export function mealPlansFromOptions(options?: MealPlanOption[] | null): MealPlansValue {
  const v: MealPlansValue = {
    CP: { ...EMPTY_MEAL_PLANS.CP }, MAP: { ...EMPTY_MEAL_PLANS.MAP }, AP: { ...EMPTY_MEAL_PLANS.AP },
  };
  for (const o of options ?? []) {
    if ((PRICED_MEAL_CODES as readonly string[]).includes(o.code)) {
      v[o.code as PricedMealCode] = { on: true, price: String(o.rate_inr) };
    }
  }
  return v;
}

/** What the API takes: {CP: 350, …} for the plans switched on ({} = room only). */
export function mealPlansPayload(v: MealPlansValue): Partial<Record<PricedMealCode, number>> {
  const out: Partial<Record<PricedMealCode, number>> = {};
  for (const code of PRICED_MEAL_CODES) {
    if (v[code].on) out[code] = Math.max(0, parseInt(v[code].price, 10) || 0);
  }
  return out;
}

export function mealPlansError(v: MealPlansValue): string | null {
  for (const code of PRICED_MEAL_CODES) {
    const { on, price } = v[code];
    if (!on) continue;
    if (price.trim() === "") return `Enter a price for "${mealPlanName(code)}", or 0 if it's included.`;
    const n = Number(price);
    if (!Number.isInteger(n) || n < 0 || n > 20000) {
      return `The price for "${mealPlanName(code)}" must be whole rupees between ₹0 and ₹20,000.`;
    }
  }
  return null;
}

export function mealPlansSummary(v: MealPlansValue): string {
  const p = mealPlansPayload(v);
  const parts = PRICED_MEAL_CODES.filter((c) => c in p).map((c) =>
    `${mealPlanName(c)} ${p[c] ? `+${inr(p[c]!)}` : "(included)"}`);
  if (!parts.length) return "Room only";
  const roomOnly = !Object.values(p).some((x) => x === 0);
  return [roomOnly ? "Room only" : null, ...parts].filter(Boolean).join(" · ");
}

export function MealPlansEditor({ value, onChange }: { value: MealPlansValue; onChange: (v: MealPlansValue) => void }) {
  const set = (code: PricedMealCode, patch: Partial<{ on: boolean; price: string }>) =>
    onChange({ ...value, [code]: { ...value[code], ...patch } });
  const included = PRICED_MEAL_CODES.some((c) => value[c].on && value[c].price.trim() !== "" && Number(value[c].price) === 0);
  const err = mealPlansError(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.help}>
        Guests choose a plan when they book. Prices are per guest, per night, on top of your nightly price. They're
        part of your earnings, and GST and our fee apply as on the room.
      </Text>
      {PRICED_MEAL_CODES.map((code) => (
        <View key={code} style={[styles.plan, value[code].on && styles.planOn]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{mealPlanName(code)} <Text style={styles.code}>({code})</Text></Text>
              <Text style={styles.sub}>{HELP[code]}</Text>
            </View>
            <Switch value={value[code].on} onValueChange={(on) => set(code, { on })}
                    accessibilityLabel={`Offer ${mealPlanName(code)}`}
                    trackColor={{ true: Colors.aanganDeep, false: Colors.edgeStrong }} />
          </View>
          {value[code].on && (
            <View style={styles.priceRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput value={value[code].price} keyboardType="number-pad" placeholder="e.g. 350"
                         placeholderTextColor={Colors.charcoal3}
                         accessibilityLabel={`${mealPlanName(code)} price per guest per night`}
                         onChangeText={(t) => set(code, { price: t.replace(/\D/g, "") })} style={styles.input} />
              <Text style={styles.sub}>per guest per night · 0 = included</Text>
            </View>
          )}
        </View>
      ))}
      {included && <Text style={styles.help}>A plan at ₹0 is included in your nightly price, so guests can't book room only.</Text>}
      {err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  help: { fontSize: 12.5, color: Colors.charcoal2, lineHeight: 18 },
  plan: { borderWidth: 1, borderColor: Colors.line, borderRadius: 12, padding: 12, backgroundColor: Colors.paper },
  planOn: { borderColor: Colors.aanganSoft, backgroundColor: Colors.terraTint },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  code: { fontWeight: "500", color: Colors.charcoal3 },
  sub: { fontSize: 12, color: Colors.charcoal3, flexShrink: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  rupee: { fontSize: 14, fontWeight: "700", color: Colors.charcoal2 },
  input: {
    width: 96, borderWidth: 1, borderColor: Colors.edgeStrong, borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 15, fontWeight: "600", color: Colors.charcoal, backgroundColor: Colors.paper,
  },
  err: { fontSize: 12.5, fontWeight: "700", color: Colors.error },
});
