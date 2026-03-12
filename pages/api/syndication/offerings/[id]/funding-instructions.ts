import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { ethers } from 'ethers';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required. Connect your wallet and sign in.' });
  }

  const { id, subscriptionId } = req.query;

  try {
    const offeringResult = await pool.query(
      `SELECT o.slug, o.name, o.created_by FROM syn_offerings o WHERE o.id = $1`,
      [id]
    );
    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found' });
    }

    const isOperator = offeringResult.rows[0].created_by &&
      offeringResult.rows[0].created_by.toLowerCase() === wallet.toLowerCase();

    if (subscriptionId) {
      const subResult = await pool.query(
        `SELECT s.id, s.investor_wallet, ip.wallet_address AS profile_wallet
         FROM syn_subscriptions s
         LEFT JOIN syn_investor_profiles ip ON ip.id = s.investor_profile_id
         WHERE s.id = $1 AND s.offering_id = $2`,
        [subscriptionId, id]
      );
      if (subResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Subscription not found for this offering' });
      }
      const sub = subResult.rows[0];
      const walletLower = wallet.toLowerCase();
      const isSubOwner =
        (sub.investor_wallet && sub.investor_wallet.toLowerCase() === walletLower) ||
        (sub.profile_wallet && sub.profile_wallet.toLowerCase() === walletLower);
      if (!isOperator && !isSubOwner) {
        return res.status(403).json({ success: false, error: 'Not authorized to view funding instructions for this subscription' });
      }
    } else if (!isOperator) {
      return res.status(403).json({ success: false, error: 'Not authorized to view funding instructions for this offering' });
    }

    const offering = offeringResult.rows[0];
    const slugPart = (offering.slug || 'OFFER').substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const subPart = subscriptionId ? String(subscriptionId).substring(0, 8).toUpperCase() : 'GENERAL';
    const memoCode = `AXIOM-${slugPart}-${subPart}`;

    let treasuryWallet = process.env.TREASURY_WALLET_ADDRESS || null;
    if (!treasuryWallet) {
      try {
        if (process.env.DEPLOYER_PRIVATE_KEY) {
          const derivedWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
          treasuryWallet = derivedWallet.address;
        }
      } catch {}
    }

    const routingNumber = process.env.UNIT_ROUTING_NUMBER || null;
    const accountNumber = process.env.UNIT_ACCOUNT_NUMBER || null;
    const bankConfigured = !!(routingNumber && accountNumber);

    const bankDetails = bankConfigured
      ? {
          bankName: 'Axiom Protocol Treasury',
          routingNumber,
          accountNumber,
          accountType: 'Checking',
          beneficiary: 'Axiom Protocol LLC',
          bankAddress: 'Unit Finance / Evolve Bank & Trust',
          note: 'Wire routing and account details provided via Unit Finance.',
          configured: true,
        }
      : {
          bankName: 'Axiom Protocol Treasury',
          routingNumber: null,
          accountNumber: null,
          accountType: null,
          beneficiary: 'Axiom Protocol LLC',
          bankAddress: null,
          note: 'USD wire instructions not yet configured. Contact operations for payment details.',
          configured: false,
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
