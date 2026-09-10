// The one screen header. Replaces the identical hand-rolled opaque header
// (paper bg, hairline bottom, 40pt back + centered title + 40pt spacer)
// previously copy-pasted across the stack screens. Glass on iOS, solid on
// Android via GlassSurface.
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { GlassSurface } from "./GlassSurface";

export function GlassHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  /** Defaults to router.back(). */
  onBack?: () => void;
  /** Optional right-side control; defaults to a 40pt spacer so the title
   *  stays centered. */
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <GlassSurface style={styles.wrap}>
      <SafeAreaView edges={["top"]}>
        <View style={styles.row}>
          <TouchableOpacity onPress={onBack ?? (() => router.back())} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {right ?? <View style={{ width: 40 }} />}
        </View>
      </SafeAreaView>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.edge,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: Colors.charcoal,
  },
});
