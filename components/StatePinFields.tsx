import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";

// The property's state and PIN code (same as the website's StatePinFields).
// The state sets the GST on every stay, so the PIN is checked against India
// Post's directory as the host types it: a PIN in one state picks it; a PIN
// that disagrees says so.

type StateRow = { code: string; name: string; kind: string };
type PinInfo = { pincode: string; states: string[]; district: string; checked: boolean; found: boolean | null };

let statesCache: StateRow[] | null = null;

export function useStates() {
  const [states, setStates] = useState<StateRow[]>(statesCache || []);
  useEffect(() => {
    if (statesCache) return;
    api<StateRow[]>("/api/geo/states").then((s) => { statesCache = s; setStates(s); }).catch(() => {});
  }, []);
  return states;
}

export function StatePinFields({ stateCode, pincode, onChange, inputStyle, labelStyle }: {
  stateCode: string;
  pincode: string;
  onChange: (v: { state_code: string; pincode: string }) => void;
  inputStyle: any;
  labelStyle: any;
}) {
  const states = useStates();
  const nameOf = (c: string) => states.find((s) => s.code === c)?.name || c;
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [info, setInfo] = useState<PinInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const latest = useRef("");

  useEffect(() => {
    const pin = pincode.trim();
    latest.current = pin;
    setInfo(null); setLookupErr(null);
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    setChecking(true);
    api<PinInfo>(`/api/geo/pincode/${pin}`)
      .then((r) => {
        if (latest.current !== pin) return;
        setInfo(r);
        if (r.checked && r.states.length === 1 && !stateCode) onChange({ state_code: r.states[0], pincode: pin });
      })
      .catch((e) => { if (latest.current === pin) setLookupErr(e.message); })
      .finally(() => { if (latest.current === pin) setChecking(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode]);

  const pin = pincode.trim();
  const mismatch = info && stateCode && !info.states.includes(stateCode);
  let note: React.ReactNode = "Six digits, from the property's postal address. Guests don't see it.";
  let tone = Colors.charcoal3;
  if (pin.length === 6 && !/^[1-9]/.test(pin)) { note = "A PIN code doesn't start with 0."; tone = Colors.error; }
  else if (checking) note = `Checking ${pin}…`;
  else if (lookupErr) { note = lookupErr; tone = Colors.error; }
  else if (info && mismatch) {
    tone = Colors.error;
    const where = info.states.map(nameOf).join(" or ");
    note = (
      <>
        {info.checked ? `PIN ${info.pincode} is in ${where}` : `PIN ${info.pincode} looks like ${where}`}, not {nameOf(stateCode)}.
        {info.states.length === 1 && (
          <Text style={styles.fix} onPress={() => onChange({ state_code: info.states[0], pincode: info.pincode })}>
            {"  "}Use {nameOf(info.states[0])}
          </Text>
        )}
      </>
    );
  } else if (info?.checked) {
    tone = Colors.success;
    note = `✓ ${info.pincode} is in ${info.district ? `${info.district}, ` : ""}${info.states.map(nameOf).join(" / ")}`;
  } else if (info) {
    note = "We couldn't reach India Post's directory just now. We'll confirm this PIN later; you can carry on.";
  }

  const shown = states.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <View style={styles.field}>
        <Text style={labelStyle}>State / union territory</Text>
        <TouchableOpacity onPress={() => setPicking(true)} style={[inputStyle, styles.select]} testID="state-picker"
                          accessibilityRole="button" accessibilityLabel={`State: ${stateCode ? nameOf(stateCode) : "not chosen"}`}>
          <Text style={[styles.selectText, !stateCode && { color: Colors.charcoal3 }]}>
            {stateCode ? nameOf(stateCode) : "Choose…"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.charcoal2} />
        </TouchableOpacity>
        <Text style={styles.note}>GST on your bookings depends on the state.</Text>
      </View>
      <View style={styles.field}>
        <Text style={labelStyle}>PIN code</Text>
        <TextInput value={pincode} onChangeText={(t) => onChange({ state_code: stateCode, pincode: t.replace(/\D/g, "").slice(0, 6) })}
                   keyboardType="number-pad" maxLength={6} placeholder="e.g. 122002" placeholderTextColor={Colors.charcoal3}
                   autoComplete="postal-code" textContentType="postalCode" style={inputStyle} testID="pincode-input" />
        <Text style={[styles.note, { color: tone }]} accessibilityLiveRegion="polite">{note}</Text>
      </View>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>State / union territory</Text>
              <TouchableOpacity onPress={() => setPicking(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor={Colors.charcoal3}
                       style={[inputStyle, { marginBottom: 8 }]} autoCorrect={false} />
            <FlatList data={shown} keyExtractor={(s) => s.code} keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.option} onPress={() => {
                          onChange({ state_code: item.code, pincode }); setPicking(false); setSearch("");
                        }}>
                          <Text style={[styles.optionText, item.code === stateCode && { color: Colors.terra }]}>{item.name}</Text>
                          {item.code === stateCode && <Ionicons name="checkmark" size={18} color={Colors.terra} />}
                        </TouchableOpacity>
                      )} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { fontSize: 15, color: Colors.charcoal, fontWeight: "600" },
  note: { fontSize: 12, color: Colors.charcoal3, marginTop: 6, lineHeight: 17 },
  fix: { fontWeight: "800", textDecorationLine: "underline", color: Colors.terra },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16,
           maxHeight: "80%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800", color: Colors.charcoal },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13,
            borderBottomWidth: 1, borderBottomColor: Colors.edge },
  optionText: { fontSize: 15, fontWeight: "600", color: Colors.charcoal },
});
