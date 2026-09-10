import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

// Native Sign in with Apple needs no client id / web config on-device — the
// identity token it returns is verified against Apple's own JWKS on the
// backend. The only gate here is platform: Apple's own rules (and the
// library itself) make this iOS-only.
export const isAppleSignInConfigured = Platform.OS === "ios";

export class AppleSignInCancelledError extends Error {
  constructor() {
    super("Apple sign-in was cancelled.");
    this.name = "AppleSignInCancelledError";
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export interface AppleSignInResult {
  identityToken: string;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("Apple sign-in returned no identity token.");
    }
    return { identityToken: credential.identityToken, fullName: credential.fullName };
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED") throw new AppleSignInCancelledError();
    throw new Error(e?.message || "Apple sign-in failed.");
  }
}
