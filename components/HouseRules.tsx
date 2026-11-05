// House rules a guest should know before paying, so nobody is turned away at
// the door. The editor is used when a host creates or edits a listing; the
// list is shown on the listing. true = welcome/allowed, false = not, null =
// the host has not said.
//
// Couples, local ID and alcohol are columns on the listing; pets is a flag;
// everything else lives in `house_rules` (backend services/house_rules.py —
// keep the wording here in step with its lines(), and with the website's
// components/HouseRules.tsx).
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput } from "react-native";
import { Colors } from "@/constants/Colors";
import { fmtTime } from "@/lib/format";

export type Rule = boolean | null;
export type Smoking = "yes" | "outside" | "no";
export interface HouseRulesExtra {
  children_ok?: boolean | null; foreigners_ok?: boolean | null; min_age?: number | null;
  smoking?: Smoking | null; nonveg_ok?: boolean | null; parties_ok?: boolean | null;
  visitors_ok?: boolean | null; quiet_hours?: string | null; note?: string | null;
}
export interface HouseRulesValue {
  couples_ok: Rule; local_id_ok: Rule; alcohol_ok: Rule; pet_friendly: boolean; house_rules: HouseRulesExtra;
}
export const EMPTY_HOUSE_RULES: HouseRulesValue = { couples_ok: null, local_id_ok: null, alcohol_ok: null, pet_friendly: false, house_rules: {} };

type ColumnKey = "couples_ok" | "local_id_ok" | "alcohol_ok";
type ExtraBoolKey = "children_ok" | "foreigners_ok" | "nonveg_ok" | "parties_ok" | "visitors_ok";
interface TriRule { key: ColumnKey | ExtraBoolKey; column: boolean; label: string; help?: string;
  yesLabel: string; noLabel: string; yes: string; no: string }

const WHO: TriRule[] = [
  { key: "couples_ok", column: true, label: "Unmarried couples", yesLabel: "Welcome", noLabel: "Not allowed",
    yes: "Unmarried couples welcome", no: "Married couples and families only" },
  { key: "local_id_ok", column: true, label: "Guests with ID from the same city", yesLabel: "Accepted", noLabel: "Not accepted",
    yes: "Local ID accepted", no: "Guests with an ID from this city are not accepted" },
  { key: "children_ok", column: false, label: "Children", yesLabel: "Welcome", noLabel: "Not suitable",
    yes: "Children welcome", no: "Not suitable for children" },
  { key: "foreigners_ok", column: false, label: "Foreign nationals", yesLabel: "Welcome", noLabel: "Indian citizens only",
    help: "If you welcome foreign guests you must file Form-C with the local police within 24 hours of their arrival.",
    yes: "Foreign nationals welcome (passport and visa needed at check-in)", no: "Indian citizens only" },
];
const PROPERTY: TriRule[] = [
  { key: "alcohol_ok", column: true, label: "Alcohol", yesLabel: "Allowed", noLabel: "Not allowed",
    yes: "Alcohol allowed", no: "No alcohol on the property" },
  { key: "nonveg_ok", column: false, label: "Non-veg food", yesLabel: "Allowed", noLabel: "Vegetarian only",
    yes: "Non-veg food allowed", no: "Vegetarian food only on the property" },
  { key: "parties_ok", column: false, label: "Parties and events", yesLabel: "Small gatherings OK", noLabel: "No parties",
    yes: "Small gatherings allowed", no: "No parties or events" },
  { key: "visitors_ok", column: false, label: "Outside visitors", yesLabel: "Allowed", noLabel: "Booked guests only",
    yes: "Visitors allowed", no: "No outside visitors — booked guests only" },
];
const SMOKING: Record<Smoking, { label: string; line: string; ok: boolean }> = {
  yes: { label: "Allowed", line: "Smoking allowed", ok: true },
  outside: { label: "Outdoors only", line: "Smoking outdoors only", ok: false },
  no: { label: "No smoking", line: "No smoking", ok: false },
};
const QUIET = ["21:00", "22:00", "22:30", "23:00"];

function value(v: Partial<HouseRulesValue>, r: TriRule): Rule | undefined {
  return r.column ? v[r.key as ColumnKey] : v.house_rules?.[r.key as ExtraBoolKey];
}

