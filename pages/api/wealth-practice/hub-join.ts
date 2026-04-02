import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../server/db';
import { susuHubWalletMembers } from '../../../shared/increaseParticipantSchema';
import { and, eq } from 'drizzle-orm';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';

// GET  /api/wealth-practice/hub-join?hubId=X&wallet=Y  — membership check
// POST /api/wealth-practice/hub-join                   — join a hub

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET: check membership ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { hubId, wallet } = req.query;
    if (!hubId || !wallet) {
      return res.status(400).json({ success: false, error: 'hubId and wallet required' });
    }
    try {
      const rows = await db
        .select()
        .from(susuHubWalletMembers)
        .where(
          and(
            eq(susuHubWalletMembers.hubId, Number(hubId)),
            eq(susuHubWalletMembers.walletAddress, String(wallet).toLowerCase()),
          ),
        )
        .limit(1);
      return res.status(200).json({ success: true, isMember: rows.length > 0 });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  // ── POST: join hub ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ success: false, error: 'Wallet sign-in required to join a hub' });
  }

  const { hubId, walletAddress: bodyWallet } = req.body;

  const wallet: string =
    siweWallet === '__dev__' ? String(bodyWallet || '').toLowerCase() : siweWallet.toLowerCase();

  if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: 'Valid wallet address required' });
  }

  if (!hubId) {
    return res.status(400).json({ success: false, error: 'hubId required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify hub exists and is active
    const hubResult = await client.query(
      `SELECT id, member_count FROM susu_interest_hubs WHERE id = $1 AND is_active = true`,
      [Number(hubId)],
    );
    if (hubResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Hub not found or inactive' });
    }

    // Idempotency: already a member
    const existing = await db
      .select()
      .from(susuHubWalletMembers)
      .where(
        and(
          eq(susuHubWalletMembers.hubId, Number(hubId)),
          eq(susuHubWalletMembers.walletAddress, wallet),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ success: true, alreadyMember: true, message: 'Already a member of this hub' });
    }

    // Insert membership row
    await db.insert(susuHubWalletMembers).values({
      hubId: Number(hubId),
      walletAddress: wallet,
    });

    // Increment hub member count
    await client.query(
      `UPDATE susu_interest_hubs SET member_count = member_count + 1 WHERE id = $1`,
      [Number(hubId)],
    );

    // Log analytics event
    await client.query(
      `INSERT INTO susu_analytics_events (event_type, hub_id, metadata, created_at)
       VALUES ('hub_join', $1, $2, NOW())`,
      [Number(hubId), JSON.stringify({ wallet_address: wallet })],
    );

    await client.query('COMMIT');

    return res.status(201).json({ success: true, message: 'Joined hub successfully' });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: String(err) });
  } finally {
    client.release();
  }
}
