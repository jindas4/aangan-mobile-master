# Apple Review Demo Video Runbook

This is the shortest repeatable path to record the app workflow video that can be shared privately with the Apple Review Team.

## Source of truth

- App Review demo account: see [RELEASE.md](RELEASE.md#L30)
- Demo account seeding: see [RELEASE.md](RELEASE.md#L86)
- iOS submission config: see [eas.json](eas.json#L59)
- Reviewer notes template: see [APP_STORE_REVIEW_NOTES.md](APP_STORE_REVIEW_NOTES.md)
- Apple review rehearsal flow: see [.maestro/08_apple_review_demo.yaml](.maestro/08_apple_review_demo.yaml)
- Existing mobile workflow coverage: see [.maestro/01_explore_tab.yaml](.maestro/01_explore_tab.yaml), [.maestro/03_search_flow.yaml](.maestro/03_search_flow.yaml), [.maestro/04_listing_detail.yaml](.maestro/04_listing_detail.yaml), [.maestro/05_login_screen.yaml](.maestro/05_login_screen.yaml), [.maestro/06_host_dashboard.yaml](.maestro/06_host_dashboard.yaml)

## What Apple should see

Record one continuous video, ideally 3 to 5 minutes, on a real iPhone build or a TestFlight build.

Show these flows in order:

1. Launch the app and land on the home/explore experience.
2. Search for a stay and open a listing detail page.
3. Show listing photos, amenities, pricing, and availability context.
4. Log in with the App Review demo account.
5. Open the existing message thread tied to the seeded demo booking.
6. Open account/profile so Apple can see the authenticated state.
7. If host surfaces are part of the submission, open the host dashboard.
8. Briefly show report/block entry points if Apple asks about user-generated content moderation.

Do not try to demonstrate real payments unless the release build is configured for that and the reviewer must verify it. For most reviews, showing the booking flow up to the payment step is enough, plus reviewer notes in App Store Connect.

## Recording setup

1. Build an iOS preview or production binary from [package.json](package.json#L18).
2. Install it on a physical iPhone. Physical-device capture is safer than simulator capture for Apple review.
3. Seed the review account and demo data from the backend steps in [RELEASE.md](RELEASE.md#L86).
4. Sign in once before recording to verify the credentials and the seeded message thread still exist.
5. Turn on iOS Screen Recording.
6. Record in portrait unless a specific landscape flow exists.
7. Keep system notifications, personal accounts, and debug overlays off.

To rehearse the exact capture path with Maestro once it is installed locally:

```bash
REVIEW_PASSWORD='your-demo-password' ./scripts/apple-review-demo.sh
```

## Suggested narration script

Use short factual narration. Example:

"This video shows the main guest workflow for Aangan. I start on the Explore screen, search for a property, open the listing details, sign in with the review account provided in App Review Information, and then open the seeded message thread and account screens. Moderation entry points such as report and block are available in-app."

## Private sharing format

Apple usually accepts the video link in App Review Notes. Use one of these:

1. Unlisted YouTube link.
2. Private Google Drive link with reviewer access enabled.
3. Direct hosted MP4 link if it does not require login.

The link must not expire during review.

## Fast capture checklist

- App launches without dev menus or redboxes.
- Review login works.
- Search returns listings.
- At least one listing detail page loads images.
- Seeded message thread opens.
- Account screen loads.
- Any host/admin flow shown in the video is actually enabled for the seeded account.

## Optional: use Maestro as a shot list

The repo already has reusable flow coverage under [.maestro](.maestro):

- [.maestro/01_explore_tab.yaml](.maestro/01_explore_tab.yaml)
- [.maestro/03_search_flow.yaml](.maestro/03_search_flow.yaml)
- [.maestro/04_listing_detail.yaml](.maestro/04_listing_detail.yaml)
- [.maestro/05_login_screen.yaml](.maestro/05_login_screen.yaml)
- [.maestro/06_host_dashboard.yaml](.maestro/06_host_dashboard.yaml)

These are useful as a rehearsal checklist even if the final Apple video is recorded manually.

## Recommended submission note

Include this in App Store Connect reviewer notes, adapted as needed:

"A private demo video of the primary in-app workflow is available here: <insert link>. Review credentials: review@aanganstay.com / <password>. The account is pre-seeded with a completed booking and a message thread for review purposes."