/** The rules a host has stated, as lines for guests. Order matches the backend. */
export function houseRuleLines(v: Partial<HouseRulesValue>): { text: string; ok: boolean; note?: boolean }[] {
  const x = v.house_rules || {};
  const out: { text: string; ok: boolean; note?: boolean }[] = [];
  const push = (r: TriRule) => {
    const val = value(v, r);
    if (val === true) out.push({ text: r.yes, ok: true });
    if (val === false) out.push({ text: r.no, ok: false });
  };
  WHO.forEach(push);
  if (x.min_age) out.push({ text: `The main guest must be ${x.min_age} or older`, ok: false });
  push(PROPERTY[0]);
  if (x.smoking && SMOKING[x.smoking]) out.push({ text: SMOKING[x.smoking].line, ok: SMOKING[x.smoking].ok });
  PROPERTY.slice(1).forEach(push);
  if (v.pet_friendly) out.push({ text: "Pets welcome", ok: true });
  if (x.quiet_hours) out.push({ text: `Quiet hours from ${fmtTime(x.quiet_hours, x.quiet_hours)}`, ok: false });
  if (x.note?.trim()) out.push({ text: x.note.trim(), ok: true, note: true });
  return out;
}

export function HouseRulesList({ item }: { item: Partial<HouseRulesValue> & { checkin_time?: string; checkout_time?: string } }) {
  const all = houseRuleLines(item);
  const lines = all.filter((l) => !l.note);
  const note = all.find((l) => l.note);
  // Every listing has check-in / check-out times (default 2 PM / 11 AM).
  const times = [`Check-in from ${fmtTime(item.checkin_time, "2:00 PM")}`, `Check-out by ${fmtTime(item.checkout_time, "11:00 AM")}`];
  return (
    <View>
      {times.map((t) => (
        <View key={t} style={styles.line}>
          <View style={[styles.mark, styles.markOk]}><Text style={styles.markText}>🕑</Text></View>
          <Text style={styles.lineText}>{t}</Text>
        </View>
      ))}
      {lines.map((l) => (
        <View key={l.text} style={styles.line}>
          <View style={[styles.mark, l.ok ? styles.markOk : styles.markNo]}>
            <Text style={[styles.markText, l.ok && styles.markTextOk]}>{l.ok ? "✓" : "✕"}</Text>
          </View>
          <Text style={styles.lineText}>{l.text}</Text>
        </View>
      ))}
      {note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteHead}>MORE FROM THE HOST</Text>
          <Text style={styles.noteText}>{note.text}</Text>
        </View>
      )}
    </View>
  );
}

