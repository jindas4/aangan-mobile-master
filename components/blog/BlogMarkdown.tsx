// A blog post's body, drawn with native views. The parsing lives in
// lib/blog.ts and follows the same rules as the website's renderer.
import { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { Colors, Fonts, Radius } from "@/constants/Colors";
import { WEB_BASE, type ListingCard } from "@/lib/api";
import { parseBlog, parseInline, safeHref, type Span } from "@/lib/blog";
import { imageUrl, imageVariantUrl } from "@/lib/format";
import { ListingCardItem } from "@/components/ListingCard";

const SCREEN_W = Dimensions.get("window").width;

function useOpenLink() {
  const router = useRouter();
  return (href: string) => {
    // Another post opens in the app; any other page of ours or the web opens in
    // the in-app browser sheet.
    const post = /^\/blog\/([a-z0-9-]+)\/?$/.exec(href);
    if (post) return router.push(`/blog/${post[1]}`);
    if (href.startsWith("mailto:")) return WebBrowser.openBrowserAsync(href).catch(() => {});
    const url = href.startsWith("/") ? `${WEB_BASE}${href}` : href;
    WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => {});
  };
}

function Spans({ spans, open }: { spans: Span[]; open: (h: string) => void }) {
  return (
    <>
      {spans.map((s, k) => {
        switch (s.t) {
          case "text":
            return s.text;
          case "bold":
            return <Text key={k} style={styles.bold}><Spans spans={s.children} open={open} /></Text>;
          case "italic":
            return <Text key={k} style={styles.italic}>{s.text}</Text>;
          case "link":
            return (
              <Text key={k} style={styles.link} onPress={() => open(s.href)} accessibilityRole="link">
                {s.label}
              </Text>
            );
        }
      })}
    </>
  );
}

export function InlineText({ text, style }: { text: string; style?: any }) {
  const open = useOpenLink();
  return <Text style={style}><Spans spans={parseInline(text)} open={open} /></Text>;
}

function Photo({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const [ratio, setRatio] = useState(3 / 2);
  const original = imageUrl(src);
  const [uri, setUri] = useState(imageVariantUrl(original, "large"));
  return (
    <View style={styles.figure}>
      <Image
        source={{ uri }}
        accessibilityLabel={alt}
        style={{ width: SCREEN_W, aspectRatio: ratio, backgroundColor: Colors.terraTint }}
        contentFit="cover"
        transition={200}
        onLoad={(e) => {
          const { width, height } = e.source;
          if (width && height) setRatio(Math.max(0.6, Math.min(2.2, width / height)));
        }}
        onError={() => { if (uri !== original) setUri(original); }}
      />
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

export function BlogMarkdown({ source, listings = [] }: { source: string; listings?: ListingCard[] }) {
  const open = useOpenLink();
  const byId = new Map(listings.map((l) => [l.id, l]));
  const blocks = parseBlog(source);
  const firstP = blocks.findIndex((b) => b.t === "p");

  return (
    <View>
      {blocks.map((b, n) => {
        switch (b.t) {
          case "h":
            return (
              <Text key={n} style={b.level === 2 ? styles.h2 : styles.h3} accessibilityRole="header">
                <Spans spans={parseInline(b.text)} open={open} />
              </Text>
            );
          case "p":
            return (
              <Text key={n} style={[styles.p, n === firstP && styles.lead]}>
                <Spans spans={parseInline(b.text)} open={open} />
              </Text>
            );
          case "ul":
          case "ol":
            return (
              <View key={n} style={styles.list}>
                {b.items.map((t, j) => (
                  <View key={j} style={styles.li}>
                    <Text style={styles.marker}>{b.t === "ol" ? `${j + 1}.` : "•"}</Text>
                    <Text style={[styles.p, styles.liText]}><Spans spans={parseInline(t)} open={open} /></Text>
                  </View>
                ))}
              </View>
            );
          case "quote":
            return (
              <View key={n} style={styles.quote}>
                <Text style={styles.quoteText}><Spans spans={parseInline(b.text)} open={open} /></Text>
              </View>
            );
          case "callout":
            return (
              <View key={n} style={[styles.callout, b.kind === "tip" ? styles.tip : styles.note]}>
                <Text style={styles.calloutKicker}>{b.kind === "tip" ? "AANGAN TIP" : "GOOD TO KNOW"}</Text>
                <Text style={styles.calloutText}><Spans spans={parseInline(b.text)} open={open} /></Text>
              </View>
            );
          case "img":
            return safeHref(b.src) ? <Photo key={n} src={b.src} alt={b.alt} caption={b.caption} /> : null;
          case "stay": {
            const l = byId.get(b.id);
            if (!l) return null;
            return (
              <View key={n} style={styles.stay}>
                <Text style={styles.calloutKicker}>STAY HERE</Text>
                <View style={{ marginTop: 10 }}><ListingCardItem listing={l} wide /></View>
              </View>
            );
          }
          case "hr":
            return <Text key={n} style={styles.hr} accessibilityElementsHidden importantForAccessibility="no">✦  ✦  ✦</Text>;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  p: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 28, color: Colors.charcoal2, marginVertical: 10 },
  lead: { fontSize: 18.5, lineHeight: 30, color: Colors.charcoal },
  bold: { fontWeight: "700", color: Colors.charcoal },
  italic: { fontStyle: "italic" },
  link: { color: Colors.terraDeep, textDecorationLine: "underline" },
  h2: { fontFamily: Fonts.display, fontSize: 25, lineHeight: 31, fontWeight: "700", color: Colors.charcoal, letterSpacing: -0.3, marginTop: 30, marginBottom: 6 },
  h3: { fontFamily: Fonts.regular, fontSize: 18.5, lineHeight: 25, fontWeight: "800", color: Colors.charcoal, marginTop: 22, marginBottom: 4 },
  list: { marginVertical: 8 },
  li: { flexDirection: "row", gap: 10, paddingLeft: 4 },
  marker: { width: 18, fontFamily: Fonts.regular, fontSize: 17, lineHeight: 28, color: Colors.terra, fontWeight: "800", marginVertical: 4 },
  liText: { flex: 1, marginVertical: 4 },
  quote: { borderLeftWidth: 3, borderLeftColor: Colors.terra, paddingLeft: 18, marginVertical: 24 },
  quoteText: { fontFamily: Fonts.display, fontStyle: "italic", fontSize: 22, lineHeight: 30, color: Colors.charcoal },
  callout: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginVertical: 18 },
  tip: { backgroundColor: Colors.terraTint, borderColor: Colors.terraSoft },
  note: { backgroundColor: Colors.paper, borderColor: Colors.edge },
  calloutKicker: { fontFamily: Fonts.regular, fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6, color: Colors.terraDeep },
  calloutText: { fontFamily: Fonts.regular, fontSize: 15.5, lineHeight: 24, color: Colors.charcoal2, marginTop: 5 },
  figure: { marginVertical: 22, marginHorizontal: -20 },
  caption: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.charcoal3, marginTop: 8, paddingHorizontal: 20 },
  stay: { marginVertical: 22 },
  hr: { textAlign: "center", color: Colors.terra, fontSize: 14, letterSpacing: 6, marginVertical: 28 },
});
