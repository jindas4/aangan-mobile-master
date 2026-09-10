import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Platform,
  Animated,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "@/lib/format";
import { ListingImage } from "@/lib/api";

const { width: W, height: H } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;

interface Props {
  images: ListingImage[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export function PhotoViewer({ images, visible, initialIndex, onClose, onIndexChange }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderMove: (_, gs) => {
        translateY.setValue(gs.dy);
        const progress = Math.min(Math.abs(gs.dy) / DISMISS_THRESHOLD, 1);
        opacity.setValue(1 - progress * 0.6);
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dy) > DISMISS_THRESHOLD || Math.abs(gs.vy) > 0.8) {
          const direction = gs.dy > 0 ? H : -H;
          Animated.parallel([
            Animated.timing(translateY, { toValue: direction, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            onClose();
            translateY.setValue(0);
            opacity.setValue(1);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  const onScrollEnd = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / W);
      setIndex(idx);
      onIndexChange?.(idx);
    },
    [onIndexChange],
  );

  const getItemLayout = useCallback(
    (_: any, i: number) => ({ length: W, offset: W * i, index: i }),
    [],
  );

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent onShow={() => setIndex(initialIndex)}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Animated.View style={[styles.container, { opacity }]}>
        <Animated.View
          style={[styles.imageLayer, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={onScrollEnd}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image
                  source={{ uri: imageUrl(item.url) }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />
        </Animated.View>

        {/* Close button — top right */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={16}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Counter — bottom center */}
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{index + 1} / {images.length}</Text>
          </View>
        )}

        {/* Swipe hint dots */}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  imageLayer: {
    flex: 1,
  },
  slide: {
    width: W,
    height: H,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: W,
    height: H,
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 44,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  counterText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  dots: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  swipeHint: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 44,
    alignSelf: "center",
    opacity: 0.6,
  },
});