function Chips<T>({ label, options, current, onPick }: {
  label: string; options: [string, T][]; current: T; onPick: (v: T) => void;
}) {
  return (
    <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(([text, v]) => {
        const on = current === v;
        return (
          <TouchableOpacity key={text} onPress={() => onPick(v)} activeOpacity={0.8}
                            accessibilityRole="radio" accessibilityState={{ selected: on }}
                            style={[styles.opt, on && styles.optOn]}>
            <Text style={[styles.optText, on && styles.optTextOn]}>{text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function HouseRulesEditor({ value: v, onChange }: { value: HouseRulesValue; onChange: (v: HouseRulesValue) => void }) {
  const x = v.house_rules || {};
  const setX = (patch: Partial<HouseRulesExtra>) => onChange({ ...v, house_rules: { ...x, ...patch } });
  const row = (r: TriRule) => {
    const cur = value(v, r) ?? null;
    return (
      <View key={r.key} style={styles.rule}>
        <Text style={styles.ruleLabel}>{r.label}</Text>
        <Chips label={r.label} options={[[r.yesLabel, true], [r.noLabel, false], ["Not stated", null]] as [string, Rule][]}
               current={cur} onPick={(val) => (r.column ? onChange({ ...v, [r.key]: val }) : setX({ [r.key]: val } as Partial<HouseRulesExtra>))} />
        {r.help && cur === true && <Text style={styles.help}>{r.help}</Text>}
      </View>
    );
  };
  return (
    <View>
      <Text style={styles.head}>WHO CAN STAY</Text>
      {WHO.map(row)}
      <View style={styles.rule}>
        <Text style={styles.ruleLabel}>Minimum age of the main guest</Text>
        <Chips label="Minimum age" options={[["Any adult", null], ["18+", 18], ["21+", 21], ["25+", 25]] as [string, number | null][]}
               current={x.min_age ?? null} onPick={(val) => setX({ min_age: val })} />
      </View>

      <Text style={styles.head}>ON THE PROPERTY</Text>
      {row(PROPERTY[0])}
      <View style={styles.rule}>
        <Text style={styles.ruleLabel}>Smoking</Text>
        <Chips label="Smoking"
               options={[...(Object.keys(SMOKING) as Smoking[]).map((k) => [SMOKING[k].label, k] as [string, Smoking | null]), ["Not stated", null]]}
               current={x.smoking ?? null} onPick={(val) => setX({ smoking: val })} />
      </View>
      {PROPERTY.slice(1).map(row)}
      <View style={styles.petRow}>
        <Text style={styles.ruleLabel}>Pets welcome</Text>
        <Switch value={v.pet_friendly} onValueChange={(val) => onChange({ ...v, pet_friendly: val })}
                trackColor={{ true: Colors.terra }} accessibilityLabel="Pets welcome" />
      </View>
      <View style={styles.rule}>
        <Text style={styles.ruleLabel}>Quiet hours from</Text>
        <Chips label="Quiet hours"
               options={[["None", null], ...QUIET.map((t) => [fmtTime(t, t), t] as [string, string | null])]}
               current={x.quiet_hours ?? null} onPick={(val) => setX({ quiet_hours: val })} />
      </View>

      <Text style={styles.head}>ANYTHING ELSE</Text>
      <TextInput value={x.note ?? ""} onChangeText={(t) => setX({ note: t.slice(0, 500) })} multiline maxLength={500}
                 placeholder="e.g. Shoes off inside. The main gate closes at 11 PM."
                 placeholderTextColor={Colors.charcoal3} style={styles.noteInput} accessibilityLabel="Other house rules" />
      <Text style={styles.note}>{(x.note ?? "").length}/500 · Phone numbers and emails here are hidden; guests message you in the app.</Text>
      <Text style={[styles.note, { marginTop: 8 }]}>
        Guests see these before they book, and each booking keeps a copy of the rules it was made under. A guest who meets
        the rules shown can't be turned away.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  mark: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  markOk: { backgroundColor: Colors.warmBg },
  markNo: { backgroundColor: Colors.line },
  markText: { fontSize: 11, fontWeight: "700", color: Colors.charcoal2 },
  markTextOk: { color: Colors.terra },
  lineText: { fontSize: 14.5, color: Colors.charcoal2, flex: 1 },
  noteBox: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.warmBg },
  noteHead: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, color: Colors.charcoal3, marginBottom: 4 },
  noteText: { fontSize: 14, color: Colors.charcoal2, lineHeight: 20 },
  head: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: Colors.charcoal3, marginTop: 6, marginBottom: 8 },
  rule: { marginBottom: 12 },
  ruleLabel: { fontSize: 13.5, fontWeight: "600", color: Colors.charcoal },
  help: { fontSize: 11.5, color: Colors.charcoal3, marginTop: 6, lineHeight: 16 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  opt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  optOn: { backgroundColor: Colors.terra, borderColor: Colors.terra },
  optText: { fontSize: 12.5, fontWeight: "600", color: Colors.charcoal },
  optTextOn: { color: "#fff" },
  petRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  noteInput: { minHeight: 80, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, padding: 12, fontSize: 14,
               color: Colors.charcoal, backgroundColor: Colors.paper, textAlignVertical: "top" },
  note: { fontSize: 11.5, color: Colors.charcoal3, lineHeight: 16, marginTop: 4 },
});

/** The rules a booking was made under (the backend keeps a copy at booking time). */
export function BookingHouseRules({ rules }: { rules?: { text: string; ok: boolean; note?: boolean }[] }) {
  const lines = (rules || []).filter((l) => !/^Check-(in|out) /.test(l.text));
  if (!lines.length) return null;
  return (
    <View>
      {lines.map((l) => (
        <View key={l.text} style={styles.line}>
          <View style={[styles.mark, l.ok ? styles.markOk : styles.markNo]}>
            <Text style={[styles.markText, l.ok && styles.markTextOk]}>{l.note ? "i" : l.ok ? "✓" : "✕"}</Text>
          </View>
          <Text style={styles.lineText}>{l.text}</Text>
        </View>
      ))}
    </View>
  );
}
