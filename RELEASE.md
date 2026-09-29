# Aangan — Release Runbook

The end-to-end sequence to ship the Aangan mobile app to the **Apple App Store**
and **Google Play**, plus the backend/frontend deploys it depends on.

Two repos are involved:

| Repo | Role |
| --- | --- |
| `aangan-mobile` (this) | Expo / React Native app → EAS build + store submit |
| `stayindia` | `backend/` (FastAPI) + `frontend/` (Next.js) — both on Railway |

**Golden rule:** deploy **backend → frontend → mobile build → submit**, in that
order. The mobile app calls endpoints and web pages that must already be live.

---

## 0. Reference values

| Thing | Value |
| --- | --- |
| iOS bundle id / Android package | `in.aangan.app` |
| App Store Connect App ID (`ascAppId`) | `6805300002` |
| Apple Team ID | `LRYVMJZY77` |
| EAS project id | `e607db25-0749-4e2c-b974-a29326e5d8c8` |
| Backend (prod) | `https://backend-service-production-2df4.up.railway.app` |
| Frontend (prod) | `https://frontend-production-7d9b.up.railway.app` → `https://aanganstay.com` (old `aangan.net.in` redirects) |
| Privacy Policy URL | `<frontend>/legal/privacy` |
| Support URL | `<frontend>/support` |
| Review demo login | `review@aangan.in` (password printed by the seed script) |

Full metadata checklist: the App Store Connect checklist artifact from the build session.

---

## 1. One-time setup (do once, then never again)

- [ ] **Apple Developer portal** → Identifiers → `in.aangan.app` → enable
      **Sign In with Apple** capability.
- [ ] **EAS iOS credentials** generated (`eas credentials --platform ios` → let
      EAS create the distribution cert + provisioning profile). ✅ already done.
- [ ] **Google OAuth** client IDs (Web / iOS / Android) created and set in
      `eas.json`. ✅ done.
- [ ] **Facebook** — either configure `EXPO_PUBLIC_FACEBOOK_CLIENT_ID` or leave
      it unset (the button auto-hides when unset).
- [ ] **Google Play** service account JSON saved to
      `stayindia/... /google-service-account.json` (only needed for Android submit).
- [x] **Custom domain** `aanganstay.com` DNS pointed at Railway (`aangan.net.in` redirects to it).
- [ ] **Mailboxes** `support@`, `privacy@`, `dpo@` and `safety@aangan.net.in` actually receive mail
      (referenced by the Support page).
- [ ] **GitHub secret** `EXPO_TOKEN` set (for the CI workflows).

---

## 2. Backend deploy (`stayindia/backend`)

1. **Set/verify env vars** on the Railway backend service. The auth-critical ones:

   | Var | Purpose |
   | --- | --- |
   | `APPLE_BUNDLE_IDS` | `in.aangan.app` — **required** for Sign in with Apple |
   | `CORS_ORIGINS` | include the frontend origin(s), incl. `https://aanganstay.com` |
   | `RESEND_API_KEY`, `RESEND_FROM` | transactional email (verification / OTP) |
   | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | SMS OTP (DLT-approved template) |
   | `OTP_DEV_MODE` | `false` in production |
   | `SUPPLIER_GSTIN`, `SUPPLIER_ADDRESS` | real GST registration — boot-gated once `PAYMENTS_DEV_MODE=false` |
   | `SENTRY_DSN` | error tracking (backend + worker + beat) |
   | `ENVIRONMENT` | `production` (set **last**, after everything else works) |

   > Full list lives in `deploy/railway/env-vars.txt`. Never commit real secret values.

2. **Deploy.** Railway runs Alembic on boot → applies **`0017_moderation`**
   (content reports + user blocks). Confirm it's healthy:

   ```bash
   curl -s https://backend-service-production-2df4.up.railway.app/healthz
   ```

3. **Verify moderation endpoints exist** (should be 401/403 unauth, not 404):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     https://backend-service-production-2df4.up.railway.app/api/blocks
   ```

4. **Seed the App Review demo account** (once listings are seeded):

   ```bash
   python -m app.seed          # listings/hosts, if not already present
   python -m app.seed_demo     # review@aangan.in + confirmed booking + thread
   ```

   Copy the printed **email + password** into App Store Connect → App Review Info.
   Override the password with `DEMO_REVIEW_PASSWORD` if you prefer.

---

## 3. Frontend deploy (`stayindia/frontend`)

1. Fill the legal identity via env vars — `NEXT_PUBLIC_COMPANY_CIN` and
   `NEXT_PUBLIC_COMPANY_REGISTERED_OFFICE` on the Railway frontend service
   (build-time; see `deploy/railway/env-vars.txt`). Unset values render as
   "[TO FILL …]" on `/legal/terms` and `/legal/privacy`.
2. (Optional) Once counsel has reviewed, remove the "DRAFT — NOT LEGAL ADVICE"
   banner in `app/legal/layout.tsx`.
3. **Deploy**, then verify the pages Apple will read:

   ```bash
   for p in / /legal/privacy /legal/terms /support; do
     curl -s -o /dev/null -w "$p -> %{http_code}\n" https://frontend-production-7d9b.up.railway.app$p
   done
   ```

4. `EXPO_PUBLIC_WEB_URL` in `eas.json` (§4) is `https://aanganstay.com`; use its URLs
   for the store metadata (privacy policy, support, marketing).

