# Native iOS / Android shell (Capacitor)

> **Finishing on a Mac?** Follow **[`HANDOFF.md`](./HANDOFF.md)** — the ordered
> runbook (sweep for new features → generate projects → push/deep-links →
> TestFlight). This file is the reference detail it links to.

Barycal ships to the App Store and Play Store as a thin **Capacitor** shell whose
WebView loads the **live site** (`server.url` → `https://barycal.com`). The PWA
keeps running on the web untouched; the native apps are just another door onto
the same Cloudflare deployment. One deploy updates web + both apps at once.

This directory and the repo's `capacitor.config.ts` are the parts that live in
git. The native `ios/` and `android/` projects are generated on a Mac (Xcode /
Android SDK can't run in CI here) and committed once created.

## What's already wired (no native toolchain needed)

- `capacitor.config.ts` — app id `com.barycal.app`, `server.url` (override per
  build with `CAP_SERVER_URL`, must be HTTPS).
- `lib/native/bridge.js` — runtime bridge. Detects `window.Capacitor` (injected
  by the native runtime into the live site) and calls plugins **without bundling
  any `@capacitor/*` package into the web app**, so web visitors are unaffected.
- `components/NativeBootstrap.tsx` — mounted in `app/layout.tsx`; on launch sets
  the status bar, hides the splash, and registers for push. No-ops on web.
- Share / clipboard — `app/rooms/_client/cast/link.js` uses the native share
  sheet + clipboard when running natively, else the existing Web Share path.
- Push backend — `POST /api/push/register` (`app/api/push/register/route.ts`) +
  `lib/push/send.ts` (FCM HTTP v1) + the `push_tokens` table.
- Deep-link association files — `public/.well-known/apple-app-site-association`
  and `public/.well-known/assetlinks.json` (fill in the placeholders, below).

## One-time setup (on a Mac)

```bash
# 1. Install Capacitor CLI/core + the plugins the bridge calls.
npm i -D @capacitor/cli @capacitor/assets
npm i @capacitor/core @capacitor/share @capacitor/clipboard \
      @capacitor/push-notifications @capacitor/status-bar \
      @capacitor/splash-screen @capacitor/browser @exxili/capacitor-nfc

# 2. Generate the native projects (creates ./ios and ./android at repo root).
npx cap add ios
npx cap add android

# 3. App icons + splash from the existing source art (bg matches the app chrome).
#    Provide a 1024x1024 PNG (or let it rasterize public/icon.svg).
npx @capacitor/assets generate --iconBackgroundColor '#0C0B10' \
    --splashBackgroundColor '#0C0B10'

# 4. Pull the web config/plugins into the native projects.
npx cap sync
```

> The `@capacitor/*` packages are intentionally **not** in `package.json` in the
> repo: nothing in the Next.js build imports them (the bridge uses the injected
> runtime), and adding them would only churn the lockfile for the web build.
> Install them here, on the machine that builds the native apps.

## Run / debug against the live (or a preview) site

```bash
CAP_SERVER_URL='https://<preview>.barycal.com' npx cap run ios
CAP_SERVER_URL='https://<preview>.barycal.com' npx cap run android
```

Use an HTTPS origin — the session cookie is `Secure` and camera/mic/WebSocket
need a secure context, so `http://localhost` will not work in the WebView.

## Native permissions (required for App Store / Play review)

- **iOS** `ios/App/App/Info.plist`: `NSCameraUsageDescription` (QR scan),
  `NSMicrophoneUsageDescription` (audio "chirp" cast), `NFCReaderUsageDescription`
  (if NFC is added). Add the **Push Notifications** + **Associated Domains**
  capabilities (Associated Domain: `applinks:barycal.com`).
- **Android** `android/app/src/main/AndroidManifest.xml`: `CAMERA`,
  `RECORD_AUDIO`, `NFC` permissions; intent filters for the App Links host; and
  the FCM service (added by `@capacitor/push-notifications`).

## Push notifications

1. Create a Firebase project; add iOS + Android apps with id `com.barycal.app`.
2. Android: drop `google-services.json` into `android/app/`.
   iOS: add `GoogleService-Info.plist` to the Xcode project, and upload an **APNs
   auth key (.p8)** in Firebase so FCM can relay to iOS.
3. Backend secrets (from the Firebase service-account JSON), set as Worker
   secrets so `lib/push/send.ts` can mint an FCM token:
   ```bash
   wrangler secret put FCM_PROJECT_ID
   wrangler secret put FCM_CLIENT_EMAIL
   wrangler secret put FCM_PRIVATE_KEY   # the PEM "private_key" field
   ```
## Daily reminder cron

A standalone scheduler Worker fires the daily push digest. OpenNext can't host a
`scheduled()` handler, so the logic lives in an app route and a thin Worker just
triggers it on schedule:

- `app/api/cron/reminders/route.ts` — builds one digest per user of the events
  they're attending today (reuses `getEventsBetween` / `getAllAttendance` /
  `sendToUser`), bearer-authed with `CRON_SECRET`. The digest formatting is the
  pure, unit-tested `buildDailyDigests` (`lib/push/reminders.ts`).
- `workers/push/` — a cron-only Worker (sibling of `workers/room/`) that POSTs to
  that route each tick. Deploy + secrets:
  ```bash
  cd workers/push
  npm install
  npx wrangler secret put CRON_SECRET -c ./wrangler.toml   # same value both places
  npm run deploy
  # App worker (repo root) needs the matching secret + a recipient app URL:
  npx wrangler secret put CRON_SECRET                       # SAME value as above
  ```
  `APP_URL` (the origin the scheduler calls) is set as a `[vars]` entry in
  `workers/push/wrangler.toml`. Test a tick locally with
  `npm run test:scheduled` (in `workers/push/`).

Future: recurring-occurrence expansion and a "a regular is free today" signal
(would reuse `computeRegulars` from `lib/domain/regulars.ts`).

## Deep links — fill in the placeholders

- `public/.well-known/apple-app-site-association`: replace `TEAMID` with your
  Apple Team ID (→ `TEAMID.com.barycal.app`). Served from `barycal.com` over
  HTTPS with no redirect; ensure `content-type: application/json`.
- `public/.well-known/assetlinks.json`: replace the SHA-256 with your **release**
  signing cert fingerprint (`keytool -list -v -keystore …`, or copy from Play
  Console → App signing).

## Still to do natively (testable only on a device)

- **NFC verification** — native NFC write is wired (`lib/native/bridge.js`
  `nativeWriteUrlTag` → `app/rooms/_client/cast/nfc.js`) against
  `@exxili/capacitor-nfc`, and iOS Core NFC enables what Web NFC can't. It can't
  be runtime-verified here (no device): confirm the plugin's registered name
  (`window.Capacitor.Plugins.NFC`/`Nfc`) and that `writeNDEF({ records: [{ type:
  'U', payload }] })` matches the installed version; adjust `nfcPlugin()` if not.
- Verify URL **fragments survive** the Universal/App Link handoff so room links
  (`/rooms/enter#i=…&k=…`) still decrypt client-side.
- Confirm login **persists across a cold start** (WKWebView cookie store).
- Store listings: privacy nutrition / Data Safety forms (phone number is
  collected for OTP), screenshots, content rating, privacy-policy URL.
