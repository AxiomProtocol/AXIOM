/**
 * Task #280 — Buyer self-service payment recovery.
 *
 * The "your report request expired" email (#275) and the operator console
 * are the only paths today that can rescue a stuck `pending` report by
 * pasting a tx hash. This endpoint exposes the same write path
 * (`resolveSingleByTxHash`) to the public so a buyer who actually paid
 * can unstick their own report from the receipt-lookup page without
 * waiting on support.
 *
 * Security model:
 *   - Strict per-IP rate limit (10/min) — prevents brute-force tx-hash
 *     probing. A malicious caller cannot enumerate the (reportId, txHash)
 *     space looking for somebody else's order.
 *   - Hard tx-hash format guard (0x + 64 hex) before any DB hit — junk
 *     input never reaches the resolver / RPC.
 *   - The sender-wallet check inside `promoteToPaid` (resolver) is the
 *     authoritative gate that prevents recovering somebody else's report:
 *     if the row was created with `buyerWallet`, the on-chain transfer
 *     must come from that wallet. We surface that as 403 here.
 *   - Tx-hash uniqueness check inside `promoteToPaid` blocks a buyer from
 *     re-using one transfer to "recover" multiple reports. We surface
 *     that as 409.
 *
 * Status mapping mirrors `pages/api/property/confirm-payment.ts` so the
 * two surfaces feel identical to the buyer.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveSingleByTxHash } from '../../../lib/property/stuckPaymentResolver';
import { rateLimitStrict, rateLimitByKey } from '../../../lib/rateLimit';

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
// `id` on property_reports is `varchar(40)` in propertySchema. Cap input
// at the same length so oversize values are rejected at the edge instead
// of generating an unnecessary DB round-trip (and on Postgres a varchar
// length-limit insert/where on a too-long string is a noisy failure
// surface we'd rather avoid).
const REPORT_ID_MAX_LEN = 40;

/** Reasons emitted by `promoteToPaid` that mean "the buyer cannot rescue this with this tx hash". */
function mapResolverError(reason: string): { status: number; error: string } {
  // Sender-wallet enforcement (the canonical path that blocks recovering
  // somebody else's report).
  if (/sent from the wallet/i.test(reason)) {
    return { status: 403, error: reason };
  }
  // Tx hash already claimed by a different report — usually means the
  // buyer pasted the wrong report ID, NOT that they're attacking us.
  if (/already used by another report/i.test(reason)) {
    return { status: 409, error: reason };
  }
  // NOTE: the "Report is already <status>" reason is handled by the
  // caller — it returns 200 with the current status to mirror the
  // idempotent behavior of confirm-payment.ts. We do NOT match it here.
  if (/free reports do not require payment/i.test(reason)) {
    return { status: 400, error: reason };
  }
  if (/report not found/i.test(reason)) {
    return { status: 404, error: reason };
  }
  if (/unknown tier/i.test(reason)) {
    return { status: 400, error: reason };
  }
  // Everything else is an on-chain verification failure
  // (verifyOnchainPayment.reason), which we surface with 402 to mirror
  // confirm-payment.ts.
  return { status: 402, error: reason };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // First rate-limit axis: per IP. rateLimitStrict writes the 429
  // response itself when exhausted. Catches one attacker hitting many
  // reports.
  if (!rateLimitStrict(req, res)) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const reportIdRaw = body.reportId;
  const txHashRaw = body.txHash;

  if (typeof reportIdRaw !== 'string' || reportIdRaw.trim().length === 0) {
    return res.status(400).json({ error: 'reportId is required' });
  }
  if (reportIdRaw.length > REPORT_ID_MAX_LEN) {
    return res.status(400).json({ error: 'reportId is too long' });
  }
  if (typeof txHashRaw !== 'string' || txHashRaw.trim().length === 0) {
    return res.status(400).json({ error: 'txHash is required' });
  }

  const reportId = reportIdRaw.trim();
  const txHash = txHashRaw.trim();

  if (!TX_HASH_RE.test(txHash)) {
    return res.status(400).json({
      error: 'txHash must be a 0x-prefixed 32-byte hex string (66 characters total).',
    });
  }

  // Second rate-limit axis: per-reportId. Catches a distributed attacker
  // (many IPs, one report) trying to brute-force tx hashes against a
  // single victim row. We use the canonicalized (lower-cased) reportId
  // so case variants share the same bucket. 5 attempts/min is generous
  // for an honest buyer (their email gives them the exact tx hash to
  // paste) but ruinous for a probe.
  if (!rateLimitByKey(res, 'recover-pay-report', reportId.toLowerCase(), 5, 60_000)) {
    return;
  }

  try {
    const result = await resolveSingleByTxHash(reportId, txHash);
    if (result.ok) {
      return res.status(200).json({ reportId, status: result.status });
    }
    // Idempotency: if the row has already moved past pending (paid,
    // ready, generating, failed, or expired-then-recovered), don't
    // surface an error — return 200 with the current status so the
    // client can redirect the buyer to their report. Mirrors the same
    // pattern in pages/api/property/confirm-payment.ts so polling /
    // retries from the buyer or the email link don't show a spurious
    // failure UI.
    const idempotentMatch = result.reason.match(
      /already (paid|ready|generating|failed|expired)/i,
    );
    if (idempotentMatch) {
      return res
        .status(200)
        .json({ reportId, status: idempotentMatch[1].toLowerCase() });
    }
    const { status, error } = mapResolverError(result.reason);
    return res.status(status).json({ error });
  } catch (err) {
    console.error(
      '[recover-payment] resolver crashed',
      reportId,
      err instanceof Error ? err.message : err,
    );
    return res.status(500).json({ error: 'Could not recover payment.' });
  }
}
