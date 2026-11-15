import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";

// Host dashboard nudges (same as the website's HostTaxNudges):
//  - PAN verified before we kept its holder type → confirm it for the ₹5 lakh TDS exemption.
//  - GST turnover answer is per tax year → asked again each April.
export function HostTaxNudges() {
  const router = useRouter();
  const [panConfirm, setPanConfirm] = useState(false);
  const [gst, setGst] = useState<{ turnover_current: boolean; fy_label: string; last_turnover_fy: string | null } | null>(null);

  useFocusEffect(useCallback(() => {
    api<{ pan_confirm_needed?: boolean }>("/api/kyc").then((k) => setPanConfirm(!!k.pan_confirm_needed)).catch(() => {});
    api<{ turnover_current: boolean; fy_label: string; last_turnover_fy: string | null }>("/api/kyc/gst").then(setGst).catch(() => {});
  }, []));

  const items: { title: string; body: string; cta: string }[] = [];
  if (panConfirm) items.push({
    title: "Confirm your PAN",
    body: "Enter it once more. If you're an individual or HUF, no TDS is deducted while your earnings through Aangan Stay this tax year are ₹5 lakh or less, including on payouts not sent yet.",
    cta: "Confirm PAN",
  });
  if (gst && !gst.turnover_current) items.push({
    title: gst.last_turnover_fy ? `Confirm your GST turnover for ${gst.fy_label}` : "Answer the GST question",
    body: "Tell us whether your total turnover has gone over ₹20 lakh this financial year. It decides who invoices your guests, and new listings can't go live without it.",
    cta: "Answer now",
  });
  if (!items.length) return null;

  return (
    <View style={{ gap: 10, marginHorizontal: 16, marginBottom: 16 }}>
      {items.map((it) => (
        <View key={it.title} style={styles.card}>
          <Text style={styles.title}>{it.title}</Text>
          <Text style={styles.body}>{it.body}</Text>
          <TouchableOpacity onPress={() => router.push("/host/verify")} style={styles.btn} accessibilityRole="button">
            <Text style={styles.btnText}>{it.cta}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.terraSoft, backgroundColor: Colors.terraTint },
  title: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  body: { fontSize: 13, lineHeight: 18, color: Colors.charcoal2, marginTop: 4 },
  btn: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.terra },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
});
