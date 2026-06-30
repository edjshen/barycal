import { nanoid } from 'nanoid';
import { getDb } from './index';
import { adminAuditLog } from './schema';
import type { AdminAuditRow } from './schema';

export type AuditInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  meta?: Record<string, unknown>;
};

export function buildAuditRow(input: AuditInput): AdminAuditRow {
  return {
    id: nanoid(),
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
    meta: input.meta ?? null,
    createdAt: new Date().toISOString(),
  };
}

// Append-only. Called inside every mutating admin action (Plan 2).
export async function writeAudit(input: AuditInput): Promise<void> {
  await getDb().insert(adminAuditLog).values(buildAuditRow(input));
}
