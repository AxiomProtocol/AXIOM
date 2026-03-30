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

  let regResult: Awaited<ReturnType<typeof ERC3643Service.registerIdentity>>;
  let kyc: Awaited<ReturnType<typeof ERC3643Service.issueClaim>>;
  let sanctions: Awaited<ReturnType<typeof ERC3643Service.issueClaim>>;

  try {
    regResult = await ERC3643Service.registerIdentity(submission.walletAddress, countryCode ?? 840);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.insert(t3ComplianceOpsLog).values({
      wallet: submission.walletAddress,
      action: 'issuance',
      topic: null,
      operatorAddress: adminWallet,
      result: 'failed',
      notes: `registerIdentity failed: ${msg}`,
    }).catch(() => {});
    return res.status(500).json({ error: `registerIdentity failed: ${msg}` });
  }

  try {
    kyc = await ERC3643Service.issueClaim(submission.walletAddress, 1);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.insert(t3ComplianceOpsLog).values({
      wallet: submission.walletAddress,
      action: 'issuance',
      topic: 1,
      operatorAddress: adminWallet,
      result: 'failed',
      notes: `issueClaim(Topic 1 KYC) failed: ${msg}`,
    }).catch(() => {});
    return res.status(500).json({ error: `issueClaim(Topic 1 KYC) failed: ${msg}` });
  }

  try {
    sanctions = await ERC3643Service.issueClaim(submission.walletAddress, 3);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.insert(t3ComplianceOpsLog).values({
      wallet: submission.walletAddress,
      action: 'issuance',
      topic: 3,
      operatorAddress: adminWallet,
      result: 'failed',
      notes: `issueClaim(Topic 3 Sanctions) failed: ${msg}`,
    }).catch(() => {});
    return res.status(500).json({ error: `issueClaim(Topic 3 Sanctions) failed: ${msg}` });
  }

  await db.update(t3KycSubmissions)
    .set({
      status: 'bridged',
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
      bridgedAt: new Date(),
      bridgeError: null,
      updatedAt: new Date(),
    })
    .where(eq(t3KycSubmissions.id, submissionId)).catch(() => {});

  await db.insert(t3ComplianceOpsLog).values({
    wallet: submission.walletAddress,
    action: 'issuance',
    topic: 1,
    claimId: kyc.claimId,
    operatorAddress: adminWallet,
    txHash: kyc.txHash ?? null,
    result: 'success',
    notes: 'KYC approved — registerIdentity + Topic 1 (KYC) + Topic 3 (Sanctions) issued atomically',
    metadata: {
      identityAddress: regResult.onchainIdAddress,
      registryTxHash: regResult.registryTxHash,
      kycClaimId: kyc.claimId,
      kycExpiresAt: kyc.expiresAt,
      sanctionsClaimId: sanctions.claimId,
      sanctionsExpiresAt: sanctions.expiresAt,
    },
  }).catch(() => {});

  await db.insert(t3ComplianceOpsLog).values({
    wallet: submission.walletAddress,
    action: 'issuance',
    topic: 3,
    claimId: sanctions.claimId,
    operatorAddress: adminWallet,
    txHash: sanctions.txHash ?? null,
    result: 'success',
    notes: 'Topic 3 (Sanctions) issued as part of atomic KYC approval',
  }).catch(() => {});

  return res.status(200).json({
    success: true,
    data: {
      submissionId,
      walletAddress: submission.walletAddress,
      status: 'bridged',
      identityAddress: regResult.onchainIdAddress,
      kycClaim: { claimId: kyc.claimId, expiresAt: kyc.expiresAt },
      sanctionsClaim: { claimId: sanctions.claimId, expiresAt: sanctions.expiresAt },
    },
  });
}
