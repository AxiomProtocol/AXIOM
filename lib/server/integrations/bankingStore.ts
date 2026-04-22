import { pool } from '../../../server/db';

let schemaEnsured = false;

async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS banking_customers (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) UNIQUE NOT NULL,
      unit_customer_id TEXT UNIQUE,
      kyc_status TEXT NOT NULL DEFAULT 'pending',
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS banking_accounts (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      unit_account_id TEXT UNIQUE NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'Open',
      balance_cents INTEGER NOT NULL DEFAULT 0,
      available_balance_cents INTEGER NOT NULL DEFAULT 0,
      routing_number TEXT,
      account_number_last4 TEXT,
      masked_account_number TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_banking_member_account
      ON banking_accounts(wallet_address, account_type)
      WHERE account_type = 'member';

    CREATE TABLE IF NOT EXISTS banking_counterparties (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      counterparty_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      routing_number TEXT NOT NULL,
      masked_account_number TEXT NOT NULL,
      account_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS custody_wallets (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) UNIQUE NOT NULL,
      bitgo_wallet_id TEXT UNIQUE NOT NULL,
      coin TEXT NOT NULL,
      receive_address TEXT,
      confirmed_balance_str TEXT NOT NULL DEFAULT '0',
      spendable_balance_str TEXT NOT NULL DEFAULT '0',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS custody_transactions (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      bitgo_wallet_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount_str TEXT,
      coin TEXT,
      to_address TEXT,
      tx_id TEXT,
      tx_hash TEXT,
      state TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS treasury_approvals (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      pending_approval_id TEXT UNIQUE NOT NULL,
      type TEXT,
      description TEXT,
      amount TEXT,
      to_address TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
      acted_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bridge_quotes (
      id SERIAL PRIMARY KEY,
      snapshot_id TEXT UNIQUE NOT NULL,
      wallet_address VARCHAR(42) NOT NULL,
      direction TEXT NOT NULL,
      fiat_amount_cents INTEGER NOT NULL,
      crypto_asset TEXT NOT NULL,
      exchange_rate_str TEXT NOT NULL,
      crypto_amount_str TEXT NOT NULL,
      fee_percent TEXT NOT NULL,
      fee_cents INTEGER NOT NULL,
      estimated_settlement_minutes INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bridge_transfers (
      id SERIAL PRIMARY KEY,
      transfer_id TEXT UNIQUE NOT NULL,
      wallet_address VARCHAR(42) NOT NULL,
      direction TEXT NOT NULL,
      fiat_amount_cents INTEGER NOT NULL,
      crypto_asset TEXT NOT NULL,
      crypto_amount_str TEXT,
      status TEXT NOT NULL,
      quote_snapshot_id TEXT,
      unit_account_id TEXT,
      bitgo_wallet_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  schemaEnsured = true;
}

export async function getBankingSnapshot(walletAddress: string): Promise<any> {
  await ensureSchema();

  const [customerRes, accountsRes] = await Promise.all([
    pool.query(
      `SELECT wallet_address, unit_customer_id, kyc_status, first_name, last_name, email, created_at, updated_at
       FROM banking_customers
       WHERE wallet_address = $1`,
      [walletAddress]
    ),
    pool.query(
      `SELECT id, wallet_address, unit_account_id, account_type, status, balance_cents, available_balance_cents,
              routing_number, account_number_last4, masked_account_number, created_at
       FROM banking_accounts
       WHERE wallet_address = $1
       ORDER BY created_at ASC`,
      [walletAddress]
    ),
  ]);

  return {
    customer: customerRes.rows[0] || null,
    accounts: accountsRes.rows,
  };
}

export async function upsertCustomer(params: {
  walletAddress: string;
  unitCustomerId: string;
  kycStatus: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  metadata?: any;
}): Promise<any> {
  await ensureSchema();

  const result = await pool.query(
    `INSERT INTO banking_customers (wallet_address, unit_customer_id, kyc_status, first_name, last_name, email, metadata, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (wallet_address) DO UPDATE
     SET unit_customer_id = EXCLUDED.unit_customer_id,
         kyc_status = EXCLUDED.kyc_status,
         first_name = COALESCE(EXCLUDED.first_name, banking_customers.first_name),
         last_name = COALESCE(EXCLUDED.last_name, banking_customers.last_name),
         email = COALESCE(EXCLUDED.email, banking_customers.email),
         metadata = COALESCE(EXCLUDED.metadata, banking_customers.metadata),
         updated_at = NOW()
     RETURNING *`,
    [
      params.walletAddress,
      params.unitCustomerId,
      params.kycStatus,
      params.firstName || null,
      params.lastName || null,
      params.email || null,
      params.metadata || null,
    ]
  );

  return result.rows[0];
}

export async function createAccount(params: {
  walletAddress: string;
  unitAccountId: string;
  accountType: string;
  status: string;
  routingNumber?: string;
  accountLast4?: string;
  maskedAccountNumber?: string;
}): Promise<any> {
  await ensureSchema();

  const result = await pool.query(
    `INSERT INTO banking_accounts (
       wallet_address, unit_account_id, account_type, status, routing_number, account_number_last4, masked_account_number,
       balance_cents, available_balance_cents, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW())
     ON CONFLICT (unit_account_id) DO UPDATE
     SET status = EXCLUDED.status,
         routing_number = COALESCE(EXCLUDED.routing_number, banking_accounts.routing_number),
         account_number_last4 = COALESCE(EXCLUDED.account_number_last4, banking_accounts.account_number_last4),
         masked_account_number = COALESCE(EXCLUDED.masked_account_number, banking_accounts.masked_account_number),
         updated_at = NOW()
     RETURNING *`,
    [
      params.walletAddress,
      params.unitAccountId,
      params.accountType,
      params.status,
      params.routingNumber || null,
      params.accountLast4 || null,
      params.maskedAccountNumber || null,
    ]
  );

  return result.rows[0];
}

export async function createCounterparty(params: {
  walletAddress: string;
  counterpartyId: string;
  name: string;
  routingNumber: string;
  maskedAccountNumber: string;
  accountType: string;
  status: string;
}): Promise<any> {
  await ensureSchema();

  const result = await pool.query(
    `INSERT INTO banking_counterparties (
      wallet_address, counterparty_id, name, routing_number, masked_account_number, account_type, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (counterparty_id) DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status
    RETURNING *`,
    [
      params.walletAddress,
      params.counterpartyId,
      params.name,
      params.routingNumber,
      params.maskedAccountNumber,
      params.accountType,
      params.status,
    ]
  );

  return result.rows[0];
}

export async function listCounterparties(walletAddress: string): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM banking_counterparties
     WHERE wallet_address = $1
     ORDER BY created_at DESC`,
    [walletAddress]
  );
  return result.rows;
}

export async function deleteCounterparty(walletAddress: string, counterpartyId: string): Promise<void> {
  await ensureSchema();
  await pool.query(
    `DELETE FROM banking_counterparties
     WHERE wallet_address = $1 AND counterparty_id = $2`,
    [walletAddress, counterpartyId]
  );
}

export async function getMemberAccount(walletAddress: string): Promise<any | null> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM banking_accounts
     WHERE wallet_address = $1 AND account_type = 'member'
     ORDER BY created_at ASC
     LIMIT 1`,
    [walletAddress]
  );
  return result.rows[0] || null;
}

export async function applyAchTransfer(params: {
  walletAddress: string;
  unitAccountId: string;
  amountCents: number;
  direction: 'Debit' | 'Credit';
}): Promise<void> {
  await ensureSchema();
  const delta = params.direction === 'Debit' ? params.amountCents : -params.amountCents;

  await pool.query(
    `UPDATE banking_accounts
     SET balance_cents = GREATEST(0, balance_cents + $1),
         available_balance_cents = GREATEST(0, available_balance_cents + $1),
         updated_at = NOW()
     WHERE wallet_address = $2 AND unit_account_id = $3`,
    [delta, params.walletAddress, params.unitAccountId]
  );
}

export async function upsertCustodyWallet(params: {
  walletAddress: string;
  bitgoWalletId: string;
  coin: string;
  receiveAddress: string;
  confirmedBalanceStr: string;
  spendableBalanceStr: string;
}): Promise<any> {
  await ensureSchema();

  const result = await pool.query(
    `INSERT INTO custody_wallets (
      wallet_address, bitgo_wallet_id, coin, receive_address, confirmed_balance_str, spendable_balance_str, status, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
    ON CONFLICT (wallet_address) DO UPDATE
    SET bitgo_wallet_id = EXCLUDED.bitgo_wallet_id,
        coin = EXCLUDED.coin,
        receive_address = EXCLUDED.receive_address,
        confirmed_balance_str = EXCLUDED.confirmed_balance_str,
        spendable_balance_str = EXCLUDED.spendable_balance_str,
        updated_at = NOW()
    RETURNING *`,
    [
      params.walletAddress,
      params.bitgoWalletId,
      params.coin,
      params.receiveAddress,
      params.confirmedBalanceStr,
      params.spendableBalanceStr,
    ]
  );

  return result.rows[0];
}

export async function getCustodyWallet(walletAddress: string): Promise<any | null> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM custody_wallets WHERE wallet_address = $1`,
    [walletAddress]
  );
  return result.rows[0] || null;
}

export async function addCustodyTransaction(params: {
  walletAddress: string;
  bitgoWalletId: string;
  direction: string;
  amountStr?: string;
  coin?: string;
  toAddress?: string;
  txId?: string;
  txHash?: string;
  state: string;
}): Promise<any> {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO custody_transactions (
      wallet_address, bitgo_wallet_id, direction, amount_str, coin, to_address, tx_id, tx_hash, state
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      params.walletAddress,
      params.bitgoWalletId,
      params.direction,
      params.amountStr || null,
      params.coin || null,
      params.toAddress || null,
      params.txId || null,
      params.txHash || null,
      params.state,
    ]
  );
  return result.rows[0];
}

export async function listCustodyTransactions(walletAddress: string): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM custody_transactions
     WHERE wallet_address = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [walletAddress]
  );
  return result.rows;
}

export async function addTreasuryApproval(params: {
  walletAddress: string;
  pendingApprovalId: string;
  type?: string;
  description?: string;
  amount?: string;
  toAddress?: string;
}): Promise<any> {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO treasury_approvals (wallet_address, pending_approval_id, type, description, amount, to_address, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     ON CONFLICT (pending_approval_id) DO UPDATE
     SET description = EXCLUDED.description
     RETURNING *`,
    [
      params.walletAddress,
      params.pendingApprovalId,
      params.type || 'transaction',
      params.description || null,
      params.amount || null,
      params.toAddress || null,
    ]
  );
  return result.rows[0];
}

export async function listPendingApprovals(walletAddress: string): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM treasury_approvals
     WHERE wallet_address = $1 AND status = 'pending'
     ORDER BY requested_at DESC`,
    [walletAddress]
  );
  return result.rows;
}

export async function resolveApproval(walletAddress: string, pendingApprovalId: string, action: 'approve' | 'reject'): Promise<any | null> {
  await ensureSchema();
  const status = action === 'approve' ? 'approved' : 'rejected';
  const result = await pool.query(
    `UPDATE treasury_approvals
     SET status = $1,
         acted_at = NOW()
     WHERE wallet_address = $2 AND pending_approval_id = $3
     RETURNING *`,
    [status, walletAddress, pendingApprovalId]
  );
  return result.rows[0] || null;
}

export async function createQuote(params: {
  snapshotId: string;
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
  exchangeRateStr: string;
  cryptoAmountStr: string;
  feePercent: string;
  feeCents: number;
  estimatedSettlementMinutes: number;
  expiresAt: Date;
}): Promise<any> {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO bridge_quotes (
      snapshot_id, wallet_address, direction, fiat_amount_cents, crypto_asset, exchange_rate_str,
      crypto_amount_str, fee_percent, fee_cents, estimated_settlement_minutes, expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      params.snapshotId,
      params.walletAddress,
      params.direction,
      params.fiatAmountCents,
      params.cryptoAsset,
      params.exchangeRateStr,
      params.cryptoAmountStr,
      params.feePercent,
      params.feeCents,
      params.estimatedSettlementMinutes,
      params.expiresAt,
    ]
  );
  return result.rows[0];
}

export async function getQuote(walletAddress: string, snapshotId: string): Promise<any | null> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM bridge_quotes
     WHERE wallet_address = $1 AND snapshot_id = $2 AND expires_at > NOW()`,
    [walletAddress, snapshotId]
  );
  return result.rows[0] || null;
}

