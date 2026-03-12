import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { ethers } from 'ethers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id, subscriptionId } = req.query;

  try {
    const offeringResult = await pool.query(
      `SELECT o.slug, o.name FROM syn_offerings o WHERE o.id = $1`,
      [id]
    );
    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found' });
    }

    const offering = offeringResult.rows[0];
    const slugPart = (offering.slug || 'OFFER').substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const subPart = subscriptionId ? String(subscriptionId).substring(0, 8).toUpperCase() : 'GENERAL';
    const memoCode = `AXIOM-${slugPart}-${subPart}`;

    let treasuryWallet = null;
    try {
      if (process.env.DEPLOYER_PRIVATE_KEY) {
        const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
        treasuryWallet = wallet.address;
      }
    } catch {}

    const bankDetails = {
      bankName: 'Axiom Protocol Treasury',
      routingNumber: process.env.UNIT_API_TOKEN ? '084106768' : null,
      accountNumber: process.env.UNIT_API_TOKEN ? '****pending-unit-setup' : null,
      accountType: 'Checking',
      beneficiary: 'Axiom Protocol LLC',
      bankAddress: 'Unit Finance / Evolve Bank & Trust',
      note: process.env.UNIT_API_TOKEN
        ? 'Wire routing and account details provided via Unit Finance.'
        : 'Banking rails not yet configured. Contact operations for wire instructions.',
    };

    return res.status(200).json({
      success: true,
      offeringName: offering.name,
      memoCode,
      bankDetails,
      treasuryWallet,
      network: 'Arbitrum One',
      axusdContract: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
