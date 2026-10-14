// Damage claim on a booking, for the host (report, confirm payment) and the
// guest (accept, dispute, pay). Rules live on the server: backend
// services/claims.py and api/routes_claims.py.
import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Linking, Image } from "react-native";
import * as Clipboard from "expo-clipboard";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { inr } from "@/lib/format";
import { Button } from "@/components/Button";
import { PhotoPicker, Photo } from "@/components/PhotoPicker";

interface Claim {
  id: string; booking_id: string; status: "open" | "accepted" | "disputed" | "approved" | "dismissed" | "withdrawn" | "settled";
  no_reply: boolean; description: string; amount_inr: number; photos: string[];
  respond_by: string | null; guest_response: string | null; guest_photos: string[];
  decision: "full" | "partial" | "dismissed" | null; decision_note: string | null;
  owed_inr: number; pay_by: string | null; payment_overdue: boolean;
  guest_paid_at: string | null; settled_at: string | null;
  pay_to: { host_name: string; upi_id: string | null } | null;
}
interface ClaimInfo { can_report: boolean; report_hours: number; response_hours: number; pay_within_days: number; claim: Claim | null }

// Server times are UTC; show them in the reader's own time zone.
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const dayTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

function Photos({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <View style={styles.photos}>
      {urls.map((u) => (
        <TouchableOpacity key={u} onPress={() => Linking.openURL(u)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
          <Image source={{ uri: u }} style={styles.photo} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function DamageClaim({ bookingId, role }: { bookingId: string; role: "host" | "guest" }) {
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [mode, setMode] = useState<"idle" | "report" | "dispute">("idle");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api<ClaimInfo>(`/api/claims/booking/${bookingId}`).then(setInfo).catch(() => setInfo(null));
  }, [bookingId]);
  useEffect(load, [load]);

  const uploaded = photos.filter((p) => p.remoteUrl).map((p) => p.remoteUrl!);
  const uploading = photos.some((p) => p.uploading);

  const act = async (path: string, body?: unknown) => {
    setBusy(true); setErr("");
    try {
      await api(path, { method: "POST", body });
      setMode("idle"); setText(""); setAmount(""); setPhotos([]);
      load();
    } catch (e: any) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (!info) return null;
  const c = info.claim;
  if (!c && !(role === "host" && info.can_report)) return null;
  const errLine = err ? <Text style={styles.err}>{err}</Text> : null;

  if (!c) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Damage after this stay?</Text>
        <Text style={styles.body}>
          You can report it until {info.report_hours} hours after checkout, with photos and what it will cost to put right.
          The guest then has {info.response_hours} hours to accept or dispute it.
        </Text>
        {mode !== "report" ? (
          <Button title="Report damage" variant="outline" full onPress={() => setMode("report")} style={{ marginTop: 12 }} />
        ) : (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Photos of the damage (at least one)</Text>
            <PhotoPicker value={photos} onChange={setPhotos} />
            <Text style={[styles.label, { marginTop: 12 }]}>What happened?</Text>
            <TextInput value={text} onChangeText={setText} multiline maxLength={1500} style={[styles.input, styles.area]}
                       placeholder="What was damaged or missing, and when you found it." placeholderTextColor={Colors.charcoal3} />
            <Text style={[styles.label, { marginTop: 12 }]}>Cost to repair or replace (₹)</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input}
                       placeholder="Based on an estimate or bill" placeholderTextColor={Colors.charcoal3} />
            {errLine}
            <Button title={busy ? "Sending…" : uploading ? "Uploading photos…" : "Send to the guest"} full style={{ marginTop: 12 }}
                    disabled={busy || uploading || !uploaded.length || text.trim().length < 20 || !(parseInt(amount) > 0)}
                    onPress={() => act("/api/claims", { booking_id: bookingId, description: text.trim(), amount_inr: parseInt(amount), photos: uploaded })} />
            <Button title="Cancel" variant="outline" full onPress={() => setMode("idle")} style={{ marginTop: 8 }} />
          </View>
        )}
      </View>
    );
  }

  const owing = (c.status === "accepted" || c.status === "approved") && c.owed_inr > 0;
  const headline: Record<Claim["status"], string> = {
    open: role === "guest" ? "Your host has reported damage" : "Waiting for the guest's reply",
    disputed: "Aangan Stay is reviewing this claim",
    accepted: role === "guest" ? "You accepted this claim" : "The guest accepted your claim",
    approved: "Aangan Stay decided an amount is owed",
    dismissed: "Claim dismissed — nothing is owed",
    withdrawn: "Claim withdrawn — nothing is owed",
    settled: "Paid and closed",
  };

  return (
    <View style={[styles.box, (owing || (c.status === "open" && role === "guest")) && styles.boxOn]}>
      <Text style={styles.kicker}>DAMAGE CLAIM</Text>
      <Text style={styles.title}>{headline[c.status]}</Text>

      <View style={styles.rowBetween}>
        <Text style={styles.body}>{role === "host" ? "You asked for" : "The host asks for"}</Text>
        <Text style={styles.amount}>{inr(c.amount_inr)}</Text>
      </View>
      <Text style={styles.body}>{c.description}</Text>
      <Photos urls={c.photos} />

      {c.guest_response ? (
        <View style={styles.section}>
          <Text style={styles.label}>{role === "guest" ? "Your reply" : "The guest's reply"}</Text>
          <Text style={styles.body}>{c.guest_response}</Text>
          <Photos urls={c.guest_photos} />
        </View>
      ) : null}

      {c.status === "disputed" ? (
        <Text style={[styles.body, { marginTop: 10 }]}>
          {c.no_reply ? "The guest did not reply in time, so " : ""}Aangan Stay is looking at both accounts and will decide.
          You will be told the outcome and the reasons here.
        </Text>
      ) : null}

      {c.decision ? (
        <View style={styles.section}>
          <Text style={styles.label}>Aangan Stay's decision</Text>
          <Text style={styles.body}>
            <Text style={styles.strong}>
              {c.decision === "full" ? "Claim upheld in full. " : c.decision === "partial" ? "Claim upheld in part. " : "Claim dismissed. "}
            </Text>
            {c.decision_note}
          </Text>
        </View>
      ) : null}

      {role === "guest" && c.status === "open" ? (
        <View style={styles.section}>
          <Text style={styles.body}>
            Please reply by <Text style={styles.strong}>{dayTime(c.respond_by)}</Text>. If you do not reply, Aangan Stay reviews the claim without your side of it.
          </Text>
          {mode !== "dispute" ? (
            <>
              <Button title={busy ? "Sending…" : `Accept — I will pay ${inr(c.amount_inr)}`} full disabled={busy} style={{ marginTop: 12 }}
                      onPress={() => act(`/api/claims/${c.id}/respond`, { action: "accept" })} />
              <Button title="Dispute this claim" variant="outline" full onPress={() => setMode("dispute")} style={{ marginTop: 8 }} />
            </>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Why do you disagree?</Text>
              <TextInput value={text} onChangeText={setText} multiline maxLength={1500} style={[styles.input, styles.area]}
                         placeholder="For example: it was already damaged when we arrived, and we told the host that day."
                         placeholderTextColor={Colors.charcoal3} />
              <Text style={[styles.label, { marginTop: 12 }]}>Your photos (optional)</Text>
              <PhotoPicker value={photos} onChange={setPhotos} />
              {errLine}
              <Button title={busy ? "Sending…" : uploading ? "Uploading photos…" : "Send my reply"} full style={{ marginTop: 12 }}
                      disabled={busy || uploading || text.trim().length < 20}
                      onPress={() => act(`/api/claims/${c.id}/respond`, { action: "dispute", response: text.trim(), photos: uploaded })} />
              <Button title="Back" variant="outline" full onPress={() => setMode("idle")} style={{ marginTop: 8 }} />
            </View>
          )}
        </View>
      ) : null}

      {owing ? (
        <View style={styles.owed}>
          <View style={styles.rowBetween}>
            <Text style={styles.body}>Amount owed to the host</Text>
            <Text style={[styles.amount, { fontSize: 17 }]}>{inr(c.owed_inr)}</Text>
          </View>
          {role === "guest" ? (
            <>
              <Text style={styles.body}>
                Pay {c.pay_to?.host_name || "the host"} directly by <Text style={styles.strong}>{day(c.pay_by)}</Text>.
                {c.payment_overdue ? " This is now overdue, and you cannot make new bookings until it is settled." : " After that date you cannot make new bookings until it is settled."}
              </Text>
              {c.pay_to?.upi_id ? (
                <View style={styles.upiRow}>
                  <Text style={[styles.body, { flexShrink: 1 }]}>UPI ID: <Text style={styles.strong}>{c.pay_to.upi_id}</Text></Text>
                  <TouchableOpacity style={styles.copy} accessibilityRole="button"
                                    onPress={async () => { await Clipboard.setStringAsync(c.pay_to!.upi_id!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    <Text style={styles.copyText}>{copied ? "Copied!" : "Copy"}</Text>
                  </TouchableOpacity>
                </View>
              ) : <Text style={styles.body}>Message the host in the app for their payment details.</Text>}
              <Button title={c.guest_paid_at ? `Marked as paid on ${day(c.guest_paid_at)}` : busy ? "Sending…" : "I have paid"} full
                      disabled={busy || !!c.guest_paid_at} onPress={() => act(`/api/claims/${c.id}/paid`)} style={{ marginTop: 10 }} />
              {c.guest_paid_at ? <Text style={[styles.body, { marginTop: 6 }]}>Waiting for the host to confirm they received it.</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.body}>
                The guest pays you directly{c.pay_by ? ` by ${day(c.pay_by)}` : ""}. {c.guest_paid_at ? `They marked it as paid on ${day(c.guest_paid_at)}.` : "They have not marked it as paid yet."}
              </Text>
              <Button title={busy ? "Sending…" : "I have received the payment"} full disabled={busy}
                      onPress={() => act(`/api/claims/${c.id}/received`)} style={{ marginTop: 10 }} />
            </>
          )}
        </View>
      ) : null}

      {errLine}

      {role === "host" && (c.status === "open" || c.status === "disputed" || owing) ? (
        <TouchableOpacity disabled={busy} onPress={() => act(`/api/claims/${c.id}/withdraw`)} accessibilityRole="button" style={{ marginTop: 12 }}>
          <Text style={styles.link}>Withdraw the claim</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  boxOn: { borderColor: Colors.terra },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: Colors.terra, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  body: { fontSize: 13.5, lineHeight: 19, color: Colors.charcoal2, marginTop: 6 },
  strong: { fontWeight: "700", color: Colors.charcoal },
  label: { fontSize: 12, fontWeight: "700", color: Colors.charcoal3 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 8 },
  amount: { fontSize: 15, fontWeight: "800", color: Colors.charcoal, fontVariant: ["tabular-nums"], marginTop: 6 },
  section: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.line },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  photo: { width: 76, height: 76, borderRadius: 10, backgroundColor: Colors.cream },
  input: { marginTop: 4, minHeight: 46, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.charcoal },
  area: { minHeight: 96, textAlignVertical: "top" },
  owed: { marginTop: 14, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.warmBg },
  upiRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  copy: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper, marginTop: 6 },
  copyText: { fontSize: 12, fontWeight: "700", color: Colors.charcoal },
  link: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal3, textDecorationLine: "underline" },
  err: { fontSize: 12.5, fontWeight: "600", color: Colors.error, marginTop: 8 },
});
