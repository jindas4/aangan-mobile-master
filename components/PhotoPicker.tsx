// Photo picker for a host's listing.
//
// Built for slow connections: each photo is resized on the phone first (a
// 12-megapixel photo of 3–5 MB goes up as a few hundred KB), at most three
// upload at a time (twelve at once makes every one of them crawl), and a
// failed upload is retried automatically before the host is asked to.
import { Dispatch, SetStateAction, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
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

const MAX_EDGE = 2000;          // longest side in px — listing photos are never shown larger
const JPEG_QUALITY = 0.82;
const PARALLEL_UPLOADS = 3;
const AUTO_RETRIES = 2;

interface Picked { uri: string; width?: number; height?: number }

/** Resize to at most MAX_EDGE on the long side and re-encode as JPEG. Falls
 *  back to the original file if the phone can't process it. */
async function shrink(p: Picked): Promise<string> {
  try {
    const { width: w, height: h } = p;
    const resize = w && h && Math.max(w, h) > MAX_EDGE
      ? [{ resize: w >= h ? { width: MAX_EDGE } : { height: MAX_EDGE } }]
      : [];
    const out = await manipulateAsync(p.uri, resize, { compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return out.uri;
  } catch {
    return p.uri;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PhotoPicker({ value, onChange }: Props) {
  // Upload queue: at most PARALLEL_UPLOADS in flight. Photos are identified by
  // the uri the picker gave us, which is also what the thumbnail shows.
  const queue = useRef<Picked[]>([]);
  const running = useRef(0);
  const sizes = useRef<Record<string, Picked>>({});

  const runUpload = async (picked: Picked) => {
    const { uri } = picked;
    try {
      const small = await shrink(picked);
      const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      let res: { url: string } | undefined;
      let lastError: any;
      for (let attempt = 0; attempt <= AUTO_RETRIES && !res; attempt++) {
        if (attempt > 0) await wait(1500 * attempt);
        try {
          res = await uploadFile<{ url: string }>("/api/uploads/image", small, filename);
        } catch (e: any) {
          lastError = e;
          if (e?.status >= 400 && e?.status < 500) break;      // wrong type / too large / signed out — final
        }
      }
      if (!res) throw lastError;
      const url = res.url;
      onChange((prev) =>
        prev.map((p) => (p.localUri === uri ? { ...p, remoteUrl: url, uploading: false, error: undefined } : p))
      );
    } catch (e: any) {
      onChange((prev) =>
        prev.map((p) => (p.localUri === uri ? { ...p, uploading: false, error: e?.message || "Upload failed" } : p))
      );
    }
  };

  const pump = () => {
    while (running.current < PARALLEL_UPLOADS && queue.current.length > 0) {
      const next = queue.current.shift()!;
      running.current += 1;
      runUpload(next).finally(() => { running.current -= 1; pump(); });
    }
  };

  const uploadOne = (picked: Picked) => {
    sizes.current[picked.uri] = picked;
    onChange((prev) => [...prev, { localUri: picked.uri, uploading: true }]);
    queue.current.push(picked);
    pump();
  };

  const retry = (uri: string) => {
    onChange((prev) => prev.map((p) => (p.localUri === uri ? { ...p, uploading: true, error: undefined } : p)));
    queue.current.push(sizes.current[uri] ?? { uri });
    pump();
  };

  const remove = (uri: string) => {
    queue.current = queue.current.filter((q) => q.uri !== uri);     // not started yet → never upload it
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
      quality: 1,              // resized and compressed once, in shrink()
    });
    if (result.canceled) return;
    result.assets.forEach((a) => uploadOne({ uri: a.uri, width: a.width, height: a.height }));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;
    const a = result.assets[0];
    uploadOne({ uri: a.uri, width: a.width, height: a.height });
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
