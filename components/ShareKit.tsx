import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { Colors, Radius } from "@/constants/Colors";
import { WEB_BASE } from "@/lib/api";
import { GlassSheet } from "@/components/GlassSheet";

interface Props {
  slug: string;
  title: string;
  city: string;
}

export function ShareKit({ slug, title, city }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [guestKitOpen, setGuestKitOpen] = useState(false);
  const url = `${WEB_BASE}/p/${slug}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = async () => {
    const text = `Check out ${title} in ${city} — book directly on Aangan Stay:\n${url}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) {
      Linking.openURL(waUrl);
    } else {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  const shareGeneric = async () => {
    try {
      await Share.share({
        message: `Check out ${title} in ${city} — book directly on Aangan Stay: ${url}`,
        url,
      });
    } catch {}
  };

  return (
    <>
      <View style={styles.row}>
        <Chip
          icon="link-outline"
          label={copied ? "Copied!" : "Copy link"}
          color={Colors.aanganDeep}
          borderColor="rgba(27,39,80,0.2)"
          onPress={copyLink}
        />
        <Chip
          icon="logo-whatsapp"
          label="WhatsApp"
          color="#25D366"
          borderColor="rgba(37,211,102,0.3)"
          onPress={shareWhatsApp}
        />
        <Chip
          icon="qr-code-outline"
          label="QR code"
          color={Colors.charcoal2}
          borderColor={Colors.edge}
          onPress={() => setQrOpen(true)}
        />
        <Chip
          icon="people-outline"
          label="Bring your guests"
          color={Colors.charcoal2}
          borderColor={Colors.edge}
          onPress={() => setGuestKitOpen(true)}
        />
        <Chip
          icon="share-outline"
          label="Share"
          color={Colors.charcoal2}
          borderColor={Colors.edge}
          onPress={shareGeneric}
        />
      </View>

      {qrOpen && (
        <QRModal url={url} title={title} city={city} onClose={() => setQrOpen(false)} />
      )}
      {guestKitOpen && <GuestKit url={url} title={title} city={city} onClose={() => setGuestKitOpen(false)} />}
    </>
  );
}

function Chip({
  icon,
  label,
  color,
  borderColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, { borderColor }]}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Messages a host can send to people who have stayed with them, or enquired, before. */
function guestMessages(title: string, city: string, url: string): { lang: string; text: string }[] {
  return [
    { lang: "English",
      text: `Namaste! ${title} in ${city} can now be booked online. Choose your dates, pay safely by UPI or card, and get a GST invoice — no service fee for you.\n\nBook here: ${url}` },
    { lang: "हिंदी",
      text: `नमस्ते! ${city} में ${title} अब ऑनलाइन बुक किया जा सकता है। अपनी तारीखें चुनें, UPI या कार्ड से सुरक्षित भुगतान करें और GST बिल पाएँ — आपसे कोई सेवा शुल्क नहीं।\n\nयहाँ बुक करें: ${url}` },
  ];
}

