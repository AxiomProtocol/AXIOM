import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3KycSubmissions, t3ComplianceOpsLog } from '../../../../shared/erc3643Schema';
import { eq } from 'drizzle-orm';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { submissionId, countryCode, reviewNote } = req.body as {
    submissionId?: string;
    countryCode?: number;
    reviewNote?: string;
  };

  if (!submissionId || typeof submissionId !== 'string') {
    return res.status(400).json({ error: 'submissionId required' });
  }

  const [submission] = await db.select()
    .from(t3KycSubmissions)
    .where(eq(t3KycSubmissions.id, submissionId))
    .limit(1).catch(() => []);

  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (!['submitted', 'under_review'].includes(submission.status)) {
    return res.status(400).json({ error: `Cannot approve submission in status: ${submission.status}` });
  }

  const adminWallet = 'compliance-operator';
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  await db.update(t3KycSubmissions)
    .set({ status: 'approved', reviewNote: reviewNote ?? null, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(t3KycSubmissions.id, submissionId));

  try {
    const regResult = await ERC3643Service.registerIdentity(submission.walletAddress, countryCode ?? 840);
    results.registerIdentity = { txHash: regResult.txHash, registryTxHash: regResult.registryTxHash, identityAddress: regResult.onchainIdAddress };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`registerIdentity: ${msg}`);
    results.registerIdentity = { error: msg };
  }

  try {
    const kyc = await ERC3643Service.issueClaim(submission.walletAddress, 1);
    results.kycClaim = { claimId: kyc.claimId, expiresAt: kyc.expiresAt };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`issueClaim(topic 1): ${msg}`);
    results.kycClaim = { error: msg };
  }

  try {
    const sanctions = await ERC3643Service.issueClaim(submission.walletAddress, 3);
    results.sanctionsClaim = { claimId: sanctions.claimId, expiresAt: sanctions.expiresAt };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`issueClaim(topic 3): ${msg}`);
    results.sanctionsClaim = { error: msg };
  }

  const bridged = errors.length === 0;
  await db.update(t3KycSubmissions)
    .set({ status: bridged ? 'bridged' : 'approved', bridgedAt: bridged ? new Date() : null, bridgeError: errors.length ? errors.join('; ') : null, updatedAt: new Date() })
    .where(eq(t3KycSubmissions.id, submissionId)).catch(() => {});

  await db.insert(t3ComplianceOpsLog).values({
    wallet: submission.walletAddress,
    action: 'issuance',
    topic: null,
    operatorAddress: adminWallet,
    result: bridged ? 'success' : 'partial',
    notes: bridged ? 'KYC approved — Topics 1 and 3 issued' : `Partial: ${errors.join('; ')}`,
    metadata: results,
  }).catch(() => {});

  return res.status(200).json({
    success: true,
    data: {
      submissionId,
      walletAddress: submission.walletAddress,
      status: bridged ? 'bridged' : 'approved',
      results,
      errors: errors.length ? errors : undefined,
    },
  });
}
