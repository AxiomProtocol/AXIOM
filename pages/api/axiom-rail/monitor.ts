/**
 * POST /api/axiom-rail/monitor
 *
 * Axiom Rail settlement monitor — admin-only.
 *
 * Four-phase settlement lifecycle for WITHDRAW flow (USDC → USD):
 *   Phase 1 — Stellar detection:
 *     pending_user_transfer_start → pending_external
 *     Scans Stellar Horizon for USDC payments to AXIOM_RAIL_DEPOSIT_ACCOUNT.
 *     Matches by stored sep31StellarMemo (exact uppercase text memo).
 *     Records stellarTransactionHash.
 *
 *   Phase 2 — Increase ACH/Wire initiation:
 *     pending_external → pending_anchor
 *     Parses bank details from destinationAccount.
 *     Initiates Increase ACH or wire payout with idempotency key.
 *     Stores increaseTransferId + transferType in anchorRawResponse.
 *
 *   Phase 3 — Increase settlement confirmation:
 *     pending_anchor → completed | error
 *     Fetches Increase transfer status.
 *     ACH settled = "settled"; Wire final = "submitted" (no reversal notice).
 *
 * Two-phase settlement lifecycle for DEPOSIT flow (USD → USDC):
 *   Phase 1 — Increase inbound detection:
 *     pending_user_transfer_start → pending_anchor
 *     Matches Increase inbound transactions by description containing short ref.
 *
 *   Phase 2 — Stellar USDC delivery (manual for now):
 *     pending_anchor → completed
 *     Requires ops team to deliver USDC on Stellar; set via manual status update.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { axiomRailEscrows } from '../../../shared/escrowSchema';
import { eq, inArray } from 'drizzle-orm';
import { IncreaseService, getAccountId } from '../../../lib/services/IncreaseService';
import { AXIOM_RAIL_DEPOSIT_ACCOUNT } from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { requireAdminAuth } from '../../../lib/multichain/stellar/axiom-rail/adminAuth';
import { setRailCors, handlePreflight } from '../../../lib/multichain/stellar/axiom-rail/corsUtils';

interface DetailEntry {
  transferId: string;
  flow: 'withdraw' | 'deposit' | 'escrow';
  phase: string;
  status: 'ok' | 'skip' | 'error';
  message: string;
}

interface MonitorResult {
  phase1DetectedWithdraws: number;
  phase2InitiatedPayouts: number;
  phase3ConfirmedWithdraws: number;
  phase1DetectedDeposits: number;
  escrowPhase1InitiatedPayouts: number;
  escrowPhase2ConfirmedPayouts: number;
  errors: string[];
  details: DetailEntry[];
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
  transactionHash: string;
  amount: string;
  memo: string | null;
}>> {
  const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  try {
    const [txRes, payRes] = await Promise.all([
      fetch(`https://horizon.stellar.org/accounts/${depositAccount}/transactions?limit=100&order=desc`, {
        headers: { Accept: 'application/json' },
      }),
      fetch(`https://horizon.stellar.org/accounts/${depositAccount}/payments?limit=200&order=desc`, {
        headers: { Accept: 'application/json' },
      }),
    ]);
    if (!txRes.ok || !payRes.ok) return [];
    const [txData, payData] = await Promise.all([txRes.json(), payRes.json()]);

    const transactions: Array<{ hash: string; memo?: string; memo_type?: string }> =
      txData?._embedded?.records ?? [];
    const payments: Array<{
      type: string;
      transaction_hash: string;
      to: string;
      amount: string;
      asset_code?: string;
      asset_issuer?: string;
    }> = payData?._embedded?.records ?? [];

    const txMemoMap = new Map(
      transactions
        .filter(t => t.memo_type === 'text' && t.memo)
        .map(t => [t.hash, (t.memo ?? '').toUpperCase().trim()]),
    );

    return payments
      .filter(p =>
        p.to === depositAccount &&
        p.asset_code === 'USDC' &&
        p.asset_issuer === USDC_ISSUER,
      )
      .map(p => ({
        transactionHash: p.transaction_hash,
        amount: p.amount,
        memo: txMemoMap.get(p.transaction_hash) ?? null,
      }));
  } catch (err) {
    console.error('[monitor] Horizon fetch error:', err);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdminAuth(req, res)) return;

  const result: MonitorResult = {
    phase1DetectedWithdraws: 0,
    phase2InitiatedPayouts: 0,
    phase3ConfirmedWithdraws: 0,
    phase1DetectedDeposits: 0,
    escrowPhase1InitiatedPayouts: 0,
    escrowPhase2ConfirmedPayouts: 0,
    errors: [],
    details: [],
  };

  // ─── WITHDRAW PHASE 1: Stellar detection ───────────────────────────────────
  // Match incoming Stellar USDC payments against pending_user_transfer_start withdraws.
  // Uses exact sep31StellarMemo match (stored at submit time).
  try {
    const phase1Withdraws = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_user_transfer_start'));

    const withdrawPhase1 = phase1Withdraws.filter(
      t => t.corridorId === 'usdc-to-usd-axiom-rail-rtp',
    );

    if (withdrawPhase1.length > 0) {
      const stellarPayments = await fetchStellarPayments(AXIOM_RAIL_DEPOSIT_ACCOUNT);

      for (const transfer of withdrawPhase1) {
        const expectedMemo = transfer.sep31StellarMemo?.toUpperCase().trim() ?? null;
        if (!expectedMemo) {
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '1-stellar-detect',
            status: 'skip',
            message: 'No sep31StellarMemo stored — cannot match Stellar payment',
          });
          continue;
        }

        const matched = stellarPayments.find(p => p.memo === expectedMemo);
        if (!matched) {
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '1-stellar-detect',
            status: 'skip',
            message: `No Stellar USDC payment found for memo: ${expectedMemo}`,
          });
          continue;
        }

        try {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'pending_external',
              stellarTransactionHash: matched.transactionHash,
              updatedAt: new Date(),
              anchorRawResponse: {
                ...(transfer.anchorRawResponse as object ?? {}),
                stellarDetectedAt: new Date().toISOString(),
                stellarUsdcAmount: matched.amount,
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.phase1DetectedWithdraws++;
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '1-stellar-detect',
            status: 'ok',
            message: `Stellar USDC detected (memo: ${expectedMemo}, tx: ${matched.transactionHash.slice(0, 16)}…) → pending_external`,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Phase1 update ${transfer.id}: ${msg}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '1-stellar-detect',
            status: 'error',
            message: msg,
          });
        }
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Phase1 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── WITHDRAW PHASE 2: Initiate Increase payout ────────────────────────────
  // For pending_external withdraws: parse bank details and initiate ACH/wire.
  // Idempotency key prevents duplicate payouts. Sets status to pending_anchor.
  try {
    const phase2Withdraws = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_external'));

    const accountId = getAccountId();

    for (const transfer of phase2Withdraws.filter(t => t.corridorId === 'usdc-to-usd-axiom-rail-rtp')) {
      const raw = transfer.anchorRawResponse as Record<string, unknown> ?? {};
      if (raw.increaseTransferId) {
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '2-increase-payout',
          status: 'skip',
          message: `Payout already initiated (Increase ID: ${raw.increaseTransferId})`,
        });
        continue;
      }

      const bankDetails = parseBankDetails(transfer.destinationAccount ?? '');
      if (!bankDetails) {
        result.errors.push(`Phase2 ${transfer.id}: cannot parse bank details`);
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '2-increase-payout',
          status: 'error',
          message: 'Cannot parse routing/account from destinationAccount field',
        });
        continue;
      }

      const destinationAmountUsd = parseFloat(transfer.destinationAmount ?? '0');
      if (destinationAmountUsd < 1) {
        result.errors.push(`Phase2 ${transfer.id}: amount too small ($${destinationAmountUsd})`);
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '2-increase-payout',
          status: 'error',
          message: `Amount too small: $${destinationAmountUsd}`,
        });
        continue;
      }

      const amountCents = Math.round(destinationAmountUsd * 100);
      const idempotencyKey = `axiom-rail-${transfer.id}`;

      try {
        let increaseTransfer;
        if (bankDetails.transferType === 'Wire') {
          increaseTransfer = await IncreaseService.initiateWireTransfer(
            {
              account_id: accountId,
              account_number: bankDetails.accountNumber,
              routing_number: bankDetails.routingNumber,
              amount: amountCents,
              message_to_recipient: `Axiom Rail ${transfer.sep31StellarMemo ?? transfer.id.slice(0, 16).toUpperCase()}`,
              beneficiary_name: bankDetails.name,
            },
            idempotencyKey,
          );
        } else {
          increaseTransfer = await IncreaseService.initiateAchTransfer(
            {
              account_id: accountId,
              account_number: bankDetails.accountNumber,
              routing_number: bankDetails.routingNumber,
              amount: amountCents,
              statement_descriptor: `AXIOM RAIL ${(transfer.sep31StellarMemo ?? transfer.id).slice(0, 20)}`,
              company_name: 'Axiom Protocol LLC',
            },
            idempotencyKey,
          );
        }

        await db
          .update(stellarPaymentTransfers)
          .set({
            status: 'pending_anchor',
            updatedAt: new Date(),
            anchorRawResponse: {
              ...raw,
              increaseTransferId: increaseTransfer.id,
              increaseTransferType: bankDetails.transferType,
              increaseStatus: increaseTransfer.status,
              payoutInitiatedAt: new Date().toISOString(),
            },
          })
          .where(eq(stellarPaymentTransfers.id, transfer.id));

        result.phase2InitiatedPayouts++;
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '2-increase-payout',
          status: 'ok',
          message: `${bankDetails.transferType} initiated (Increase ID: ${increaseTransfer.id}) → pending_anchor`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Phase2 payout ${transfer.id}: ${msg}`);
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '2-increase-payout',
          status: 'error',
          message: msg,
        });
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Phase2 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── WITHDRAW PHASE 3: Confirm Increase settlement ─────────────────────────
  // For pending_anchor withdraws with increaseTransferId: check Increase status.
  // ACH settled = "settled"; Wire final = "submitted" (no reversal notice yet).
  try {
    const phase3Withdraws = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_anchor'));

    for (const transfer of phase3Withdraws.filter(t => t.corridorId === 'usdc-to-usd-axiom-rail-rtp')) {
      const raw = transfer.anchorRawResponse as Record<string, unknown> ?? {};
      const increaseTransferId = raw.increaseTransferId as string | undefined;
      const transferType = raw.increaseTransferType as 'ACH' | 'Wire' | undefined;

      if (!increaseTransferId) {
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '3-increase-confirm',
          status: 'skip',
          message: 'No increaseTransferId in anchorRawResponse — awaiting Phase 2',
        });
        continue;
      }

      try {
        let increaseStatus: string;
        if (transferType === 'Wire') {
          const wire = await IncreaseService.getWireTransfer(increaseTransferId);
          increaseStatus = wire.status;
        } else {
          const ach = await IncreaseService.getAchTransfer(increaseTransferId);
          increaseStatus = ach.status;
        }

        const isSettled = transferType === 'Wire'
          ? increaseStatus === 'submitted'
          : increaseStatus === 'settled';
        const isError = ['returned', 'reversed', 'declined'].includes(increaseStatus);

        if (isSettled) {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
              anchorRawResponse: {
                ...raw,
                increaseStatus,
                settledAt: new Date().toISOString(),
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.phase3ConfirmedWithdraws++;
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '3-increase-confirm',
            status: 'ok',
            message: `Increase ${transferType} settled (status: ${increaseStatus}) → completed`,
          });
        } else if (isError) {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'error',
              errorMessage: `Increase ${transferType} ${increaseStatus}`,
              updatedAt: new Date(),
              anchorRawResponse: { ...raw, increaseStatus },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.errors.push(`Transfer ${transfer.id}: Increase ${transferType} ${increaseStatus}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '3-increase-confirm',
            status: 'error',
            message: `Increase ${transferType} ${increaseStatus} → error`,
          });
        } else {
          result.details.push({
            transferId: transfer.id,
            flow: 'withdraw',
            phase: '3-increase-confirm',
            status: 'skip',
            message: `Increase ${transferType} still in-flight (status: ${increaseStatus})`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Phase3 confirm ${transfer.id}: ${msg}`);
        result.details.push({
          transferId: transfer.id,
          flow: 'withdraw',
          phase: '3-increase-confirm',
          status: 'error',
          message: msg,
        });
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Phase3 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── DEPOSIT PHASE 1: Detect Increase inbound (USD → USDC) ────────────────
  // Matches Increase inbound transactions by reference in description.
  // Sets status to pending_anchor; Stellar USDC delivery is handled manually.
  try {
    const depositPhase1 = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_user_transfer_start'));

    const depositsPending = depositPhase1.filter(
      t => t.corridorId === 'usd-to-usdc-axiom-rail-ach',
    );

    if (depositsPending.length > 0) {
      const accountId = getAccountId();
      const incomingTxRes = await IncreaseService.listTransactions(accountId, 50);
      const credits = incomingTxRes.data.filter(tx => tx.amount > 0);

      for (const transfer of depositsPending) {
        const shortRef = transfer.id
          .replace(/^axr-(wdr|dep)-/, '')
          .replace(/-/g, '')
          .slice(0, 16)
          .toUpperCase();

        const matched = credits.find(tx =>
          (tx.description ?? '').toUpperCase().includes(shortRef),
        );

        if (!matched) {
          result.details.push({
            transferId: transfer.id,
            flow: 'deposit',
            phase: '1-increase-detect',
            status: 'skip',
            message: `No Increase inbound transaction found (ref: ${shortRef})`,
          });
          continue;
        }

        try {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'pending_anchor',
              updatedAt: new Date(),
              anchorRawResponse: {
                ...(transfer.anchorRawResponse as object ?? {}),
                increaseInboundTxId: matched.id,
                increaseInboundAmount: matched.amount,
                usdReceivedAt: new Date().toISOString(),
                note: 'USD received via Increase — pending manual Stellar USDC delivery',
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.phase1DetectedDeposits++;
          result.details.push({
            transferId: transfer.id,
            flow: 'deposit',
            phase: '1-increase-detect',
            status: 'ok',
            message: `USD received via Increase (ID: ${matched.id}, $${(matched.amount / 100).toFixed(2)}) → pending_anchor`,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Deposit Phase1 ${transfer.id}: ${msg}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'deposit',
            phase: '1-increase-detect',
            status: 'error',
            message: msg,
          });
        }
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Deposit Phase1 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── ESCROW PHASE 1: Initiate Increase ACH payout ─────────────────────────
  // For pending_user_transfer_start escrow transfers: parse bank details and
  // initiate Increase ACH. Idempotency key prevents duplicate payouts.
  // Sets status to pending_anchor.
  try {
    const escrowPhase1 = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_user_transfer_start'));

    const escrowPending = escrowPhase1.filter(
      t => t.corridorId === 'usd-to-usd-escrow-axiom-rail',
    );

    if (escrowPending.length > 0) {
      const accountId = getAccountId();

      for (const transfer of escrowPending) {
        const raw = transfer.anchorRawResponse as Record<string, unknown> ?? {};

        if (raw.increaseTransferId) {
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-1-initiate-ach',
            status: 'skip',
            message: `ACH already initiated (Increase ID: ${raw.increaseTransferId})`,
          });
          continue;
        }

        const bankDetails = parseBankDetails(transfer.destinationAccount ?? '');
        if (!bankDetails) {
          result.errors.push(`EscrowPhase1 ${transfer.id}: cannot parse bank details`);
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-1-initiate-ach',
            status: 'error',
            message: 'Cannot parse routing/account from destinationAccount field',
          });
          continue;
        }

        const destinationAmountUsd = parseFloat(transfer.destinationAmount ?? '0');
        if (destinationAmountUsd < 1) {
          result.errors.push(`EscrowPhase1 ${transfer.id}: amount too small ($${destinationAmountUsd})`);
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-1-initiate-ach',
            status: 'error',
            message: `Amount too small: $${destinationAmountUsd}`,
          });
          continue;
        }

        const amountCents = Math.round(destinationAmountUsd * 100);
        const idempotencyKey = `axiom-escrow-${transfer.id}`;

        try {
          const increaseTransfer = await IncreaseService.initiateAchTransfer(
            {
              account_id: accountId,
              account_number: bankDetails.accountNumber,
              routing_number: bankDetails.routingNumber,
              amount: amountCents,
              statement_descriptor: `AXIOM ESCROW ${(raw.escrowId as string ?? transfer.id).slice(0, 20)}`,
              company_name: 'Axiom Protocol LLC',
            },
            idempotencyKey,
          );

          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'pending_anchor',
              updatedAt: new Date(),
              anchorRawResponse: {
                ...raw,
                increaseTransferId: increaseTransfer.id,
                increaseTransferType: 'ACH',
                increaseStatus: increaseTransfer.status,
                payoutInitiatedAt: new Date().toISOString(),
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.escrowPhase1InitiatedPayouts++;
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-1-initiate-ach',
            status: 'ok',
            message: `ACH initiated (Increase ID: ${increaseTransfer.id}) → pending_anchor`,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`EscrowPhase1 payout ${transfer.id}: ${msg}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-1-initiate-ach',
            status: 'error',
            message: msg,
          });
        }
      }
    }
  } catch (err: unknown) {
    result.errors.push(`EscrowPhase1 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ─── ESCROW PHASE 2: Confirm Increase ACH settlement ───────────────────────
  // For pending_anchor escrow transfers with increaseTransferId: check settlement.
  // ACH settled = "settled". On completion: mark stellar_payment_transfers completed
  // and update corresponding axiom_rail_escrows status to 'released'.
  try {
    const escrowPhase2 = await db
      .select()
      .from(stellarPaymentTransfers)
      .where(eq(stellarPaymentTransfers.status, 'pending_anchor'));

    const escrowAnchored = escrowPhase2.filter(
      t => t.corridorId === 'usd-to-usd-escrow-axiom-rail',
    );

    for (const transfer of escrowAnchored) {
      const raw = transfer.anchorRawResponse as Record<string, unknown> ?? {};
      const increaseTransferId = raw.increaseTransferId as string | undefined;

      if (!increaseTransferId) {
        result.details.push({
          transferId: transfer.id,
          flow: 'escrow',
          phase: 'escrow-2-confirm-ach',
          status: 'skip',
          message: 'No increaseTransferId in anchorRawResponse — awaiting Phase 1',
        });
        continue;
      }

      try {
        const ach = await IncreaseService.getAchTransfer(increaseTransferId);
        const isSettled = ach.status === 'settled';
        const isError = ['returned', 'reversed', 'declined'].includes(ach.status);

        if (isSettled) {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
              anchorRawResponse: {
                ...raw,
                increaseStatus: ach.status,
                settledAt: new Date().toISOString(),
              },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          // Update escrow record to 'released'
          const escrowId = raw.escrowId as string | undefined;
          if (escrowId) {
            try {
              await db
                .update(axiomRailEscrows)
                .set({ status: 'released', releasedAt: new Date(), updatedAt: new Date() })
                .where(eq(axiomRailEscrows.id, escrowId));
            } catch (escrowUpdateErr: unknown) {
              result.errors.push(`EscrowPhase2 escrow-status-update ${escrowId}: ${escrowUpdateErr instanceof Error ? escrowUpdateErr.message : String(escrowUpdateErr)}`);
            }
          }

          result.escrowPhase2ConfirmedPayouts++;
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-2-confirm-ach',
            status: 'ok',
            message: `ACH settled (Increase ID: ${increaseTransferId}) → completed`,
          });
        } else if (isError) {
          await db
            .update(stellarPaymentTransfers)
            .set({
              status: 'error',
              errorMessage: `Increase ACH ${ach.status}`,
              updatedAt: new Date(),
              anchorRawResponse: { ...raw, increaseStatus: ach.status },
            })
            .where(eq(stellarPaymentTransfers.id, transfer.id));

          result.errors.push(`Escrow transfer ${transfer.id}: Increase ACH ${ach.status}`);
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-2-confirm-ach',
            status: 'error',
            message: `Increase ACH ${ach.status} → error`,
          });
        } else {
          result.details.push({
            transferId: transfer.id,
            flow: 'escrow',
            phase: 'escrow-2-confirm-ach',
            status: 'skip',
            message: `Increase ACH still in-flight (status: ${ach.status})`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`EscrowPhase2 confirm ${transfer.id}: ${msg}`);
        result.details.push({
          transferId: transfer.id,
          flow: 'escrow',
          phase: 'escrow-2-confirm-ach',
          status: 'error',
          message: msg,
        });
      }
    }
  } catch (err: unknown) {
    result.errors.push(`EscrowPhase2 scan: ${err instanceof Error ? err.message : String(err)}`);
  }

  return res.status(200).json({
    success: true,
    ...result,
    scannedAt: new Date().toISOString(),
  });
}
