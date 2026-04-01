import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

// GET /api/banking/lending-fund/deposit-instructions?groupId=...
//
// Participant path: wallet is derived from SIWE session (no ?wallet= needed).
// Admin path      : requires x-admin-key header + optional ?wallet=0x... override.
// Dev mode        : SIWE returns '__dev__'; falls back to optional ?wallet= query param.
//
// Returns LP capital call deposit instructions for the Lending Fund product.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const isAdmin = typeof req.headers['x-admin-key'] === 'string'
    && req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;

  const siweWallet = await getSiweWallet(req);

  let wallet: string | null = null;

  if (isAdmin) {
    // Admin path: accept ?wallet= override, or use SIWE as fallback
    const qw = typeof req.query.wallet === 'string' ? req.query.wallet.toLowerCase() : null;
    wallet = (qw && /^0x[a-fA-F0-9]{40}$/i.test(qw))
      ? qw
      : (siweWallet && siweWallet !== '__dev__' ? siweWallet.toLowerCase() : null);
    if (!wallet) return res.status(400).json({ error: 'Admin path: supply ?wallet=0x... or authenticate via SIWE' });
  } else {
    // Participant path: derive wallet from SIWE session
    if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
    if (siweWallet === '__dev__') {
      // Dev mode: accept optional ?wallet= for testing
      const qw = typeof req.query.wallet === 'string' ? req.query.wallet.toLowerCase() : null;
      wallet = (qw && /^0x[a-fA-F0-9]{40}$/i.test(qw)) ? qw : '0x0000000000000000000000000000000000000001';
    } else {
      wallet = siweWallet.toLowerCase();
    }
  }

  try {
    const rows = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    const SHARED_ROUTING = '071006486';
    const SHARED_BANK = 'First Internet Bank';
    const SHARED_ACCOUNT_NAME = 'Axiom Protocol LLC — Nexus Account';

    if (rows.length === 0) {
      return res.status(200).json({
        registered: false,
        depositInstructions: {
          bankName: SHARED_BANK,
          accountName: SHARED_ACCOUNT_NAME,
          routingNumber: SHARED_ROUTING,
          accountNumber: null,
          memo: null,
          note: 'Register your Axiom Nexus account to receive your dedicated deposit routing number.',
          hasVirtualAccount: false,
        },
      });
    }

    const p = rows[0];
    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      depositInstructions: {
        bankName: SHARED_BANK,
        accountName: SHARED_ACCOUNT_NAME,
        routingNumber: hasVirtualAccount ? p.virtualRoutingNumber : SHARED_ROUTING,
        accountNumber: hasVirtualAccount ? p.virtualAccountNumber : null,
        memo: hasVirtualAccount ? null : p.participantRef,
        note: hasVirtualAccount
          ? `Your dedicated Lending Fund deposit account: ${p.virtualAccountNumber} (routing ${p.virtualRoutingNumber}). No memo required — this number routes exclusively to you.`
          : `Use routing ${SHARED_ROUTING} and always include your reference code "${p.participantRef}" in the ACH memo or wire description field.`,
        hasVirtualAccount,
        product: 'lending-fund',
        environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
