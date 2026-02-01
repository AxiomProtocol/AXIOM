import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { pmaApplications } from '../../../shared/schema';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fullName,
      email,
      walletAddress,
      membershipType,
      country,
      isOver18,
      acceptDeclaration,
      acceptBylaws,
      acceptMembership,
      acceptRisks,
      acceptPrivate
    } = req.body;

    if (!fullName || !email || !walletAddress || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isOver18) {
      return res.status(400).json({ error: 'Applicant must be 18 or older' });
    }

    if (!acceptDeclaration || !acceptBylaws || !acceptMembership || !acceptRisks || !acceptPrivate) {
      return res.status(400).json({ error: 'All acknowledgments must be accepted' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const restrictedCountries = ['KP', 'IR', 'SY', 'CU'];
    if (restrictedCountries.includes(country)) {
      return res.status(400).json({ error: 'Applications from restricted jurisdictions are not accepted' });
    }

    const application = await db.insert(pmaApplications).values({
      fullName,
      email: email.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      membershipType,
      country,
      status: 'pending',
      acceptedDeclaration: acceptDeclaration,
      acceptedBylaws: acceptBylaws,
      acceptedMembership: acceptMembership,
      acceptedRisks: acceptRisks,
      acceptedPrivate: acceptPrivate,
      submittedAt: new Date(),
    }).returning();

    return res.status(200).json({
      success: true,
      applicationId: application[0].id,
      message: 'Application submitted successfully'
    });
  } catch (error: any) {
    console.error('PMA application error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'An application with this email or wallet address already exists' });
    }
    
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}
