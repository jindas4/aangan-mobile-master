// One blog story: the cover photo, the headline and byline, the story, the
// homes it features, then more stories to read.
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Fonts, Radius, Shadows } from "@/constants/Colors";
import { ApiError } from "@/lib/api";
import { countView, fetchPost, postUrl, readTime, postDate, type BlogPost } from "@/lib/blog";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { Cover, PostTile } from "@/components/blog/PostCard";
import { ListingCardItem } from "@/components/ListingCard";

const W = Dimensions.get("window").width;
const placeName = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<{ missing: boolean; msg: string } | null>(null);

  const load = () => {
    setError(null);
    fetchPost(String(slug))
      .then(setPost)
      .catch((e) => setError({ missing: e instanceof ApiError && e.status === 404, msg: e?.message || "Couldn't load this story." }));
  };
  useEffect(load, [slug]);

  // Count the read once someone has stayed a few seconds.
  useEffect(() => {
    if (!post) return;
    const t = setTimeout(() => countView(post.slug), 4000);
    return () => clearTimeout(t);
  }, [post?.slug]);

  const share = () => {
    if (!post) return;
    const url = postUrl(post.slug);
    Share.share({ title: post.title, message: `${post.title}\n${url}`, url }).catch(() => {});
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/blog"));

  const chrome = (
    <View style={[styles.chrome, { top: insets.top + 8 }]} pointerEvents="box-none">
      <TouchableOpacity onPress={back} style={styles.round} accessibilityLabel="Back" hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.charcoal} />
      </TouchableOpacity>
      {post && (
        <TouchableOpacity onPress={share} style={styles.round} accessibilityLabel="Share this story" hitSlop={8}>
          <Ionicons name="share-outline" size={20} color={Colors.charcoal} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (!post) {
    return (
      <View style={[styles.safe, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        {error ? (
          <View style={{ paddingHorizontal: 32, alignItems: "center" }}>
            <Text style={styles.emptyTitle}>{error.missing ? "This story isn't available" : "Couldn't load this story"}</Text>
            <Text style={styles.emptyText}>{error.missing ? "It may have moved or been taken down." : error.msg}</Text>
            <TouchableOpacity onPress={error.missing ? () => router.replace("/blog") : load} style={styles.button}>
              <Text style={styles.buttonText}>{error.missing ? "See all stories" : "Try again"}</Text>
            </TouchableOpacity>
          </View>
        ) : <ActivityIndicator color={Colors.terra} />}
        {chrome}
      </View>
    );
  }

  const inline = new Set(Array.from(post.body.matchAll(/\[\[stay:([A-Za-z0-9_-]+)\]\]/g), (m) => m[1]));
  const stays = post.listings.filter((l) => !inline.has(l.id));
  const related = post.related ?? [];

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View>
          <Cover post={post} size="large" style={{ width: W, height: Math.round(W * 0.92) + insets.top }} />
          <LinearGradient colors={["rgba(0,0,0,0.28)", "transparent"]} style={[styles.topScrim, { height: insets.top + 80 }]} pointerEvents="none" />
          {!!post.cover_credit && <Text style={styles.credit}>{post.cover_credit}</Text>}
        </View>

        <View style={styles.sheet}>
          <Text style={styles.kicker}>{post.category_label.toUpperCase()}</Text>
          <Text style={styles.title} accessibilityRole="header">{post.title}</Text>
          {!!post.excerpt && <Text style={styles.excerpt}>{post.excerpt}</Text>}

          <View style={styles.byline}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(post.author_name || "A").charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.author}>{post.author_name}{post.author_role ? <Text style={styles.role}>{`  ·  ${post.author_role}`}</Text> : null}</Text>
              <Text style={styles.meta}>{[postDate(post.published_at), readTime(post.reading_minutes)].filter(Boolean).join("  ·  ")}</Text>
            </View>
          </View>

          <BlogMarkdown source={post.body} listings={post.listings} />

          {post.tags.length > 0 && (
            <View style={styles.tags}>
              {post.tags.map((t) => <Text key={t} style={styles.tag}>#{t}</Text>)}
            </View>
          )}

          <TouchableOpacity onPress={share} style={styles.shareRow} accessibilityRole="button">
            <Ionicons name="share-social-outline" size={18} color={Colors.terraDeep} />
            <Text style={styles.shareText}>Share this story</Text>
          </TouchableOpacity>
        </View>

        {stays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.kicker}>WHERE TO STAY</Text>
            <Text style={styles.sectionTitle}>Homes from this story</Text>
            <View style={{ gap: 18, marginTop: 14 }}>
              {stays.map((l) => <ListingCardItem key={l.id} listing={l} wide />)}
            </View>
          </View>
        )}

        {!!post.destination && (
          <TouchableOpacity style={styles.cta} activeOpacity={0.9}
                            onPress={() => router.push(`/search?where=${encodeURIComponent(placeName(post.destination))}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Stay in {placeName(post.destination)}</Text>
              <Text style={styles.ctaSub}>Homestays with verified hosts, prices in ₹ with GST included.</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.paper} />
          </TouchableOpacity>
        )}

        {related.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <Text style={[styles.kicker, { paddingHorizontal: 20 }]}>KEEP READING</Text>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>More stories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, marginTop: 14 }}>
              {related.map((r) => <PostTile key={r.slug} post={r} />)}
            </ScrollView>
            <TouchableOpacity onPress={() => router.push("/blog")} style={{ paddingHorizontal: 20, marginTop: 18 }}>
              <Text style={styles.allLink}>All stories</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {chrome}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: "center", justifyContent: "center" },
  chrome: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", ...Shadows.pill },
  topScrim: { position: "absolute", left: 0, right: 0, top: 0 },
  credit: { position: "absolute", right: 12, bottom: 34, fontFamily: Fonts.regular, fontSize: 10.5, color: "rgba(255,255,255,0.85)",
            textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 3 },
  sheet: { marginTop: -22, backgroundColor: Colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 26 },
  kicker: { fontFamily: Fonts.regular, fontSize: 10.5, fontWeight: "800", letterSpacing: 2, color: Colors.terra },
  title: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 35, fontWeight: "700", color: Colors.charcoal, letterSpacing: -0.6, marginTop: 8 },
  excerpt: { fontFamily: Fonts.regular, fontSize: 16.5, lineHeight: 25, color: Colors.charcoal2, marginTop: 12 },
  byline: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 10, paddingVertical: 14,
            borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.edgeStrong },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.terraTint, borderWidth: 1, borderColor: Colors.terraSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: Fonts.display, fontSize: 17, fontWeight: "700", color: Colors.terraDeep },
  author: { fontFamily: Fonts.regular, fontSize: 14, fontWeight: "700", color: Colors.charcoal },
  role: { fontWeight: "500", color: Colors.charcoal2 },
  meta: { fontFamily: Fonts.regular, fontSize: 12.5, fontWeight: "600", color: Colors.charcoal3, marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24 },
  tag: { fontFamily: Fonts.regular, fontSize: 13, fontWeight: "600", color: Colors.charcoal2, backgroundColor: Colors.paper,
         borderWidth: 1, borderColor: Colors.edge, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, overflow: "hidden" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 16,
              borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.terraSoft, backgroundColor: Colors.terraTint },
  shareText: { fontFamily: Fonts.regular, fontSize: 14, fontWeight: "700", color: Colors.terraDeep },
  section: { paddingHorizontal: 20, marginTop: 40 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 22, fontWeight: "700", color: Colors.charcoal, letterSpacing: -0.3, marginTop: 4 },
  cta: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 20, marginTop: 36, padding: 20, borderRadius: Radius.xl, backgroundColor: Colors.charcoal },
  ctaTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: "700", color: Colors.paper },
  ctaSub: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  allLink: { fontFamily: Fonts.regular, fontSize: 14, fontWeight: "800", color: Colors.terraDeep, textDecorationLine: "underline" },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 20, fontWeight: "700", color: Colors.charcoal, textAlign: "center" },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.charcoal2, textAlign: "center", marginTop: 8 },
  button: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.terra },
  buttonText: { fontFamily: Fonts.regular, fontSize: 14, fontWeight: "700", color: Colors.paper },
});
