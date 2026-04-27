-- Six-layer real estate intelligence extension
-- Adds field capture, verified outcomes, strategy signals, capital intelligence,
-- network snapshots, Matrix links, and AXM/AXUSD/Arbitrum readiness references.

DO $$ BEGIN
  CREATE TYPE field_inspection_status AS ENUM ('draft', 'in_progress', 'submitted', 'verified', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE field_condition AS ENUM ('good', 'light_rehab', 'medium_rehab', 'full_replace', 'not_inspected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE strategy_type AS ENUM ('light_turn', 'classic_value_add', 'heavy_reposition', 'systems_only_stabilization', 'premium_interior_upgrade', 'exterior_common_reposition');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS field_inspection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  session_name VARCHAR(255) NOT NULL,
  status field_inspection_status NOT NULL DEFAULT 'draft',
  property_metadata JSONB,
  total_units INTEGER NOT NULL DEFAULT 0,
  units_walked INTEGER NOT NULL DEFAULT 0,
  sample_confidence DECIMAL(6,4) DEFAULT 0,
  matrix_room_id VARCHAR(255),
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  created_by VARCHAR(42),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_inspection_sessions_deal_idx ON field_inspection_sessions (deal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_inspection_sessions_property_idx ON field_inspection_sessions (property_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_inspection_sessions_status_idx ON field_inspection_sessions (status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS field_unit_walk_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES field_inspection_sessions(id),
  unit_label VARCHAR(120) NOT NULL,
  bedroom_count INTEGER,
  bathroom_count DECIMAL(4,1),
  sqft INTEGER,
  kitchen field_condition NOT NULL DEFAULT 'not_inspected',
  flooring field_condition NOT NULL DEFAULT 'not_inspected',
  appliances field_condition NOT NULL DEFAULT 'not_inspected',
  bathroom field_condition NOT NULL DEFAULT 'not_inspected',
  hvac field_condition NOT NULL DEFAULT 'not_inspected',
  windows field_condition NOT NULL DEFAULT 'not_inspected',
  paint field_condition NOT NULL DEFAULT 'not_inspected',
  plumbing field_condition NOT NULL DEFAULT 'not_inspected',
  electrical field_condition NOT NULL DEFAULT 'not_inspected',
  doors field_condition NOT NULL DEFAULT 'not_inspected',
  exterior field_condition NOT NULL DEFAULT 'not_inspected',
  common_area field_condition NOT NULL DEFAULT 'not_inspected',
  site_parking field_condition NOT NULL DEFAULT 'not_inspected',
  other field_condition NOT NULL DEFAULT 'not_inspected',
  inspected BOOLEAN NOT NULL DEFAULT TRUE,
  deficiency_flags JSONB,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_unit_walk_rows_session_idx ON field_unit_walk_rows (session_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_unit_walk_rows_unit_label_idx ON field_unit_walk_rows (unit_label);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS field_unit_walk_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES field_inspection_sessions(id),
  row_id UUID REFERENCES field_unit_walk_rows(id),
  system_key VARCHAR(50),
  photo_url TEXT NOT NULL,
  deficiency_flag VARCHAR(100),
  captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_unit_walk_photos_session_idx ON field_unit_walk_photos (session_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS field_unit_walk_photos_row_idx ON field_unit_walk_photos (row_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS re_rehab_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  scenario_id UUID REFERENCES re_deal_scenarios(id),
  inspection_session_id UUID REFERENCES field_inspection_sessions(id),
  scope_name VARCHAR(255) NOT NULL,
  line_items JSONB NOT NULL,
  package_mix JSONB,
  recommended_budget DECIMAL(14,2),
  confidence DECIMAL(6,4),
  generated_by VARCHAR(42),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS re_rehab_scopes_deal_idx ON re_rehab_scopes (deal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS re_rehab_scopes_scenario_idx ON re_rehab_scopes (scenario_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS verified_project_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  scenario_id UUID REFERENCES re_deal_scenarios(id),
  status verification_status NOT NULL DEFAULT 'submitted',
  actual_rehab_cost DECIMAL(14,2) NOT NULL,
  actual_timeline_days INTEGER NOT NULL,
  actual_sale_price DECIMAL(14,2),
  actual_rent DECIMAL(10,2),
  actual_dscr DECIMAL(8,4),
  actual_monthly_cash_flow DECIMAL(12,2),
  funding_path VARCHAR(60),
  capital_source_type VARCHAR(60),
  lender_path_chosen VARCHAR(120),
  refi_outcome VARCHAR(120),
  matrix_room_id VARCHAR(255),
  axm_reward_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  axusd_settlement_ref VARCHAR(255),
  arbitrum_outcome_hash VARCHAR(100),
  arbitrum_verification_hash VARCHAR(100),
  arbitrum_cost_signal_hash VARCHAR(100),
  arbitrum_proof_ref VARCHAR(255),
  verification_timestamp TIMESTAMP,
  submitted_by VARCHAR(42),
  reviewed_by VARCHAR(42),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  interpretation TEXT,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS verified_project_outcomes_deal_idx ON verified_project_outcomes (deal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS verified_project_outcomes_scenario_idx ON verified_project_outcomes (scenario_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS verified_project_outcomes_status_idx ON verified_project_outcomes (status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS project_outcome_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES verified_project_outcomes(id),
  category VARCHAR(80) NOT NULL,
  line_item VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  invoice_ref VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS project_outcome_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES verified_project_outcomes(id),
  document_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  source_tag VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS prediction_actual_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  scenario_id UUID REFERENCES re_deal_scenarios(id),
  outcome_id UUID NOT NULL REFERENCES verified_project_outcomes(id),
  metric_key VARCHAR(80) NOT NULL,
  predicted_value DECIMAL(16,4) NOT NULL,
  actual_value DECIMAL(16,4) NOT NULL,
  variance_value DECIMAL(16,4) NOT NULL,
  variance_pct DECIMAL(10,4) NOT NULL,
  interpretation TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS prediction_actual_variances_deal_idx ON prediction_actual_variances (deal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS prediction_actual_variances_outcome_idx ON prediction_actual_variances (outcome_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS prediction_actual_variances_metric_idx ON prediction_actual_variances (metric_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS operator_strategy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_wallet VARCHAR(42) NOT NULL,
  strategy_type strategy_type NOT NULL,
  asset_class VARCHAR(80),
  vintage_band VARCHAR(40),
  market VARCHAR(120),
  unit_mix JSONB,
  observations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS operator_strategy_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES operator_strategy_profiles(id),
  deal_id UUID REFERENCES re_deals(id),
  outcome_id UUID REFERENCES verified_project_outcomes(id),
  capex_per_unit DECIMAL(12,2),
  rent_lift DECIMAL(12,2),
  noi_lift DECIMAL(14,2),
  stabilization_days INTEGER,
  confidence DECIMAL(6,4),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS capital_intelligence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES re_deals(id),
  offering_id UUID,
  event_type VARCHAR(80) NOT NULL,
  capital_source_type VARCHAR(60),
  raise_velocity DECIMAL(12,4),
  minimum_capital_met BOOLEAN,
  investor_demand_score DECIMAL(8,4),
  lender_path_chosen VARCHAR(120),
  refi_outcome VARCHAR(120),
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS market_cost_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip VARCHAR(20),
  market VARCHAR(120),
  strategy_type strategy_type,
  source_layer VARCHAR(50) NOT NULL,
  capex_per_unit DECIMAL(12,2),
  confidence DECIMAL(6,4) NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS network_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  scope VARCHAR(80) NOT NULL DEFAULT 'global',
  seeded_baseline_weight DECIMAL(6,4) DEFAULT 0.2,
  regional_benchmark_weight DECIMAL(6,4) DEFAULT 0.2,
  verified_local_weight DECIMAL(6,4) DEFAULT 0.2,
  operator_outcome_weight DECIMAL(6,4) DEFAULT 0.2,
  capital_outcome_weight DECIMAL(6,4) DEFAULT 0.2,
  aggregated_signals JSONB NOT NULL,
  confidence_score DECIMAL(6,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS verification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES verified_project_outcomes(id),
  reviewer VARCHAR(42) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS verified_data_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID REFERENCES verified_project_outcomes(id),
  session_id UUID REFERENCES field_inspection_sessions(id),
  wallet_address VARCHAR(42) NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_amount_axm DECIMAL(18,8),
  reward_ref VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS matrix_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_room_id VARCHAR(255) NOT NULL UNIQUE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  configured BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS matrix_room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES matrix_rooms(id),
  user_ref VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS matrix_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES matrix_rooms(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  matrix_event_id VARCHAR(255),
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
