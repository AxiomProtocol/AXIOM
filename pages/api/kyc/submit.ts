import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, fullName, email, country, annualIncome, netWorth, accredited } = req.body;

  if (!walletAddress || !fullName || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log('KYC Submission received:', {
      walletAddress: walletAddress.toLowerCase(),
      fullName,
      email,
      country,
      annualIncome,
      netWorth,
      accredited,
      submittedAt: new Date().toISOString()
    });

    return res.status(200).json({ 
      success: true, 
      status: 'pending',
      message: 'Your verification has been submitted for review'
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    return res.status(500).json({ error: 'Failed to submit verification' });
  }
}
