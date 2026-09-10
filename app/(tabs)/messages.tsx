import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { api, Conversation } from "@/lib/api";
import { Colors, Radius } from "@/constants/Colors";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

export default function MessagesScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api<Conversation[]>("/api/conversations");
      setConvos(data);
    } catch {
      setConvos([]);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.header}>Messages</Text>
        <EmptyState
          icon="chatbubble-outline"
          title="Log in to see messages"
          subtitle="Chat with hosts and guests about your stays."
        />
        <View style={styles.loginWrap}>
          <Button title="Log in" onPress={() => router.push("/login")} full />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.header}>Messages</Text>
      {convos.length === 0 && !loading ? (
        <EmptyState
          icon="chatbubble-outline"
          title="No messages yet"
          subtitle="When you contact a host or receive a booking, conversations will appear here."
        />
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.terra} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convoRow}
              activeOpacity={0.8}
              onPress={() => router.push(`/messages/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.other?.name?.[0] || "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.convoInfo}>
                <View style={styles.convoTop}>
                  <Text style={styles.convoName} numberOfLines={1}>
                    {item.other?.name || "Guest"}
                  </Text>
                  {item.last_at && (
                    <Text style={styles.convoTime}>{timeAgo(item.last_at)}</Text>
                  )}
                </View>
                <Text style={styles.convoListing} numberOfLines={1}>
                  {item.listing_title}
                </Text>
                <Text
                  style={[styles.convoMsg, item.unread_count > 0 && styles.convoMsgUnread]}
                  numberOfLines={1}
                >
                  {item.last_message || "No messages yet"}
                </Text>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.charcoal,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  list: {
    paddingBottom: 32,
  },
  loginWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.aanganSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.aanganDeep,
  },
  convoInfo: {
    flex: 1,
  },
  convoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convoName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.charcoal,
    flex: 1,
    marginRight: 8,
  },
  convoTime: {
    fontSize: 11,
    color: Colors.charcoal3,
  },
  convoListing: {
    fontSize: 12,
    color: Colors.charcoal2,
    marginTop: 1,
  },
  convoMsg: {
    fontSize: 13,
    color: Colors.charcoal3,
    marginTop: 2,
  },
  convoMsgUnread: {
    color: Colors.charcoal,
    fontWeight: "600",
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terra,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.edge,
    marginLeft: 76,
  },
});
