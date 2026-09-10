import { useEffect, useRef, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Sentry from "@sentry/react-native";
import type { EventSubscription } from "expo-modules-core";
import { useAuth, useWishlist } from "@/lib/auth";
import { Colors } from "@/constants/Colors";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatFab } from "@/components/ChatSheet";
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
        <Stack.Screen name="account/edit" />
        <Stack.Screen name="account/delete" />
      </Stack>
      <ChatFab />
      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </ErrorBoundary>
  );
}

// Sentry.wrap adds touch-event breadcrumbs + native-crash context around the
// root component. No-op when the DSN is blank.
export default Sentry.wrap(RootLayout);
