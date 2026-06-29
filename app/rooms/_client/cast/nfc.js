/**
 * NFC cast/catch. Two backends behind one interface:
 *  - Native shell: the Capacitor NFC plugin (works on iOS + Android).
 *  - Web: Web NFC / NDEFReader (Android Chrome only; absent on iOS and inside the
 *    native WebView). The "catch" side is passive — a pre-written tag auto-opens
 *    its URL via the OS reader, which deep-links into the app.
 * Feature-detect and hide the option entirely where unsupported.
 */
import { nativeNfcSupported, nativeWriteUrlTag } from '@/lib/native/bridge.js';

export function nfcSupported() {
  return nativeNfcSupported() || (typeof window !== 'undefined' && 'NDEFReader' in window);
}

/**
 * Write the room URL to a tag. Must be called from a user gesture.
 * @returns {Promise<void>} resolves when the tag is written
 */
export async function writeRoomToTag(url) {
  if (nativeNfcSupported()) return nativeWriteUrlTag(url);
  if (typeof window === 'undefined' || !('NDEFReader' in window)) {
    throw new Error('Web NFC unsupported');
  }
  const reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: 'url', data: url }] });
}

/**
 * Scan for a tag and return the first URL record's data. Must be called from a
 * user gesture. Returns a stop() function; resolves the URL via onUrl callback.
 * @returns {Promise<() => void>} a stop function
 */
export async function scanTags(onUrl, onError) {
  if (!nfcSupported()) throw new Error('Web NFC unsupported');
  const reader = new window.NDEFReader();
  const controller = new AbortController();
  reader.onreading = (event) => {
    for (const record of event.message.records) {
      if (record.recordType === 'url') {
        const url = new TextDecoder().decode(record.data);
        onUrl(url);
        return;
      }
    }
  };
  reader.onreadingerror = () => onError?.(new Error('NFC read error'));
  await reader.scan({ signal: controller.signal });
  return () => controller.abort();
}
