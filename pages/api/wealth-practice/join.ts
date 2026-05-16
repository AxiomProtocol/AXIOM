import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    }).filter(([k]) => k.length > 0)
  );
}

async function getSiweWallet(req: NextApiRequest): Promise<string | null> {
  if (process.env.NODE_ENV === 'development') return '__dev__';
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['siwe_session'];
  if (!token) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW() LIMIT 1`,
      [token]
    );
    return result.rows[0]?.wallet_address ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Derive memberAddress from SIWE session to prevent IDOR/unauthorized membership mutation.
  // In dev mode, fall back to the body-supplied address.
  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ success: false, error: 'Wallet sign-in required — connect your wallet and sign in to join a group' });
  }

  const { groupId, memberAddress: bodyMemberAddress } = req.body;

  // Derive canonical memberAddress from SIWE (dev falls back to body param)
  const memberAddress: string | null | undefined = siweWallet === '__dev__'
    ? bodyMemberAddress
    : siweWallet;

  if (!memberAddress || !/^0x[a-fA-F0-9]{40}$/i.test(memberAddress)) {
    return res.status(400).json({ success: false, error: 'Valid wallet address could not be determined from your session' });
  }

  // In production, if a body memberAddress is provided, it must match the SIWE wallet
  if (siweWallet !== '__dev__' && bodyMemberAddress && bodyMemberAddress.toLowerCase() !== siweWallet.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'You may only join groups as your own connected wallet' });
  }

  if (!groupId) {
    return res.status(400).json({
      success: false,
      error: 'groupId is required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `SELECT id, member_count, max_members, is_active, hub_id, contribution_amount
       FROM susu_purpose_groups WHERE id = $1`,
      [Number(groupId)]
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    if (!group.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Group is not active' });
    }

    const memberCount = parseInt(group.member_count) || 0;
    const maxMembers = parseInt(group.max_members) || 12;

    if (memberCount >= maxMembers) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Group is full' });
    }

    const existingMember = await client.query(
      `SELECT id FROM susu_group_members WHERE group_id = $1 AND member_address = $2`,
      [Number(groupId), memberAddress]
    );

    if (existingMember.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Already a member of this group' });
    }

    // ── Insurance hold gate ──────────────────────────────────────────────────
    // Require a funded insurance-hold escrow in banking_product_escrows for this
    // participant + group before allowing them to join.
    // The required hold = 1 week equivalent (monthly contribution ÷ 4).
    // In development mode we skip this gate to enable local testing.
    if (process.env.NODE_ENV !== 'development') {
      const participantResult = await client.query(
        `SELECT ip.id FROM banking_participants ip WHERE ip.wallet_address = $1 LIMIT 1`,
        [memberAddress.toLowerCase()]
      );

      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          success: false,
          error: 'Banking account required — register your banking account before joining a group.',
          code: 'BANKING_NOT_REGISTERED',
        });
      }

      const participantId = participantResult.rows[0].id;

      // Check for a funded insurance-hold in banking_product_escrows for this group
      const holdResult = await client.query(
        `SELECT id, status FROM banking_product_escrows
         WHERE participant_id = $1
           AND product = 'wealth-practice'
           AND purpose = 'insurance-hold'
           AND group_id = $2
           AND status = 'funded'
         LIMIT 1`,
        [participantId, String(groupId)]
      );

      if (holdResult.rows.length === 0) {
        const monthlyContributionCents = group.contribution_amount
          ? Math.round(parseFloat(group.contribution_amount) * 100)
          : 0;
        const requiredHoldCents = monthlyContributionCents > 0
          ? Math.ceil(monthlyContributionCents / 4)
          : null;

        await client.query('ROLLBACK');
        return res.status(402).json({
          success: false,
          error: 'Insurance hold required — your security deposit must be funded before joining this group.',
          code: 'INSURANCE_HOLD_NOT_FUNDED',
          requiredHoldCents,
          instructions: 'Go to your Axiom Nexus account (Products → My Nexus Account) to fund your insurance hold.',
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    await client.query(
      `INSERT INTO susu_group_members (group_id, member_address, position, status, joined_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [Number(groupId), memberAddress, memberCount + 1]
    );

    await client.query(
      `UPDATE susu_purpose_groups SET member_count = member_count + 1 WHERE id = $1`,
      [Number(groupId)]
    );

    await client.query(
      `INSERT INTO susu_analytics_events (event_type, hub_id, group_id, metadata, created_at)
       VALUES ('group_join', $1, $2, $3, NOW())`,
      [group.hub_id, Number(groupId), JSON.stringify({ member_address: memberAddress })]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Joined group successfully',
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  } finally {
    client.release();
  }
}
