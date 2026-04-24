import { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateUserData, updateUserData } from './index';

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

  try {
    await getOrCreateUserData(address);
    await updateUserData(address, { autoCompound: enabled });

    return res.status(200).json({
      success: true,
      message: enabled ? 'Auto-compound enabled' : 'Auto-compound disabled',
      autoCompoundEnabled: enabled,
    });
  } catch (error: any) {
    console.error('Error toggling auto-compound:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle auto-compound' });
  }
}
