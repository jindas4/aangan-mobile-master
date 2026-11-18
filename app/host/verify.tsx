// Host verification, one step per screen, like the new-listing flow
// (app/host/new.tsx; same as the website's components/HostVerifyFlow.tsx).
// Steps come from the server (phone, email, Aadhaar, PAN, payout), then GST and
// a review. Steps don't depend on each other: any segment of the bar opens its
// step, and a step can be left for later. Opens on the first one still to do.
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { api, VerificationStatus } from "@/lib/api";
import { Button } from "@/components/Button";
import { StepBody, type VerifyStep } from "@/components/VerifyWizard";
import { HostGst } from "@/components/HostGst";

const COPY: Record<string, { label: string; title: string; why: string }> = {
  phone:   { label: "Phone",   title: "Your mobile number",   why: "Guests and booking alerts, including WhatsApp alerts, reach you on this number." },
  email:   { label: "Email",   title: "Your email address",   why: "Booking confirmations, invoices and payout statements are sent here." },
  aadhaar: { label: "Aadhaar", title: "Verify your identity", why: "One Aadhaar check, so guests know a real, verified person is hosting them." },
  pan:     { label: "PAN",     title: "Your PAN",             why: "Not needed to publish, but we need it before we can pay you. It also decides how much TDS is deducted." },
  payout:  { label: "Payout",  title: "Where we pay you",     why: "Your earnings from each stay go to this UPI ID or bank account." },
  gst:     { label: "GST",     title: "GST",                  why: "Two quick questions decide who invoices your guests. Most homestays are well under the limit, and then we take care of GST." },
  review:  { label: "Review",  title: "",                     why: "" },
};

type Item = { key: string; required: boolean; done: boolean; step?: VerifyStep };

