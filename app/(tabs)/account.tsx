import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Colors, Radius, Shadows } from "@/constants/Colors";
import { api, WEB_BASE, UserOut, VerificationStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { ReferralCard } from "@/components/ReferralCard";

export default function AccountScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text
          style={styles.pageTitle}
          testID="profile-header"
          accessibilityLabel="Profile"
        >
          Profile
        </Text>
        <View style={styles.loginCard}>
          <View style={styles.loginIllustration}>
            <Ionicons name="person-circle-outline" size={64} color={Colors.terraSoft} />
          </View>
          <Text
            style={styles.loginTitle}
            testID="welcome-title"
            accessibilityLabel="Welcome to Aangan Stay"
          >
            Welcome to Aangan Stay
          </Text>
          <Text style={styles.loginSub}>
            Log in to manage your trips, message hosts, and list your home.
          </Text>
          <Button
            title="Log in"
            testID="login-btn"
            onPress={() => router.push("/login")}
            full
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const initials = (
    user.name?.[0] ||
    user.email?.[0] ||
    user.phone?.[0] ||
    "U"
  ).toUpperCase();

  const joinedYear = user.host_joined_at
    ? new Date(user.host_joined_at).getFullYear()
    : null;

  const badges: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [];
  if (user.superhost) badges.push({ icon: "star", label: "Superhost", color: Colors.terra });
  if (user.phone_verified) badges.push({ icon: "call", label: "Phone verified", color: Colors.success });
  if (user.email_verified) badges.push({ icon: "mail", label: "Email verified", color: Colors.success });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text
          style={styles.pageTitle}
          testID="profile-header"
          accessibilityLabel="Profile"
        >
          Profile
        </Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.profileRight}>
              <Text style={styles.profileName}>
                {user.name || "Guest"}
              </Text>
              {joinedYear && (
                <Text style={styles.profileSince}>
                  Host since {joinedYear}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push("/account/edit")}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={18} color={Colors.terra} />
            </TouchableOpacity>
          </View>

          {/* Contact info */}
          <View style={styles.contactRow}>
            {user.email && (
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={14} color={Colors.charcoal2} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            )}
            {user.phone && (
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={14} color={Colors.charcoal2} />
                <Text style={styles.contactText}>{user.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Verification status */}
        <VerificationBanner user={user} isHost={!!user.is_host} />

        {/* Invite & earn */}
        <ReferralCard />

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.badgesRow}>
            {badges.map((b) => (
              <View key={b.label} style={styles.badge}>
                <Ionicons name={b.icon} size={14} color={b.color} />
                <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Host bio section */}
        {user.is_host && user.host_bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>About me</Text>
            <Text style={styles.bioText}>{user.host_bio}</Text>
            {user.host_languages && (
              <View style={styles.bioDetail}>
                <Ionicons name="language-outline" size={14} color={Colors.charcoal2} />
                <Text style={styles.bioDetailText}>
                  Speaks {user.host_languages}
                </Text>
              </View>
            )}
            {user.host_response_time && (
              <View style={styles.bioDetail}>
                <Ionicons name="time-outline" size={14} color={Colors.charcoal2} />
                <Text style={styles.bioDetailText}>
                  Responds {user.host_response_time.replace(/_/g, " ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Host section */}
        <Text style={styles.sectionLabel}>HOST</Text>
        {user.is_host ? (
          <>
            <MenuItem
              icon="home-outline"
              label="Host dashboard"
              testID="menu-host-dashboard"
              onPress={() => router.push("/host")}
            />
            <MenuItem
              icon="add-circle-outline"
              label="List a new property"
              testID="menu-new-listing"
              onPress={() => router.push("/host/new")}
            />
            <MenuItem
              icon="person-outline"
              label="Edit host profile"
              onPress={() => router.push("/host/profile")}
            />
          </>
        ) : (
          <MenuItem
            icon="home-outline"
            label="Become a host"
            subtitle="List your home, earn in ₹"
            onPress={() => router.push("/host")}
          />
        )}

        {/* Settings section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <MenuItem
          icon="person-outline"
          label="Personal info"
          onPress={() => router.push("/account/edit")}
        />

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <MenuItem
          icon="information-circle-outline"
          label="About Aangan Stay"
          onPress={() => router.push("/about")}
        />
        <MenuItem
          icon="help-circle-outline"
          label="Help centre"
          onPress={() => Linking.openURL("mailto:support@aanganstay.com")}
        />
        <MenuItem
          icon="document-text-outline"
          label="Terms of service"
          onPress={() =>
            WebBrowser.openBrowserAsync(`${WEB_BASE}/legal/terms`, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            })
          }
        />
        <MenuItem
          icon="shield-outline"
          label="Privacy policy"
          onPress={() =>
            WebBrowser.openBrowserAsync(`${WEB_BASE}/legal/privacy`, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            })
          }
        />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => router.push("/account/delete")}
        >
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Aangan Stay v1.0.0</Text>
        <View style={{ height: tabBarHeight + 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VerificationBanner({
  user,
  isHost,
}: {
  user: UserOut;
  isHost: boolean;
}) {
  const router = useRouter();
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    api<VerificationStatus>("/api/account/verification")
      .then((s) => setEligible(s.eligible))
      .catch(() => {});
  }, [user]);

  if (eligible === null) return null;

  if (eligible) {
    return (
      <View style={styles.verifiedBanner}>
        <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
        <Text style={styles.verifiedText}>Verified account</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.verifyBanner}
      onPress={() =>
        router.push(isHost ? "/host/verify" : "/account/verify")
      }
    >
      <Ionicons name="shield-outline" size={18} color={Colors.terra} />
      <Text style={styles.verifyText}>Complete verification</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.terra} />
    </TouchableOpacity>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={label}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={20} color={Colors.charcoal} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.charcoal3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.charcoal,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  loginCard: {
    margin: 16,
    padding: 24,
    backgroundColor: Colors.paper,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.edge,
    alignItems: "center",
  },
  loginIllustration: {
    marginBottom: 12,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.charcoal,
    textAlign: "center",
  },
  loginSub: {
    fontSize: 14,
    color: Colors.charcoal2,
    marginTop: 8,
    lineHeight: 20,
    textAlign: "center",
  },
  profileCard: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: Colors.paper,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.edge,
    ...Shadows.card,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.aanganSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.aanganDeep,
  },
  profileRight: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  profileSince: {
    fontSize: 13,
    color: Colors.charcoal2,
    marginTop: 2,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warmBg,
    alignItems: "center",
    justifyContent: "center",
  },
  contactRow: {
    marginTop: 16,
    gap: 6,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: Colors.charcoal2,
    fontWeight: "600",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#dcfce7",
    borderRadius: Radius.md,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.success,
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.warmBg,
    borderRadius: Radius.md,
  },
  verifyText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.terra,
    flex: 1,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bioSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  bioTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.charcoal,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: Colors.charcoal2,
    lineHeight: 22,
  },
  bioDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  bioDetailText: {
    fontSize: 13,
    color: Colors.charcoal2,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.charcoal3,
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.charcoal2,
    marginTop: 2,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  deleteBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.error,
    textDecorationLine: "underline",
  },
  version: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.charcoal3,
    marginTop: 24,
  },
});
