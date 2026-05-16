/**
 * Provider-agnostic banking interface.
 *
 * The historical banking integration was disabled when the provider account
 * was cancelled on 2026-04-28. The provider slot is open. When a replacement
 * banking provider is selected (Mercury, Column, Brex, Bridge, Lead Bank, etc.)
 * it should:
 *
 *   1. Implement `BankingProvider` in `lib/banking/providers/<name>.ts`.
 *   2. Register itself with `lib/banking/registry.ts`.
 *   3. Be selected via the `BANKING_PROVIDER` environment variable.
 *
 * Scope intentionally small. This interface covers only the operations that
 * existing route handlers actually call. Anything provider-specific lives
 * behind the adapter and is exposed through additional optional methods.
 *
 * All amounts are in cents. Errors must extend `BankingProviderError` so HTTP
 * handlers can map them to a consistent shape.
 */

export type BankingProviderId = 'mercury' | 'column' | 'brex' | 'bridge' | 'lead' | 'none';

export interface BankAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  balanceCents?: number;
}

export interface BankAccountNumber {
  id: string;
  accountId: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  status: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  amountCents: number;
  currency: string;
  description: string;
  status?: string;
  createdAt: string;
}

export interface BankTransfer {
  id: string;
  accountId: string;
  amountCents: number;
  currency: string;
  status: string;
  description: string;
  network?: 'ach' | 'wire' | 'rtp' | 'book';
  createdAt: string;
}

export interface BankCard {
  id: string;
  accountId: string;
  description: string;
  status: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
}

export interface AchTransferInput {
  accountId: string;
  destinationAccountNumber: string;
  destinationRoutingNumber: string;
  amountCents: number;
  statementDescriptor: string;
  companyName?: string;
  effectiveDate?: string;
  idempotencyKey?: string;
}

export interface WireTransferInput {
  accountId: string;
  destinationAccountNumber: string;
  destinationRoutingNumber: string;
  amountCents: number;
  messageToRecipient: string;
  beneficiaryName?: string;
  idempotencyKey?: string;
}

export interface BankingProvider {
  readonly id: BankingProviderId;
  readonly name: string;

  getAccount(accountId: string): Promise<BankAccount>;
  listAccounts(): Promise<BankAccount[]>;
  getAccountBalance(accountId: string): Promise<{ availableCents: number; currentCents: number; currency: string }>;
  listAccountNumbers(accountId: string): Promise<BankAccountNumber[]>;

  listTransactions(accountId: string, opts?: { limit?: number }): Promise<BankTransaction[]>;

  initiateAchTransfer(input: AchTransferInput): Promise<BankTransfer>;
  initiateWireTransfer(input: WireTransferInput): Promise<BankTransfer>;
  getTransfer(transferId: string, network: 'ach' | 'wire'): Promise<BankTransfer>;

  issueVirtualCard?(input: { accountId: string; description: string }): Promise<BankCard>;
  listCards?(accountId: string): Promise<BankCard[]>;

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean;
}

export class BankingProviderError extends Error {
  readonly code: string;
  readonly status: number;
  readonly providerId: BankingProviderId;
  constructor(message: string, code: string, status: number, providerId: BankingProviderId) {
    super(message);
    this.name = 'BankingProviderError';
    this.code = code;
    this.status = status;
    this.providerId = providerId;
  }
}

export class BankingProviderUnavailableError extends BankingProviderError {
  constructor(reason: string, providerId: BankingProviderId = 'none') {
    super(`Banking provider unavailable: ${reason}`, 'BANKING_DISABLED', 503, providerId);
    this.name = 'BankingProviderUnavailableError';
  }
}
