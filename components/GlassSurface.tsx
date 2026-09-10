// The one place the iOS-blur / Android-solid branch lives. iOS renders a real
// BlurView with a white tint layered on top (the Liquid Glass recipe); Android
// gets a high-alpha solid stand-in — BlurView's experimental Android blur has
// artifacts and real GPU cost on mid-tier devices, so we fail to legible.
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { Glass } from "@/constants/Colors";

export function GlassSurface({
  children,
  style,
  intensity = Glass.intensity,
  tint = Glass.tint,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** White overlay painted over the blur; also informs nothing on Android
   *  (which always uses the opaque Glass.fallback). */
  tint?: string;
}) {
  if (Platform.OS !== "ios") {
    return <View style={[{ backgroundColor: Glass.fallback }, style]}>{children}</View>;
  }
  return (
    <BlurView tint="light" intensity={intensity} style={style}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} pointerEvents="none" />
      {children}
    </BlurView>
  );
}
