import { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateUserData, vaultData } from './index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, enabled } = req.body;

  if (!address) {
    return res.status(400).json({ success: false, error: 'Address required' });
  }

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid address' });
  }

  const userData = getOrCreateUserData(address);
  userData.autoCompound = enabled;
  vaultData[address.toLowerCase()] = userData;

  return res.status(200).json({
    success: true,
    message: enabled ? 'Auto-compound enabled' : 'Auto-compound disabled',
    autoCompoundEnabled: enabled,
  });
}
