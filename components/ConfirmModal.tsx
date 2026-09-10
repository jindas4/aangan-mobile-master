import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Radius } from "@/constants/Colors";
import { GlassSheet } from "@/components/GlassSheet";

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <GlassSheet onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
          onPress={onConfirm}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
            {busy ? "Please wait…" : confirmLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14.5,
    color: Colors.charcoal2,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Radius.full,
    backgroundColor: Colors.terra,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  destructiveBtn: {
    backgroundColor: "#FEE2E2",
  },
  destructiveText: {
    color: "#DC2626",
  },
});
