// Universal-link target for microsite URLs (https://aangan.net.in/p/<slug>).
// The app's canonical screen is /listing/[id], so resolve slug → id and
// replace. Falls back to the Explore tab if the slug is gone.
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ListingFull } from "@/lib/api";
import { Colors } from "@/constants/Colors";

export default function MicrositeRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const listing = await api<ListingFull>(`/api/listings/by-slug/${slug}`);
        if (alive) router.replace(`/listing/${listing.id}`);
      } catch {
        if (alive) router.replace("/");
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.cream }}>
      <ActivityIndicator color={Colors.terra} />
    </View>
  );
}
