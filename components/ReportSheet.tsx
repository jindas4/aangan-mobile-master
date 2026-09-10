import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius } from "@/constants/Colors";
import { REPORT_REASONS } from "@/lib/moderation";

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSubmit: (reason: string, detail?: string) => void | Promise<void>;
}

export function ReportSheet({ visible, title = "Report", onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason(null);
    setDetail("");
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await onSubmit(reason, detail.trim() || undefined);
      reset();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Tell us what's wrong. Our team reviews every report within 24 hours and removes content
            that breaks our community guidelines.
          </Text>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[styles.reasonRow, reason === r.code && styles.reasonRowActive]}
                onPress={() => setReason(r.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.reasonText, reason === r.code && styles.reasonTextActive]}>
                  {r.label}
                </Text>
                {reason === r.code && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.terra} />
                )}
              </TouchableOpacity>
            ))}

            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="Add details (optional)"
              placeholderTextColor={Colors.charcoal3}
              multiline
              style={styles.detailInput}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, (!reason || busy) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={!reason || busy}
          >
            <Text style={styles.submitText}>{busy ? "Submitting…" : "Submit report"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.edgeStrong,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.charcoal2,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    marginBottom: 8,
  },
  reasonRowActive: {
    borderColor: Colors.terra,
    backgroundColor: Colors.warmBg,
  },
  reasonText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  reasonTextActive: {
    color: Colors.terra,
  },
  detailInput: {
    minHeight: 72,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.charcoal,
    marginTop: 4,
    marginBottom: 8,
    textAlignVertical: "top",
  },
  submitBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
