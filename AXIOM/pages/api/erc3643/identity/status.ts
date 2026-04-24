import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

const TOPIC_NAMES: Record<number, string> = { 1: 'KYC_VERIFIED', 2: 'ACCREDITED_INVESTOR', 3: 'SANCTIONS_CLEAR' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required as query parameter' });
  }

  try {
    const status = await ERC3643Service.getIdentityStatus(wallet);

    const now = Date.now();
    const claimsWithExpiry = status.claims.map(c => {
      const expiresAt = c.expiresAt ? new Date(c.expiresAt) : null;
      const daysUntilExpiry = expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - now) / (24 * 3600 * 1000)))
        : null;
      const expired = expiresAt ? expiresAt.getTime() <= now : false;
      return {
        ...c,
        topicName: TOPIC_NAMES[c.topic] ?? `TOPIC_${c.topic}`,
        daysUntilExpiry,
        expired,
      };
    });

    return res.status(200).json({
      success: true,
      data: { ...status, claims: claimsWithExpiry },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
