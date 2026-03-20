import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession, ensureSecInvestor } from '../../../../../../server/services/secondary/auth';
import { getListing, submitBid, getListingBids } from '../../../../../../server/services/secondary/marketplace';
import { createApprovalRequests } from '../../../../../../server/services/secondary/approvals';
import { createSettlementInstruction } from '../../../../../../server/services/secondary/settlement';
import { pool } from '../../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { listingId } = req.query as { listingId: string };

  if (req.method === 'GET') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    const bids = await getListingBids(listingId);
    const listing = await getListing(listingId);
    const isSeller = listing?.seller_id === session.investorId;
    if (!isSeller && !session.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    return res.status(200).json({ success: true, bids });
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    let investorId = session.investorId;
    if (!investorId) investorId = await ensureSecInvestor(session.walletAddress);

    const { unitsRequested, bidPricePerUnit, expiresAt } = req.body;
    if (!unitsRequested || !bidPricePerUnit) {
      return res.status(400).json({ success: false, error: 'unitsRequested and bidPricePerUnit required' });
    }

    const listing = await getListing(listingId);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (listing.status !== 'active') return res.status(422).json({ success: false, error: 'Listing is not active' });
    if (listing.seller_id === investorId) return res.status(422).json({ success: false, error: 'Cannot bid on your own listing' });

    try {
      const bidId = await submitBid({
        listingId, buyerId: investorId, buyerWalletAddress: session.walletAddress,
        unitsRequested, bidPricePerUnit,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      return res.status(201).json({ success: true, bidId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    // Accept bid: PATCH with { bidId, action: 'accept' }
    const session = await getSecSession(req);
    if (!session || !session.investorId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { bidId, action } = req.body;
    if (action !== 'accept' || !bidId) return res.status(400).json({ success: false, error: 'action=accept and bidId required' });

    const { acceptBid } = await import('../../../../../../server/services/secondary/marketplace');
    try {
      const matchedTradeId = await acceptBid(bidId, session.investorId);

      // Get the transfer request for this listing
      const trResult = await pool.query(
        `SELECT transfer_request_id FROM sec_listings WHERE id = $1 LIMIT 1`, [listingId]
      );
      const transferRequestId = trResult.rows[0]?.transfer_request_id;

      // Create approvals based on series policy
      const listing = await getListing(listingId);
      if (listing?.requires_issuer_approval) {
        await createApprovalRequests(transferRequestId, matchedTradeId, listing.series_id);
        await pool.query(
          `UPDATE sec_matched_trades SET status = 'awaiting_approvals', updated_at = NOW() WHERE id = $1`, [matchedTradeId]
        );
        await pool.query(
          `UPDATE sec_transfer_requests SET status = 'awaiting_approvals', updated_at = NOW() WHERE id = $1`, [transferRequestId]
        );
        return res.status(200).json({ success: true, matchedTradeId, status: 'awaiting_approvals' });
      } else {
        const instructionId = await createSettlementInstruction(matchedTradeId);
        return res.status(200).json({ success: true, matchedTradeId, settlementInstructionId: instructionId, status: 'settlement_pending' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
