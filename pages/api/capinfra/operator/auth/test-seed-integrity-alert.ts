/**
 * DEV / TEST ONLY — seeds an unread `collateral.integrity_failed`
 * operator-channel notification row so the Playwright spec at
 * e2e/operator-mark-read-button.spec.ts can deterministically verify
 * that clicking "Mark read" on the operator dashboard's
 * AssetIntegrityAlertsPanel hits
 * /api/capinfra/operator/notifications/[id]/read and removes the row
 * from the unread list.
 *
 * Disabled in production.
 *
 * Actions (POST body):
 *   { action: 'seed' }
 *     - Inserts one new operator-channel notification with topic
 *       `collateral.integrity_failed` and a structured bodyJson
 *       carrying { assetId, symbol, kind, rationale } so it is
 *       recognised by `listRecentUnreadIntegrityAlerts` and rendered
 *       by `AssetIntegrityAlertsPanel`.
 *     - Returns { id, assetId, symbol }.
 *
 *   { action: 'cleanup', id: string }
 *     - Deletes the given notification row.
 *     - Returns { id, deleted: true }.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '../../../../../server/db';
import { capNotifications } from '../../../../../shared/capInfraSchema';
import { generateId } from '../../../../../lib/capinfra/ids';
import { INTEGRITY_ALERT_TOPIC } from '../../../../../lib/capinfra/risk/integrityAlerts';

interface PagedBlob {
  channels: string[];
  errors: string[];
  skipped: boolean;
}

interface SeedBody {
  action?: 'seed' | 'cleanup';
  id?: string;
  /**
   * Optional paging result to embed in the bodyJson `paged` field.
   * When absent the row is a legacy-style pre-task-#258 row (paged = null).
   */
  paged?: PagedBlob | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const body = (req.body ?? {}) as SeedBody;
  const action = body.action ?? 'seed';

  try {
    if (action === 'seed') {
      const id = generateId('ntf');
      // Use a unique symbol per call so concurrent runs do not
      // collide and so the spec can target its exact row by
      // data-testid (`asset-integrity-alert-${id}-mark-read`).
      const assetId = `asset_e2e_markread_${id}`;
      const symbol = `E2EMR${id.slice(-6).toUpperCase()}`;
      const rationale =
        'oracle_stale: e2e mark-read seed — synthetic auto-freeze for Playwright coverage';
      const bodyJson: Record<string, unknown> = {
        assetId,
        symbol,
        kind: 'oracle_stale',
        rationale,
        source: 'e2e-test-seed-integrity-alert',
      };
      // Only embed the paged blob when explicitly supplied so legacy
      // (null-paged) rows can still be seeded by omitting the field.
      if (body.paged !== undefined && body.paged !== null) {
        bodyJson.paged = body.paged;
      }
      await db.insert(capNotifications).values({
        id,
        userId: null,
        channel: 'operator',
        topic: INTEGRITY_ALERT_TOPIC,
        severity: 'CRITICAL',
        subject: `[e2e] auto-freeze ${symbol}`,
        bodyJson,
        correlationId: null,
        relatedEventId: null,
      });
      return res.status(200).json({ id, assetId, symbol });
    }

    if (action === 'cleanup') {
      if (!body.id || typeof body.id !== 'string') {
        return res
          .status(400)
          .json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      await db.delete(capNotifications).where(eq(capNotifications.id, body.id));
      return res.status(200).json({ id: body.id, deleted: true });
    }

    return res.status(400).json({
      error: 'BAD_REQUEST',
      detail: `unknown action: ${String(action)}`,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SEED_FAILED',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
