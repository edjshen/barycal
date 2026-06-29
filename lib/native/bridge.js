/**
 * Native bridge — lights up Capacitor-native capabilities when the app runs
 * inside the iOS/Android shell, and no-ops on the web so the PWA bundle behaves
 * identically.
 *
 * Design: the Capacitor native runtime injects `window.Capacitor` (and
 * `window.Capacitor.Plugins.*`) into the live site that the WebView loads. We
 * detect that at runtime and call the injected plugins directly — so NOTHING in
 * this file imports an `@capacitor/*` package, and web visitors ship a bundle
 * with zero Capacitor code. Callers feature-detect via `isNative()` and fall
 * back to their existing Web API path when a capability is unavailable.
 */

function cap() {
  return typeof window !== 'undefined' ? window.Capacitor : undefined;
}

/** True only inside the Capacitor native shell (iOS/Android). */
export function isNative() {
  const c = cap();
  return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
}

/** Current platform: 'ios' | 'android' | 'web'. */
export function platform() {
  const c = cap();
  return c && typeof c.getPlatform === 'function' ? c.getPlatform() : 'web';
}

function plugin(name) {
  const c = cap();
  return c && c.Plugins ? c.Plugins[name] : undefined;
}

/**
 * Share via the native OS share sheet.
 * @param {{ title?: string, text?: string, url?: string }} opts
 * @returns {Promise<'shared'|'cancelled'|'unavailable'>} 'unavailable' means the
 *   caller should fall back to its Web Share / clipboard path.
 */
export async function nativeShare(opts) {
  const Share = plugin('Share');
  if (!Share || typeof Share.share !== 'function') return 'unavailable';
  try {
    await Share.share(opts);
    return 'shared';
  } catch {
    // Capacitor's Share throws when the user dismisses the sheet.
    return 'cancelled';
  }
}

/**
 * Copy text via the native clipboard.
 * @param {string} text
 * @returns {Promise<boolean>} true on success.
 */
export async function nativeCopy(text) {
  const Clipboard = plugin('Clipboard');
  if (!Clipboard || typeof Clipboard.write !== 'function') return false;
  try {
    await Clipboard.write({ string: text });
    return true;
  } catch {
    return false;
  }
}

function nfcPlugin() {
  const c = cap();
  if (!c || !c.Plugins) return undefined;
  // Registration name varies by package; accept the common spellings.
  return c.Plugins.NFC || c.Plugins.Nfc;
}

/** True when running natively AND an NFC-write plugin is present. */
export function nativeNfcSupported() {
  const p = nfcPlugin();
  return isNative() && !!p && typeof p.writeNDEF === 'function';
}

/**
 * Write a URL to an NFC tag via the native plugin (NDEF 'U' / URI record).
 * Targets @exxili/capacitor-nfc; callers must guard with nativeNfcSupported().
 * @param {string} url
 */
export async function nativeWriteUrlTag(url) {
  const NFC = nfcPlugin();
  if (!NFC || typeof NFC.writeNDEF !== 'function') {
    throw new Error('native NFC unavailable');
  }
  await NFC.writeNDEF({ records: [{ type: 'U', payload: url }] });
}

async function postToken(token, plat) {
  if (!token) return;
  try {
    await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, platform: plat }),
    });
  } catch {
    /* best-effort; retried on next launch */
  }
}

/**
 * Register this device for push and hand the token to the server. Best-effort:
 * silently no-ops on web and on any failure (permission denied, or the user
 * isn't signed in yet — /api/push/register is session-gated and just 401s,
 * which we ignore; the token is re-sent on the next launch).
 */
export async function registerPush() {
  const Push = plugin('PushNotifications');
  if (!Push) return;
  try {
    let perm = await Push.checkPermissions();
    if (perm.receive === 'prompt') perm = await Push.requestPermissions();
    if (perm.receive !== 'granted') return;
    // The token arrives asynchronously via the 'registration' event.
    await Push.addListener('registration', (token) => {
      void postToken(token && token.value, platform());
    });
    await Push.addListener('registrationError', (err) => {
      console.warn('[native] push registration error', err && err.error);
    });
    await Push.register();
  } catch (err) {
    console.warn('[native] push setup failed', err && err.message);
  }
}

/**
 * One-time native shell setup, safe to call on every load. No-ops on web. Sets a
 * dark status bar to match the app chrome, hides the splash once web content is
 * up, and registers for push.
 */
export async function initNative() {
  if (!isNative()) return;

  const StatusBar = plugin('StatusBar');
  if (StatusBar && typeof StatusBar.setStyle === 'function') {
    try {
      // 'DARK' = dark content (light glyphs) over the app's dark chrome.
      await StatusBar.setStyle({ style: 'DARK' });
      if (platform() === 'android' && typeof StatusBar.setBackgroundColor === 'function') {
        await StatusBar.setBackgroundColor({ color: '#0C0B10' });
      }
    } catch {
      /* non-fatal */
    }
  }

  const SplashScreen = plugin('SplashScreen');
  if (SplashScreen && typeof SplashScreen.hide === 'function') {
    try {
      await SplashScreen.hide();
    } catch {
      /* non-fatal */
    }
  }

  void registerPush();
}
