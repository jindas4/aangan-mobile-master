import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Scene } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { AMENITIES } from "@/constants/Amenities";
import { Button } from "@/components/Button";
import { PhotoPicker, Photo } from "@/components/PhotoPicker";

const SCENES: { key: Scene; label: string }[] = [
  { key: "mountain", label: "Mountain" },
  { key: "beach", label: "Beach" },
  { key: "city", label: "City" },
  { key: "forest", label: "Forest" },
  { key: "lake", label: "Lake" },
  { key: "desert", label: "Desert" },
  { key: "backwater", label: "Backwater" },
  { key: "heritage", label: "Heritage" },
];

const TYPES = ["Apartment", "Villa", "Cottage", "Homestay", "Bungalow", "Farm Stay"];

export default function NewListingScreen() {
  const router = useRouter();
  const [pending, setPending] = useState<null | "publish" | "draft">(null);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [scene, setScene] = useState<Scene>("mountain");
  const [type, setType] = useState("Apartment");
  const [price, setPrice] = useState("");
  const [guests, setGuests] = useState("2");
  const [bedrooms, setBedrooms] = useState("1");
  const [baths, setBaths] = useState("1");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);

  const uploadedImages = photos.filter((p) => p.remoteUrl).map((p) => p.remoteUrl!);
  const stillUploading = photos.some((p) => p.uploading);
  const valid = title.trim() && city.trim() && price.trim() && description.trim() && uploadedImages.length > 0;

  const handleCreate = async (published: boolean) => {
    if (!valid || stillUploading || pending) return;
    setPending(published ? "publish" : "draft");
    try {
      await api<{ id: string }>("/api/listings", {
        method: "POST",
        body: {
          title: title.trim(),
          city: city.trim(),
          area: area.trim(),
          scene,
          type,
          price_inr: parseInt(price),
          guests: parseInt(guests) || 2,
          bedrooms: parseInt(bedrooms) || 1,
          baths: parseInt(baths) || 1,
          description: description.trim(),
          amenities,
          images: uploadedImages,
          published,
        },
      });
      Alert.alert(
        published ? "Listing published!" : "Draft saved",
        published
          ? "Your property is now live."
          : "Saved as a draft. Publish it any time from your dashboard.",
        [{ text: "View dashboard", onPress: () => router.replace("/host") }],
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save listing.");
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} testID="new-listing-header" accessibilityLabel="List your property">List your property</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel} testID="basic-info-section" accessibilityLabel="BASIC INFO">BASIC INFO</Text>

          <Field label="Property name" placeholder="Sunny hillside cottage in Manali">
            <TextInput value={title} onChangeText={setTitle} placeholder="Sunny hillside cottage in Manali" placeholderTextColor={Colors.charcoal3} style={styles.input} />
          </Field>

          <View style={styles.row}>
            <Field label="City" style={{ flex: 1 }}>
              <TextInput value={city} onChangeText={setCity} placeholder="Manali" placeholderTextColor={Colors.charcoal3} style={styles.input} />
            </Field>
            <Field label="Area" style={{ flex: 1 }}>
              <TextInput value={area} onChangeText={setArea} placeholder="Old Manali" placeholderTextColor={Colors.charcoal3} style={styles.input} />
            </Field>
          </View>

          <Field label="Scene">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SCENES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setScene(s.key)}
                  style={[styles.chip, scene === s.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, scene === s.key && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label="Type">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, type === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PHOTOS</Text>
          <PhotoPicker value={photos} onChange={setPhotos} />
          {photos.length === 0 && (
            <Text style={styles.helperText}>Add at least one photo to publish your listing.</Text>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DETAILS</Text>

          <Field label="Price per night (₹)">
            <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="3500" placeholderTextColor={Colors.charcoal3} style={styles.input} />
          </Field>

          <View style={styles.row}>
            <Field label="Guests" style={{ flex: 1 }}>
              <TextInput value={guests} onChangeText={setGuests} keyboardType="number-pad" style={styles.input} />
            </Field>
            <Field label="Bedrooms" style={{ flex: 1 }}>
              <TextInput value={bedrooms} onChangeText={setBedrooms} keyboardType="number-pad" style={styles.input} />
            </Field>
            <Field label="Baths" style={{ flex: 1 }}>
              <TextInput value={baths} onChangeText={setBaths} keyboardType="number-pad" style={styles.input} />
            </Field>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]} testID="amenities-section" accessibilityLabel="AMENITIES">AMENITIES</Text>
          <View style={styles.amenGrid}>
            {AMENITIES.map((a) => {
              const selected = amenities.includes(a.key);
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() =>
                    setAmenities((prev) =>
                      selected ? prev.filter((x) => x !== a.key) : [...prev, a.key],
                    )
                  }
                  style={[styles.amenChip, selected && styles.amenChipActive]}
                >
                  <Ionicons
                    name={a.icon as any}
                    size={16}
                    color={selected ? Colors.terra : Colors.charcoal2}
                  />
                  <Text style={[styles.amenChipText, selected && styles.amenChipTextActive]}>
                    {a.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {amenities
              .filter((a) => !AMENITIES.some((p) => p.key === a))
              .map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAmenities((prev) => prev.filter((x) => x !== a))}
                  style={[styles.amenChip, styles.amenChipActive]}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.terra} />
                  <Text style={[styles.amenChipText, styles.amenChipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.customAmenRow}>
            <TextInput
              value={customAmenity}
              onChangeText={setCustomAmenity}
              placeholder="Add custom amenity…"
              placeholderTextColor={Colors.charcoal3}
              style={[styles.input, { flex: 1 }]}
              returnKeyType="done"
              onSubmitEditing={() => {
                const val = customAmenity.trim();
                if (val && !amenities.includes(val)) {
                  setAmenities((prev) => [...prev, val]);
                  setCustomAmenity("");
                }
              }}
            />
            <TouchableOpacity
              style={[styles.addAmenBtn, !customAmenity.trim() && { opacity: 0.4 }]}
              onPress={() => {
                const val = customAmenity.trim();
                if (val && !amenities.includes(val)) {
                  setAmenities((prev) => [...prev, val]);
                  setCustomAmenity("");
                }
              }}
              disabled={!customAmenity.trim()}
            >
              <Ionicons name="add" size={20} color={Colors.paper} />
            </TouchableOpacity>
          </View>

          <Field label="Description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Tell guests what makes your place special…"
              placeholderTextColor={Colors.charcoal3}
              style={[styles.input, { height: 100 }]}
            />
          </Field>

          <Button
            title={
              pending === "publish" ? "Publishing…" : stillUploading ? "Uploading photos…" : "Publish listing"
            }
            onPress={() => handleCreate(true)}
            disabled={!valid || pending !== null || stillUploading}
            loading={pending === "publish"}
            full
            size="lg"
            style={{ marginTop: 24 }}
          />

          <TouchableOpacity
            onPress={() => handleCreate(false)}
            disabled={!valid || pending !== null || stillUploading}
            style={[styles.draftBtn, (!valid || pending !== null || stillUploading) && styles.draftBtnDisabled]}
            activeOpacity={0.7}
          >
            <Ionicons name="document-outline" size={18} color={Colors.charcoal} />
            <Text style={styles.draftBtnText}>
              {pending === "draft" ? "Saving draft…" : "Save as draft"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.draftHint}>
            Drafts stay private and don't appear in search until you publish them.
          </Text>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, style, placeholder }: { label: string; children: React.ReactNode; style?: any; placeholder?: string }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  form: { padding: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 1.5,
    color: Colors.charcoal3, marginBottom: 12,
  },
  field: { marginBottom: 16 },
  helperText: { fontSize: 12, color: Colors.charcoal3, marginTop: 8 },
  draftBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    marginTop: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  draftBtnDisabled: { opacity: 0.4 },
  draftBtnText: { fontSize: 15, fontWeight: "700", color: Colors.charcoal },
  draftHint: { fontSize: 12, color: Colors.charcoal3, marginTop: 8, textAlign: "center" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2, marginBottom: 6 },
  input: {
    height: 48, paddingHorizontal: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
    fontSize: 15, color: Colors.charcoal, fontWeight: "600",
  },
  row: { flexDirection: "row", gap: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
    marginRight: 8,
  },
  chipActive: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.charcoal2 },
  chipTextActive: { color: Colors.terra },
  amenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  amenChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.edge, backgroundColor: Colors.paper,
  },
  amenChipActive: { borderColor: Colors.terra, backgroundColor: Colors.warmBg },
  amenChipText: { fontSize: 12.5, fontWeight: "700", color: Colors.charcoal2 },
  amenChipTextActive: { color: Colors.terra },
  customAmenRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  addAmenBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.terra, alignItems: "center", justifyContent: "center",
  },
});
