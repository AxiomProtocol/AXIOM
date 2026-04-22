/**
 * POST /api/banking/dao-account/provision
 *
 * Admin-only endpoint (x-admin-key gated, same pattern as other admin endpoints).
 * Provisions an Increase account for an approved DAO account application.
 * Stores the returned increaseAccountId and flips status to 'active'.
 * Also stores a hashed account token for dashboard access.
 *
 * Body: { applicationId: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';
import { IncreaseService } from '../../../../lib/services/IncreaseService';

const TOKEN_SALT = 'axiom-dao-account-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized — admin key required' });

  const { applicationId } = req.body as { applicationId?: string };
  if (!applicationId?.trim()) return res.status(400).json({ error: 'applicationId is required' });

  try {
    const [application] = await db
      .select()
      .from(daoAccountApplications)
      .where(eq(daoAccountApplications.id, applicationId.trim()))
      .limit(1);

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status === 'active') {
      return res.status(409).json({ error: 'Account already provisioned', increaseAccountId: application.increaseAccountId });
    }
    if (application.status === 'rejected') {
      return res.status(409).json({ error: 'Application has been rejected — cannot provision' });
    }

    const increaseAccount = await IncreaseService.createAccount({
      name: application.entityName,
      program_id: process.env.INCREASE_PROGRAM_ID ?? process.env.INCREASE_SANDBOX_PROGRAM_ID ?? '',
    });

    const accountNumbers = await IncreaseService.listAccountNumbers(increaseAccount.id);
    let routingNumber: string | undefined;
    let accountNumber: string | undefined;
    if (accountNumbers.data.length === 0) {
      const newAccountNumber = await IncreaseService.createAccountNumber({
        account_id: increaseAccount.id,
        name: `${application.entityName} — Operating`,
        inbound_ach: { debit_status: 'blocked' },
      });
      routingNumber = newAccountNumber.routing_number;
      accountNumber = newAccountNumber.account_number;
    } else {
      routingNumber = accountNumbers.data[0].routing_number;
      accountNumber = accountNumbers.data[0].account_number;
    }

    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(plainToken);

    await db.update(daoAccountApplications)
      .set({
        increaseAccountId: increaseAccount.id,
        increaseAccountNumber: accountNumber,
        increaseRoutingNumber: routingNumber,
        accountTokenHash: tokenHash,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(daoAccountApplications.id, applicationId.trim()));

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application.id,
        entityName: application.entityName,
        increaseAccountId: increaseAccount.id,
        status: 'active',
        accountToken: plainToken,
        note: 'Store the accountToken securely — it is shown once and cannot be retrieved again. Provide it to the DAO for dashboard access.',
      },
    });
  } catch (err: unknown) {
    console.error('[DAO Account Provision] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to provision account' });
  }
}
