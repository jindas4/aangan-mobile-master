// Listing videos for guests and hosts: a cover (the still the host's app made)
// with a play button; tapping plays it full screen with expo-video. On an app
// build without the video player (an older binary that received this code as
// an update) the video opens in the browser instead.
import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Colors, Radius } from "@/constants/Colors";
import { expoVideo } from "@/lib/nativeVideo";
import { fmtDuration, type ListingVideo } from "@/lib/nightPrices";

function NativePlayer({ url }: { url: string }) {
  const { useVideoPlayer, VideoView } = expoVideo!;
  const player = useVideoPlayer(url, (p) => { p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" allowsFullscreen />;
}

export function VideoPlayerModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} animationType="fade" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <View style={styles.player}>
        {url && expoVideo ? <NativePlayer url={url} /> : null}
        <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close video">
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export function openVideo(url: string, setPlaying: (u: string) => void) {
  if (expoVideo) setPlaying(url);
  else WebBrowser.openBrowserAsync(url).catch(() => {});
}

export function VideoTile({ video, onPress, width }: { video: Pick<ListingVideo, "poster_url" | "duration_s" | "caption">; onPress: () => void; width: number }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width }} accessibilityRole="button"
                      accessibilityLabel={video.caption ? `Play video: ${video.caption}` : "Play video"}>
      <View style={[styles.tile, { width, height: Math.round(width * 9 / 16) }]}>
        {video.poster_url ? <Image source={{ uri: video.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={styles.playBtn}><Ionicons name="play" size={26} color="#fff" /></View>
        {video.duration_s ? <Text style={styles.dur}>{fmtDuration(video.duration_s)}</Text> : null}
      </View>
      {video.caption ? <Text style={styles.caption} numberOfLines={2}>{video.caption}</Text> : null}
    </TouchableOpacity>
  );
}

/** The videos strip on a listing. */
export function ListingVideos({ videos, title = "Videos" }: { videos?: ListingVideo[] | null; title?: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!videos?.length) return null;
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.kicker}>{title.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {videos.map((v) => (
          <VideoTile key={v.id} video={v} width={videos.length === 1 ? 320 : 260} onPress={() => openVideo(v.url, setPlaying)} />
        ))}
      </ScrollView>
      <VideoPlayerModal url={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, backgroundColor: "#000" },
  close: { position: "absolute", top: 54, right: 18, padding: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)" },
  tile: { borderRadius: Radius.md, overflow: "hidden", backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  playBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingLeft: 3 },
  dur: { position: "absolute", right: 8, bottom: 8, color: "#fff", fontSize: 12, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  caption: { fontSize: 13, color: Colors.charcoal2, marginTop: 6 },
  kicker: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1, color: Colors.charcoal3, marginBottom: 8 },
});
