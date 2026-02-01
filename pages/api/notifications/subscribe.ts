import { NextApiRequest, NextApiResponse } from 'next';

const subscriptions: { [address: string]: any } = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, subscription } = req.body;

  if (!address || !subscription) {
    return res.status(400).json({ success: false, error: 'Address and subscription required' });
  }

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ success: false, error: 'Invalid address' });
  }

  subscriptions[address.toLowerCase()] = subscription;

  return res.status(200).json({
    success: true,
    message: 'Push subscription saved',
  });
}
