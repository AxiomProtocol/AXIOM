-- Migration: Ensure shared-schema cap_* tables exist
--
-- Idempotent re-creation of the cap_accounts, cap_ledger_entries,
-- cap_trading_positions, cap_trades, cap_fees, cap_price_marks,
-- cap_snapshots, cap_snapshot_lines, cap_drawdowns, cap_drift_series,
-- cap_decision_log, and cap_risk_flags tables (and their 7 enum types).
--
-- Reason: On CI test databases a previous capinfra-migrate run dropped ALL
-- cap_* tables (including these shared ones). The standard Drizzle migration
-- tracker still records the original creation as applied, so the tables were
-- never re-created on subsequent runs. This migration guarantees they exist
-- regardless of migration history.

-- ── Enum types ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE cap_account_type AS ENUM ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_account_subtype AS ENUM ('CASH','TRADING','FEE_RESERVE','UNREALIZED','REALIZED','OPERATING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_position_status AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_trade_side AS ENUM ('BUY','SELL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_fee_type AS ENUM ('TRADING','NETWORK','MANAGEMENT','ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_drawdown_status AS ENUM ('ACTIVE','RECOVERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_risk_severity AS ENUM ('INFO','WARNING','ELEVATED','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cap_accounts (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(200)         NOT NULL,
  account_type cap_account_type     NOT NULL,
  subtype      cap_account_subtype  NOT NULL,
  currency     varchar(20)          NOT NULL DEFAULT 'AXUSD',
  is_active    boolean              NOT NULL DEFAULT true,
  created_at   timestamptz          NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_acct_type_idx ON cap_accounts (account_type);

CREATE TABLE IF NOT EXISTS cap_ledger_entries (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_group_id   uuid         NOT NULL,
  account_id    uuid         NOT NULL,
  debit_amount  numeric(24,8) NOT NULL DEFAULT 0,
  credit_amount numeric(24,8) NOT NULL DEFAULT 0,
  currency      varchar(20)  NOT NULL DEFAULT 'AXUSD',
  description   text         NOT NULL DEFAULT '',
  external_id   varchar(255),
  source_type   varchar(50)  NOT NULL DEFAULT 'MANUAL',
  created_at    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_ledger_tx_group_idx  ON cap_ledger_entries (tx_group_id);
CREATE INDEX IF NOT EXISTS cap_ledger_account_idx   ON cap_ledger_entries (account_id);
CREATE INDEX IF NOT EXISTS cap_ledger_external_idx  ON cap_ledger_entries (external_id);
CREATE INDEX IF NOT EXISTS cap_ledger_created_idx   ON cap_ledger_entries (created_at);

CREATE TABLE IF NOT EXISTS cap_trading_positions (
  id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument      varchar(50)         NOT NULL,
  venue           varchar(50)         NOT NULL DEFAULT 'PAPER',
  strategy_id     varchar(100),
  status          cap_position_status NOT NULL DEFAULT 'OPEN',
  side            cap_trade_side      NOT NULL,
  quantity        numeric(24,8)       NOT NULL,
  avg_entry_price numeric(24,8)       NOT NULL,
  avg_exit_price  numeric(24,8),
  realized_pnl    numeric(24,8),
  opened_at       timestamptz         NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  mirdt_setup_id  uuid,
  mirdt_trade_id  uuid
);
CREATE INDEX IF NOT EXISTS cap_trading_pos_instrument_idx ON cap_trading_positions (instrument);
CREATE INDEX IF NOT EXISTS cap_trading_pos_status_idx     ON cap_trading_positions (status);
CREATE INDEX IF NOT EXISTS cap_trading_pos_opened_idx     ON cap_trading_positions (opened_at);

CREATE TABLE IF NOT EXISTS cap_trades (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid           NOT NULL,
  side        cap_trade_side NOT NULL,
  quantity    numeric(24,8)  NOT NULL,
  price       numeric(24,8)  NOT NULL,
  venue       varchar(50)    NOT NULL DEFAULT 'PAPER',
  executed_at timestamptz    NOT NULL DEFAULT now(),
  external_id varchar(255)
);
CREATE INDEX IF NOT EXISTS cap_trade_position_idx ON cap_trades (position_id);
CREATE INDEX IF NOT EXISTS cap_trade_executed_idx ON cap_trades (executed_at);
CREATE INDEX IF NOT EXISTS cap_trade_external_idx ON cap_trades (external_id);

CREATE TABLE IF NOT EXISTS cap_fees (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id    uuid,
  fee_type    cap_fee_type  NOT NULL,
  amount      numeric(24,8) NOT NULL,
  currency    varchar(20)   NOT NULL DEFAULT 'AXUSD',
  description text          NOT NULL DEFAULT '',
  incurred_at timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_fee_trade_idx    ON cap_fees (trade_id);
CREATE INDEX IF NOT EXISTS cap_fee_incurred_idx ON cap_fees (incurred_at);

CREATE TABLE IF NOT EXISTS cap_price_marks (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument  varchar(50)   NOT NULL,
  price       numeric(24,8) NOT NULL,
  source      varchar(100)  NOT NULL DEFAULT 'SYSTEM',
  marked_at   timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_mark_instrument_idx ON cap_price_marks (instrument);
CREATE INDEX IF NOT EXISTS cap_mark_marked_idx     ON cap_price_marks (marked_at);

CREATE TABLE IF NOT EXISTS cap_snapshots (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of        timestamptz NOT NULL,
  checksum     varchar(128) NOT NULL,
  sources_used jsonb       NOT NULL DEFAULT '[]',
  confidence   varchar(20) NOT NULL DEFAULT 'HIGH',
  warnings     jsonb       NOT NULL DEFAULT '[]',
  regime_band  varchar(50),
  policy_state varchar(50),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_snap_as_of_idx ON cap_snapshots (as_of);

CREATE TABLE IF NOT EXISTS cap_snapshot_lines (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id  uuid         NOT NULL,
  metric_key   varchar(100) NOT NULL,
  metric_value varchar(200) NOT NULL,
  period       varchar(20)  NOT NULL,
  instrument   varchar(50)
);
CREATE INDEX IF NOT EXISTS cap_snapline_snapshot_idx ON cap_snapshot_lines (snapshot_id);
CREATE INDEX IF NOT EXISTS cap_snapline_metric_idx   ON cap_snapshot_lines (metric_key);

CREATE TABLE IF NOT EXISTS cap_drawdowns (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  peak_value   numeric(24,8)        NOT NULL,
  trough_value numeric(24,8)        NOT NULL,
  depth_pct    numeric(10,6)        NOT NULL,
  peak_at      timestamptz          NOT NULL,
  trough_at    timestamptz          NOT NULL,
  recovered_at timestamptz,
  status       cap_drawdown_status  NOT NULL DEFAULT 'ACTIVE',
  snapshot_id  uuid,
  created_at   timestamptz          NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cap_drift_series (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of          timestamptz   NOT NULL,
  expected_value numeric(24,8) NOT NULL,
  actual_value   numeric(24,8) NOT NULL,
  variance_pct   numeric(10,6) NOT NULL,
  snapshot_id    uuid,
  created_at     timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_drift_as_of_idx ON cap_drift_series (as_of);

CREATE TABLE IF NOT EXISTS cap_decision_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid,
  setup_id    uuid,
  position_id uuid,
  action      varchar(100) NOT NULL,
  rationale   text         NOT NULL,
  metadata    jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_decision_snapshot_idx ON cap_decision_log (snapshot_id);
CREATE INDEX IF NOT EXISTS cap_decision_created_idx  ON cap_decision_log (created_at);

CREATE TABLE IF NOT EXISTS cap_risk_flags (
  id           uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  severity     cap_risk_severity  NOT NULL,
  category     varchar(100)       NOT NULL,
  explanation  text               NOT NULL,
  snapshot_id  uuid,
  resolved_at  timestamptz,
  created_at   timestamptz        NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_risk_severity_idx ON cap_risk_flags (severity);
CREATE INDEX IF NOT EXISTS cap_risk_snapshot_idx ON cap_risk_flags (snapshot_id);