export default function HostVerifyScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const params = useLocalSearchParams<{ step?: string }>();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [gstDone, setGstDone] = useState<boolean | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(() => api<VerificationStatus>("/api/me/account/verification")
    .then((s) => { setStatus(s); return s; }).catch(() => null), []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => {
    if (!user) return;
    api<{ answered: boolean; turnover_current: boolean }>("/api/kyc/gst")
      .then((p) => setGstDone(p.answered && p.turnover_current)).catch(() => setGstDone(false));
  }, [user]);

  useEffect(() => { if (!user) router.replace("/login"); }, [user, router]);

  const items: Item[] = status ? [
    ...status.steps.map((s) => ({ key: s.key, required: s.required, step: s,
      done: s.done && s.status !== "rejected" && s.status !== "confirm" })),
    // GST only once they're a host (as before): it's about their stays.
    ...(status.role === "host" ? [{ key: "gst", required: true, done: !!gstDone }] : []),
    { key: "review", required: false, done: false },
  ] : [];

  // Where to start: ?step=gst (from a nudge), else the first step still to do.
  useEffect(() => {
    if (!status || gstDone === null || at) return;
    const first = items.find((i) => i.key !== "review" && !i.done && i.required) ?? items.find((i) => i.key !== "review" && !i.done);
    setAt(params.step && items.some((i) => i.key === params.step) ? params.step : first?.key ?? "review");
  }, [status, gstDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (key: string) => { setAt(key); scrollRef.current?.scrollTo({ y: 0, animated: false }); };

  if (!user) return null;
  if (!status || !at) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator style={{ marginTop: 64 }} color={Colors.terra} /></SafeAreaView>;
  }

  const idx = Math.max(0, items.findIndex((i) => i.key === at));
  const cur = items[idx];
  const work = items.filter((i) => i.key !== "review");
  const required = work.filter((i) => i.required);
  const doneRequired = required.filter((i) => i.done).length;
  const ready = doneRequired === required.length;
  const next = () => go(items[Math.min(idx + 1, items.length - 1)].key);
  const finished = async () => { await load(); next(); };
  const C = COPY[cur.key] ?? { label: cur.key, title: cur.step?.label ?? cur.key, why: "" };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (idx > 0 ? go(items[idx - 1].key) : router.back())} style={styles.backBtn}
                          accessibilityLabel={idx > 0 ? "Back" : "Close"}>
          <Ionicons name={idx > 0 ? "chevron-back" : "close"} size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} testID="host-verify-header">
          {COPY[cur.key]?.label ?? cur.key} · {idx + 1} of {items.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: items.length, now: idx + 1 }}>
        {items.map((it, i) => (
          <TouchableOpacity key={it.key} style={{ flex: 1, paddingVertical: 6 }} disabled={i === idx} onPress={() => go(it.key)}
                            accessibilityLabel={`Step ${i + 1}: ${COPY[it.key]?.label ?? it.key}${it.done ? ", done" : ""}`}>
            <View style={[styles.seg, it.done && { backgroundColor: Colors.terra }, i === idx && { backgroundColor: Colors.terraDeep }]} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.count}>{doneRequired} of {required.length} required done</Text>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {cur.key === "review" ? (
            <Review items={work} ready={ready} onEdit={go} />
          ) : (
            <View key={cur.key}>
              <Text style={styles.title}>{C.title}</Text>
              {!cur.required && <Text style={styles.badge}>{cur.key === "pan" ? "NEEDED BEFORE PAYOUTS" : "OPTIONAL"}</Text>}
              <Text style={styles.why}>{C.why}</Text>
              {cur.key === "gst"
                ? <HostGst embedded onStatus={setGstDone} />
                : cur.step && <StepBody step={cur.step} onDone={finished} />}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.footer}>
          {cur.key === "review" ? (
            <Button title={ready ? "Go to host studio" : "Finish later"} size="lg" style={{ flex: 1 }}
                    onPress={() => (router.canGoBack() ? router.back() : router.replace("/host"))} />
          ) : cur.done ? (
            <Button title={idx === items.length - 2 ? "Review" : "Next"} size="lg" style={{ flex: 1 }} onPress={next} />
          ) : (
            <Button title={cur.required ? "Do this later" : "Skip for now"} variant="outline" size="lg" style={{ flex: 1 }} onPress={next} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Review({ items, ready, onEdit }: { items: Item[]; ready: boolean; onEdit: (key: string) => void }) {
  const left = items.filter((i) => i.required && !i.done);
  return (
    <View>
      <Text style={styles.title}>{ready ? "You're all set to publish" : "Almost there"}</Text>
      <Text style={styles.why}>
        {ready
          ? "Every required step is done. You can come back any time to change your payout account or update GST."
          : `${left.length} required step${left.length === 1 ? "" : "s"} left before your listings can go live: ${left.map((i) => COPY[i.key]?.label ?? i.key).join(", ")}.`}
      </Text>
      <View style={styles.card}>
        {items.map((it, i) => {
          const pending = it.step?.status === "pending";
          return (
            <TouchableOpacity key={it.key} onPress={() => onEdit(it.key)} activeOpacity={0.7}
                              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.edge }]}>
              <Ionicons name={it.done ? (pending ? "time" : "checkmark-circle") : "ellipse-outline"} size={24}
                        color={it.done ? (pending ? Colors.terra : Colors.success) : Colors.charcoal3} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{COPY[it.key]?.title ?? it.key}</Text>
                <Text style={styles.rowSub}>
                  {it.done ? (pending ? "Saved, pending our review" : it.step?.detail || "Done")
                    : it.required ? "Required to publish" : it.key === "pan" ? "Needed before payouts" : "Optional"}
                </Text>
              </View>
              <Text style={styles.link}>{it.done ? "View" : "Start"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, backgroundColor: Colors.cream },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "800", color: Colors.charcoal2, letterSpacing: 0.3 },
  progress: { flexDirection: "row", gap: 4, paddingHorizontal: 16 },
  seg: { height: 5, borderRadius: 3, backgroundColor: Colors.edge },
  count: { fontSize: 11.5, fontWeight: "700", color: Colors.charcoal3, textAlign: "right", paddingHorizontal: 16, marginTop: 2 },
  body: { padding: 16, paddingTop: 12 },
  title: { fontFamily: "Fraunces", fontSize: 28, lineHeight: 33, color: Colors.charcoal, letterSpacing: -0.4 },
  badge: { alignSelf: "flex-start", marginTop: 8, fontSize: 10.5, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3,
           borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  why: { fontSize: 14, lineHeight: 20, color: Colors.charcoal2, marginTop: 6, marginBottom: 20 },
  card: { borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.lg, backgroundColor: Colors.paper },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  rowSub: { fontSize: 12.5, color: Colors.charcoal3, marginTop: 2 },
  link: { fontSize: 13.5, fontWeight: "800", color: Colors.terraDeep, textDecorationLine: "underline" },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10,
            borderTopWidth: 1, borderTopColor: Colors.edge, backgroundColor: Colors.paper },
});
