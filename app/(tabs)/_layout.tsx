import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { Colors, Glass } from "@/constants/Colors";
import { GlassSurface } from "@/components/GlassSurface";

// Liquid Glass tab bar: the bar floats over content (position absolute +
// transparent bg) with a GlassSurface behind it, so screens must pad their
// scroll content by useBottomTabBarHeight() to clear it.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.terra,
        tabBarInactiveTintColor: Colors.charcoal3,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Glass.border,
          elevation: 0,
        },
        tabBarBackground: () => <GlassSurface style={StyleSheet.absoluteFill} />,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          tabBarButtonTestID: "tab-explore",
          tabBarAccessibilityLabel: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarButtonTestID: "tab-wishlist",
          tabBarAccessibilityLabel: "Wishlist",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarButtonTestID: "tab-trips",
          tabBarAccessibilityLabel: "Trips",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "airplane" : "airplane-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarButtonTestID: "tab-messages",
          tabBarAccessibilityLabel: "Messages",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Profile",
          tabBarButtonTestID: "tab-profile",
          tabBarAccessibilityLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
