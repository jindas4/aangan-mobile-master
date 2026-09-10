import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

export const isGoogleSignInConfigured = !!WEB_CLIENT_ID;

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super("Google sign-in was cancelled.");
    this.name = "GoogleSignInCancelledError";
  }
}

let configured = false;

/**
 * Safe to call from Expo Go too — the native module simply isn't linked
 * there, so this silently no-ops instead of crashing app startup. The
 * friendly "needs a dev build" message surfaces when the user actually taps
 * the Google button, via signInWithGoogle()'s catch below.
 */
export function configureGoogleSignIn() {
  if (configured || !WEB_CLIENT_ID) return;
  try {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID || undefined,
      offlineAccess: false,
      scopes: ["email", "profile"],
    });
    configured = true;
  } catch {}
}

export async function signInWithGoogle(): Promise<string> {
  if (!WEB_CLIENT_ID) {
    throw new Error("Google sign-in is not configured yet.");
  }
  configureGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== "success" || !response.data.idToken) {
      throw new GoogleSignInCancelledError();
    }
    return response.data.idToken;
  } catch (e: any) {
    if (e instanceof GoogleSignInCancelledError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleSignInCancelledError();
      if (e.code === statusCodes.IN_PROGRESS) throw new Error("Google sign-in is already in progress.");
      throw new Error(e.message || "Google sign-in failed.");
    }
    throw new Error("Google sign-in needs a development build — it isn't available in Expo Go.");
  }
}
