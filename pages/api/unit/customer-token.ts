import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { unitCustomerService } from '../../../lib/services/UnitCustomerService';
import { getUnitClient, isUnitConfigured } from '../../../lib/unit/client';
import { rateLimitDefault } from '../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  if (!isUnitConfigured()) {
    return res.status(503).json({ error: 'Banking service is not configured.' });
  }

  const customer = await unitCustomerService.getCustomer(session.address);
  if (!customer?.unitCustomerId) {
    return res.status(404).json({ error: 'Banking profile not found. Complete identity verification first.' });
  }

  const client = getUnitClient();
  if (!client) {
    return res.status(503).json({ error: 'Banking service unavailable.' });
  }

  try {
    const response = await client.customerTokens.createToken(customer.unitCustomerId, {
      type: 'customerToken',
      attributes: {
        scope: 'accounts transactions counterparties counterparties-write',
        expiresIn: 3600,
      },
    });

    const token = (response.data?.attributes as { token?: string })?.token;
    if (!token) {
      return res.status(500).json({ error: 'Failed to generate access token.' });
    }

    return res.status(200).json({ token, expiresIn: 3600 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[unit/customer-token] error:', msg);
    return res.status(500).json({ error: 'Failed to generate token. Please try again.' });
  }
}
