// Unique test-data generators. Each test creates its own data with globally
// unique identifiers so parallel workers and repeat runs never collide — the
// isolation strategy the design mandates over a shared clean-DB reset.
import { randomUUID } from 'node:crypto';

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export function uniqueEmail(prefix = 'e2e', domain = 'test.dev'): string {
  return `${prefix}-${randomUUID()}@${domain}`;
}

export function uniqueName(prefix = 'e2e'): string {
  return `${prefix}-${uniqueSuffix()}`;
}

/** 32-hex token (e.g. validator/redemption tokens). */
export function uniqueToken(): string {
  return randomUUID().replace(/-/g, '');
}

/**
 * A synthetic client IP from TEST-NET-3 (203.0.113.0/24) so per-IP rate-limit
 * buckets are isolated per test — set as `x-forwarded-for`.
 */
export function uniqueXff(): string {
  const a = Math.floor(Math.random() * 254) + 1;
  const b = Math.floor(Math.random() * 254) + 1;
  return `203.0.${a}.${b}`;
}
