import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://backend-service-production-2df4.up.railway.app";
// Overridable per-build via EXPO_PUBLIC_WEB_URL (see eas.json).
export const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL || "https://www.aanganstay.com";
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

// This install's id. The backend uses it to remember how someone first found
// a host before they signed in (backend services/introductions.py).
const DEVICE_KEY = "hm_device_id";
let deviceId: string | null = null;

function getDeviceId(): string | null {
  if (deviceId) return deviceId;
  try {
    let id = SecureStore.getItem(DEVICE_KEY);
    if (!id) {
      id = "app_" + Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("");
      SecureStore.setItem(DEVICE_KEY, id);
    }
    deviceId = id;
  } catch {}
  return deviceId;
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
  const did = getDeviceId();
  if (did) headers["x-device-id"] = did;

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
          : "Couldn't reach Aangan Stay. Check your connection and try again.",
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
        // Never show a bare status code ("500") to a person.
        (res.status >= 500
          ? "Something went wrong on our side. Please try again in a moment."
          : `Request failed (${res.status}). Please try again.`);
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
        : "Couldn't reach Aangan Stay. Check your connection and try again.",
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
  /** Tiny data: URI preview to show while the photo loads. In lists only the cover has one. */
  blur?: string | null;
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
  /** The night's price with GST added, and the GST rate. */
  price_incl_tax_inr?: number;
  tax_pct?: number;
  /** On a search for dates: the whole stay with cleaning and GST included. */
  stay_nights?: number | null;
  stay_total_inr?: number | null;
  /** House rules: true = welcome/allowed, false = not, null = not stated. */
  pet_friendly?: boolean;
  couples_ok?: boolean | null;
  local_id_ok?: boolean | null;
  alcohol_ok?: boolean | null;
  /** Registered with the state tourism department, and checked by Aangan Stay. */
  state_registered?: boolean;
  rating: number;
  reviews_count: number;
  guests: number;
  bedrooms: number;
  baths: number;
  instant_book: boolean;
  /** What a guest gets back on cancelling: the standard tiers, or nothing. */
  cancellation_policy?: "flexible" | "non_refundable";
  veg_kitchen: boolean;
  jain_friendly: boolean;
  min_nights?: number;
  /** Check-in from / check-out by, "HH:MM" Indian time (required on every listing). */
  checkin_time?: string;
  checkout_time?: string;
  distance_note: string;
  tags: string[];
  lat: number;
  lng: number;
  published?: boolean;
  images: ListingImage[];
}

export interface ListingFull extends ListingCard {
  /** State tourism registration number: present for guests once checked, and always for the owner. */
  registration_no?: string | null;
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
  /** Fixed when the booking was made. */
  cancellation_policy?: "flexible" | "non_refundable" | null;
  /** This stay's check-in from / check-out by ("HH:MM"), fixed when booked. */
  checkin_time?: string | null;
  checkout_time?: string | null;
  /** Per-night rate on a booking (the stay costs nightly_inr × nights). */
  nightly_inr: number;
  cleaning_inr: number;
  service_inr: number;
  tax_inr: number;
  /** GST rate on the stay; null on older bookings (12%). */
  tax_pct?: number | null;
  total_inr: number;
  /** Referral credits applied — the guest pays total_inr - credits_inr. */
  credits_inr?: number;
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
  /** Who booked — present only when the viewer is the host. */
  guest_name?: string | null;
  /** Who is hosting — present only when the viewer is the guest, on a single booking. */
  host_name?: string | null;
  /** The guest has already reviewed this stay (one review per booking). */
  reviewed?: boolean;
  /** Whether the booking can still be cancelled (until its check-in day). */
  can_cancel?: boolean;
  /** When the guest reported a problem at check-in, if they did. */
  checkin_problem_at?: string | null;
  /** What the host is paid and what is taken off first — present only when the viewer is the host. */
  host_earnings?: HostEarnings | null;
}

export interface HostEarnings {
  earnings_inr: number;
  fee_pct: number;
  fee_inr: number;
  fee_gst_inr: number;
  tds_pct: number;
  tds_inr: number;
  payout_inr: number;
  /** Who introduced the guest: Aangan Stay ("marketplace") or the host's own link ("direct"). */
  introduced_by?: "marketplace" | "direct";
}

export interface AvailabilityResponse {
  available: boolean;
  nights: number;
  /** Price line: price_per_night_inr × nights = nights_total_inr. */
  price_per_night_inr?: number;
  nights_total_inr?: number;
  /** Deprecated — the total for all nights, not a per-night rate. */
  nightly_inr: number;
  cleaning_inr: number;
  service_inr: number;
  tax_inr: number;
  /** GST rate on the stay; null on older bookings (12%). */
  tax_pct?: number | null;
  total_inr: number;
  min_nights: number;
  /** False while new bookings are paused (until live payments are on). */
  bookings_open?: boolean;
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
  /** Which gateway the server chose: "razorpay" | "cashfree" | "local". */
  provider?: string;
  cashfree_order_id?: string | null;
  cashfree_payment_session_id?: string | null;
  /** "sandbox" | "production" */
  cashfree_mode?: string | null;
}

export interface PaymentConfirmResponse {
  status: string;
  /** Authoritative booking state after payment — "confirmed" for instant-book
   *  listings, otherwise still "pending" while the host reviews. */
  booking_status: string;
  payment_id: string;
  booking_id: string;
}

// ── Referral program ───────────────────────────────────────────
export interface ReferralEventOut {
  id: string;
  kind: string;
  status: string;
  amount_inr: number;
  note?: string | null;
  created_at?: string | null;
}
export interface ReferralMe {
  code: string;
  share_url: string;
  balance_inr: number;
  pending_inr: number;
  referee_bonus_inr: number;
  referrer_reward_inr: number;
  min_booking_inr: number;
  /** The friend's stay must be worth at least this for the referrer's reward. */
  min_qualifying_stay_inr?: number;
  history: ReferralEventOut[];
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
  photos: string[];
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
  key: "phone" | "email" | "aadhaar" | "pan" | "payout";
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
