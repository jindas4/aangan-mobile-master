import { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Sentry from "@sentry/react-native";
import type { EventSubscription } from "expo";
import { useAuth, useWishlist } from "@/lib/auth";
import { Colors } from "@/constants/Colors";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatFab } from "@/components/ChatSheet";
import { EnvBadge } from "@/components/EnvBadge";
import { configureGoogleSignIn } from "@/lib/googleAuth";
import { registerPushToken } from "@/lib/pushNotifications";

// Crash reporting — blank DSN (dev / Expo Go) disables it entirely.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: false, // DPDP: no user PII in crash reports
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function RootLayout() {
  const hydrate = useAuth((s) => s.hydrate);
  const hydrateWish = useWishlist((s) => s.hydrate);
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const responseListener = useRef<EventSubscription>(null);

  const [fontsLoaded] = useFonts({
    Inter: require("../assets/fonts/Inter.ttf"),
    Fraunces: require("../assets/fonts/Fraunces.ttf"),
  });

  useEffect(() => {
    hydrate()
      .then(() => hydrateWish())
      .then(() => registerPushToken())
      .catch(() => {});
    configureGoogleSignIn();

    // Deep-link when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === "new_message" && data.conversation_id) {
        router.push(`/messages/${data.conversation_id}`);
      } else if (data?.type === "booking_confirmed" || data?.type === "booking_cancelled") {
        router.push("/trips");
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingTop: WINDOW_CONTROLS_INSET, backgroundColor: Colors.cream }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.cream },
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="messages/index" options={{ headerShown: true, title: "Messages" }} />
        <Stack.Screen name="messages/[id]" />
        <Stack.Screen name="login" options={{ presentation: "modal", animation: "slide_from_bottom", gestureDirection: "vertical" }} />
        <Stack.Screen name="host/index" />
        <Stack.Screen name="host/new" />
        <Stack.Screen name="host/verify" />
        <Stack.Screen name="host/listings/[id]" />
        <Stack.Screen name="host/profile" />
        <Stack.Screen name="account/verify" />
        <Stack.Screen name="trips/[id]" />
        <Stack.Screen name="account/edit" />
        <Stack.Screen name="account/delete" />
        <Stack.Screen name="blog/index" />
        <Stack.Screen name="blog/[slug]" />
      </Stack>
      </View>
      <ChatFab />
      <EnvBadge />
      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </ErrorBoundary>
  );
}

// iPhone app running on an iPad (iPadOS 26+ windowing): the system window
// controls float over the top-left corner and swallow taps on our floating
// back buttons, and the safe area doesn't include them. Start the app below
// that strip there; on iPhone this is 0.
const ON_IPAD =
  Platform.OS === "ios" &&
  (Device.osName === "iPadOS" || /iPad/.test(Device.modelId ?? "") || /iPad/.test(Device.modelName ?? ""));
const WINDOW_CONTROLS_INSET = ON_IPAD ? 40 : 0;

// Sentry.wrap adds touch-event breadcrumbs + native-crash context around the
// root component. No-op when the DSN is blank.
export default Sentry.wrap(RootLayout);
