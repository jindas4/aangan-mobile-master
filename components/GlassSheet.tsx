// The one bottom sheet. Replaces the three copy-pasted RN Modal shells
// (cancel booking, write review, date picker). Glass panel on iOS, solid on
// Android; single scrim token; drag handle + standard header with close.
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Glass, Radius } from "@/constants/Colors";
import { GlassSurface } from "./GlassSurface";

export function GlassSheet({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <GlassSurface intensity={Glass.intensityStrong} tint={Glass.tintStrong} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>
          {children}
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Glass.scrim,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: Glass.border,
    overflow: "hidden",
    maxHeight: "90%",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.edgeStrong,
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.charcoal,
  },
});
