/**
 * Axiom Rail — Increase Settlement Service
 *
 * Handles the fiat side of Axiom Rail:
 *   - Deposit:    Incoming ACH/wire from user → credit USDC on Stellar
 *   - Withdrawal: USDC received on Stellar → outbound ACH/wire to user's bank
 *
 * Uses the existing Increase API credentials (INCREASE_API_KEY).
 * Environment-aware: sandbox when INCREASE_ENVIRONMENT != 'production'.
 */

import type { IncreaseTransferRequest, IncreaseTransferResult } from './types';
import { isIncreaseDisabled, IncreaseDisabledError } from '../../../services/IncreaseService';

function getBaseUrl(): string {
  return process.env.INCREASE_ENVIRONMENT === 'production'
    ? 'https://api.increase.com'
    : 'https://sandbox.increase.com';
}

function getAccountId(): string {
  return process.env.INCREASE_ENVIRONMENT === 'production'
    ? (process.env.INCREASE_ACCOUNT_ID ?? '')
    : (process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? '');
}

async function increaseRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const killSwitch = isIncreaseDisabled();
  if (killSwitch.disabled) {
    throw new IncreaseDisabledError(killSwitch.reason);
  }
  const apiKey = process.env.INCREASE_API_KEY;
  if (!apiKey) throw new Error('INCREASE_API_KEY environment variable is not set');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as T;
  if (!res.ok) {
    const err = data as Record<string, unknown>;
    throw new Error(
      `Increase API ${method} ${path} failed ${res.status}: ${JSON.stringify(err)}`
    );
  }
  return data;
}

// ─── Withdrawal: USDC received → send fiat out via ACH/wire ───────────────────

export async function sendFiatToUser(
  req: IncreaseTransferRequest,
  idempotencyKey: string,
): Promise<IncreaseTransferResult> {
  const accountId = getAccountId();

  if (req.type === 'ach') {
    const result = await increaseRequest<Record<string, unknown>>(
      'POST',
      '/ach_transfers',
      {
        account_id: accountId,
        account_number: req.account_number,
        routing_number: req.routing_number,
        amount: req.amount_cents,
        statement_descriptor: req.description.slice(0, 22),
        company_name: 'Axiom Rail',
        standard_entry_class_code: 'CCD',
      },
      idempotencyKey,
    );
    return {
      transfer_id: result.id as string,
      status: result.status as string,
      amount_cents: req.amount_cents,
      type: 'ach',
    };
  }

  const result = await increaseRequest<Record<string, unknown>>(
    'POST',
    '/wire_transfers',
    {
      account_id: accountId,
      account_number: req.account_number,
      routing_number: req.routing_number,
      amount: req.amount_cents,
      message_to_recipient: req.description.slice(0, 35),
      beneficiary_name: req.beneficiary_name,
    },
    idempotencyKey,
  );
  return {
    transfer_id: result.id as string,
    status: result.status as string,
    amount_cents: req.amount_cents,
    type: 'wire',
  };
}

// ─── Deposit: Check if inbound ACH/wire arrived ────────────────────────────────

export async function checkInboundTransfer(transferId: string): Promise<{
  status: string;
  amount_cents: number;
  settled: boolean;
}> {
  const result = await increaseRequest<Record<string, unknown>>(
    'GET',
    `/inbound_ach_transfers/${transferId}`,
  );
  return {
    status: result.status as string,
    amount_cents: result.amount as number,
    settled: result.status === 'accepted',
  };
}

// ─── Account health check ──────────────────────────────────────────────────────

export async function getRailAccountStatus(): Promise<{
  account_id: string;
  balance_cents: number;
  status: string;
  environment: string;
}> {
  const accountId = getAccountId();
  if (!accountId) {
    return { account_id: '', balance_cents: 0, status: 'unconfigured', environment: 'unknown' };
  }

  const result = await increaseRequest<Record<string, unknown>>(
    'GET',
    `/accounts/${accountId}`,
  );

  return {
    account_id: accountId,
    balance_cents: (result.balance as number) ?? 0,
    status: (result.status as string) ?? 'unknown',
    environment: process.env.INCREASE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  };
}
