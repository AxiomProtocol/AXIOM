-- Migration: 0059_bridge_settlement_rails
-- Adds Bridge.xyz settlement rail tables:
--   bridge_customers        — KYC identity records linked to wallet addresses
--   bridge_virtual_accounts — persistent ACH deposit accounts (on-ramp)
--   bridge_external_accounts — linked bank accounts for ACH withdrawal (off-ramp)
--
-- Also adds bridge_transfer_id and bridge_customer_id columns to the existing
-- bridge_transfers table so every orchestration row references the Bridge API record.

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE bridge_kyc_status AS ENUM (
    'not_started', 'incomplete', 'under_review', 'approved', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bridge_ext_account_status AS ENUM (
    'pending', 'active', 'failed', 'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── bridge_customers ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bridge_customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address        VARCHAR(42) NOT NULL UNIQUE,
  bridge_customer_id    VARCHAR(100),
  kyc_status            bridge_kyc_status NOT NULL DEFAULT 'not_started',
  full_name             VARCHAR(200),
  email                 VARCHAR(255),
  type                  VARCHAR(20) NOT NULL DEFAULT 'individual',
  kyc_link_url          TEXT,
  kyc_link_expires_at   TIMESTAMPTZ,
  raw_response          JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bc_wallet_idx  ON bridge_customers(wallet_address);
CREATE INDEX IF NOT EXISTS bc_cust_id_idx ON bridge_customers(bridge_customer_id) WHERE bridge_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bc_kyc_idx     ON bridge_customers(kyc_status);

-- ── bridge_virtual_accounts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bridge_virtual_accounts (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address               VARCHAR(42) NOT NULL,
  bridge_virtual_account_id    VARCHAR(100) UNIQUE,
  bridge_customer_id           VARCHAR(100) NOT NULL,
  source_currency              VARCHAR(3) NOT NULL DEFAULT 'usd',
  destination_payment_rail     VARCHAR(50) NOT NULL DEFAULT 'arbitrum',
  destination_currency         VARCHAR(20) NOT NULL DEFAULT 'usdc',
  destination_address          VARCHAR(42) NOT NULL,
  deposit_bank_name            VARCHAR(200),
  deposit_account_number       VARCHAR(50),
  deposit_routing_number       VARCHAR(20),
  deposit_beneficiary_name     VARCHAR(200),
  deposit_memo                 VARCHAR(500),
  status                       VARCHAR(50) NOT NULL DEFAULT 'active',
  raw_response                 JSONB,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bva_wallet_idx ON bridge_virtual_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS bva_cust_idx   ON bridge_virtual_accounts(bridge_customer_id);

-- ── bridge_external_accounts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bridge_external_accounts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address             VARCHAR(42) NOT NULL,
  bridge_external_account_id VARCHAR(100) UNIQUE,
  bridge_customer_id         VARCHAR(100) NOT NULL,
  bank_name                  VARCHAR(200),
  account_holder_name        VARCHAR(200),
  account_type               VARCHAR(20) NOT NULL DEFAULT 'checking',
  last4                      VARCHAR(4),
  routing_number             VARCHAR(20),
  currency                   VARCHAR(3) NOT NULL DEFAULT 'usd',
  status                     bridge_ext_account_status NOT NULL DEFAULT 'pending',
  raw_response               JSONB,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bea_wallet_idx ON bridge_external_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS bea_cust_idx   ON bridge_external_accounts(bridge_customer_id);

-- ── Extend bridge_transfers ───────────────────────────────────────────────────

ALTER TABLE bridge_transfers
  ADD COLUMN IF NOT EXISTS bridge_transfer_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bridge_customer_id  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bridge_state        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_bank_name   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS deposit_account_num VARCHAR(50),
  ADD COLUMN IF NOT EXISTS deposit_routing_num VARCHAR(20),
  ADD COLUMN IF NOT EXISTS deposit_memo        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS raw_response        JSONB;

CREATE INDEX IF NOT EXISTS bt_bridge_id_idx ON bridge_transfers(bridge_transfer_id) WHERE bridge_transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bt_cust_id_idx   ON bridge_transfers(bridge_customer_id)  WHERE bridge_customer_id  IS NOT NULL;
