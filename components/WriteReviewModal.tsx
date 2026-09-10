import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";

interface Props {
  bookingId: string;
  listingTitle: string;
  onClose: () => void;
  onPosted: () => void;
}

export function WriteReviewModal({ bookingId, listingTitle, onClose, onPosted }: Props) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (body.trim().length < 8) {
      setErr("Tell us a little more (8+ characters).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api("/api/reviews", {
        method: "POST",
        body: { booking_id: bookingId, rating, body: body.trim() },
      });
      onPosted();
    } catch (e: any) {
      setErr(e.message || "Couldn't post your review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassSheet onClose={onClose} title="Write a review">
          <Text style={styles.kicker} numberOfLines={1}>{listingTitle}</Text>
          <Text style={styles.heading}>How was your stay?</Text>
          <Text style={styles.subtitle}>
            Your review helps future travellers — and helps your host improve.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={6}>
                <Ionicons name={rating >= s ? "star" : "star-outline"} size={32} color={Colors.gold} />
              </TouchableOpacity>
            ))}
            <Text style={styles.ratingLabel}>{rating}/5</Text>
          </View>

          <Text style={styles.fieldLabel}>Your story</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
            placeholder="What did you love? Anything future guests should know?"
            placeholderTextColor={Colors.charcoal3}
            style={styles.textArea}
          />
          <Text style={styles.charCount}>{body.length}/2000 characters</Text>

          {err && <Text style={styles.errorText}>{err}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title={busy ? "Posting…" : "Post review"}
              onPress={submit}
              loading={busy}
              disabled={busy || body.trim().length < 8}
              style={{ flex: 1 }}
            />
          </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3, textTransform: "uppercase" },
  heading: { fontFamily: Fonts.display, fontSize: 22, fontWeight: "700", color: Colors.charcoal, marginTop: 4 },
  subtitle: { fontSize: 13.5, color: Colors.charcoal2, marginTop: 4, lineHeight: 19 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
  ratingLabel: { fontSize: 15, fontWeight: "800", color: Colors.charcoal, marginLeft: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginTop: 20, marginBottom: 8 },
  textArea: {
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.cream,
    fontSize: 15,
    color: Colors.charcoal,
  },
  charCount: { fontSize: 11.5, fontWeight: "600", color: Colors.charcoal3, marginTop: 4 },
  errorText: { fontSize: 12.5, color: Colors.error, marginTop: 10, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  ghostBtn: {
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
  },
  ghostBtnText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
});
