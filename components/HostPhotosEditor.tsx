// The host's photos on their listing screen: how many are tagged by room, and
// an editor to add, remove, reorder and tag them (Bedroom, Kitchen, …).
// Same behaviour as the website's components/HostPhotos.tsx.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, type ListingFull } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { PhotoPicker, photoCategoriesPayload, type Photo } from "@/components/PhotoPicker";
import { photoCategoryLabel } from "@/lib/photoCategories";

export function HostPhotosEditor({ listing, onSaved }: { listing: ListingFull; onSaved: (l: ListingFull) => void }) {
  const images = listing.images?.filter((i) => i.url?.startsWith("http")) || [];
  const untagged = images.filter((i) => !photoCategoryLabel(i.category)).length;
  const [editing, setEditing] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const uploading = photos.some((p) => p.uploading);

  const start = () => {
    setPhotos(images.map((i) => ({
      localUri: i.url, remoteUrl: i.url, uploading: false,
      category: photoCategoryLabel(i.category) ? i.category : null,
    })));
    setEditing(true);
  };

  const save = async () => {
    const urls = photos.filter((p) => p.remoteUrl).map((p) => p.remoteUrl!);
    if (listing.published !== false && urls.length === 0) {
      Alert.alert("Photos needed", "A live listing needs at least one photo. Unpublish it first to remove them all.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api<ListingFull>(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body: { images: urls, image_categories: photoCategoriesPayload(photos) },
      });
      onSaved(updated);
      setEditing(false);
    } catch (e: any) {
      const d = e?.body?.detail;
      Alert.alert("Couldn't save photos", (typeof d === "object" ? d?.message : d) || e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <TouchableOpacity style={styles.summary} onPress={start} activeOpacity={0.8}>
        <Ionicons name="images-outline" size={20} color={Colors.terra} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{images.length ? (untagged ? "Edit & tag photos" : "Edit photos") : "Add photos"}</Text>
          <Text style={styles.summarySub}>
            {images.length === 0 ? "No photos yet"
              : untagged ? `${images.length} photos · ${untagged} without a room`
              : `${images.length} photos, all tagged by room`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.charcoal3} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.help}>Tap "Choose room" under each photo. Guests see your photos grouped room by room. The first photo is the cover.</Text>
      <PhotoPicker value={photos} onChange={setPhotos} withCategories />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setEditing(false)} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.saveBtn, (saving || uploading) && { opacity: 0.5 }]}
                          onPress={save} disabled={saving || uploading}>
          {saving ? <ActivityIndicator color={Colors.paper} />
            : <Text style={styles.saveText}>{uploading ? "Uploading…" : "Save photos"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper,
  },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  summarySub: { fontSize: 12.5, color: Colors.charcoal3, marginTop: 2 },
  card: { padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  help: { fontSize: 12.5, color: Colors.charcoal2, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: "center" },
  cancel: { borderWidth: 1, borderColor: Colors.edgeStrong },
  cancelText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  saveBtn: { backgroundColor: Colors.terra },
  saveText: { fontSize: 14, fontWeight: "800", color: Colors.paper },
});
