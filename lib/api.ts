import * as SecureStore from "expo-secure-store";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://backend-service-production-2df4.up.railway.app";
// Overridable per-build via EXPO_PUBLIC_WEB_URL (see eas.json). Fallback is the
// current Railway domain; switch the env to https://aangan.net.in once its DNS
// resolves — no code change needed.
export const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL || "https://frontend-production-7d9b.up.railway.app";
const TOKEN_KEY = "hm_token";

export function getToken(): string | null {
  try {
    return SecureStore.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getTokenAsync(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(t: string | null) {
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

type ReqInit = Omit<RequestInit, "body"> & {
  body?: any;
  token?: string | null;
  /** Abort the request after this many ms (default 20s). */
  timeoutMs?: number;
  /** Retry attempts for transient failures. Defaults: GET → 2, mutations → 0
   *  (a booking/payment POST must never fire twice). */
  retries?: number;
};

export class ApiError extends Error {
  constructor(msg: string, public status: number, public body?: any) {
    super(msg);
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch() with a hard deadline — on Indian 3G/4G a request that would hang
 *  forever must fail fast so the UI can offer a retry. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function api<T = any>(path: string, init: ReqInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = init.token === undefined ? getToken() : init.token;
  if (token) headers["authorization"] = `Bearer ${token}`;

  const body =
    init.body !== undefined && typeof init.body !== "string"
      ? JSON.stringify(init.body)
      : (init.body as string | undefined);

  const method = (init.method || "GET").toUpperCase();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Only idempotent reads retry automatically; retrying a POST could
  // double-book or double-charge.
  const maxRetries = init.retries ?? (method === "GET" ? 2 : 0);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter: ~500ms, ~1s.
      await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
    }
    let res: Response;
    try {
      res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, method, headers, body }, timeoutMs);
    } catch (e: any) {
      // Network drop or timeout — retry if we have budget, else surface a
      // human-readable error instead of "AbortError".
      lastErr = e;
      if (attempt < maxRetries) continue;
      const timedOut = e?.name === "AbortError";
      throw new ApiError(
        timedOut
          ? "Request timed out. Check your connection and try again."
          : "Couldn't reach Aangan. Check your connection and try again.",
        0,
      );
    }
    const text = await res.text();
    const data = text ? safeParse(text) : null;
    if (!res.ok) {
      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) continue;
      const detail = data?.detail;
      const msg =
        (typeof detail === "string" ? detail : detail?.message) ||
        data?.message ||
        `${res.status} ${res.statusText}`;
      throw new ApiError(msg, res.status, data);
    }
    return data as T;
  }
  throw lastErr instanceof Error ? lastErr : new ApiError("Request failed", 0);
}

function safeParse(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export async function uploadFile<T = any>(path: string, uri: string, filename: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["authorization"] = `Bearer ${token}`;
  const fd = new FormData();
  fd.append("file", { uri, name: filename, type: "image/jpeg" } as any);
  let res: Response;
  try {
    // Uploads get a longer deadline (large photos on slow uplinks), no retry —
    // the PhotoPicker UI already has per-image retry.
    res = await fetchWithTimeout(`${API_BASE}${path}`, { method: "POST", body: fd, headers }, 60_000);
  } catch (e: any) {
    throw new ApiError(
      e?.name === "AbortError"
        ? "Upload timed out. Check your connection and try again."
        : "Couldn't reach Aangan. Check your connection and try again.",
      0,
    );
  }
  const text = await res.text();
  const data = text ? safeParse(text) : null;
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      (typeof detail === "string" ? detail : detail?.message) ||
      data?.message ||
      `${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

// ── Types ────────────────────────────────────────────────
export type Scene =
  | "mountain"
  | "beach"
  | "city"
  | "forest"
  | "lake"
  | "desert"
  | "backwater"
  | "heritage";

export interface UserOut {
  id: string;
  phone?: string | null;
  // The backend returns null (not undefined) for an unset name/email/avatar —
  // verified against the OpenAPI schema by lib/api-contract.ts.
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  is_host: boolean;
  lang: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  fully_verified?: boolean;
  kyc_status?: "unstarted" | "pending" | "verified" | "rejected";
  is_admin?: boolean;
  suspended?: boolean;
  host_bio?: string | null;
  host_languages?: string | null;
  host_response_time?: string | null;
  host_joined_at?: string | null;
  superhost?: boolean;
}

export interface ListingImage {
  id: number;
  url: string;
  position: number;
  label?: string;
}

export interface ListingCard {
  id: string;
  slug: string;
  title: string;
  type: string;
  scene: Scene;
  city: string;
  area: string;
  price_inr: number;
  rating: number;
  reviews_count: number;
  guests: number;
  bedrooms: number;
  baths: number;
  instant_book: boolean;
  veg_kitchen: boolean;
  jain_friendly: boolean;
  min_nights?: number;
  distance_note: string;
  tags: string[];
  lat: number;
  lng: number;
  published?: boolean;
  images: ListingImage[];
}

export interface ListingFull extends ListingCard {
  description: string;
  amenities: string[];
  cleaning_fee_inr: number;
  min_nights: number;
  host: {
    id: string;
    name?: string | null;
    avatar_url?: string | null;
    is_verified: boolean;
    fully_verified: boolean;
    host_bio?: string | null;
    host_languages?: string | null;
    host_response_time?: string | null;
    superhost?: boolean;
  };
}

export interface BookingOut {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  nights: number;
  guests: number;
  nightly_inr: number;
  cleaning_inr: number;
  service_inr: number;
  tax_inr: number;
  total_inr: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "refunded";
  payment_id?: string | null;
  created_at: string;
}

export interface BookingWithListing extends BookingOut {
  listing_title: string;
  listing_city: string;
  listing_area: string;
  listing_scene: Scene;
  listing_image?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  nights: number;
  nightly_inr: number;
  cleaning_inr: number;
  service_inr: number;
  tax_inr: number;
  total_inr: number;
  min_nights: number;
}

export interface CalendarRange {
  start_date: string;
  end_date: string;
  kind: "block" | "booking";
  reason: string | null;
}

export interface CalendarResponse {
  listing_id: string;
  min_nights: number;
  unavailable: CalendarRange[];
}

export interface PaymentInitResponse {
  payment_id: string;
  razorpay_order_id: string | null;
  /** null while the backend runs in PAYMENTS_DEV_MODE — no real gateway call. */
  razorpay_key: string | null;
  amount_inr: number;
}

export interface PaymentConfirmResponse {
  status: string;
  /** Authoritative booking state after payment — "confirmed" for instant-book
   *  listings, otherwise still "pending" while the host reviews. */
  booking_status: string;
  payment_id: string;
  booking_id: string;
}

export interface RefundQuoteResponse {
  tier: "free" | "half" | "none" | "host_full";
  refund_pct: number;
  refund_inr: number;
  note: string;
  total_inr: number;
}

export interface CancelResponse {
  booking_id: string;
  booking_status: string;
  refund_pct: number;
  refund_inr: number;
  tier: string;
  note: string;
}

export interface Review {
  id: number;
  listing_id: string;
  booking_id: string;
  author_id: string;
  author_name: string | null;
  rating: number;
  body: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  listing_id: string;
  listing_title: string | null;
  guest_id: string;
  host_id: string;
  other: { id: string; name: string | null; avatar_url: string | null; fully_verified: boolean } | null;
  last_message: string | null;
  last_at: string | null;
  unread_count: number;
}

export interface Message {
  id: number;
  sender_id: string | null;
  body: string;
  kind?: "user" | "system";
  created_at: string;
}

export interface VerificationStep {
  key: "phone" | "email" | "aadhaar" | "payout";
  label: string;
  done: boolean;
  required: boolean;
  hint: string;
  status?: "unverified" | "pending" | "verified" | "rejected" | null;
}

export interface VerificationStatus {
  role: "host" | "guest";
  eligible: boolean;
  missing: string[];
  steps: VerificationStep[];
}

export interface CmsBanner {
  id: number;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  audience: string;
}

export interface CmsCollection {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  scene: string;
  filters: Record<string, unknown>;
}

export interface HostAnalytics {
  this_month: { bookings: number; revenue_inr: number };
  last_month: { bookings: number; revenue_inr: number };
  all_time: { bookings: number; revenue_inr: number };
  upcoming_checkins_7d: number;
  direct_bookings: number;
}
