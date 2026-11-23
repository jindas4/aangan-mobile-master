// "All photos": a listing's photos grouped room by room (the host's photo
// categories, lib/photoCategories.ts), with untagged photos last. Tapping a
// photo opens the full-screen viewer in the same order. The viewer is rendered
// inside this modal: iOS can't present a second sibling modal on top.
import { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RemoteImage } from "@/components/RemoteImage";
import { PhotoViewer } from "@/components/PhotoViewer";
import { Colors } from "@/constants/Colors";
import { groupPhotos } from "@/lib/photoCategories";
import type { ListingImage } from "@/lib/api";

const W = Dimensions.get("window").width;
const PAD = 16;
const HALF = (W - PAD * 2 - 8) / 2;

export function PhotoTour({ images, visible, onClose }: { images: ListingImage[]; visible: boolean; onClose: () => void }) {
  const groups = useMemo(() => groupPhotos(images), [images]);
  const order = useMemo(() => groups.flatMap((g) => g.images), [groups]);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const showHeads = groups.length > 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.title}>Photo tour</Text>
        </View>
        {showHeads && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {groups.map((g) => (
              <TouchableOpacity key={g.code || "more"} style={styles.chip}
                                onPress={() => scroller.current?.scrollTo({ y: offsets.current[g.code] ?? 0, animated: true })}>
                <RemoteImage url={g.images[0].url} size="thumb" style={styles.chipImg} contentFit="cover" />
                <Text numberOfLines={1} style={styles.chipText}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <ScrollView ref={scroller} contentContainerStyle={styles.body}>
          {groups.map((g) => (
            <View key={g.code || "more"} style={styles.section}
                  onLayout={(e) => { offsets.current[g.code] = e.nativeEvent.layout.y - 8; }}>
              {showHeads && (
                <Text style={styles.sectionTitle}>{g.label} <Text style={styles.sectionCount}>· {g.images.length}</Text></Text>
              )}
              <View style={styles.grid}>
                {g.images.map((img, i) => {
                  const wide = g.images.length % 2 === 1 && i === 0;
                  return (
                    <TouchableOpacity key={img.id} activeOpacity={0.9} onPress={() => setViewerAt(order.indexOf(img))}>
                      <RemoteImage url={img.url} blur={img.blur} size="medium" contentFit="cover"
                                   style={wide ? styles.wide : styles.half} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        <PhotoViewer images={order} visible={viewerAt !== null} initialIndex={Math.max(0, viewerAt ?? 0)}
                     onClose={() => setViewerAt(null)} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: PAD, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: "800", color: Colors.charcoal },
  chips: { paddingHorizontal: PAD, paddingBottom: 12, gap: 10 },
  chip: { width: 84, gap: 5 },
  chipImg: { width: 84, height: 58, borderRadius: 8, backgroundColor: Colors.edge },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.charcoal2 },
  body: { paddingHorizontal: PAD, paddingBottom: 48, gap: 28, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.edge, paddingTop: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: Colors.charcoal },
  sectionCount: { fontSize: 14, fontWeight: "600", color: Colors.charcoal3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  half: { width: HALF, height: HALF * 0.75, borderRadius: 10, backgroundColor: Colors.edge },
  wide: { width: W - PAD * 2, height: (W - PAD * 2) * 0.62, borderRadius: 10, backgroundColor: Colors.edge },
});
