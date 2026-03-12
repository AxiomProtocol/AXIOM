import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { rateLimitDistPay } from '../../../../../lib/rateLimit';

const AXUSD_CONTRACT = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const IDENTITY_REGISTRY = '0x7856b3597389D34789512f43A0270a688846313B';

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

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

function isOperator(wallet: string): boolean {
  return OPERATOR_WALLETS.includes(wallet.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  if (!isOperator(wallet)) {
    return res.status(403).json({ success: false, error: 'Operator access required.' });
  }

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

      const distCurrency = currency || 'USD';

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

      if (distCurrency === 'AXUSD') {
        const missingWallets = capResult.rows.filter((r: any) => !r.wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(r.wallet_address));
        if (missingWallets.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Cannot create AXUSD distributions: ${missingWallets.length} investor(s) have no valid wallet address on file. Update investor profiles before creating AXUSD distributions.`,
          });
        }
      }

      const totalOwnership = capResult.rows.reduce(
        (sum: number, r: any) => sum + parseFloat(r.ownership_pct || '0'), 0
      );

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
        if (!rateLimitDistPay(req, res)) return;

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

async function setDistFailed(distributionId: string, offeringId: string, errorMsg: string) {
  await pool.query(
    `UPDATE syn_distributions SET status = 'failed', meta = jsonb_set(COALESCE(meta, '{}'), '{error}', $1::jsonb), updated_at = now()
     WHERE id = $2 AND offering_id = $3`,
    [JSON.stringify(errorMsg), distributionId, offeringId]
  );
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
    const unitCustomerId = investorMeta.unit_customer_id || investorMeta.unitCustomerId;

    if (!unitCustomerId) {
      await setDistFailed(distributionId, offeringId, 'Investor has no linked Unit bank account. Cannot initiate ACH credit.');
      return res.status(200).json({ success: false, error: 'Investor has no linked Unit bank account. Cannot initiate ACH credit.' });
    }

    const { UnitAccountService } = await import('../../../../../lib/services/UnitAccountService');
    const accountService = new UnitAccountService();

    const investorWallet = (dist.wallet_address || '').toLowerCase();

    if (investorWallet) {
      await accountService.syncAccountsFromUnit(investorWallet, unitCustomerId);
    }

    const { isUnitConfigured } = await import('../../../../../lib/unit/client');
    if (!isUnitConfigured()) {
      await setDistFailed(distributionId, offeringId, 'Banking service is not configured.');
      return res.status(200).json({ success: false, error: 'Banking service is not configured.' });
    }

    const { getUnitClient } = await import('../../../../../lib/unit/client');
    const unitClient = getUnitClient();
    if (!unitClient) {
      await setDistFailed(distributionId, offeringId, 'Banking service unavailable.');
      return res.status(200).json({ success: false, error: 'Banking service unavailable.' });
    }

    let counterpartyAccountId: string | null = null;
    try {
      const accountsResp = await unitClient.accounts.list({ customerId: unitCustomerId });
      const remoteAccounts = accountsResp.data ?? [];
      if (remoteAccounts.length > 0) {
        counterpartyAccountId = remoteAccounts[0].id;
      }
    } catch (err) {
      console.error('[Distributions] Failed to list accounts by customer ID:', err);
    }

    if (!counterpartyAccountId && investorWallet) {
      const localAccounts = await accountService.getAccountsForWallet(investorWallet);
      const found = localAccounts.find((a: any) => a.unitAccountId);
      if (found) counterpartyAccountId = found.unitAccountId;
    }

    if (!counterpartyAccountId) {
      await setDistFailed(distributionId, offeringId, 'No linked deposit account found for investor.');
      return res.status(200).json({ success: false, error: 'No linked deposit account found for investor.' });
    }

    const treasuryAccountId = process.env.UNIT_TREASURY_ACCOUNT_ID;
    if (!treasuryAccountId) {
      await setDistFailed(distributionId, offeringId, 'Treasury account not configured.');
      return res.status(200).json({ success: false, error: 'Treasury account not configured.' });
    }

    const { UnitPaymentService } = await import('../../../../../lib/services/UnitPaymentService');
    const paymentService = new UnitPaymentService();
    const amountCents = Math.round(netAmount * 100);

    const payResult = await paymentService.createAchCredit({
      walletAddress: investorWallet || 'system',
      fromAccountId: treasuryAccountId,
      counterpartyAccountId,
      amountCents,
      description: `Distribution — ${dist.legal_name || 'Investor'} — $${netAmount.toLocaleString()}`,
      purpose: 'distribution',
    });

    if (!payResult.success) {
      await setDistFailed(distributionId, offeringId, payResult.error || 'ACH credit payment failed');
      return res.status(200).json({ success: false, error: payResult.error || 'ACH credit payment failed.' });
    }

    await pool.query(
      `UPDATE syn_distributions SET status = 'completed', paid_at = now(),
       meta = jsonb_set(jsonb_set(COALESCE(meta, '{}'), '{unit_payment_id}', $1::jsonb), '{payment_method}', '"ach_credit"'::jsonb),
       updated_at = now()
       WHERE id = $2 AND offering_id = $3`,
      [JSON.stringify(payResult.unitPaymentId), distributionId, offeringId]
    );

    return res.status(200).json({
      success: true,
      paymentMethod: 'ach_credit',
      unitPaymentId: payResult.unitPaymentId,
    });
  } catch (error: any) {
    console.error('[Distributions] USD ACH credit error:', error);
    const errorMsg = error.message || 'ACH credit payment failed';
    await setDistFailed(distributionId, offeringId, errorMsg);
    return res.status(200).json({ success: false, error: errorMsg });
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
    const recipientWallet = dist.recipient_wallet;

    if (!recipientWallet || !/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
      await setDistFailed(distributionId, offeringId, 'Recipient wallet address is required for AXUSD distributions. Set it when creating the distribution.');
      return res.status(200).json({ success: false, error: 'Recipient wallet address is required for AXUSD distributions. Set it when creating the distribution.' });
    }

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const alchemyKey = process.env.ALCHEMY_API_KEY;
    if (!deployerKey || !alchemyKey) {
      await setDistFailed(distributionId, offeringId, 'On-chain payment infrastructure not configured.');
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
      await setDistFailed(distributionId, offeringId, 'Recipient wallet not KYC-verified for AXUSD. Register at /axusd-3643 first.');
      return res.status(200).json({ success: false, error: 'Recipient wallet not KYC-verified for AXUSD. Register at /axusd-3643 first.' });
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
    await setDistFailed(distributionId, offeringId, errorMsg);
    return res.status(200).json({ success: false, error: errorMsg });
  }
}
