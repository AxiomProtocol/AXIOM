/**
 * POST /api/axiom-rail/monitor
 *
 * Axiom Rail settlement monitor — admin-only.
 *
 * Withdraw flow (USDC → USD):
 *   1. Fetches recent Stellar payments to AXIOM_RAIL_DEPOSIT_ACCOUNT
 *   2. Matches against pending stellar_payment_transfers records (by memo)
 *   3. Triggers Increase ACH/wire payout to user's registered bank
 *   4. Updates transfer status to completed
 *
 * Deposit flow (USD → USDC):
 *   1. Fetches recent Increase inbound transactions
 *   2. Matches against pending stellar_payment_transfers records (by description/memo)
 *   3. Marks matched records as pending_anchor (requires manual Stellar USDC delivery for now)
 *
 * Returns a summary of processed transfers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { eq, inArray } from 'drizzle-orm';
import { IncreaseService, getAccountId } from '../../../lib/services/IncreaseService';
import { AXIOM_RAIL_DEPOSIT_ACCOUNT } from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

function checkAdminKey(req: NextApiRequest): boolean {
  return req.headers['x-admin-key'] === process.env.ADMIN_SOLVENCY_KEY;
}

interface MonitorResult {
  withdrawsProcessed: number;
  depositsMatched: number;
  errors: string[];
  details: Array<{
    transferId: string;
    flow: 'withdraw' | 'deposit';
    action: string;
    status: 'ok' | 'error';
    message: string;
  }>;
}

function parseBankDetails(destinationAccount: string): {
  name: string;
  accountNumber: string;
  routingNumber: string;
  transferType: 'ACH' | 'Wire';
} | null {
  try {
    const parts = destinationAccount.split('|').map(s => s.trim());
    const name = parts[0] ?? '';
    const accountMatch = destinationAccount.match(/Account:\s*(\d+)/);
    const routingMatch = destinationAccount.match(/Routing:\s*(\d+)/);
    const isWire = destinationAccount.toLowerCase().includes('wire');

    if (!accountMatch || !routingMatch) return null;

    return {
      name,
      accountNumber: accountMatch[1],
      routingNumber: routingMatch[1],
      transferType: isWire ? 'Wire' : 'ACH',
    };
  } catch {
    return null;
  }
}

async function fetchStellarPayments(depositAccount: string): Promise<Array<{
  id: string;
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  assetIssuer: string;
  memo: string | null;
  createdAt: string;
}>> {
  const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

  try {
    const txRes = await fetch(
      `https://horizon.stellar.org/accounts/${depositAccount}/transactions?limit=50&order=desc`,
      { headers: { Accept: 'application/json' } },
    );
    if (!txRes.ok) return [];
    const txData = await txRes.json();
    const transactions: Array<{
      id: string;
      hash: string;
      memo?: string;
      memo_type?: string;
      created_at: string;
    }> = txData?._embedded?.records ?? [];

    const payRes = await fetch(
      `https://horizon.stellar.org/accounts/${depositAccount}/payments?limit=100&order=desc`,
      { headers: { Accept: 'application/json' } },
    );
    if (!payRes.ok) return [];
    const payData = await payRes.json();
    const payments: Array<{
      id: string;
      type: string;
      transaction_hash: string;
      from: string;
      to: string;
      amount: string;
      asset_code?: string;
      asset_issuer?: string;
      created_at: string;
    }> = payData?._embedded?.records ?? [];

    const txMap = new Map(transactions.map(t => [t.hash, t]));

    return payments
      .filter(p =>
        p.to === depositAccount &&
        p.asset_code === 'USDC' &&
        p.asset_issuer === USDC_ISSUER,
      )
      .map(p => {
        const tx = txMap.get(p.transaction_hash);
        const memo = tx?.memo_type === 'text' ? (tx.memo ?? null) : null;
        return {
          id: p.id,
          transactionHash: p.transaction_hash,
          from: p.from,
          to: p.to,
          amount: p.amount,
          assetCode: p.asset_code ?? 'USDC',
          assetIssuer: p.asset_issuer ?? USDC_ISSUER,
          memo,
          createdAt: p.created_at,
        };
      });
  } catch (err) {
    console.error('[monitor] Horizon fetch error:', err);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const result: MonitorResult = {
    withdrawsProcessed: 0,
    depositsMatched: 0,
    errors: [],
    details: [],
  };

  // ─── Step 1: Process WITHDRAW transfers (USDC → USD via Increase) ───────────
  try {
    const pendingWithdraws = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(
        inArray(stellarPaymentTransfers.status, [
          'pending_user_transfer_start',
          'pending_external',
          'pending_stellar',
        ]),
      );

    const withdrawPending = pendingWithdraws.filter(
      t => t.corridorId === 'usdc-to-usd-axiom-rail-rtp',
    );

    if (withdrawPending.length > 0) {
      const stellarPayments = await fetchStellarPayments(AXIOM_RAIL_DEPOSIT_ACCOUNT);

      for (const transfer of withdrawPending) {
        try {
          const expectedMemo = transfer.id
            .replace(/^axr-(wdr|dep)-/, '')
            .replace(/-/g, '')
            .slice(0, 28)
            .toUpperCase();

          const matchedPayment = stellarPayments.find(p => {
            const memo = p.memo?.toUpperCase().trim() ?? '';
            return memo === expectedMemo || memo.includes(expectedMemo.slice(0, 16));
          });

          if (!matchedPayment) {
            result.details.push({
              transferId: transfer.id,
              flow: 'withdraw',
              action: 'scan',
              status: 'ok',
              message: `No Stellar payment found yet (memo: ${expectedMemo})`,
            });
            continue;
          }

          if (transfer.stellarTransactionHash === matchedPayment.transactionHash) {
            result.details.push({
              transferId: transfer.id,
              flow: 'withdraw',
              action: 'skip',
              status: 'ok',
              message: 'Already matched — Stellar tx hash recorded',
            });
            continue;
          }

          const bankDetails = parseBankDetails(transfer.destinationAccount ?? '');
          if (!bankDetails) {
            await db
              .update(stellarPaymentTransfers)
              .set({
                stellarTransactionHash: matchedPayment.transactionHash,
                status: 'error',
                errorMessage: 'Cannot parse bank details from destinationAccount',
                updatedAt: new Date(),
              })
              .where(eq(stellarPaymentTransfers.id, transfer.id));

            result.errors.push(`Transfer ${transfer.id}: cannot parse bank details`);
            result.details.push({
              transferId: transfer.id,
              flow: 'withdraw',
              action: 'error',
              status: 'error',
              message: 'Cannot parse bank details',
            });
            continue;
          }

          const destinationAmountUsd = parseFloat(transfer.destinationAmount ?? '0');
          if (destinationAmountUsd < 1) {
            result.errors.push(`Transfer ${transfer.id}: destination amount too small (${destinationAmountUsd})`);
            result.details.push({
              transferId: transfer.id,
              flow: 'withdraw',
              action: 'error',
              status: 'error',
              message: `Amount too small: $${destinationAmountUsd}`,
            });
            continue;
          }

          const amountCents = Math.round(destinationAmountUsd * 100);
          const accountId = getAccountId();

          let increaseTransfer;
          if (bankDetails.transferType === 'Wire') {
            increaseTransfer = await IncreaseService.initiateWireTransfer(
              {
                account_id: accountId,
                account_number: bankDetails.accountNumber,
                routing_number: bankDetails.routingNumber,
                amount: amountCents,
                message_to_recipient: `Axiom Rail Settlement — ${transfer.id.slice(0, 16).toUpperCase()}`,
                beneficiary_name: bankDetails.name,
              },
              `axiom-rail-${transfer.id}`,
            );
          } else {
            increaseTransfer = await IncreaseService.initiateAchTransfer(
              {
                account_id: accountId,
                account_number: bankDetails.accountNumber,
                routing_number: bankDetails.routingNumber,
                amount: amountCents,
                statement_descriptor: `AXIOM RAIL ${transfer.id.slice(0, 12).toUpperCase()}`,
                company_name: 'Axiom Protocol LLC',
              },
              `axiom-rail-${transfer.id}`,
            );
          }

          await db
            .update(stellarPaymentTransfers)
            .set({
              stellarTransactionHash: matchedPayment.transactionHash,
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
              anchorRawResponse: {
                ...(transfer.anchorRawResponse as object ?? {}),
                increaseTransferId: increaseTransfer.id,
                increaseStatus: increaseTransfer.status,
                settledAt: new Date().toISOString(),
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.withdrawsProcessed++;
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            action: 'settled',
            status: 'ok',
            message: `${bankDetails.transferType} initiated — Increase ID: ${increaseTransfer.id}`,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Transfer ${transfer.id}: ${msg}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            action: 'error',
            status: 'error',
            message: msg,
          });
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Withdraw scan failed: ${msg}`);
  }

  // ─── Step 2: Match DEPOSIT transfers (USD → USDC) via Increase inbound ──────
  try {
    const pendingDeposits = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(
        inArray(stellarPaymentTransfers.status, [
          'pending_user_transfer_start',
          'pending_external',
        ]),
      );

    const depositPending = pendingDeposits.filter(
      t => t.corridorId === 'usd-to-usdc-axiom-rail-ach',
    );

    if (depositPending.length > 0) {
      const accountId = getAccountId();
      const increaseTxRes = await IncreaseService.listTransactions(accountId, 50);
      const incomingTxs = increaseTxRes.data.filter(tx => tx.amount > 0);

      for (const transfer of depositPending) {
        const shortId = transfer.id.replace(/^axr-(wdr|dep)-/, '').replace(/-/g, '').slice(0, 16).toUpperCase();

        const matchedTx = incomingTxs.find(tx =>
          tx.description?.toUpperCase().includes(shortId),
        );

        if (!matchedTx) {
          result.details.push({
            transferId: transfer.id,
            flow: 'deposit',
            action: 'scan',
            status: 'ok',
            message: `No matching Increase inbound transaction found yet (ref: ${shortId})`,
          });
          continue;
        }

        await db
          .update(stellarPaymentTransfers)
          .set({
            status: 'pending_anchor',
            updatedAt: new Date(),
            anchorRawResponse: {
              ...(transfer.anchorRawResponse as object ?? {}),
              increaseInboundTxId: matchedTx.id,
              increaseInboundAmount: matchedTx.amount,
              matchedAt: new Date().toISOString(),
              note: 'USD received — pending Stellar USDC delivery',
            },
          })
          .where(eq(stellarPaymentTransfers.id, transfer.id));

        result.depositsMatched++;
        result.details.push({
          transferId: transfer.id,
          flow: 'deposit',
          action: 'matched',
          status: 'ok',
          message: `USD received via Increase (ID: ${matchedTx.id}, $${(matchedTx.amount / 100).toFixed(2)}) — pending Stellar delivery`,
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Deposit scan failed: ${msg}`);
  }

  return res.status(200).json({
    success: true,
    ...result,
    scannedAt: new Date().toISOString(),
  });
}
