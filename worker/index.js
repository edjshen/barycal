// Router for the Orbit static SPA on Cloudflare Workers.
//
// Static files live in public/ (bound as env.ASSETS). Cloudflare serves a
// matching asset directly; this Worker only shapes the routes that don't map
// 1:1 to a file:
//   - /u/:handle and /e/:id  -> the account-free view shell (view.html / view.js)
//   - any other unknown path -> the app shell (index.html / app.js), SPA-style
//
// Data and auth are not served here — they live on the Supabase 'orbit' Edge
// Function, which the frontend reaches via window.ORBIT_API (set in the HTML).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Shared, account-free pages always boot the lightweight view bundle.
    if (path === "/u" || path === "/e" || path.startsWith("/u/") || path.startsWith("/e/")) {
      return env.ASSETS.fetch(new Request(new URL("/view.html", url), request));
    }

    // Otherwise serve the real static asset when one exists...
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // ...and fall back to the app shell for unknown client-side routes.
    return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
  },
};