---

## 4. Mobile build (`aangan-mobile`)

`eas.json` env is the source of truth per profile. Verify before building:

| Var | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | backend prod URL |
| `EXPO_PUBLIC_WEB_URL` | `https://aanganstay.com` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `_IOS_` / `_ANDROID_` | set ✅ |
| `EXPO_PUBLIC_SENTRY_DSN` | mobile project DSN from Sentry (blank = disabled) |

Build production for both platforms:

```bash
eas build --profile production --platform ios --non-interactive
eas build --profile production --platform android --non-interactive
```

Sanity checks baked into the app now: `supportsTablet:false` (no iPad shots
required), `ITSAppUsesNonExemptEncryption:false` (no export-compliance prompt),
iOS privacy manifest (`privacyManifests` in `app.json`), Facebook button hidden
unless configured, in-app Report/Block wired to the backend, terms-acceptance
gate at signup, native Razorpay checkout (activates automatically when the
backend leaves `PAYMENTS_DEV_MODE`), crash reporting + error boundary.

### OTA hotfixes (EAS Update)

`expo-updates` is configured (`runtimeVersion: appVersion`; channels
`preview`/`production` in `eas.json`). JS-only fixes ship in minutes without
store review:

```bash
eas update --channel production --message "fix: <what>"
```

Rules: an update only reaches builds with the **same app version** (native
changes — new SDK, new native module — still require a store build), and it
must not change payment/feature behaviour materially (store policy). The app
picks updates up on next launch (`checkAutomatically: ON_LOAD`).

---

## 5. Submit to the stores

```bash
eas submit --platform ios --latest --non-interactive       # → App Store Connect
eas submit --platform android --latest --non-interactive   # → Play Console (internal)
```

Or use the **Release to Stores** GitHub Action (`.github/workflows/release.yml`)
→ Run workflow → pick platform.

---

## 6. App Store Connect metadata → Submit for Review

Work through the checklist artifact. The fields that block submission:

- [ ] Privacy Policy URL = `<frontend>/legal/privacy`
- [ ] Support URL = `<frontend>/support`
- [ ] Privacy "nutrition label" filled (Contact, User Content, Location,
      Financial/Sensitive, Identifiers, Diagnostics; **not** used to track)
- [ ] Age rating questionnaire (flag User-Generated Content = Yes)
- [ ] iPhone 6.9" screenshots
- [ ] Description + keywords (drafts in the checklist)
- [ ] App Review Information: **demo login** (`review@aangan.in` + password),
      reviewer notes (moderation, physical-services payments, sign-in methods)
- [ ] Build attached + export compliance
- [ ] **Submit for Review**

Play Console mirrors most of this: Data safety form, content rating, store
listing, and a testing track before production.

---

## Pre-flight verification (paste-and-run)

```bash
echo "backend:"  ; curl -s https://backend-service-production-2df4.up.railway.app/healthz
echo "web pages:"; for p in /legal/privacy /legal/terms /support; do \
  curl -s -o /dev/null -w "  $p -> %{http_code}\n" https://frontend-production-7d9b.up.railway.app$p; done
```

Expected: `{"ok":true}` and three `200`s.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Apple sign-in fails in the app | `APPLE_BUNDLE_IDS` unset on backend, or capability not enabled on the App ID |
| In-app Report/Block does nothing / errors | Backend not deployed with `0017` migration |
| In-app Terms/Privacy links 404 | `EXPO_PUBLIC_WEB_URL` points at a dead domain — check §3/§4 |
| `eas build` credential error | run `eas credentials --platform ios` interactively once |
| Rejected 1.2 (UGC) | Confirm Report + Block ship and reviewer notes explain them |
| Rejected 2.1 (completeness) | A visible non-functional button (e.g. unconfigured Facebook) |
| Rejected 4.8 (Apple sign-in) | Apple sign-in present but not functioning end-to-end |

---

_Last updated: 2026-08-26._
