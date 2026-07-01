/**
 * POST /api/push/register
 *   { token, platform } → { ok }
 *
 * Stores (or refreshes) a device's push-notification token for the signed-in
 * user. Called by the native iOS/Android shell once the OS grants push and hands
 * back a registration token (see lib/native/bridge.js → registerPush). Web
 * visitors never hit this — there's no native runtime to produce a token.
 */
import { z } from 'zod';
import { parseJsonBody } from '@/lib/http';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';

const Body = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(['ios', 'android', 'web']),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [body, err] = await parseJsonBody(request);
  if (err) return err;

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { token, platform } = parsed.data;

  const db = getDb();
  const now = new Date().toISOString();
  // `token` is globally unique per install, so it's the conflict target: a token
  // that moves to a newly signed-in user updates in place instead of duplicating.
  await db
    .insert(pushTokens)
    .values({ id: crypto.randomUUID(), userId: session.userId, token, platform, updatedAt: now })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: session.userId, platform, updatedAt: now },
    });

  return Response.json({ ok: true });
}
