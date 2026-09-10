import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as AppleAuthentication from "expo-apple-authentication";
import { Colors, Radius } from "@/constants/Colors";
import { WEB_BASE } from "@/lib/api";
import { useAuth, useWishlist } from "@/lib/auth";
import { Button } from "@/components/Button";
import { signInWithGoogle, isGoogleSignInConfigured, GoogleSignInCancelledError } from "@/lib/googleAuth";
import { signInWithApple, isAppleSignInConfigured, AppleSignInCancelledError } from "@/lib/appleAuth";
import Svg, { Path } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "register";
type Flow = "form" | "resetRequest" | "resetCode";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || "";

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.2h4.8c-.2 1.1-.8 2-1.7 2.6v2.2h2.8c1.7-1.5 2.7-3.8 2.7-6.3Z" />
      <Path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.8-2.2c-.8.5-1.8.9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H.7v2.4C2.2 16 5.4 18 9 18Z" />
      <Path fill="#FBBC05" d="M3.7 10.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6V5H.7C.2 6 0 7 0 9s.2 3 .7 4l3-2.4Z" />
      <Path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.5-2.5C13.5.9 11.4 0 9 0 5.4 0 2.2 2 .7 5l3 2.4C4.4 5.3 6.5 3.6 9 3.6Z" />
    </Svg>
  );
}

function FacebookIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#1877F2" d="M24 12a12 12 0 1 0-13.875 11.854V15.469H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953h-1.514c-1.49 0-1.955.926-1.955 1.875V12h3.328l-.532 3.469h-2.796v8.385A12.003 12.003 0 0 0 24 12Z" />
      <Path fill="#FFFFFF" d="m16.671 15.469.532-3.469h-3.328V9.75c0-.949.465-1.875 1.955-1.875h1.514V4.922s-1.374-.234-2.686-.234c-2.741 0-4.533 1.661-4.533 4.668V12H7.078v3.469h3.047v8.385a12.117 12.117 0 0 0 3.75 0v-8.385h2.796Z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const {
    socialLogin, loginWithPassword, registerWithPassword, requestPasswordReset, confirmPasswordReset,
  } = useAuth();
  const { hydrate: refreshWish } = useWishlist();
  const [mode, setMode] = useState<Mode>("login");
  const [flow, setFlow] = useState<Flow>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [, , facebookPrompt] = Facebook.useAuthRequest({
    clientId: FACEBOOK_CLIENT_ID,
  });

  const handleGoogleLogin = async () => {
    if (!isGoogleSignInConfigured) {
      Alert.alert("Not configured", "Google login is not yet configured.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const idToken = await signInWithGoogle();
      await socialLogin("google", idToken);
      await refreshWish();
      router.back();
    } catch (e: any) {
      if (!(e instanceof GoogleSignInCancelledError)) {
        setErr(e.message || "Google login failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAppleLogin = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { identityToken } = await signInWithApple();
      await socialLogin("apple", identityToken);
      await refreshWish();
      router.back();
    } catch (e: any) {
      if (!(e instanceof AppleSignInCancelledError)) {
        setErr(e.message || "Apple login failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (!FACEBOOK_CLIENT_ID) {
      Alert.alert("Not configured", "Facebook login is not yet configured.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await facebookPrompt();
      if (result?.type === "success") {
        const accessToken = result.params.access_token;
        await socialLogin("facebook", accessToken);
        await refreshWish();
        router.back();
      }
    } catch (e: any) {
      setErr(e.message || "Facebook login failed");
    } finally {
      setBusy(false);
    }
  };

  const validEmail = EMAIL_RE.test(email.trim());
  const canSubmit =
    validEmail &&
    password.length >= 8 &&
    (mode === "login" || (firstName.trim().length > 0 && agreed));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const normEmail = email.trim().toLowerCase();
      if (mode === "login") await loginWithPassword(normEmail, password);
      else await registerWithPassword(firstName.trim(), lastName.trim(), normEmail, password);
      await refreshWish();
      router.back();
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async () => {
    if (!validEmail) return;
    setBusy(true);
    setErr(null);
    try {
      const dev = await requestPasswordReset(email.trim().toLowerCase());
      if (dev) setDevCode(dev);
      setFlow("resetCode");
    } catch (e: any) {
      setErr(e.message || "Could not send reset code");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    if (resetCode.length < 4 || newPassword.length < 8) return;
    setBusy(true);
    setErr(null);
    try {
      await confirmPasswordReset(email.trim().toLowerCase(), resetCode, newPassword);
      setFlow("form");
      setMode("login");
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setDevCode(null);
    } catch (e: any) {
      setErr(e.message || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={Colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log in or sign up</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>
            {flow === "form" ? "WELCOME" : flow === "resetRequest" ? "RESET PASSWORD" : "ONE MORE STEP"}
          </Text>
          <Text style={styles.title} testID="login-title" accessibilityLabel={flow === "form" ? (mode === "login" ? "Welcome back" : "Create your account") : "Reset password"}>
            {flow === "form"
              ? mode === "login" ? "Welcome back" : "Create your account"
              : flow === "resetRequest" ? "Forgot your password?"
              : "Enter your reset code"}
          </Text>
          <Text style={styles.subtitle}>
            {flow === "form"
              ? "Real homes, real hosts — all over India."
              : flow === "resetRequest"
                ? "We'll email you a code to reset it."
                : `We've sent a code to ${email.trim().toLowerCase()}.`}
          </Text>

          {flow === "form" && (
            <>
              {mode === "register" && (
                <View style={styles.nameRow}>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor={Colors.charcoal3}
                    autoFocus
                    style={[styles.input, { flex: 1 }, firstName.trim().length > 0 && styles.inputValid]}
                  />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name (optional)"
                    placeholderTextColor={Colors.charcoal3}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
              )}
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={Colors.charcoal3}
                autoFocus={mode === "login"}
                testID="email-input"
                accessibilityLabel="Email"
                style={[styles.input, styles.emailInput, validEmail && styles.inputValid]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Password"
                placeholderTextColor={Colors.charcoal3}
                style={[styles.input, { marginTop: 10 }]}
              />

              {mode === "register" && (
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => setAgreed((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={agreed ? "checkbox" : "square-outline"}
                    size={22}
                    color={agreed ? Colors.terra : Colors.charcoal3}
                  />
                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE}/legal/terms`)}
                    >
                      Terms
                    </Text>{" "}
                    &{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => WebBrowser.openBrowserAsync(`${WEB_BASE}/legal/privacy`)}
                    >
                      Privacy Policy
                    </Text>
                    , and to Aangan's zero-tolerance policy for objectionable content and abusive
                    behaviour.
                  </Text>
                </TouchableOpacity>
              )}

              {err && <Text style={styles.error}>{err}</Text>}

              <Button
                title={busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                onPress={submit}
                disabled={!canSubmit || busy}
                loading={busy}
                full
                size="lg"
                style={{ marginTop: 20 }}
              />
              <View style={styles.pwLinksRow}>
                <TouchableOpacity onPress={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }}>
                  <Text style={styles.editText}>
                    {mode === "login" ? "Create an account" : "Have an account? Log in"}
                  </Text>
                </TouchableOpacity>
                {mode === "login" && (
                  <TouchableOpacity onPress={() => { setFlow("resetRequest"); setErr(null); }}>
                    <Text style={styles.editText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Apple first per Apple's own HIG when present */}
              {isAppleSignInConfigured && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={Radius.lg}
                  style={styles.appleBtn}
                  onPress={handleAppleLogin}
                />
              )}

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleLogin}
                disabled={busy}
                activeOpacity={0.7}
              >
                <GoogleIcon />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Facebook only shown when configured — a dead button fails App Review (2.1). */}
              {!!FACEBOOK_CLIENT_ID && (
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleFacebookLogin}
                  disabled={busy}
                  activeOpacity={0.7}
                >
                  <FacebookIcon />
                  <Text style={styles.socialBtnText}>Continue with Facebook</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {flow === "resetRequest" && (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={Colors.charcoal3}
                autoFocus
                style={[styles.input, styles.emailInput, validEmail && styles.inputValid]}
              />
              {err && <Text style={styles.error}>{err}</Text>}
              <Button
                title={busy ? "Sending…" : "Send reset code"}
                onPress={requestReset}
                disabled={!validEmail || busy}
                loading={busy}
                full
                size="lg"
                style={{ marginTop: 20 }}
              />
              <TouchableOpacity onPress={() => { setFlow("form"); setErr(null); }} style={styles.editBtn}>
                <Text style={styles.editText}>Back to log in</Text>
              </TouchableOpacity>
            </>
          )}

          {flow === "resetCode" && (
            <>
              <TextInput
                value={resetCode}
                onChangeText={(t) => setResetCode(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                placeholder="Reset code"
                placeholderTextColor={Colors.charcoal3}
                autoFocus
                style={[styles.input, { textAlign: "center", letterSpacing: 4 }]}
              />
              {devCode && (
                <Text style={styles.devCode}>
                  Dev mode — your code: <Text style={{ fontWeight: "800" }}>{devCode}</Text>
                </Text>
              )}
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="New password"
                placeholderTextColor={Colors.charcoal3}
                style={[styles.input, { marginTop: 10 }]}
              />
              {err && <Text style={styles.error}>{err}</Text>}
              <Button
                title={busy ? "Resetting…" : "Reset password"}
                onPress={confirmReset}
                disabled={resetCode.length < 4 || newPassword.length < 8 || busy}
                loading={busy}
                full
                size="lg"
                style={{ marginTop: 20 }}
              />
              <TouchableOpacity onPress={() => { setFlow("form"); setErr(null); }} style={styles.editBtn}>
                <Text style={styles.editText}>Back to log in</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: Colors.charcoal,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 24,
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.terra,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.charcoal2,
    marginTop: 8,
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  emailInput: {
    width: "100%",
    marginTop: 16,
  },
  inputValid: {
    borderColor: Colors.terra,
  },
  error: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 8,
  },
  devCode: {
    fontSize: 12,
    color: Colors.charcoal3,
    marginTop: 8,
    textAlign: "center",
  },
  editBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
  },
  editText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.charcoal2,
    textDecorationLine: "underline",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.edge,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: Colors.charcoal3,
  },
  pwLinksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.charcoal2,
  },
  termsLink: {
    color: Colors.terra,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  appleBtn: {
    height: 52,
    borderRadius: Radius.lg,
    marginBottom: 12,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.edge,
    backgroundColor: Colors.paper,
    marginBottom: 12,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
  },
});
