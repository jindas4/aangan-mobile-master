import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { api, getToken } from "./api";

let _registered = false;

export async function registerPushToken(): Promise<void> {
  if (_registered) return;
  if (!Device.isDevice) return;

  const authToken = getToken();
  if (!authToken) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const pushToken = await Notifications.getDevicePushTokenAsync();

  try {
    await api("/api/push/register", {
      method: "POST",
      body: {
        token: pushToken.data,
        platform: Platform.OS === "ios" ? "ios" : "android",
      },
    });
    _registered = true;
  } catch {}
}

export async function unregisterPushToken(): Promise<void> {
  if (!Device.isDevice) return;
  _registered = false;

  try {
    const pushToken = await Notifications.getDevicePushTokenAsync();
    await api("/api/push/unregister", {
      method: "DELETE",
      body: {
        token: pushToken.data,
        platform: Platform.OS === "ios" ? "ios" : "android",
      },
    });
  } catch {}
}
