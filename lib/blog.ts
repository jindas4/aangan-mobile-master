// The Aangan Stay blog. Posts come from the backend (api/routes_blog.py); the
// website shows the same posts at /blog. The Markdown rules here match the
// web's components/blog/BlogMarkdown.tsx — keep them in step.
//
//   ## Heading / ### Subheading
//   paragraphs, **bold**, *italic*, [link](https://… or /path)
//   - bullets, 1. numbered
//   > a pull quote          > [!TIP] Aangan tip      > [!NOTE] Good to know
//   ![What the photo shows](https://… "Caption")   a photo on its own line
//   [[stay:lst_abc123]]     a card for that home, to book it
//   ---                     a divider
import { api, WEB_BASE, type ListingCard } from "@/lib/api";

export type BlogCategory = "travel-guides" | "homestay-stories" | "food-culture" | "festivals" | "host-tips" | "news";

export interface BlogCard {
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string;
  category: BlogCategory;
  category_label: string;
  tags: string[];
  language: "en" | "hi";
  author_name: string;
  author_role: string;
  destination: string;
  featured: boolean;
  published_at: string | null;
  updated_at: string | null;
  reading_minutes: number;
}

export interface BlogPost extends BlogCard {
  body: string;
  cover_credit: string;
  listing_ids: string[];
  listings: ListingCard[];
  related?: BlogCard[];
}

export interface BlogPage {
  total: number;
  featured: BlogCard | null;
  posts: BlogCard[];
}

export const PAGE_SIZE = 12;

// Order shown in the app. Labels match the backend's BLOG_CATEGORIES.
export const CATEGORIES: { key: BlogCategory; label: string }[] = [
  { key: "travel-guides", label: "Travel guides" },
  { key: "homestay-stories", label: "Homestay stories" },
  { key: "food-culture", label: "Food & culture" },
  { key: "festivals", label: "Festivals & seasons" },
  { key: "host-tips", label: "For hosts" },
  { key: "news", label: "Aangan news" },
];

export function fetchPosts(p: { category?: string | null; q?: string; offset?: number; limit?: number } = {}): Promise<BlogPage> {
  const qs = new URLSearchParams();
  if (p.category) qs.set("category", p.category);
  if (p.q) qs.set("q", p.q);
  qs.set("limit", String(p.limit ?? PAGE_SIZE));
  qs.set("offset", String(p.offset ?? 0));
  return api<BlogPage>(`/api/blog/posts?${qs.toString()}`);
}

export const fetchPost = (slug: string) => api<BlogPost>(`/api/blog/posts/${encodeURIComponent(slug)}`);

/** Count a read. Fire and forget: a failed count must never bother the reader. */
export function countView(slug: string) {
  api(`/api/blog/posts/${encodeURIComponent(slug)}/view`, { method: "POST", token: null }).catch(() => {});
}

export const postUrl = (slug: string) => `${WEB_BASE}/blog/${slug}`;

export function postDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  } catch {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
}

export const readTime = (m: number) => `${Math.max(1, m || 1)} min read`;

// ── Markdown ─────────────────────────────────────────────────────────────────
export type Block =
  | { t: "h"; level: 2 | 3; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "callout"; kind: "tip" | "note"; text: string }
  | { t: "img"; src: string; alt: string; caption: string }
  | { t: "stay"; id: string }
  | { t: "hr" };

const IMG = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const STAY = /^\[\[stay:([A-Za-z0-9_-]{3,40})\]\]$/;

export function parseBlog(md: string): Block[] {
  const lines = (md || "").replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let i = 0;
  const isStart = (l: string) => /^(#{2,3}\s|[-*]\s|\d+\.\s|>|---\s*$)/.test(l) || IMG.test(l) || STAY.test(l);
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    let m: RegExpExecArray | null;
    if ((m = /^(#{2,3})\s+(.+)$/.exec(line))) { out.push({ t: "h", level: m[1].length as 2 | 3, text: m[2] }); i++; continue; }
    if (/^---\s*$/.test(line)) { out.push({ t: "hr" }); i++; continue; }
    if ((m = IMG.exec(line))) { out.push({ t: "img", alt: m[1], src: m[2], caption: m[3] || "" }); i++; continue; }
    if ((m = STAY.exec(line))) { out.push({ t: "stay", id: m[1] }); i++; continue; }
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { body.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      const kind = /^\[!(TIP|NOTE)\]\s*/i.exec(body[0] || "");
      const text = body.join(" ").replace(/^\[!(TIP|NOTE)\]\s*/i, "").trim();
      out.push(kind ? { t: "callout", kind: kind[1].toLowerCase() as "tip" | "note", text } : { t: "quote", text });
      continue;
    }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const ordered = /^\d+\.\s/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\.\s/ : /^[-*]\s/).test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([-*]|\d+\.)\s+/, "")); i++;
      }
      out.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isStart(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    else i++;
  }
  return out;
}

export type Span =
  | { t: "text"; text: string }
  | { t: "bold"; children: Span[] }
  | { t: "italic"; text: string }
  | { t: "link"; label: string; href: string };

const INLINE = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)/g;

export function safeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  return null;
}

/** Bold, italic and links inside a line of text. A link to anything but
 *  https, mailto or one of our own paths is shown as plain text. */
export function parseInline(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push({ t: "text", text: text.slice(last, m.index) });
    const s = m[0];
    if (m[1]) out.push({ t: "bold", children: parseInline(s.slice(2, -2)) });
    else if (m[2]) {
      const [, label, raw] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(s)!;
      const href = safeHref(raw);
      out.push(href ? { t: "link", label, href } : { t: "text", text: label });
    } else out.push({ t: "italic", text: s.slice(1, -1) });
    last = m.index! + s.length;
  }
  if (last < text.length) out.push({ t: "text", text: text.slice(last) });
  return out;
}
