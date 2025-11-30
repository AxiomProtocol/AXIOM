const { pgTable, serial, text, boolean, timestamp, varchar, decimal, integer, jsonb } = require('drizzle-orm/pg-core');

// User table - match the exact column names in the database
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  is_admin: boolean('is_admin').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Savings Accounts table - matching actual database structure
const savingsAccounts = pgTable('savings_accounts', {
  id: serial('id').primaryKey(),
  accountNumber: varchar('account_number', { length: 20 }),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  apy: decimal('apy').notNull(),
  principal: decimal('principal'),
  balance: decimal('balance').notNull(),
  accruedInterest: decimal('accrued_interest').default('0').notNull(),
  termMonths: integer('term_months'),
  maturityDate: timestamp('maturity_date'),
  earlyWithdrawalPenaltyRate: decimal('early_withdrawal_penalty_rate'),
  lastAccruedAt: timestamp('last_accrued_at'),
  metadata: jsonb('metadata'),
  openedAt: timestamp('opened_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Savings Transactions table - matching actual database structure
const savingsTransactions = pgTable('savings_transactions', {
  id: serial('id').primaryKey(),
  savingsAccountId: integer('savings_account_id').notNull(),
  txType: text('tx_type').notNull(),
  amount: decimal('amount').notNull(),
  balanceAfter: decimal('balance_after').notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  source: varchar('source', { length: 20 }),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Savings Account Settings table - matching actual database structure
const savingsAccountSettings = pgTable('savings_account_settings', {
  id: serial('id').primaryKey(),
  savingsAccountId: integer('savings_account_id').notNull().unique(),
  roundUpEnabled: boolean('round_up_enabled').default(false).notNull(),
  autoTransferEnabled: boolean('auto_transfer_enabled').default(false).notNull(),
  autoTransferAmount: decimal('auto_transfer_amount'),
  autoTransferDay: integer('auto_transfer_day'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Checking Accounts table
const checkingAccounts = pgTable('checking_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  accountNumber: varchar('account_number', { length: 20 }).notNull().unique(),
  routingNumber: varchar('routing_number', { length: 9 }).default('021000021'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  ledgerBalance: decimal('ledger_balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  overdraftEnabled: boolean('overdraft_enabled').default(false).notNull(),
  overdraftLimit: decimal('overdraft_limit', { precision: 15, scale: 2 }).default('0.00'),
  dailySpendCap: decimal('daily_spend_cap', { precision: 15, scale: 2 }),
  limits: jsonb('limits'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Checking Transactions table
const checkingTransactions = pgTable('checking_transactions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  transactionType: varchar('transaction_type', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('SWF'),
  description: text('description'),
  merchantName: varchar('merchant_name', { length: 255 }),
  mcc: varchar('mcc', { length: 4 }),
  referenceId: varchar('reference_id', { length: 100 }),
  status: varchar('status', { length: 20 }).default('posted').notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }).notNull(),
  initiatedBy: varchar('initiated_by', { length: 42 }),
  relatedTransferId: integer('related_transfer_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  postedAt: timestamp('posted_at').defaultNow()
});

// Transfers table
const transfers = pgTable('transfers', {
  id: serial('id').primaryKey(),
  fromAccountType: varchar('from_account_type', { length: 20 }).notNull(),
  fromAccountId: integer('from_account_id').notNull(),
  toAccountType: varchar('to_account_type', { length: 20 }).notNull(),
  toAccountId: integer('to_account_id').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('SWF'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  settledAt: timestamp('settled_at')
});

// Payees table
const payees = pgTable('payees', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  payeeType: varchar('payee_type', { length: 20 }).notNull(),
  achRouting: varchar('ach_routing', { length: 9 }),
  achAccount: varchar('ach_account', { length: 20 }),
  walletPayeeAddress: varchar('wallet_payee_address', { length: 42 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Scheduled Payments table
const scheduledPayments = pgTable('scheduled_payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  fromAccountType: varchar('from_account_type', { length: 20 }).notNull(),
  fromAccountId: integer('from_account_id').notNull(),
  toPayeeId: integer('to_payee_id'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('SWF'),
  frequency: varchar('frequency', { length: 50 }).notNull(),
  nextRunAt: timestamp('next_run_at').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Investment Accounts table
const investmentAccounts = pgTable('investment_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // crypto, etf, retirement, reit, bonds, commodities, index, options
  accountNumber: varchar('account_number', { length: 20 }).notNull().unique(),
  baseCurrency: varchar('base_currency', { length: 10 }).default('USD'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Instruments table (stocks, bonds, cryptos, ETFs, etc.)
const instruments = pgTable('instruments', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(),
  name: text('name').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // crypto, stock, etf, bond, commodity, index, option, reit
  exchange: varchar('exchange', { length: 50 }),
  tickSize: decimal('tick_size', { precision: 10, scale: 6 }),
  lotSize: decimal('lot_size', { precision: 10, scale: 2 }),
  quoteSource: varchar('quote_source', { length: 50 }), // binance, polygon, iex, etc
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Options Contracts metadata
const optionsContracts = pgTable('options_contracts', {
  id: serial('id').primaryKey(),
  instrumentId: integer('instrument_id').notNull(),
  underlyingId: integer('underlying_id').notNull(),
  expirationDate: timestamp('expiration_date').notNull(),
  strikePrice: decimal('strike_price', { precision: 15, scale: 2 }).notNull(),
  optionRight: varchar('option_right', { length: 4 }).notNull(), // CALL or PUT
  multiplier: integer('multiplier').default(100),
  style: varchar('style', { length: 10 }).default('american'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Bonds metadata
const bondsMetadata = pgTable('bonds_metadata', {
  id: serial('id').primaryKey(),
  instrumentId: integer('instrument_id').notNull().unique(),
  issuer: varchar('issuer', { length: 255 }).notNull(),
  couponRate: decimal('coupon_rate', { precision: 6, scale: 4 }),
  maturityDate: timestamp('maturity_date').notNull(),
  faceValue: decimal('face_value', { precision: 15, scale: 2 }),
  rating: varchar('rating', { length: 10 }),
  duration: decimal('duration', { precision: 10, scale: 4 }),
  convexity: decimal('convexity', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// REITs metadata
const reitsMetadata = pgTable('reits_metadata', {
  id: serial('id').primaryKey(),
  instrumentId: integer('instrument_id').notNull().unique(),
  payoutFrequency: varchar('payout_frequency', { length: 20 }), // monthly, quarterly
  dripAvailable: boolean('drip_available').default(true),
  documents: jsonb('documents'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Positions table
const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  instrumentId: integer('instrument_id').notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 8 }).notNull(),
  avgCost: decimal('avg_cost', { precision: 15, scale: 6 }),
  realizedPnl: decimal('realized_pnl', { precision: 15, scale: 2 }).default('0'),
  unrealizedPnl: decimal('unrealized_pnl', { precision: 15, scale: 2 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Orders table
const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  instrumentId: integer('instrument_id').notNull(),
  side: varchar('side', { length: 4 }).notNull(), // BUY or SELL
  orderType: varchar('order_type', { length: 20 }).notNull(), // MARKET, LIMIT, STOP
  quantity: decimal('quantity', { precision: 20, scale: 8 }).notNull(),
  limitPrice: decimal('limit_price', { precision: 15, scale: 6 }),
  stopPrice: decimal('stop_price', { precision: 15, scale: 6 }),
  tif: varchar('tif', { length: 10 }).default('GTC'), // GTC, DAY, IOC
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, filled, partial, cancelled
  filledQty: decimal('filled_qty', { precision: 20, scale: 8 }).default('0'),
  avgFillPrice: decimal('avg_fill_price', { precision: 15, scale: 6 }),
  createdBy: varchar('created_by', { length: 42 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Executions table
const executions = pgTable('executions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  fillQty: decimal('fill_qty', { precision: 20, scale: 8 }).notNull(),
  fillPrice: decimal('fill_price', { precision: 15, scale: 6 }).notNull(),
  fees: decimal('fees', { precision: 15, scale: 6 }).default('0'),
  venue: varchar('venue', { length: 50 }),
  txHash: varchar('tx_hash', { length: 66 }),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Ledger table (all account movements)
const investmentLedger = pgTable('investment_ledger', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  type: varchar('type', { length: 30 }).notNull(), // CONTRIBUTION, WITHDRAWAL, DIVIDEND, INTEREST, REBALANCE, EXERCISE, ASSIGNMENT
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  instrumentId: integer('instrument_id'),
  refId: varchar('ref_id', { length: 100 }),
  description: text('description'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Dividends/Distributions table
const dividendsDistributions = pgTable('dividends_distributions', {
  id: serial('id').primaryKey(),
  instrumentId: integer('instrument_id').notNull(),
  amountPerShare: decimal('amount_per_share', { precision: 15, scale: 6 }).notNull(),
  exDate: timestamp('ex_date').notNull(),
  payDate: timestamp('pay_date').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Performance Snapshots table
const performanceSnapshots = pgTable('performance_snapshots', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull(),
  snapshotDate: timestamp('snapshot_date').notNull(),
  nav: decimal('nav', { precision: 15, scale: 2 }).notNull(), // Net Asset Value
  contributions: decimal('contributions', { precision: 15, scale: 2 }).default('0'),
  withdrawals: decimal('withdrawals', { precision: 15, scale: 2 }).default('0'),
  returnAmount: decimal('return_amount', { precision: 15, scale: 2 }),
  returnPercent: decimal('return_percent', { precision: 8, scale: 4 }),
  volatility: decimal('volatility', { precision: 8, scale: 4 }),
  sharpeRatio: decimal('sharpe_ratio', { precision: 8, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Market Data Snapshots table
const marketDataSnapshots = pgTable('market_data_snapshots', {
  id: serial('id').primaryKey(),
  instrumentId: integer('instrument_id').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  bid: decimal('bid', { precision: 15, scale: 6 }),
  ask: decimal('ask', { precision: 15, scale: 6 }),
  last: decimal('last', { precision: 15, scale: 6 }),
  volume: decimal('volume', { precision: 20, scale: 2 }),
  openInterest: decimal('open_interest', { precision: 20, scale: 2 }),
  impliedVolatility: decimal('implied_volatility', { precision: 8, scale: 4 })
});

// User Investment Settings table
const userInvestingSettings = pgTable('user_investing_settings', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().unique(),
  autoInvest: jsonb('auto_invest'),
  riskProfile: varchar('risk_profile', { length: 20 }), // conservative, moderate, aggressive
  taxLotMethod: varchar('tax_lot_method', { length: 20 }).default('FIFO'), // FIFO, LIFO, HIFO
  updatedAt: timestamp('updated_at').defaultNow()
});

// Admin Controls table
const adminControls = pgTable('admin_controls', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Compliance Audit table
const complianceAudit = pgTable('compliance_audit', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  walletAddress: varchar('wallet_address', { length: 42 }),
  event: varchar('event', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  details: jsonb('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

module.exports = {
  users,
  savingsAccounts,
  savingsTransactions,
  savingsAccountSettings,
  checkingAccounts,
  checkingTransactions,
  transfers,
  payees,
  scheduledPayments,
  investmentAccounts,
  instruments,
  optionsContracts,
  bondsMetadata,
  reitsMetadata,
  positions,
  orders,
  executions,
  investmentLedger,
  dividendsDistributions,
  performanceSnapshots,
  marketDataSnapshots,
  userInvestingSettings,
  adminControls,
  complianceAudit
};
