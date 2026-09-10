import { Dispatch, SetStateAction } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { uploadFile } from "@/lib/api";

export interface Photo {
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
}

interface Props {
  value: Photo[];
  onChange: Dispatch<SetStateAction<Photo[]>>;
}

export function PhotoPicker({ value, onChange }: Props) {
  const runUpload = async (uri: string) => {
    try {
      const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      const res = await uploadFile<{ url: string }>("/api/uploads/image", uri, filename);
      onChange((prev) =>
        prev.map((p) => (p.localUri === uri ? { ...p, remoteUrl: res.url, uploading: false, error: undefined } : p))
      );
    } catch (e: any) {
      onChange((prev) =>
        prev.map((p) => (p.localUri === uri ? { ...p, uploading: false, error: e.message || "Upload failed" } : p))
      );
    }
  };

  const uploadOne = (uri: string) => {
    onChange((prev) => [...prev, { localUri: uri, uploading: true }]);
    runUpload(uri);
  };

  const retry = (uri: string) => {
    onChange((prev) => prev.map((p) => (p.localUri === uri ? { ...p, uploading: true, error: undefined } : p)));
    runUpload(uri);
  };

  const remove = (uri: string) => {
    onChange((prev) => prev.filter((p) => p.localUri !== uri));
  };

  const makeCover = (uri: string) => {
    onChange((prev) => {
      const idx = prev.findIndex((p) => p.localUri === uri);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    result.assets.forEach((a) => uploadOne(a.uri));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    uploadOne(result.assets[0].uri);
  };

  return (
    <View>
      <View style={styles.grid}>
        {value.map((p, i) => (
          <View key={p.localUri} style={styles.tile}>
            <Image source={{ uri: p.localUri }} style={styles.thumb} />
            {i === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}
            {p.uploading && (
              <View style={styles.overlay}>
                <ActivityIndicator color={Colors.paper} />
              </View>
            )}
            {p.error && (
              <TouchableOpacity style={styles.overlay} onPress={() => retry(p.localUri)}>
                <Ionicons name="refresh" size={20} color={Colors.paper} />
                <Text style={styles.errorText}>Retry</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.removeBtn} onPress={() => remove(p.localUri)} hitSlop={8}>
              <Ionicons name="close" size={14} color={Colors.paper} />
            </TouchableOpacity>
            {i !== 0 && !p.uploading && !p.error && (
              <TouchableOpacity style={styles.coverBtn} onPress={() => makeCover(p.localUri)}>
                <Text style={styles.coverBtnText}>Make cover</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={[styles.tile, styles.actionTile]} onPress={pickFromLibrary}>
          <Ionicons name="images-outline" size={22} color={Colors.terra} />
          <Text style={styles.actionLabel}>Add photos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tile, styles.actionTile]} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={22} color={Colors.terra} />
          <Text style={styles.actionLabel}>Take photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TILE = "31%";

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Numeric gap (px), not a percentage. A percentage `gap` made Yoga
    // mis-measure the wrapped grid's height, truncating the parent ScrollView
    // so it couldn't reach the fields below (Description / Publish) once
    // several photos were added.
    gap: 10,
  },
  tile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: Colors.warmBg,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31,41,55,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: Colors.paper,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(31,41,55,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.terra,
  },
  coverBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.paper,
    letterSpacing: 0.5,
  },
  coverBtn: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    backgroundColor: "rgba(31,41,55,0.55)",
    alignItems: "center",
  },
  coverBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.paper,
  },
  actionTile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.edge,
    borderStyle: "dashed",
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.terra,
    textAlign: "center",
  },
});
