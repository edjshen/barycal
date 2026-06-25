#!/usr/bin/env bash
# Build the Orbit static shell for Cloudflare Pages (or any static host).
# The SPA's data/auth come from the Supabase 'orbit' Edge Function; this script
# only assembles the HTML shell + assets and points window.ORBIT_API at it.
#
# Cloudflare Pages settings (Connect to Git):
#   Production branch:        master
#   Framework preset:         None
#   Build command:            bash deploy/build.sh
#   Build output directory:   _site
# Optional: override the API origin with an ORBIT_API env var in Pages settings.
set -euo pipefail

API="${ORBIT_API:-https://bpqtjfdiwifvrnkzldwg.supabase.co/functions/v1/orbit}"

rm -rf _site && mkdir -p _site
cp public/app.js public/orbit.css public/view.js public/icon.svg public/manifest.webmanifest public/sw.js _site/

cat > _site/index.html <<HTML
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1"><meta name="theme-color" content="#0C0B10"><title>Orbit</title><link rel="icon" href="icon.svg"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="orbit.css"><script>window.ORBIT_API="${API}";window.ORBIT_BASE="";</script></head><body><div id="app"><div class="shell"><div class="main"><div class="empty">Loading…</div></div></div></div><script src="app.js"></script></body></html>
HTML

# account-free page uses the same shell but boots view.js
cp _site/index.html _site/view.html
sed -i 's/src="app.js"/src="view.js"/' _site/view.html

# SPA routing: /u/:handle and /e/:id -> account-free page; everything else -> app
printf '%s\n' '/u/* /view.html 200' '/e/* /view.html 200' '/* /index.html 200' > _site/_redirects

echo "Built _site/ for Cloudflare Pages (API origin: ${API})"
ls -1 _site
