import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Message, Conversation } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { ReportSheet } from "@/components/ReportSheet";
import { reportContent, blockUser } from "@/lib/moderation";

export default function MessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const otherId = convo?.other?.id ?? null;

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    const [c, msgs] = await Promise.all([
      api<Conversation>(`/api/conversations/${id}`).catch(() => null),
      api<Message[]>(`/api/conversations/${id}/messages`).catch(() => null),
    ]);
    if (c) setConvo(c);
    if (msgs) setMessages(msgs);
  }, [id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: { body },
      });
      setText("");
      await fetchMessages();
      flatRef.current?.scrollToEnd({ animated: true });
    } catch (e: any) {
      Alert.alert("Couldn't send", e?.message || "Please try again.");
    }
    setSending(false);
  };

  const otherName = convo?.other?.name || "Guest";

  const doBlock = () => {
    if (!otherId) return;
    Alert.alert(
      `Block ${otherName}?`,
      "They won't be able to message you, and this conversation will be removed from your inbox.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(otherId);
              router.back();
            } catch {
              Alert.alert("Couldn't block", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const openMenu = () => {
    Alert.alert(otherName, undefined, [
      { text: "Report", onPress: () => setReportOpen(true) },
      { text: "Block", style: "destructive", onPress: doBlock },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const submitReport = async (reason: string, detail?: string) => {
    if (!otherId) return;
    await reportContent("user", otherId, reason, detail);
    setReportOpen(false);
    Alert.alert("Report received", "Thanks — our team will review this within 24 hours.");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
          {convo?.listing_title && (
            <Text style={styles.headerListing} numberOfLines={1}>
              {convo.listing_title}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={openMenu} style={styles.menuBtn} hitSlop={8} disabled={!otherId}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
      </View>

      <ReportSheet
        visible={reportOpen}
        title={`Report ${otherName}`}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            const isSystem = item.kind === "system";
            if (isSystem) {
              return (
                <View style={styles.systemMsg}>
                  <Text style={styles.systemText}>{item.body}</Text>
                </View>
              );
            }
            return (
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                  {item.body}
                </Text>
                <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={Colors.charcoal3}
            multiline
            style={styles.textInput}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  headerListing: {
    fontSize: 12,
    color: Colors.charcoal2,
    marginTop: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  systemMsg: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.warmBg,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 12,
    color: Colors.charcoal2,
    fontStyle: "italic",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: Colors.aanganDeep,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: "#fff",
  },
  bubbleTime: {
    fontSize: 10,
    color: Colors.charcoal3,
    marginTop: 4,
    textAlign: "right",
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.6)",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.charcoal3,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    backgroundColor: Colors.paper,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    fontSize: 15,
    color: Colors.charcoal,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
