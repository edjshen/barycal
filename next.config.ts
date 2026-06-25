import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { viewTransition: true },
};

export default nextConfig;

// Enable Cloudflare bindings (D1, etc.) during `next dev`.
// NOTE: commented out until wrangler.toml / open-next config is added in Task 0.2
// import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
// initOpenNextCloudflareForDev();
