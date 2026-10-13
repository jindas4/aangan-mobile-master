// The check-in promise, on the guest's booking screen: from check-in day to
// checkout a guest who is turned away, or finds the place is not what they
// booked, reports it here. Support is alerted at once and the host's payout
// is held (backend routes_bookings.checkin_problem).
import { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { api, BookingWithListing } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { Button } from "@/components/Button";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckinHelp({ booking, onReported }: { booking: BookingWithListing; onReported: () => void }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = todayISO();
  const inWindow = booking.status === "confirmed" && booking.start_date <= today && today <= booking.end_date;
  if (!booking.checkin_problem_at && !inWindow) return null;

  if (booking.checkin_problem_at) {
    return (
      <View style={[styles.box, styles.boxDone]}>
        <Text style={styles.title}>We have your report</Text>
        <Text style={styles.body}>
          Our support team has been alerted and the host's payout is on hold. If you could not stay, you will be
          refunded in full and we will help you find another place. Watch your phone and email for our reply.
        </Text>
      </View>
    );
  }

  const send = async () => {
    setBusy(true); setErr("");
    try {
      await api(`/api/bookings/${booking.id}/checkin-problem`, { method: "POST", body: { details: details.trim() } });
      onReported();
    } catch (e: any) {
      setErr(e.message || "Could not send your report. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Problem at check-in?</Text>
      <Text style={styles.body}>
        If the host turns you away or the place is not what you booked, tell us now. You get a full refund and help
        finding another stay.
      </Text>
      {!open ? (
        <Button title="Report a check-in problem" variant="outline" full onPress={() => setOpen(true)} style={{ marginTop: 12 }} />
      ) : (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>What happened?</Text>
          <TextInput value={details} onChangeText={setDetails} multiline maxLength={1000} accessibilityLabel="What happened?"
                     placeholder="For example: the host said the room was already given to someone else."
                     placeholderTextColor={Colors.charcoal3} style={styles.input} />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Button title={busy ? "Sending…" : "Send to support"} full onPress={send}
                  disabled={busy || details.trim().length < 10} style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  boxDone: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  title: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  body: { fontSize: 13, lineHeight: 19, color: Colors.charcoal2, marginTop: 6 },
  label: { fontSize: 12, fontWeight: "700", color: Colors.charcoal3 },
  input: { marginTop: 4, minHeight: 96, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.charcoal, textAlignVertical: "top" },
  err: { fontSize: 12.5, fontWeight: "600", color: Colors.error, marginTop: 4 },
});
