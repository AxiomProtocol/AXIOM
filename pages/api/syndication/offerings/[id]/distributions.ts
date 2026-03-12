import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const AXUSD_CONTRACT = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const IDENTITY_REGISTRY = '0x7856b3597389D34789512f43A0270a688846313B';

const lastPaymentTimestamp = new Map<string, number>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT d.*,
           ip.legal_name, ip.entity_name, ip.wallet_address, ip.meta AS investor_meta,
           c.ownership_pct, c.capital_contributed, c.share_class as cap_share_class
         FROM syn_distributions d
         LEFT JOIN syn_investor_profiles ip ON d.investor_profile_id = ip.id
         LEFT JOIN syn_cap_table c ON d.cap_table_entry_id = c.id
         WHERE d.offering_id = $1
         ORDER BY d.created_at DESC`,
        [id]
      );

      const totalGross = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.gross_amount || '0'), 0
      );
      const totalNet = result.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.net_amount || '0'), 0
      );
      const completedCount = result.rows.filter((r: any) => r.status === 'completed').length;

      return res.status(200).json({
        success: true,
        distributions: result.rows,
        summary: {
          total: result.rows.length,
          totalGross,
          totalNet,
          completedCount,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { distributionType, grossAmount, periodStart, periodEnd, paymentMethod, currency } = req.body;
      if (!distributionType || !grossAmount) {
        return res.status(400).json({ success: false, error: 'distributionType and grossAmount are required' });
      }

      if (parseFloat(grossAmount) <= 0) {
        return res.status(400).json({ success: false, error: 'grossAmount must be greater than zero' });
      }

      const validTypes = ['preferred_return', 'profit_share', 'return_of_capital', 'refinance_proceeds', 'sale_proceeds'];
      if (!validTypes.includes(distributionType)) {
        return res.status(400).json({ success: false, error: `Invalid distribution type. Must be one of: ${validTypes.join(', ')}` });
      }

      const capResult = await pool.query(
        `SELECT c.id, c.investor_profile_id, c.ownership_pct, c.capital_contributed,
                ip.wallet_address
         FROM syn_cap_table c
         LEFT JOIN syn_investor_profiles ip ON ip.id = c.investor_profile_id
         WHERE c.offering_id = $1
         ORDER BY c.ownership_pct DESC`,
        [id]
      );

      if (capResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No capital table entries found. Sync the capital table before creating distributions.' });
      }

      const totalOwnership = capResult.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.ownership_pct || '0'), 0
      );

      const distCurrency = currency || 'USD';

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const createdIds: string[] = [];
        for (const entry of capResult.rows) {
          const ownershipPct = parseFloat(entry.ownership_pct || '0');
          const proportion = totalOwnership > 0 ? ownershipPct / totalOwnership : 0;
          const investorGross = parseFloat((parseFloat(grossAmount) * proportion).toFixed(2));
          const investorNet = investorGross;

          const recipientWallet = distCurrency === 'AXUSD' ? (entry.wallet_address || null) : null;

          const insertResult = await client.query(
            `INSERT INTO syn_distributions
               (offering_id, cap_table_entry_id, investor_profile_id, distribution_type,
                gross_amount, net_amount, payment_method, currency, recipient_wallet, period_start, period_end)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [
              id,
              entry.id,
              entry.investor_profile_id,
              distributionType,
              investorGross,
              investorNet,
              paymentMethod || 'wire',
              distCurrency,
              recipientWallet,
              periodStart || null,
              periodEnd || null,
            ]
          );
          createdIds.push(insertResult.rows[0].id);
        }

        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          message: `Created ${createdIds.length} distribution entries`,
          count: createdIds.length,
          distributionIds: createdIds,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { distributionId, status } = req.body;
      if (!distributionId || !status) {
        return res.status(400).json({ success: false, error: 'distributionId and status are required' });
      }

      const validTransitions: Record<string, string[]> = {
        draft: ['approved'],
        approved: ['processing'],
        processing: ['completed', 'failed'],
        failed: ['processing'],
      };

      const current = await pool.query(
        `SELECT d.id, d.status, d.currency, d.net_amount, d.recipient_wallet, d.investor_profile_id, d.meta,
                ip.wallet_address, ip.meta AS investor_meta, ip.legal_name
         FROM syn_distributions d
         LEFT JOIN syn_investor_profiles ip ON ip.id = d.investor_profile_id
         WHERE d.id = $1 AND d.offering_id = $2`,
        [distributionId, id]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Distribution not found' });
      }

      const dist = current.rows[0];
      const currentStatus = dist.status;
      const allowed = validTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
        });
      }

      if (status === 'completed' && currentStatus === 'processing') {
        const rateLimitKey = `dist-pay:${id}`;
        const lastTs = lastPaymentTimestamp.get(rateLimitKey) || 0;
        if (Date.now() - lastTs < 5000) {
          return res.status(429).json({ success: false, error: 'Rate limited. Wait 5 seconds between distribution payments.' });
        }
        lastPaymentTimestamp.set(rateLimitKey, Date.now());

        const currency = dist.currency || 'USD';
        const netAmount = parseFloat(dist.net_amount || '0');

        if (netAmount <= 0) {
          return res.status(400).json({ success: false, error: 'Net amount must be greater than zero.' });
        }

        if (currency === 'AXUSD') {
          return await executeAxusdPayment(res, distributionId, id as string, dist, netAmount);
        } else {
          return await executeUsdPayment(res, distributionId, id as string, dist, netAmount);
        }
      }

      const updates: string[] = ['status = $1', 'updated_at = now()'];
      const params: any[] = [status];

      params.push(distributionId);
      params.push(id);
      await pool.query(
        `UPDATE syn_distributions SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND offering_id = $${params.length}`,
        params
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[Distributions] PATCH error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { distributionId } = req.body;
      if (!distributionId) {
        return res.status(400).json({ success: false, error: 'distributionId is required' });
      }

      await pool.query(
        `DELETE FROM syn_distributions WHERE id = $1 AND offering_id = $2 AND status = 'draft'`,
        [distributionId, id]
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function executeUsdPayment(
  res: NextApiResponse,
  distributionId: string,
  offeringId: string,
  dist: any,
  netAmount: number
) {
  try {
    const investorMeta = dist.investor_meta || {};
    const unitCustomerId = investorMeta.unitCustomerId;

    if (!unitCustomerId) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Investor has no linked Unit bank account. Cannot initiate ACH credit.'), distributionId, offeringId]
      );
      return res.status(200).json({
        success: false,
        error: 'Investor has no linked Unit bank account. Cannot initiate ACH credit.',
      });
    }

    const { UnitAccountService } = await import('../../../../../lib/services/UnitAccountService');
    const accountService = new UnitAccountService();

    const { isUnitConfigured } = await import('../../../../../lib/unit/client');
    if (!isUnitConfigured()) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Banking service is not configured.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'Banking service is not configured.' });
    }

    const { getUnitClient } = await import('../../../../../lib/unit/client');
    const unitClient = getUnitClient();
    if (!unitClient) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Banking service unavailable.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'Banking service unavailable.' });
    }

    let investorAccountId: string | null = null;
    try {
      const accountsResp = await unitClient.accounts.list({ customerId: unitCustomerId });
      const accounts = accountsResp.data ?? [];
      if (accounts.length > 0) {
        investorAccountId = accounts[0].id;
      }
    } catch (err) {
      console.error('[Distributions] Failed to list investor accounts:', err);
    }

    if (!investorAccountId) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('No linked deposit account found for investor.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'No linked deposit account found for investor.' });
    }

    const treasuryAccountId = process.env.UNIT_TREASURY_ACCOUNT_ID;
    if (!treasuryAccountId) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Treasury account not configured.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'Treasury account not configured.' });
    }

    const { UnitPaymentService } = await import('../../../../../lib/services/UnitPaymentService');
    const paymentService = new UnitPaymentService();
    const amountCents = Math.round(netAmount * 100);

    const payResult = await paymentService.createBookPayment({
      walletAddress: 'system',
      fromAccountId: treasuryAccountId,
      toAccountId: investorAccountId,
      amountCents,
      description: `Distribution — ${dist.legal_name || 'Investor'} — $${netAmount.toLocaleString()}`,
      purpose: 'distribution',
    });

    if (!payResult.success) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify(payResult.error || 'ACH payment failed'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: payResult.error || 'ACH payment failed.' });
    }

    await pool.query(
      `UPDATE syn_distributions SET status = 'completed', paid_at = now(),
       meta = jsonb_set(jsonb_set(COALESCE(meta, '{}'), '{unit_payment_id}', $1::jsonb), '{payment_method}', '"unit_book"'::jsonb),
       updated_at = now()
       WHERE id = $2 AND offering_id = $3`,
      [JSON.stringify(payResult.unitPaymentId), distributionId, offeringId]
    );

    return res.status(200).json({
      success: true,
      paymentMethod: 'unit_book',
      unitPaymentId: payResult.unitPaymentId,
    });
  } catch (error: any) {
    console.error('[Distributions] USD payment error:', error);
    await pool.query(
      `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
       WHERE id = $2 AND offering_id = $3`,
      [JSON.stringify(error.message || 'Unexpected error'), distributionId, offeringId]
    );
    return res.status(200).json({ success: false, error: error.message || 'Payment execution failed.' });
  }
}

