import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3KycSubmissions } from '../../../../shared/erc3643Schema';
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
    .limit(1);

  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (!['submitted', 'under_review'].includes(submission.status)) {
    return res.status(400).json({
      error: `Cannot approve submission in status: ${submission.status}`,
    });
  }

  try {
    const result = await ERC3643Service.atomicKycApproval({
      submissionId,
      walletAddress: submission.walletAddress,
      countryCode: countryCode ?? 840,
      reviewNote,
    });

    return res.status(200).json({
      success: true,
      data: {
        submissionId,
        walletAddress: submission.walletAddress,
        status: 'bridged',
        identityAddress: result.identityAddress,
        registryTxHash: result.registryTxHash,
        t1Claim: {
          ...result.t1Claim,
          txHash: null,
          issuanceMode: 'erc3643_offchain_signature',
        },
        t3Claim: {
          ...result.t3Claim,
          txHash: null,
          issuanceMode: 'erc3643_offchain_signature',
        },
        note: 'ERC-3643 T-REX architecture: topic claims are issued as off-chain ClaimIssuer signatures (no on-chain claim tx). Claims are verified by IdentityRegistry during AXUSD transfers via ClaimIssuer.isClaimValid().',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
