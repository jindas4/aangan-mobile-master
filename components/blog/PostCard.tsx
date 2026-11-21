import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts, Radius, Shadows } from "@/constants/Colors";
import { RemoteImage } from "@/components/RemoteImage";
import { type BlogCard, postDate, readTime } from "@/lib/blog";

const W = Dimensions.get("window").width;

export function Cover({ post, size = "medium", style }: { post: BlogCard; size?: "medium" | "large"; style: any }) {
  if (!post.cover_url) {
    return (
      <View style={[style, styles.noCover]}>
        <Text style={styles.noCoverText}>Aangan</Text>
      </View>
    );
  }
  return <RemoteImage url={post.cover_url} size={size} style={[style, { backgroundColor: Colors.terraTint }]}
                      contentFit="cover" transition={200} accessibilityLabel={post.cover_alt} />;
}

export function Meta({ post, light }: { post: BlogCard; light?: boolean }) {
  const parts = [postDate(post.published_at), readTime(post.reading_minutes)];
  if (post.language === "hi") parts.push("हिन्दी");
  return <Text style={[styles.meta, light && { color: "rgba(255,255,255,0.85)" }]}>{parts.filter(Boolean).join("  ·  ")}</Text>;
}

/** The lead story: a full-width photo with the headline under it. */
export function FeaturedPost({ post }: { post: BlogCard }) {
  const router = useRouter();
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/blog/${post.slug}`)} style={styles.featured}
                      accessibilityRole="button" accessibilityLabel={`Featured: ${post.title}`}>
      <Cover post={post} size="large" style={{ width: "100%", aspectRatio: 4 / 3 }} />
      <View style={styles.featuredBody}>
        <View style={styles.row}>
          <Text style={styles.featuredPill}>FEATURED</Text>
          <Text style={styles.kicker}>{post.category_label.toUpperCase()}</Text>
        </View>
        <Text style={styles.featuredTitle}>{post.title}</Text>
        {!!post.excerpt && <Text style={styles.excerpt} numberOfLines={3}>{post.excerpt}</Text>}
        <Text style={styles.author}>{post.author_name}</Text>
        <Meta post={post} />
      </View>
    </TouchableOpacity>
  );
}

/** A story in the list: thumbnail on the left, words on the right. */
export function PostRow({ post }: { post: BlogCard }) {
  const router = useRouter();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/blog/${post.slug}`)} style={styles.rowCard}
                      accessibilityRole="button" accessibilityLabel={post.title}>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>{post.category_label.toUpperCase()}</Text>
        <Text style={styles.rowTitle} numberOfLines={3}>{post.title}</Text>
        <Meta post={post} />
      </View>
      <Cover post={post} style={styles.thumb} />
    </TouchableOpacity>
  );
}

/** A small card for horizontal rails (Explore, "More stories"). */
export function PostTile({ post, width = Math.min(260, W * 0.68) }: { post: BlogCard; width?: number }) {
  const router = useRouter();
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/blog/${post.slug}`)} style={{ width }}
                      accessibilityRole="button" accessibilityLabel={post.title}>
      <Cover post={post} style={{ width, height: width * 0.66, borderRadius: Radius.lg }} />
      <Text style={[styles.kicker, { marginTop: 10 }]}>{post.category_label.toUpperCase()}</Text>
      <Text style={styles.tileTitle} numberOfLines={2}>{post.title}</Text>
      <Meta post={post} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  noCover: { backgroundColor: Colors.terraTint, alignItems: "center", justifyContent: "center" },
  noCoverText: { fontFamily: Fonts.display, fontStyle: "italic", fontSize: 18, color: Colors.terra, opacity: 0.6 },
  meta: { fontFamily: Fonts.regular, fontSize: 12, fontWeight: "600", color: Colors.charcoal3, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  kicker: { fontFamily: Fonts.regular, fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6, color: Colors.terraDeep },
  featured: { backgroundColor: Colors.paper, borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1, borderColor: Colors.line, ...Shadows.card },
  featuredBody: { padding: 18 },
  featuredPill: { fontFamily: Fonts.regular, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: Colors.paper,
                  backgroundColor: Colors.terra, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  featuredTitle: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30, fontWeight: "700", color: Colors.charcoal, letterSpacing: -0.4, marginTop: 10 },
  excerpt: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.charcoal2, marginTop: 8 },
  author: { fontFamily: Fonts.regular, fontSize: 13, fontWeight: "700", color: Colors.charcoal, marginTop: 14 },
  rowCard: { flexDirection: "row", gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.edgeStrong },
  rowTitle: { fontFamily: Fonts.display, fontSize: 18, lineHeight: 23, fontWeight: "700", color: Colors.charcoal, marginTop: 5 },
  thumb: { width: 104, height: 104, borderRadius: Radius.md },
  tileTitle: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, fontWeight: "700", color: Colors.charcoal, marginTop: 4 },
});
