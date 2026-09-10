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
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/Button";

const LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Bengali",
  "Gujarati",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
];

const RESPONSE_TIMES = [
  { key: "within_an_hour", label: "Within an hour" },
  { key: "within_a_few_hours", label: "Within a few hours" },
  { key: "within_a_day", label: "Within a day" },
];

export default function HostProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [avatarUri, setAvatarUri] = useState(user?.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bio, setBio] = useState(user?.host_bio || "");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(
    user?.host_languages ? user.host_languages.split(",").map((l) => l.trim()) : [],
  );
  const [responseTime, setResponseTime] = useState(user?.host_response_time || "");
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to choose a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setAvatarUri(uri);
    setUploadingAvatar(true);
    try {
      const filename = uri.split("/").pop() || `avatar-${Date.now()}.jpg`;
      const res = await uploadFile<{ url: string }>("/api/uploads/image", uri, filename);
      setAvatarUri(res.url);
    } catch {
      Alert.alert("Upload failed", "Could not upload photo. Try again.");
      setAvatarUri(user?.avatar_url || "");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleLang = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const canSave = bio.trim().length >= 20 && selectedLangs.length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await updateProfile({
        avatar_url: avatarUri && avatarUri.startsWith("http") ? avatarUri : undefined,
        host_bio: bio.trim(),
        host_languages: selectedLangs.join(", "),
        host_response_time: responseTime || undefined,
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/host");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Tell guests a little about yourself. A good profile helps build trust
            and gets you more bookings.
          </Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} activeOpacity={0.7}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={36} color={Colors.charcoal3} />
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={Colors.paper} />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={Colors.paper} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to add a profile photo</Text>
          </View>

          <Text style={styles.sectionLabel}>ABOUT YOU</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder="I love hosting! I live in the hills and enjoy sharing local food and culture with my guests..."
            placeholderTextColor={Colors.charcoal3}
            style={[styles.input, { height: 120 }]}
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {bio.length}/500 {bio.trim().length < 20 && "(min 20 characters)"}
          </Text>

          <Text style={styles.sectionLabel}>LANGUAGES YOU SPEAK</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => {
              const sel = selectedLangs.includes(lang);
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => toggleLang(lang)}
                  style={[styles.langChip, sel && styles.langChipActive]}
                >
                  <Text style={[styles.langText, sel && styles.langTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>RESPONSE TIME</Text>
          <Text style={styles.fieldHint}>
            How quickly do you usually respond to guest messages?
          </Text>
          {RESPONSE_TIMES.map((rt) => (
            <TouchableOpacity
              key={rt.key}
              onPress={() => setResponseTime(rt.key)}
              style={[styles.radioRow, responseTime === rt.key && styles.radioRowActive]}
            >
              <View
                style={[
                  styles.radio,
                  responseTime === rt.key && styles.radioActive,
                ]}
              >
                {responseTime === rt.key && <View style={styles.radioDot} />}
              </View>
              <Text
                style={[
                  styles.radioLabel,
                  responseTime === rt.key && styles.radioLabelActive,
                ]}
              >
                {rt.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Button
            title={saving ? "Saving..." : "Save & continue"}
            onPress={handleSave}
            disabled={!canSave || saving}
            loading={saving}
            full
            size="lg"
            style={{ marginTop: 32 }}
          />

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  form: { padding: 16 },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.warmBg,
    borderWidth: 2,
    borderColor: Colors.edge,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31,41,55,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.paper,
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.charcoal3,
    fontWeight: "600",
    marginTop: 8,
  },
  intro: {
    fontSize: 14,
    color: Colors.charcoal2,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.charcoal3,
    marginBottom: 10,
    marginTop: 8,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    fontSize: 15,
    color: Colors.charcoal,
    fontWeight: "600",
  },
  charCount: {
    fontSize: 11,
    color: Colors.charcoal3,
    marginTop: 4,
    textAlign: "right",
  },
  fieldHint: {
    fontSize: 13,
    color: Colors.charcoal2,
    marginBottom: 12,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  langChipActive: {
    borderColor: Colors.terra,
    backgroundColor: Colors.warmBg,
  },
  langText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal2,
  },
  langTextActive: {
    color: Colors.terra,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    marginBottom: 8,
  },
  radioRowActive: {
    borderColor: Colors.terra,
    backgroundColor: Colors.warmBg,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.charcoal3,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: Colors.terra,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.terra,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal2,
  },
  radioLabelActive: {
    color: Colors.terra,
  },
});
