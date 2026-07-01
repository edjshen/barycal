import type { CapacitorConfig } from '@capacitor/cli';

// The native iOS/Android shells load the LIVE site (server.url) rather than a
// bundled static export: Barycal is SSR (server components + iron-session), so
// there is nothing to bundle offline. One Cloudflare deploy updates web + both
// apps at once. Override the URL for preview/dev builds via CAP_SERVER_URL —
// it MUST be HTTPS (the session cookie is Secure and camera/mic/WSS need a
// secure context, so localhost won't do; point at a Cloudflare preview).
const serverUrl = process.env.CAP_SERVER_URL || 'https://barycal.com';

const config: CapacitorConfig = {
  appId: 'com.barycal.app',
  appName: 'Barycal',
  // Capacitor requires a local webDir even when loading a remote URL; ours is a
  // one-screen loading fallback (see native/www/index.html).
  webDir: 'native/www',
  server: {
    url: serverUrl,
    // Keep in-app navigation on the app's own origins; off-origin links should
    // open in the system browser (@capacitor/browser — see native/README.md).
    allowNavigation: ['barycal.com', 'www.barycal.com', 'barycal-room.junting-mp3.workers.dev'],
  },
  backgroundColor: '#0C0B10',
  ios: { contentInset: 'always' },
  android: { backgroundColor: '#0C0B10' },
};

export default config;
