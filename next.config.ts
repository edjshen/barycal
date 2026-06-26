import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// Security headers applied to every worker-served (SSR/dynamic) route. Static
// assets under /public are served by Workers Static Assets and bypass the
// worker, so these don't reach them — that's fine (they carry no private HTML).
//
// The CSP is deliberately limited to directives that DON'T constrain script/
// style sources, because Next 16 emits inline bootstrap scripts and there is no
// nonce-injecting middleware here (it was removed for the OpenNext build). The
// directives below still shut down clickjacking (frame-ancestors), plugin/object
// injection, <base> hijacking, and off-origin form posts without risking the app.
// A full script-src CSP would require reintroducing nonce middleware (future work).
const CSP = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

// Mayfly's "cast" features need camera (QR scan) and microphone (ggwave audio),
// so those are allowed for same-origin; everything else powerful is denied.
const PERMISSIONS_POLICY =
  'camera=(self), microphone=(self), geolocation=(), browsing-topics=(), payment=(), usb=()';

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig: NextConfig = {
  experimental: { viewTransition: true },
  turbopack: {},
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

const withSerwist = withSerwistInit({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' });

export default withSerwist(nextConfig);

// Enable Cloudflare bindings (D1, etc.) during `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
