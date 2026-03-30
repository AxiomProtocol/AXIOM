-- Migration: 0041_admin_roles_governance_hardening
-- Purpose: Create admin_action_log and admin_roles tables for Task #42
--          AXUSD Governance Hardening / Multisig and Role Separation
-- Date: 2026-03-30
-- Notes: Tables are safe to create if they already exist (IF NOT EXISTS).
--        The unique constraint on admin_roles(role_name, holder_address) enforces
--        idempotent bootstrapping and prevents duplicate role grants.

-- Admin action log: immutable append-only audit trail of all privileged actions
CREATE TABLE IF NOT EXISTS "admin_action_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "action_type" varchar(64) NOT NULL,
  "caller_address" varchar(42) NOT NULL,
  "target_address" varchar(42),
  "amount" varchar(64),
  "tx_hash" varchar(66),
  "role" varchar(32) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "error_message" text,
  "metadata" jsonb,  -- Object storage for action context; text columns cast to jsonb on existing DBs
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Admin roles: DB-backed role registry that is the source of truth for governance
CREATE TABLE IF NOT EXISTS "admin_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "role_name" varchar(32) NOT NULL,
  "holder_address" varchar(42) NOT NULL,
  "holder_type" varchar(16) NOT NULL,
  "contract_name" varchar(128),
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "granted_by" varchar(42),
  "revoked_at" timestamp,
  "revoked_by" varchar(42),
  "is_active" boolean NOT NULL DEFAULT true,
  "notes" text,
  CONSTRAINT "uq_admin_roles_role_holder" UNIQUE ("role_name", "holder_address")
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS "idx_admin_roles_role" ON "admin_roles" ("role_name");
CREATE INDEX IF NOT EXISTS "idx_admin_roles_holder" ON "admin_roles" ("holder_address");
CREATE INDEX IF NOT EXISTS "idx_admin_roles_active" ON "admin_roles" ("is_active");

-- Idempotent bootstrap seed for canonical role assignments
-- Uses ON CONFLICT DO NOTHING so this can be run multiple times safely
INSERT INTO "admin_roles" ("role_name", "holder_address", "holder_type", "contract_name", "granted_by", "notes") VALUES
  ('EMERGENCY_ROLE', '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d', 'SAFE', 'All Pausable, AxiomTreasuryAndRevenueHub', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'Governance Safe 3-of-5 — emergency pause and sweep already operational'),
  ('MINTER_ROLE', '0x93696b537d814aed5875c4490143195983aed365', 'SAFE', 'AXM Token (0x864F9c6f...)', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'AXM Admin Safe — AXM minting already wired'),
  ('MINTER_ROLE', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'EOA', 'AXUSD Token (0xD6110F59...)', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'Deployer EOA — pending migration to Safe for AXUSD minting'),
  ('OPERATOR_ROLE', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'EOA', 'AXUSD Token, IdentityRegistry', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'Pending migration to Governance Safe'),
  ('COMPLIANCE_ROLE', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'EOA', 'ClaimIssuer, IdentityRegistry, LendingPlatformModule', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'Pending EIP-1271 Safe claim signing infrastructure'),
  ('UPGRADER_ROLE', '0xf1b1d594d6edc9f045df55b32006a24e666ed899', 'TIMELOCK', 'All Upgradeable Contracts', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'Timelock 24h — Safe holds PROPOSER_ROLE'),
  ('DEFAULT_ADMIN_ROLE', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'EOA', 'AXIOMFixedLoan, AXIOMCreditMarket, TreasuryHub, GovernanceHub', '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96', 'CRITICAL — pending migration to Timelock via Safe proposal')
ON CONFLICT ON CONSTRAINT "uq_admin_roles_role_holder" DO NOTHING;

-- Migration patch for existing databases (text -> jsonb for admin_action_log.metadata)
-- Idempotent: only runs if column is still text type
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_action_log'
      AND column_name = 'metadata'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE admin_action_log ALTER COLUMN metadata TYPE jsonb USING metadata::jsonb;
  END IF;
END $$;
