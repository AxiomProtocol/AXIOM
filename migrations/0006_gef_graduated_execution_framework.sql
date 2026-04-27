-- GEF: Graduated Execution Framework
-- Migration 0006
-- Creates policy governance tables, user execution profiles,
-- execution intents, executions, audit hash chain, violations,
-- and qualification snapshots.

CREATE TABLE IF NOT EXISTS gef_policy_modes (
  mode_id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  rcf NUMERIC NOT NULL,
  risk_fraction_default NUMERIC NOT NULL,
  risk_fraction_max NUMERIC NOT NULL,
  drawdown_limit NUMERIC NOT NULL,
  vpi_freeze_threshold NUMERIC NOT NULL,
  min_stability_to_resume NUMERIC NOT NULL,
  global_size_multiplier NUMERIC NOT NULL,
  is_execution_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_regime_multipliers (
  regime_id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  risk_multiplier NUMERIC NOT NULL,
  direction_bias TEXT,
  requires_high_conviction BOOLEAN NOT NULL DEFAULT FALSE,
  max_correlated_exposure NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_tier_thresholds (
  tier_id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  min_qualification_score NUMERIC NOT NULL,
  min_governance_weight NUMERIC NOT NULL,
  min_days_paper INT NOT NULL,
  min_trades_paper INT NOT NULL,
  max_drawdown_paper NUMERIC NOT NULL,
  min_sharpe NUMERIC,
  requires_axm_commitment BOOLEAN NOT NULL DEFAULT FALSE,
  requires_axusd_reserve BOOLEAN NOT NULL DEFAULT FALSE,
  min_axm_balance NUMERIC,
  min_axusd_reserve NUMERIC,
  max_risk_per_trade NUMERIC,
  max_concurrent_positions INT,
  max_correlated_exposure NUMERIC,
  execution_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_user_execution_profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  current_tier_id TEXT NOT NULL DEFAULT 'PAPER',
  current_policy_mode TEXT NOT NULL DEFAULT 'BOOTSTRAP',
  governance_weight NUMERIC NOT NULL DEFAULT 0,
  axm_balance NUMERIC NOT NULL DEFAULT 0,
  axusd_reserve_balance NUMERIC NOT NULL DEFAULT 0,
  paper_start_date TIMESTAMPTZ,
  paper_trade_count INT NOT NULL DEFAULT 0,
  paper_win_rate NUMERIC NOT NULL DEFAULT 0,
  paper_max_drawdown NUMERIC NOT NULL DEFAULT 0,
  paper_sharpe NUMERIC,
  paper_pnl_axusd NUMERIC NOT NULL DEFAULT 0,
  live_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  live_start_date TIMESTAMPTZ,
  risk_budget_axusd NUMERIC NOT NULL DEFAULT 0,
  last_qualification_score NUMERIC NOT NULL DEFAULT 0,
  last_regime_id TEXT,
  last_vpi NUMERIC NOT NULL DEFAULT 0,
  daily_loss_limit_axusd NUMERIC NOT NULL DEFAULT 500,
  rolling_7d_loss_limit_axusd NUMERIC NOT NULL DEFAULT 2000,
  max_drawdown_limit_pct NUMERIC NOT NULL DEFAULT 6,
  consecutive_loss_brake INT NOT NULL DEFAULT 5,
  execution_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_execution_intents (
  intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  signal_id UUID,
  regime_id TEXT,
  policy_mode TEXT,
  direction TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  stop_price NUMERIC NOT NULL,
  take_profit_price NUMERIC,
  invalidation_price NUMERIC,
  stop_distance NUMERIC NOT NULL,
  risk_budget_axusd NUMERIC NOT NULL,
  position_size NUMERIC NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL,
  exchange TEXT,
  order_id TEXT,
  filled_price NUMERIC NOT NULL,
  filled_qty NUMERIC NOT NULL,
  fees_paid NUMERIC NOT NULL DEFAULT 0,
  slippage_estimate NUMERIC NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  close_price NUMERIC,
  pnl_axusd NUMERIC NOT NULL DEFAULT 0,
  pnl_pct NUMERIC NOT NULL DEFAULT 0,
  max_adverse_excursion NUMERIC NOT NULL DEFAULT 0,
  max_favorable_excursion NUMERIC NOT NULL DEFAULT 0,
  close_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_audit_hash_chain (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_violation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'LOW',
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  related_intent_id UUID,
  related_execution_id UUID,
  action_taken TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gef_qualification_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  rbar NUMERIC,
  dsi NUMERIC,
  psc NUMERIC,
  vrs NUMERIC,
  eds NUMERIC,
  rcs NUMERIC,
  eqs NUMERIC,
  max_drawdown_pct NUMERIC,
  trade_count INT,
  win_rate NUMERIC,
  sharpe_estimate NUMERIC,
  axm_balance NUMERIC,
  axusd_reserve NUMERIC,
  tier_result TEXT,
  disqualifiers JSONB,
  notes TEXT
);
--> statement-breakpoint
-- MAE/MFE columns on existing paper trades
DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN mae NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN mfe NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint
-- Indexes
CREATE INDEX IF NOT EXISTS idx_gef_user_exec_wallet ON gef_user_execution_profiles(wallet_address);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_user ON gef_execution_intents(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_symbol ON gef_execution_intents(symbol);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_status ON gef_execution_intents(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_executions_intent ON gef_executions(intent_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_audit_entity ON gef_audit_hash_chain(entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_audit_created ON gef_audit_hash_chain(created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_violations_user ON gef_violation_events(user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gef_qual_snapshots_user ON gef_qualification_snapshots(user_id);
--> statement-breakpoint
-- Seed: Policy modes
INSERT INTO gef_policy_modes (mode_id, name, description, rcf, risk_fraction_default, risk_fraction_max, drawdown_limit, vpi_freeze_threshold, min_stability_to_resume, global_size_multiplier, is_execution_enabled)
VALUES
  ('BOOTSTRAP', 'Bootstrap', 'Initial system mode with conservative defaults', 0.5, 0.005, 0.01, 0.06, 0.8, 0.3, 0.5, true),
  ('NORMAL', 'Normal', 'Standard operating mode', 1.0, 0.01, 0.02, 0.08, 0.7, 0.4, 1.0, true),
  ('CAUTION', 'Caution', 'Elevated risk environment, reduced exposure', 0.7, 0.005, 0.01, 0.05, 0.6, 0.5, 0.6, true),
  ('RESTRICTED', 'Restricted', 'Severe conditions, minimal new exposure', 0.3, 0.0025, 0.005, 0.03, 0.5, 0.6, 0.3, false),
  ('EMERGENCY', 'Emergency', 'System freeze, no new positions', 0.0, 0.0, 0.0, 0.01, 0.0, 1.0, 0.0, false)
ON CONFLICT (mode_id) DO NOTHING;
--> statement-breakpoint
-- Seed: Regime multipliers
INSERT INTO gef_regime_multipliers (regime_id, name, risk_multiplier, direction_bias, requires_high_conviction, max_correlated_exposure)
VALUES
  ('TREND_UP', 'Trend Up', 1.2, 'LONG', false, 0.40),
  ('TREND_DOWN', 'Trend Down', 0.8, 'SHORT', true, 0.30),
  ('RANGE_LOW_VOL', 'Range Low Volatility', 1.0, NULL, false, 0.35),
  ('HIGH_VOL_DISLOCATION', 'High Volatility Dislocation', 0.5, NULL, true, 0.20)
ON CONFLICT (regime_id) DO NOTHING;
--> statement-breakpoint
-- Seed: Tier thresholds
INSERT INTO gef_tier_thresholds (tier_id, name, min_qualification_score, min_governance_weight, min_days_paper, min_trades_paper, max_drawdown_paper, min_sharpe, requires_axm_commitment, requires_axusd_reserve, min_axm_balance, min_axusd_reserve, max_risk_per_trade, max_concurrent_positions, max_correlated_exposure, execution_enabled)
VALUES
  ('PAPER', 'Paper Only', 0, 0, 0, 0, 1.0, NULL, false, false, 0, 0, 0.01, 5, 0.50, false),
  ('TIER_1', 'Execution Tier 1', 0.70, 0.1, 30, 60, 0.06, 0.5, true, true, 100, 500, 0.0025, 2, 0.40, true),
  ('TIER_2', 'Execution Tier 2', 0.78, 0.25, 60, 120, 0.04, 0.8, true, true, 500, 2000, 0.0035, 4, 0.30, true),
  ('TIER_3', 'Execution Tier 3', 0.85, 0.5, 90, 200, 0.03, 1.0, true, true, 2000, 10000, 0.005, 6, 0.25, true)
ON CONFLICT (tier_id) DO NOTHING;
