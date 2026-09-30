import { create } from "zustand";
import { api, setToken, getToken, getTokenAsync, UserOut } from "./api";
import { registerPushToken, unregisterPushToken } from "./pushNotifications";

interface AuthState {
  user: UserOut | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  requestOtp: (phone: string) => Promise<string | undefined>;
  verifyOtp: (phone: string, code: string) => Promise<UserOut>;
  requestEmailOtp: (email: string) => Promise<string | undefined>;
  verifyEmailOtp: (email: string, code: string) => Promise<UserOut>;
  /** Returns verify-screen info when the email still needs confirming, or null when already signed in. */
  registerWithPassword: (firstName: string, lastName: string, email: string, password: string) => Promise<{ devCode: string | null; codeSent: boolean; message: string | null } | null>;
  verifySignup: (email: string, code: string) => Promise<UserOut>;
  loginWithPassword: (email: string, password: string) => Promise<UserOut>;
  requestPasswordReset: (email: string) => Promise<string | undefined>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  socialLogin: (provider: string, token: string) => Promise<UserOut>;
  logout: () => void;
  refresh: () => Promise<void>;
  becomeHost: () => Promise<UserOut>;
  updateProfile: (patch: { name?: string; email?: string; lang?: string; avatar_url?: string; host_bio?: string; host_languages?: string; host_response_time?: string }) => Promise<UserOut>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  async hydrate() {
    const token = await getTokenAsync();
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const me = await api<UserOut>("/api/auth/me");
      set({ user: me, hydrated: true });
    } catch {
      await setToken(null);
      set({ user: null, hydrated: true });
    }
  },
  async requestOtp(phone) {
    const res = await api<{ ok: boolean; dev_code?: string }>("/api/auth/otp/request", {
      method: "POST",
      body: { phone },
    });
    return res.dev_code;
  },
  async verifyOtp(phone, code) {
    const res = await api<{ token: string; user: UserOut }>("/api/auth/otp/verify", {
      method: "POST",
      body: { phone, code },
    });
    await setToken(res.token);
    set({ user: res.user });
    registerPushToken().catch(() => {});
    return res.user;
  },
  async requestEmailOtp(email) {
    const res = await api<{ ok: boolean; dev_code?: string }>("/api/auth/email/otp/request", {
      method: "POST",
      body: { email },
    });
    return res.dev_code;
  },
  async verifyEmailOtp(email, code) {
    const res = await api<{ token: string; user: UserOut }>("/api/auth/email/otp/verify", {
      method: "POST",
      body: { email, code },
    });
    await setToken(res.token);
    set({ user: res.user });
    registerPushToken().catch(() => {});
    return res.user;
  },
  async registerWithPassword(firstName, lastName, email, password) {
    const res = await api<{ token?: string; user?: UserOut; dev_code?: string | null; code_sent?: boolean; message?: string | null }>(
      "/api/auth/password/register",
      { method: "POST", body: { first_name: firstName, last_name: lastName || null, email, password } },
    );
    if (res.token && res.user) {   // backends from before email verification sign you in straight away
      await setToken(res.token);
      set({ user: res.user });
      registerPushToken().catch(() => {});
      return null;
    }
    return { devCode: res.dev_code ?? null, codeSent: res.code_sent !== false, message: res.message ?? null };
  },
  async verifySignup(email, code) {
    const res = await api<{ token: string; user: UserOut }>("/api/auth/password/register/verify", {
      method: "POST",
      body: { email, code },
    });
    await setToken(res.token);
    set({ user: res.user });
    registerPushToken().catch(() => {});
    return res.user;
  },
  async loginWithPassword(email, password) {
    const res = await api<{ token: string; user: UserOut }>("/api/auth/password/login", {
      method: "POST",
      body: { email, password },
    });
    await setToken(res.token);
    set({ user: res.user });
    registerPushToken().catch(() => {});
    return res.user;
  },
  async requestPasswordReset(email) {
    const res = await api<{ ok: boolean; dev_code?: string }>("/api/auth/password/reset/request", {
      method: "POST",
      body: { email },
    });
    return res.dev_code;
  },
  async confirmPasswordReset(email, code, newPassword) {
    await api("/api/auth/password/reset/confirm", {
      method: "POST",
      body: { email, code, new_password: newPassword },
    });
  },
  async socialLogin(provider, token) {
    const res = await api<{ token: string; user: UserOut }>("/api/auth/mobile/social-login", {
      method: "POST",
      body: { provider, token },
    });
    await setToken(res.token);
    set({ user: res.user });
    registerPushToken().catch(() => {});
    return res.user;
  },
  async logout() {
    await unregisterPushToken().catch(() => {});
    // Revoke the token server-side (jti denylist) before discarding it —
    // fire-and-forget so logout never blocks on the network.
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
    await setToken(null);
    set({ user: null });
  },
  async refresh() {
    const me = await api<UserOut>("/api/auth/me");
    set({ user: me });
  },
  async becomeHost() {
    const me = await api<UserOut>("/api/auth/host/enable", { method: "POST" });
    set({ user: me });
    return me;
  },
  async updateProfile(patch) {
    const me = await api<UserOut>("/api/auth/me", { method: "PATCH", body: patch });
    set({ user: me });
    return me;
  },
}));

// Wishlist store
interface WishState {
  ids: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
  has: (id: string) => boolean;
}

export const useWishlist = create<WishState>((set, get) => ({
  ids: new Set(),
  hydrated: false,
  async hydrate() {
    if (!getToken()) {
      set({ hydrated: true });
      return;
    }
    try {
      const items = await api<{ id: string }[]>("/api/wishlist");
      set({ ids: new Set(items.map((x) => x.id)), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  has(id) {
    return get().ids.has(id);
  },
  async toggle(id) {
    const { ids } = get();
    const next = new Set(ids);
    const has = next.has(id);
    if (has) next.delete(id);
    else next.add(id);
    set({ ids: next });
    try {
      if (has) await api(`/api/wishlist/${id}`, { method: "DELETE" });
      else await api(`/api/wishlist/${id}`, { method: "POST" });
    } catch {
      set({ ids });
    }
  },
}));
