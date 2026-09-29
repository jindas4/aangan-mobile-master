import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { API_BASE, getToken } from "@/lib/api";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: 90 + insets.bottom }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityLabel="Open chat"
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>

      {open && <ChatModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ChatModal({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content:
        "Hi! I'm the Aangan Stay assistant. Ask me about stays, bookings, or anything about Aangan Stay.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const idRef = useRef(1);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(scrollToEnd, [msgs, scrollToEnd]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: idRef.current++, role: "user", content: text };
    const assistantId = idRef.current++;
    setMsgs((p) => [...p, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      const token = getToken();
      if (token) headers["authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) {
        const errText =
          res.status === 429
            ? "Too many messages — please slow down a bit."
            : "Something went wrong. Please try again.";
        setMsgs((p) => p.map((m) => (m.id === assistantId ? { ...m, content: errText } : m)));
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const fallback = await res.text();
        try {
          const json = JSON.parse(fallback);
          setMsgs((p) =>
            p.map((m) => (m.id === assistantId ? { ...m, content: json.content || fallback } : m))
          );
        } catch {
          setMsgs((p) => p.map((m) => (m.id === assistantId ? { ...m, content: fallback } : m)));
        }
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const raw = line.trim().replace(/^data:\s*/, "");
          if (!raw) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "session" && evt.session_id) {
              setSessionId(evt.session_id);
            } else if (evt.type === "text") {
              setMsgs((p) =>
                p.map((m) => (m.id === assistantId ? { ...m, content: evt.content } : m))
              );
            } else if (evt.type === "delta") {
              setMsgs((p) =>
                p.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + evt.content } : m
                )
              );
            }
          } catch {}
        }
      }
    } catch {
      setMsgs((p) =>
        p.map((m) =>
          m.id === assistantId ? { ...m, content: "Connection error — please try again." } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.msgRow, item.role === "user" && styles.msgRowUser]}>
      <View
        style={[
          styles.bubble,
          item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {item.content ? (
          <Text
            style={[styles.bubbleText, item.role === "user" && styles.bubbleTextUser]}
          >
            {item.content}
          </Text>
        ) : (
          <Text style={styles.typing}>...</Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Aangan Stay Assistant</Text>
            <Text style={styles.headerSub}>Ask me anything</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about stays, bookings..."
            placeholderTextColor={Colors.charcoal3}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={send}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.charcoal,
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  msgRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleAssistant: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: Colors.charcoal,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.charcoal,
    fontFamily: Fonts.regular,
  },
  bubbleTextUser: {
    color: "#fff",
  },
  typing: {
    fontSize: 18,
    color: Colors.charcoal3,
    letterSpacing: 2,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    backgroundColor: Colors.paper,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 16,
    backgroundColor: Colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: Colors.charcoal,
    fontFamily: Fonts.regular,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