async function executeAxusdPayment(
  res: NextApiResponse,
  distributionId: string,
  offeringId: string,
  dist: any,
  netAmount: number
) {
  try {
    const recipientWallet = dist.recipient_wallet || dist.wallet_address;

    if (!recipientWallet || !/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Invalid or missing recipient wallet address.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'Invalid or missing recipient wallet address.' });
    }

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    if (!deployerKey || !alchemyKey) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('On-chain payment infrastructure not configured.'), distributionId, offeringId]
      );
      return res.status(200).json({ success: false, error: 'On-chain payment infrastructure not configured.' });
    }

    const { ethers } = await import('ethers');

    const rpcUrl = `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(deployerKey, provider);

    const identityRegistryAbi = ['function isVerified(address _userAddress) view returns (bool)'];
    const identityRegistry = new ethers.Contract(IDENTITY_REGISTRY, identityRegistryAbi, provider);

    let isVerified = false;
    try {
      isVerified = await identityRegistry.isVerified(recipientWallet);
    } catch (err) {
      console.error('[Distributions] Identity Registry check failed:', err);
    }

    if (!isVerified) {
      await pool.query(
        `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
         WHERE id = $2 AND offering_id = $3`,
        [JSON.stringify('Recipient wallet not KYC-verified for AXUSD. Register at /axusd-3643 first.'), distributionId, offeringId]
      );
      return res.status(200).json({
        success: false,
        error: 'Recipient wallet not KYC-verified for AXUSD. Register at /axusd-3643 first.',
      });
    }

    const axusdAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const axusdContract = new ethers.Contract(AXUSD_CONTRACT, axusdAbi, signer);

    const amountWei = ethers.parseUnits(netAmount.toString(), 18);

    const tx = await axusdContract.transfer(recipientWallet, amountWei);
    const receipt = await tx.wait(1);

    const txHash = receipt?.hash || tx.hash;

    await pool.query(
      `UPDATE syn_distributions SET status = 'completed', paid_at = now(),
       meta = jsonb_set(jsonb_set(COALESCE(meta, '{}'), '{tx_hash}', $1::jsonb), '{payment_method}', '"axusd_onchain"'::jsonb),
       updated_at = now()
       WHERE id = $2 AND offering_id = $3`,
      [JSON.stringify(txHash), distributionId, offeringId]
    );

    return res.status(200).json({
      success: true,
      paymentMethod: 'axusd_onchain',
      txHash,
    });
  } catch (error: any) {
    console.error('[Distributions] AXUSD payment error:', error);
    const errorMsg = error.reason || error.message || 'AXUSD transfer failed';
    await pool.query(
      `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
       WHERE id = $2 AND offering_id = $3`,
      [JSON.stringify(errorMsg), distributionId, offeringId]
    );
    return res.status(200).json({ success: false, error: errorMsg });
  }
}
