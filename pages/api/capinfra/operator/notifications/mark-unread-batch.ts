/**
 * POST /api/capinfra/operator/notifications/mark-unread-batch
 *
 * Cookie-authenticated batch un-mark endpoint. Flips `readAt` back to
 * null for each listed notification id. Intended as the short-lived
 * "Undo" escape hatch for the "Mark all read" batch action in
 * AssetIntegrityAlertsPanel — the UI surfaces this endpoint for ~30 s
 * after a successful batch so the on-call can recover if they cleared
 * the wrong set of alerts.
 *
 * Request body: { ids: string[] }
 *
 * Response (200):
 *   {
 *     attempted: number,
 *     marked: string[],          // ids successfully flipped back to unread
 *     notFound: string[],        // ids that didn't exist
 *     failed: { id: string, error: string }[],
 *   }
 *
 * The endpoint always returns 200 when auth + body shape are valid so
 * the dashboard can surface partial failures rather than treating any
 * single bad id as a total failure.
 */

import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../../lib/capinfra/operatorAuth';
import { markUnread } from '../../../../../lib/capinfra/notifications';
import { emitAuditEvent } from '../../../../../lib/capinfra/audit';
import { generateId } from '../../../../../lib/capinfra/ids';

const MAX_BATCH = 200;

function operatorKeyId(key: string): string {
  return 'opk_' + createHash('sha256').update(key).digest('hex').slice(0, 12);
}

interface BatchResult {
  attempted: number;
  marked: string[];
  notFound: string[];
  failed: { id: string; error: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const body = (req.body ?? {}) as { ids?: unknown };
  const rawIds = Array.isArray(body.ids) ? body.ids : null;
  if (!rawIds) {
    return res.status(400).json({ error: 'MISSING_IDS' });
  }

  const ids = Array.from(
    new Set(
      rawIds
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    ),
  );

  if (ids.length === 0) {
    return res.status(400).json({ error: 'EMPTY_IDS' });
  }
  if (ids.length > MAX_BATCH) {
    return res.status(400).json({ error: 'BATCH_TOO_LARGE', max: MAX_BATCH });
  }

  const result: BatchResult = {
    attempted: ids.length,
    marked: [],
    notFound: [],
    failed: [],
  };

  for (const id of ids) {
    try {
      const updated = await markUnread(id);
      if (updated) {
        result.marked.push(updated.id);
      } else {
        result.notFound.push(id);
      }
    } catch (err) {
      console.error(
        '[operator.notifications.mark-unread-batch] markUnread failed',
        id,
        err,
      );
      result.failed.push({
        id,
        error: err instanceof Error ? err.message : 'INTERNAL',
      });
    }
  }

  await emitAuditEvent({
    eventType: 'operator.notifications.batch_mark_unread',
    aggregateType: 'operator.notifications',
    aggregateId: generateId('ae'),
    actor: operatorKeyId(cookieKey as string),
    payloadJson: {
      operatorKeyId: operatorKeyId(cookieKey as string),
      attempted: result.attempted,
      markedCount: result.marked.length,
      notFoundCount: result.notFound.length,
      failedCount: result.failed.length,
      markedIds: result.marked,
      notFoundIds: result.notFound,
      failedIds: result.failed.map((f) => f.id),
    },
  });

  return res.status(200).json(result);
}
