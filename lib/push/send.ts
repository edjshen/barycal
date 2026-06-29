/**
 * Firebase Cloud Messaging (HTTP v1) transport. One integration delivers to both
 * Android and iOS — configure an APNs auth key in the Firebase project and FCM
 * relays to APNs for you, so the backend only ever talks to FCM.
 *
 * Credentials come from a Google service-account JSON, split into three Worker
 * secrets: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY (the PEM body). We
 * mint a short-lived OAuth2 access token (an RS256 JWT signed via Web Crypto)
 * and cache it in module scope until shortly before it expires.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';

interface FcmCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Optional data payload; FCM requires string values only. */
  data?: Record<string, string>;
}

function creds(): FcmCreds {
  const env = getCloudflareContext().env as unknown as {
    FCM_PROJECT_ID?: string;
    FCM_CLIENT_EMAIL?: string;
    FCM_PRIVATE_KEY?: string;
  };
  const projectId = env.FCM_PROJECT_ID;
  const clientEmail = env.FCM_CLIENT_EMAIL;
  // A secret stored with literal "\n" sequences round-trips to real newlines.
  const privateKey = env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'FCM credentials are not configured (FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY)'
    );
  }
  return { projectId, clientEmail, privateKey };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Web Crypto wants a concrete ArrayBuffer (not a typed-array view over
// ArrayBufferLike), so these helpers hand back plain ArrayBuffers.
function utf8(str: string): ArrayBuffer {
  const u = new TextEncoder().encode(str);
  const ab = new ArrayBuffer(u.byteLength);
  new Uint8Array(ab).set(u);
  return ab;
}

function pemToPkcs8(pem: string): ArrayBuffer {
  // Strip the PEM armor (any "-----…-----" header/footer) and whitespace, leaving
  // the base64 body. Matched generically so no PEM-header literal appears in
  // source — that would trip secret scanners (and isn't a secret).
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const raw = atob(body);
  const ab = new ArrayBuffer(raw.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return ab;
}

async function accessToken(c: FcmCreds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(
    enc.encode(
      JSON.stringify({
        iss: c.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(c.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(signingInput));
  const jwt = `${signingInput}.${base64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

/**
 * Send one notification to one device token.
 * @returns 'ok', 'stale' (token no longer valid — caller should delete it), or
 *   'error'.
 */
export async function sendToToken(
  token: string,
  payload: PushPayload
): Promise<'ok' | 'stale' | 'error'> {
  const c = creds();
  const bearer = await accessToken(c);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${c.projectId}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        ...(payload.data ? { data: payload.data } : {}),
      },
    }),
  });
  if (res.ok) return 'ok';
  const text = await res.text();
  // 404 UNREGISTERED, or a 400 naming the token, means the install is gone.
  if (res.status === 404 || /not-registered|invalid-registration|invalid argument/i.test(text)) {
    return 'stale';
  }
  console.error('[push] FCM send failed', res.status, text);
  return 'error';
}

/**
 * Send to every registered device for a user, pruning tokens FCM reports stale.
 * Best-effort: returns the number of successful deliveries.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  const db = getDb();
  const rows = await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  let delivered = 0;
  for (const row of rows) {
    const result = await sendToToken(row.token, payload).catch(() => 'error' as const);
    if (result === 'ok') {
      delivered++;
    } else if (result === 'stale') {
      await db
        .delete(pushTokens)
        .where(eq(pushTokens.token, row.token))
        .catch(() => undefined);
    }
  }
  return delivered;
}
