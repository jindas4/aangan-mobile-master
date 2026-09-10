import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
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
  const url = `${WEB_BASE}/p/${slug}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = async () => {
    const text = `Check out ${title} in ${city} — book directly on Aangan:\n${url}`;
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
        message: `Check out ${title} in ${city} — book directly on Aangan: ${url}`,
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
        message: `Scan to book ${title} on Aangan: ${url}`,
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
