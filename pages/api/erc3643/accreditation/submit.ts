import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

const VALID_BASES = [
  'income',
  'net_worth',
  'professional_certification',
  'entity',
  'knowledgeable_employee',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, selfCertification, accreditationBasis, documentUrls, notes } = req.body;

  if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (typeof selfCertification !== 'boolean') {
    return res.status(400).json({ error: 'selfCertification (boolean) required' });
  }
  if (!accreditationBasis || !VALID_BASES.includes(accreditationBasis)) {
    return res.status(400).json({ error: `accreditationBasis required. Valid: ${VALID_BASES.join(', ')}` });
  }

  try {
    const result = await ERC3643Service.submitAccreditation({
      walletAddress,
      selfCertification,
      accreditationBasis,
      documentUrls: documentUrls ?? undefined,
      notes: notes ?? undefined,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: msg });
  }
}
