/**
 * Link cast — the universal fallback that must ALWAYS work. Builds the fragment
 * URL and shares it via the Web Share API where available, else copies to the
 * clipboard. The fragment (#i=...&k=...&v=1) never reaches a server.
 */
import { buildRoomUrl } from '@/lib/mayfly/shared/credential.js';
import { keyToFragment } from '@/lib/mayfly/shared/crypto.js';
import { isNative, nativeShare, nativeCopy } from '@/lib/native/bridge.js';

/** @param {{ id: string, key: Uint8Array, event?: boolean, desiredExpiresAt?: number|null }} room */
export function roomUrl(room, origin) {
  const o = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return buildRoomUrl(room.id, keyToFragment(room.key), o, {
    event: room.event,
    expiresAt: room.desiredExpiresAt,
  });
}

/**
 * Share or copy the room link.
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareOrCopyRoom(room, origin) {
  const url = roomUrl(room, origin);

  // Native shell: use the OS share sheet / clipboard via injected Capacitor
  // plugins. Falls through to the Web Share path only if the plugin is absent.
  if (isNative()) {
    const res = await nativeShare({
      title: 'join my room',
      text: 'a room that vanishes in 24h',
      url,
    });
    if (res === 'shared') return 'shared';
    if (res === 'cancelled') return 'failed';
    if (await nativeCopy(url)) return 'copied';
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'join my room', text: 'a room that vanishes in 24h', url });
      return 'shared';
    } catch (err) {
      // User cancelled the share sheet — fall through to copy.
      if (err && err.name === 'AbortError') return 'failed';
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      /* fall through */
    }
  }
  return 'failed';
}
