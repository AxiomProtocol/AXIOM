import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { groupId, memberAddress } = req.body;

  if (!groupId || !memberAddress) {
    return res.status(400).json({
      success: false,
      error: 'groupId and memberAddress are required',
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
    // Require a funded insurance-hold escrow in increase_product_escrows for this
    // participant + group before allowing them to join.
    // The required hold = 1 week equivalent (monthly contribution ÷ 4).
    // In development mode we skip this gate to enable local testing.
    if (process.env.NODE_ENV !== 'development') {
      const participantResult = await client.query(
        `SELECT ip.id FROM increase_participants ip WHERE ip.wallet_address = $1 LIMIT 1`,
        [memberAddress.toLowerCase()]
      );

      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          success: false,
          error: 'Nexus account required — register your Axiom Nexus banking account before joining a group.',
          code: 'NEXUS_NOT_REGISTERED',
        });
      }

      const participantId = participantResult.rows[0].id;

      // Check for a funded insurance-hold in increase_product_escrows for this group
      const holdResult = await client.query(
        `SELECT id, status FROM increase_product_escrows
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