export async function createTransfer(params: {
  transferId: string;
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
  cryptoAmountStr: string;
  status: string;
  quoteSnapshotId?: string;
  unitAccountId?: string;
  bitgoWalletId?: string;
}): Promise<any> {
  await ensureSchema();
  const result = await pool.query(
    `INSERT INTO bridge_transfers (
      transfer_id, wallet_address, direction, fiat_amount_cents, crypto_asset, crypto_amount_str,
      status, quote_snapshot_id, unit_account_id, bitgo_wallet_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      params.transferId,
      params.walletAddress,
      params.direction,
      params.fiatAmountCents,
      params.cryptoAsset,
      params.cryptoAmountStr,
      params.status,
      params.quoteSnapshotId || null,
      params.unitAccountId || null,
      params.bitgoWalletId || null,
    ]
  );
  return result.rows[0];
}

export async function listTransfers(walletAddress: string): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM bridge_transfers
     WHERE wallet_address = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [walletAddress]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Webhook & reconciliation helpers
// ---------------------------------------------------------------------------

export async function getAccountByUnitId(unitAccountId: string): Promise<any | null> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM banking_accounts WHERE unit_account_id = $1`,
    [unitAccountId]
  );
  return result.rows[0] || null;
}

export async function updateAccountBalance(
  unitAccountId: string,
  balanceCents: number,
  availableBalanceCents: number
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE banking_accounts
     SET balance_cents = $1,
         available_balance_cents = $2,
         updated_at = NOW()
     WHERE unit_account_id = $3`,
    [balanceCents, availableBalanceCents, unitAccountId]
  );
}

export async function updateCustomerKycStatus(
  unitCustomerId: string,
  kycStatus: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE banking_customers
     SET kyc_status = $1,
         updated_at = NOW()
     WHERE unit_customer_id = $2`,
    [kycStatus, unitCustomerId]
  );
}

export async function getCustodyWalletByBitgoId(bitgoWalletId: string): Promise<any | null> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM custody_wallets WHERE bitgo_wallet_id = $1`,
    [bitgoWalletId]
  );
  return result.rows[0] || null;
}

export async function updateCustodyBalance(
  bitgoWalletId: string,
  confirmedBalanceStr: string,
  spendableBalanceStr: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE custody_wallets
     SET confirmed_balance_str = $1,
         spendable_balance_str = $2,
         updated_at = NOW()
     WHERE bitgo_wallet_id = $3`,
    [confirmedBalanceStr, spendableBalanceStr, bitgoWalletId]
  );
}

export async function updateCustodyTransactionState(
  txId: string,
  state: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE custody_transactions
     SET state = $1
     WHERE tx_id = $2`,
    [state, txId]
  );
}

export async function listAllBankingAccounts(): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM banking_accounts ORDER BY updated_at ASC`
  );
  return result.rows;
}

export async function listAllCustodyWallets(): Promise<any[]> {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM custody_wallets ORDER BY updated_at ASC`
  );
  return result.rows;
}
