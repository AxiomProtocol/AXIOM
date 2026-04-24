import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession, ensureSecInvestor } from '../../../../server/services/secondary/auth';
import { getListings } from '../../../../server/services/secondary/marketplace';
import { createTransferRequest, submitTransferRequest, createListingFromTransfer } from '../../../../server/services/secondary/transfers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getSecSession(req);
    const { seriesId, status } = req.query as { seriesId?: string; status?: string };

    try {
      const listings = await getListings({
        seriesId, status: status || 'active',
        buyerInvestorId: session?.investorId,
      });
      return res.status(200).json({ success: true, listings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    let investorId = session.investorId;
    if (!investorId) investorId = await ensureSecInvestor(session.walletAddress);

    const { seriesId, unitsOffered, priceType, askPricePerUnit, minimumBidUnits,
      description, expiresAt, settlementAsset } = req.body;

    if (!seriesId || !unitsOffered || !priceType) {
      return res.status(400).json({ success: false, error: 'seriesId, unitsOffered, and priceType required' });
    }

    try {
      const transferRequestId = await createTransferRequest({
        sellerId: investorId,
        seriesId,
        unitsRequested: unitsOffered,
        requestedPricePerUnit: askPricePerUnit,
        settlementAsset: settlementAsset || 'axusd',
      });

      const { status: checkStatus, decision, blockedReason } = await submitTransferRequest(transferRequestId, investorId);

      if (checkStatus === 'blocked') {
        return res.status(422).json({ success: false, error: 'Transfer blocked by compliance check', reason: blockedReason });
      }

      const listingId = await createListingFromTransfer(transferRequestId, investorId, {
        priceType, askPricePerUnit, minimumBidUnits,
        description, expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return res.status(201).json({ success: true, listingId, transferRequestId, complianceDecision: decision });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
