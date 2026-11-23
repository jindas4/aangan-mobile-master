// Pick, upload, caption, reorder and remove listing videos (website:
// components/VideoUploader.tsx). The cover image is a still taken from the
// video on the phone and uploaded as a photo. `HostVideosEditor` is the card
// on the host's listing screen that saves them.
import { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, uploadFile, type ListingFull } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { videoThumbnails } from "@/lib/nativeVideo";
import { MAX_VIDEOS, VIDEO_MAX_MB, VIDEO_MAX_SECONDS, type ListingVideo } from "@/lib/nightPrices";
import { VideoTile, VideoPlayerModal, openVideo } from "@/components/ListingVideos";

export interface VideoItem { url: string; poster_url?: string | null; duration_s?: number | null; caption?: string | null;
                             /** What to show on this screen (signed links / the local still). */
                             preview?: string; posterPreview?: string | null }

export const videosFromListing = (vs?: ListingVideo[] | null): VideoItem[] =>
  (vs || []).map((v) => ({ url: v.url, poster_url: v.poster_url, duration_s: v.duration_s, caption: v.caption,
                           preview: v.url, posterPreview: v.poster_url }));

export const videosPayload = (vs: VideoItem[]) =>
  vs.map((v) => ({ url: v.url, poster_url: v.poster_url || null, duration_s: v.duration_s ?? null, caption: v.caption?.trim() || null }));

const typeFor = (uri: string, mime?: string | null) =>
  mime && mime.startsWith("video/") ? mime : /\.mov$/i.test(uri) ? "video/quicktime" : "video/mp4";

export function VideoPicker({ value, onChange, onBusyChange }: {
  value: VideoItem[]; onChange: (v: VideoItem[]) => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Allow access", "Allow access to your videos to add one."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"], allowsEditing: true, videoMaxDuration: VIDEO_MAX_SECONDS,
      // iOS: hand over H.264 so every browser can play it (HEVC doesn't play in Chrome).
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const seconds = a.duration ? a.duration / 1000 : null;          // ms
    if (seconds && seconds > VIDEO_MAX_SECONDS + 1) {
      Alert.alert("Video too long", `Keep videos under ${VIDEO_MAX_SECONDS / 60} minutes. Trim it and try again.`); return;
    }
    if (a.fileSize && a.fileSize > VIDEO_MAX_MB * 1024 * 1024) {
      Alert.alert("Video too large", `Videos can be up to ${VIDEO_MAX_MB} MB. Trim it or record a shorter one.`); return;
    }
    setBusy(true); onBusyChange?.(true);
    try {
      let poster: { url: string; preview_url?: string } | null = null, posterLocal: string | null = null;
      if (videoThumbnails) {
        try {
          const t = await videoThumbnails.getThumbnailAsync(a.uri, { time: 1000, quality: 0.8 });
          posterLocal = t.uri;
          poster = await uploadFile<{ url: string; preview_url?: string }>("/api/uploads/image", t.uri, "cover.jpg");
        } catch { poster = null; }
      }
      const name = a.fileName || (typeFor(a.uri, a.mimeType) === "video/quicktime" ? "video.mov" : "video.mp4");
      const up = await uploadFile<{ url: string; preview_url: string }>(
        "/api/uploads/video", a.uri, name, typeFor(a.uri, a.mimeType), 15 * 60_000);
      onChange([...latest.current, { url: up.url, preview: up.preview_url, poster_url: poster?.url ?? null,
                                     posterPreview: posterLocal ?? poster?.preview_url ?? null,
                                     duration_s: seconds ? Math.round(seconds) : null, caption: "" }]);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Please try again.");
    } finally {
      setBusy(false); onBusyChange?.(false);
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <View style={{ gap: 10 }}>
      {value.map((v, i) => (
        <View key={v.url} style={styles.item}>
          <VideoTile video={{ poster_url: v.posterPreview, duration_s: v.duration_s }} width={120}
                     onPress={() => openVideo(v.preview || v.url, setPlaying)} />
          <View style={{ flex: 1, gap: 6 }}>
            <TextInput value={v.caption || ""} maxLength={120} placeholder="Caption (optional)"
                       onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, caption: t } : x)))}
                       style={styles.input} />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} style={[styles.icon, i === 0 && { opacity: 0.3 }]} accessibilityLabel="Move up">
                <Ionicons name="arrow-up" size={18} color={Colors.charcoal2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} disabled={i === value.length - 1} style={[styles.icon, i === value.length - 1 && { opacity: 0.3 }]} accessibilityLabel="Move down">
                <Ionicons name="arrow-down" size={18} color={Colors.charcoal2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onChange(value.filter((_, j) => j !== i))} style={styles.icon} accessibilityLabel="Remove video">
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
      {busy ? (
        <View style={styles.busy}><ActivityIndicator color={Colors.terra} /><Text style={styles.help}>Uploading video… keep the app open.</Text></View>
      ) : value.length < MAX_VIDEOS ? (
        <TouchableOpacity style={styles.add} onPress={pick}>
          <Ionicons name="videocam-outline" size={18} color={Colors.terra} />
          <Text style={styles.addText}>Add a video</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.help}>Up to {MAX_VIDEOS} videos, each under {VIDEO_MAX_SECONDS / 60} minutes. A slow walk through the rooms works best.</Text>
      <VideoPlayerModal url={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

export function HostVideosEditor({ listing, onSaved }: { listing: ListingFull; onSaved: (l: ListingFull) => void }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const n = listing.videos?.length || 0;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api<ListingFull>(`/api/listings/${listing.id}`, { method: "PATCH", body: { videos: videosPayload(items) } });
      onSaved(updated);
      setEditing(false);
    } catch (e: any) {
      const d = e?.body?.detail;
      Alert.alert("Couldn't save videos", (typeof d === "object" ? d?.message : d) || e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <TouchableOpacity style={styles.summary} activeOpacity={0.8}
                        onPress={() => { setItems(videosFromListing(listing.videos)); setEditing(true); }}>
        <Ionicons name="videocam-outline" size={20} color={Colors.terra} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{n ? "Edit videos" : "Add a video"}</Text>
          <Text style={styles.help}>{n ? `${n} video${n === 1 ? "" : "s"}` : "A short walk-through helps guests picture the stay"}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.charcoal3} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Videos</Text>
      <VideoPicker value={items} onChange={setItems} onBusyChange={setBusy} />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setEditing(false)} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.saveBtn, (saving || busy) && { opacity: 0.5 }]} onPress={save} disabled={saving || busy}>
          {saving ? <ActivityIndicator color={Colors.paper} /> : <Text style={styles.saveText}>{busy ? "Uploading…" : "Save videos"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: 10, padding: 8, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md },
  input: { borderWidth: 1, borderColor: Colors.edgeStrong, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: Colors.charcoal },
  actions: { flexDirection: "row", gap: 4 },
  icon: { padding: 6 },
  busy: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.cream },
  add: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.edgeStrong },
  addText: { fontSize: 14, fontWeight: "800", color: Colors.terra },
  help: { fontSize: 12.5, color: Colors.charcoal2, lineHeight: 18 },
  summary: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper,
  },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: Colors.charcoal },
  card: { padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.md, backgroundColor: Colors.paper, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: "center" },
  cancel: { borderWidth: 1, borderColor: Colors.edgeStrong },
  cancelText: { fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  saveBtn: { backgroundColor: Colors.terra },
  saveText: { fontSize: 14, fontWeight: "800", color: Colors.paper },
});
