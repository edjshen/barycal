/**
 * Tiny request helpers shared across API routes.
 */

/**
 * Parse JSON body. On parse failure, returns [null, errorResponse].
 * On success, returns [body, null]. Route pattern:
 *   const [body, err] = await parseJsonBody(request);
 *   if (err) return err;
 */
export async function parseJsonBody(
  request: Request,
  { maxBytes = 64 * 1024 }: { maxBytes?: number } = {}
): Promise<[unknown, null] | [null, Response]> {
  const tooLarge = () =>
    Response.json({ error: 'Request body is too large' }, { status: 413 }) as Response;

  // The content-length header is a cheap early reject, but it's client-controlled
  // and absent on chunked bodies — so we also bound the actual bytes read below.
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength && contentLength > maxBytes) {
    return [null, tooLarge()];
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return [null, Response.json({ error: 'Invalid JSON' }, { status: 400 })];
  }
  // UTF-16 length over-counts multibyte content vs. bytes, so this never
  // under-rejects; it's a DoS guard, not an exact byte meter.
  if (text.length > maxBytes) {
    return [null, tooLarge()];
  }
  try {
    return [JSON.parse(text), null];
  } catch {
    return [null, Response.json({ error: 'Invalid JSON' }, { status: 400 })];
  }
}
