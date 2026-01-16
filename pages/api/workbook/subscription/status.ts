import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Test mode - bypasses subscription check for development/testing
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';

  if (testMode) {
    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          hasAccess: true,
          isActive: true,
          isPastDue: false,
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          testMode: true,
        },
        usage: {
          assistantCalls: 0,
          docExtractions: 0,
          exportsGenerated: 0,
          limits: {
            assistantCalls: 100,
            docExtractions: 50,
            exportsGenerated: 20,
          },
        },
      },
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      subscription: {
        hasAccess: false,
        isActive: false,
        isPastDue: false,
        periodEnd: null,
      },
      usage: null,
    },
  });
}