// "Bring your guests" — ready-made messages and where to put the link.
function GuestKit({ url, title, city, onClose }: { url: string; title: string; city: string; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  const sendWhatsApp = async (text: string) => {
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL((await Linking.canOpenURL(waUrl)) ? waUrl : `https://wa.me/?text=${encodeURIComponent(text)}`);
  };
  const tips: [string, string][] = [
    ["Google Maps", "Open your Google Business Profile, choose Edit profile, and paste the link under Website (and under Booking, if your profile offers it)."],
    ["Instagram and Facebook", "Put the link in your bio and in the page's Book now button."],
    ["WhatsApp Business", "Add it to your business profile and to your quick replies for \"price?\" and \"available?\"."],
    ["At the property", "Show the QR code at your reception or gate."],
  ];
  return (
    <GlassSheet onClose={onClose} title="Bring your own guests">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={kit.lead}>
          A guest whose first visit is through your own link is charged to you at 8% instead of 15.5% — about half — on every booking they make with you.
        </Text>
        <Text style={kit.step}>1 · MESSAGE PEOPLE WHO HAVE STAYED OR ENQUIRED BEFORE</Text>
        {guestMessages(title, city, url).map((m) => (
          <View key={m.lang} style={kit.card}>
            <Text style={kit.lang}>{m.lang}</Text>
            <Text style={kit.msg}>{m.text}</Text>
            <View style={kit.btnRow}>
              <TouchableOpacity style={kit.btn} onPress={() => copy(m.lang, m.text)} accessibilityRole="button">
                <Text style={kit.btnText}>{copied === m.lang ? "Copied!" : "Copy message"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={kit.btn} onPress={() => sendWhatsApp(m.text)} accessibilityRole="button">
                <Text style={kit.btnText}>Send on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <Text style={kit.step}>2 · PUT YOUR LINK WHERE PEOPLE ALREADY FIND YOU</Text>
        {tips.map(([head, body]) => (
          <Text key={head} style={kit.tip}><Text style={kit.tipHead}>{head}. </Text>{body}</Text>
        ))}
        <TouchableOpacity style={[kit.btn, { alignSelf: "flex-start", marginTop: 12 }]} onPress={() => copy("link", url)} accessibilityRole="button">
          <Text style={kit.btnText}>{copied === "link" ? "Copied!" : "Copy your link"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </GlassSheet>
  );
}

const kit = StyleSheet.create({
  lead: { fontSize: 13.5, lineHeight: 20, color: Colors.charcoal2 },
  step: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3, marginTop: 20, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, padding: 12, marginBottom: 10, backgroundColor: Colors.cream },
  lang: { fontSize: 11, fontWeight: "800", color: Colors.charcoal3, marginBottom: 4 },
  msg: { fontSize: 13.5, lineHeight: 20, color: Colors.charcoal },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.paper },
  btnText: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal },
  tip: { fontSize: 13.5, lineHeight: 20, color: Colors.charcoal2, marginBottom: 8 },
  tipHead: { fontWeight: "700", color: Colors.charcoal },
});

function QRModal({
  url,
  title,
  city,
  onClose,
}: {
  url: string;
  title: string;
  city: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareQr = async () => {
    try {
      await Share.share({
        message: `Scan to book ${title} on Aangan Stay: ${url}`,
        url,
      });
    } catch {}
  };

  return (
    <GlassSheet onClose={onClose} title="QR Code">
      <View style={styles.qrCenter}>
        <Text style={styles.qrTitle}>{title}</Text>
        <Text style={styles.qrCity}>{city}</Text>

        <View style={styles.qrBox}>
          <QRCode
            value={url}
            size={220}
            color="#1B2750"
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>

        <Text style={styles.qrUrl}>{url}</Text>

        <View style={styles.qrActions}>
          <TouchableOpacity style={styles.qrBtn} onPress={copyUrl}>
            <Ionicons name="copy-outline" size={18} color={Colors.charcoal} />
            <Text style={styles.qrBtnText}>{copied ? "Copied!" : "Copy link"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qrBtn, styles.qrBtnPrimary]} onPress={shareQr}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={[styles.qrBtnText, { color: "#fff" }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.qrHint}>
          Print and stick on your gate, share in local cafés, or post on Instagram.
        </Text>
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qrCenter: {
    alignItems: "center",
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.charcoal,
    textAlign: "center",
  },
  qrCity: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal2,
    marginTop: 4,
  },
  qrBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.edge,
    backgroundColor: "#fff",
  },
  qrUrl: {
    fontSize: 11,
    fontFamily: "Courier",
    color: Colors.charcoal3,
    marginTop: 12,
    textAlign: "center",
  },
  qrActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  qrBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  qrBtnPrimary: {
    backgroundColor: Colors.terra,
    borderColor: Colors.terra,
  },
  qrBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  qrHint: {
    fontSize: 11,
    color: Colors.charcoal3,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});
