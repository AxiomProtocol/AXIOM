import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, applicationId, loanAmount, propertyAddress } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
    const { sendLoanApprovalEmail } = await import('../../../lib/server/resendEmail');
    const result = await sendLoanApprovalEmail({
      borrowerEmail: email,
      borrowerName: name,
      applicationId,
      loanAmount: loanAmount || '0',
      propertyAddress: propertyAddress || '',
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Loan approval email error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
}
