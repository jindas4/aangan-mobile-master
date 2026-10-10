// Landing route for aangan://digilocker-done. On Android the hand-back from
// DigiLocker's browser arrives as a normal deep link; the verification screen
// underneath is already checking the result, so just return to it.
import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";

export default function DigilockerDone() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);
  return <View />;
}
