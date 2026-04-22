import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    notePortal: {
      status: 'INACTIVE',
      summary: {
        totalNotes: 0,
        byStatus: {
          draft: 0,
          active: 0,
          current: 0,
          delinquent: 0,
          paidOff: 0,
          defaulted: 0,
          cancelled: 0,
        },
        financials: {
          totalPrincipal: 0,
          totalOutstanding: 0,
          totalPaymentsReceived: 0,
          totalAccruedInterest: 0,
        },
      },
      payments: {
        totalEvents: 0,
        totalAmount: 0,
        lastPaymentDate: null,
      },
      covenants: {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
      },
    },
    recentNotes: [],
  });
}