-- Migration: Community Entry Credit tables
-- Task #32 — Stage 0: Easy Entry to Real Estate Investing
-- Creates income_credit_applications, income_credit_lines, income_credit_repayment_history

DO $$ BEGIN
  CREATE TYPE income_credit_purpose AS ENUM (
    'wealth_practice_entry',
    'contribution_smoothing',
    'earnest_money'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE income_credit_application_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE income_credit_line_status AS ENUM (
    'active',
    'drawn',
    'repaid',
    'defaulted',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS income_credit_applications (
  id                        SERIAL PRIMARY KEY,
  application_id            VARCHAR(66) UNIQUE NOT NULL,
  wallet_address            VARCHAR(42) NOT NULL,
  gef_tier_at_application   VARCHAR(50) NOT NULL DEFAULT 'Observer',
  stated_monthly_income_usd DECIMAL(18,2),
  requested_amount_usd      DECIMAL(18,2) NOT NULL,
  requested_purpose         income_credit_purpose NOT NULL,
  approved_credit_limit_usd DECIMAL(18,2),
  rejection_reason          TEXT,
  status                    income_credit_application_status DEFAULT 'pending',
  reviewed_at               TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_app_wallet_idx ON income_credit_applications(wallet_address);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_app_status_idx ON income_credit_applications(status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS income_credit_lines (
  id                      SERIAL PRIMARY KEY,
  credit_line_id          VARCHAR(66) UNIQUE NOT NULL,
  application_id          INTEGER NOT NULL REFERENCES income_credit_applications(id),
  wallet_address          VARCHAR(42) NOT NULL,
  credit_limit_usd        DECIMAL(18,2) NOT NULL,
  drawn_amount_usd        DECIMAL(18,2) DEFAULT 0,
  available_balance_usd   DECIMAL(18,2) NOT NULL,
  outstanding_balance_usd DECIMAL(18,2) DEFAULT 0,
  interest_rate_bps       INTEGER DEFAULT 500,
  purpose                 income_credit_purpose NOT NULL,
  repayment_due_days      INTEGER NOT NULL,
  repayment_due_date      TIMESTAMP,
  drawn_at                TIMESTAMP,
  repaid_at               TIMESTAMP,
  expires_at              TIMESTAMP NOT NULL,
  gef_violation_flagged   BOOLEAN DEFAULT FALSE,
  interest_earned_usd     DECIMAL(18,6) DEFAULT 0,
  status                  income_credit_line_status DEFAULT 'active',
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_line_wallet_idx ON income_credit_lines(wallet_address);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_line_status_idx ON income_credit_lines(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_line_app_idx    ON income_credit_lines(application_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS income_credit_repayment_history (
  id                      SERIAL PRIMARY KEY,
  credit_line_id          VARCHAR(66) NOT NULL,
  wallet_address          VARCHAR(42) NOT NULL,
  repayment_amount_usd    DECIMAL(18,6) NOT NULL,
  principal_repaid_usd    DECIMAL(18,6) NOT NULL,
  interest_repaid_usd     DECIMAL(18,6) NOT NULL,
  outstanding_before_usd  DECIMAL(18,6) NOT NULL,
  outstanding_after_usd   DECIMAL(18,6) NOT NULL,
  fully_repaid            BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMP DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_repay_hist_line_idx   ON income_credit_repayment_history(credit_line_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ic_repay_hist_wallet_idx ON income_credit_repayment_history(wallet_address);
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE treasury_ledger_event_type AS ENUM (
    'disbursement',
    'repayment_received',
    'interest_distribution',
    'reserve_allocation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS community_credit_treasury_ledger (
  id              SERIAL PRIMARY KEY,
  event_type      treasury_ledger_event_type NOT NULL,
  credit_line_id  VARCHAR(66),
  wallet_address  VARCHAR(42) NOT NULL,
  amount_usd      DECIMAL(18,6) NOT NULL,
  direction       VARCHAR(4) NOT NULL CHECK (direction IN ('out', 'in')),
  tranche         VARCHAR(20) NOT NULL CHECK (tranche IN ('senior', 'junior', 'reserve')),
  axusd_tx_ref    VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cc_treasury_ledger_line_idx   ON community_credit_treasury_ledger(credit_line_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cc_treasury_ledger_wallet_idx ON community_credit_treasury_ledger(wallet_address);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cc_treasury_ledger_type_idx   ON community_credit_treasury_ledger(event_type);
