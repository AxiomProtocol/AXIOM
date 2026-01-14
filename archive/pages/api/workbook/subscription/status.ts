import type { NextApiRequest, NextApiResponse } from 'next';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { getOrCreateMeter } from '../../../../lib/workbook/usage-meter';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers.cookie || '';
  const hasSiweCookie = cookies.includes('siwe_session=');
  console.log('[Workbook Status] Cookie header present:', !!cookies, 'Has siwe_session:', hasSiweCookie);
  
  const userId = await getUserFromSiweSession(req);
  console.log('[Workbook Status] User ID from session:', userId);
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required', debug: { hasCookie: hasSiweCookie } });
  }

  try {
    const entitlement = await checkEntitlement(userId);
    const usage = await getOrCreateMeter(userId);

    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          hasAccess: entitlement.hasAccess,
          isActive: entitlement.isActive,
          isPastDue: entitlement.isPastDue,
          periodEnd: entitlement.periodEnd,
        },
        usage: {
          assistantCalls: usage.assistantCalls,
          docExtractions: usage.docExtractions,
          exportsGenerated: usage.exportsGenerated,
          limits: usage.limits,
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd,
        },
      },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return res.status(500).json({ error: 'Failed to get subscription status' });
  }
}
