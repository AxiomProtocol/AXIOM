/**
 * POST /api/capinfra/operator/notifications/mark-read-batch
 *
 * Cookie-authenticated batch mark-read endpoint used by the
 * operator dashboard's "Asset integrity alerts" panel "Mark all
 * read" action. Mirrors the per-id endpoint
 * `/api/capinfra/operator/notifications/[id]/read`: same auth
 * surface (operator cookie), same underlying service (`markRead`),
 * just applied to a list.
 *
 * Request body: { ids: string[] }
 *
 * Response (200):
 *   {
 *     attempted: number,
 *     marked: string[],          // ids successfully marked read
 *     notFound: string[],        // ids that didn't exist
 *     failed: { id: string, error: string }[],
 *   }
 *
 * The endpoint always returns 200 when auth + body shape are valid
 * so the dashboard can surface partial failures ("marked 8 of 10")
 * rather than treating any single bad id as a total failure.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../../lib/capinfra/operatorAuth';
import { markRead } from '../../../../../lib/capinfra/notifications';

const MAX_BATCH = 200;

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

  // Normalize: strings only, trimmed, deduped, drop empties.
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

  // Per-id try/catch so a single broken row never blocks the rest of
  // the batch. This matches the expectation in the task: partial
  // failures must be surfaced ("marked 8 of 10"), not collapsed into
  // a 500.
  for (const id of ids) {
    try {
      const updated = await markRead(id);
      if (updated) {
        result.marked.push(updated.id);
      } else {
        result.notFound.push(id);
      }
    } catch (err) {
      console.error(
        '[operator.notifications.mark-read-batch] markRead failed',
        id,
        err,
      );
      result.failed.push({
        id,
        error: err instanceof Error ? err.message : 'INTERNAL',
      });
    }
  }

  return res.status(200).json(result);
}
