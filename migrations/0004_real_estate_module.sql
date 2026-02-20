-- Real Estate Deal Intelligence Module
-- Migration: 0004_real_estate_module.sql
-- Date: 2026-02-20
-- Description: Creates extensions, enums, and 16 tables for the RE deal intelligence pipeline

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE deal_strategy AS ENUM ('brrrr', 'flip', 'hold', 'note', 'multifamily');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('draft', 'analyzing', 'underwriting', 'approved', 'rejected', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. re_sources: data source registry
CREATE TABLE IF NOT EXISTS re_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  base_url VARCHAR(500),
  credential_ref VARCHAR(255),
  rate_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_sources_name_idx ON re_sources (name);
CREATE INDEX IF NOT EXISTS re_sources_type_idx ON re_sources (type);

-- 2. re_ingest_runs: ETL run tracking
CREATE TABLE IF NOT EXISTS re_ingest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES re_sources(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_ingest_runs_source_idx ON re_ingest_runs (source_id);
CREATE INDEX IF NOT EXISTS re_ingest_runs_status_idx ON re_ingest_runs (status);

-- 3. re_record_errors: per-record error log
CREATE TABLE IF NOT EXISTS re_record_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id UUID NOT NULL REFERENCES re_ingest_runs(id),
  error_type VARCHAR(50) NOT NULL,
  raw_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_record_errors_ingest_run_idx ON re_record_errors (ingest_run_id);
CREATE INDEX IF NOT EXISTS re_record_errors_error_type_idx ON re_record_errors (error_type);

-- 4. re_properties: canonical property records
CREATE TABLE IF NOT EXISTS re_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES re_sources(id),
  external_id VARCHAR(255),
  address_raw VARCHAR(500) NOT NULL,
  address_normalized VARCHAR(500),
  street_number VARCHAR(20),
  street_name VARCHAR(200),
  unit VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  county VARCHAR(100),
  fips VARCHAR(15),
  apn VARCHAR(50),
  lat DECIMAL(10, 7),
  lon DECIMAL(10, 7),
  location_point GEOMETRY(Point, 4326),
  property_type VARCHAR(50),
  year_built INTEGER,
  sqft INTEGER,
  lot_sqft INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  stories SMALLINT,
  garage VARCHAR(50),
  pool BOOLEAN DEFAULT FALSE,
  zoning VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_properties_source_idx ON re_properties (source_id);
CREATE INDEX IF NOT EXISTS re_properties_external_idx ON re_properties (external_id);
CREATE INDEX IF NOT EXISTS re_properties_city_state_idx ON re_properties (city, state);
CREATE INDEX IF NOT EXISTS re_properties_zip_idx ON re_properties (zip);
CREATE INDEX IF NOT EXISTS re_properties_fips_idx ON re_properties (fips);
CREATE INDEX IF NOT EXISTS re_properties_location_gist_idx ON re_properties USING GIST (location_point);
CREATE INDEX IF NOT EXISTS re_properties_address_trgm_idx ON re_properties USING GIN (address_normalized gin_trgm_ops);

-- 5. re_parcels: parcel geometry records
CREATE TABLE IF NOT EXISTS re_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apn VARCHAR(50),
  fips VARCHAR(15),
  geometry GEOMETRY(Polygon, 4326),
  acreage DECIMAL(12, 4),
  land_use VARCHAR(100),
  zoning VARCHAR(50),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_parcels_apn_idx ON re_parcels (apn);
CREATE INDEX IF NOT EXISTS re_parcels_fips_idx ON re_parcels (fips);
CREATE INDEX IF NOT EXISTS re_parcels_geometry_gist_idx ON re_parcels USING GIST (geometry);

-- 6. re_property_parcel_links: property-to-parcel mapping
CREATE TABLE IF NOT EXISTS re_property_parcel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  parcel_id UUID NOT NULL REFERENCES re_parcels(id),
  link_confidence DECIMAL(5, 4),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_prop_parcel_property_idx ON re_property_parcel_links (property_id);
CREATE INDEX IF NOT EXISTS re_prop_parcel_parcel_idx ON re_property_parcel_links (parcel_id);

-- 7. re_property_facts: extensible key-value property attributes
CREATE TABLE IF NOT EXISTS re_property_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  fact_type VARCHAR(50) NOT NULL,
  fact_value TEXT,
  fact_numeric DECIMAL(18, 4),
  as_of DATE,
  source_id UUID REFERENCES re_sources(id),
  confidence DECIMAL(5, 4),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_prop_facts_property_idx ON re_property_facts (property_id);
CREATE INDEX IF NOT EXISTS re_prop_facts_type_idx ON re_property_facts (fact_type);
CREATE INDEX IF NOT EXISTS re_prop_facts_as_of_idx ON re_property_facts (as_of);

-- 8. re_sales: property sale/transfer history
CREATE TABLE IF NOT EXISTS re_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  sale_date DATE NOT NULL,
  sale_price DECIMAL(14, 2),
  price_per_sqft DECIMAL(10, 2),
  buyer VARCHAR(255),
  seller VARCHAR(255),
  deed_type VARCHAR(50),
  document_number VARCHAR(100),
  is_arms_length BOOLEAN DEFAULT TRUE,
  source_id UUID REFERENCES re_sources(id),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_sales_property_idx ON re_sales (property_id);
CREATE INDEX IF NOT EXISTS re_sales_date_idx ON re_sales (sale_date);
CREATE INDEX IF NOT EXISTS re_sales_property_date_idx ON re_sales (property_id, sale_date);

-- 9. re_taxes: tax assessment history
CREATE TABLE IF NOT EXISTS re_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  tax_year INTEGER NOT NULL,
  assessed_total DECIMAL(14, 2),
  assessed_land DECIMAL(14, 2),
  assessed_improvement DECIMAL(14, 2),
  market_value DECIMAL(14, 2),
  tax_amount DECIMAL(12, 2),
  tax_rate DECIMAL(8, 6),
  exemptions JSONB,
  source_id UUID REFERENCES re_sources(id),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_taxes_property_idx ON re_taxes (property_id);
CREATE INDEX IF NOT EXISTS re_taxes_year_idx ON re_taxes (tax_year);
CREATE INDEX IF NOT EXISTS re_taxes_property_year_idx ON re_taxes (property_id, tax_year);

-- 10. re_deals: deal analysis workspace
CREATE TABLE IF NOT EXISTS re_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id),
  user_id UUID,
  created_by_wallet VARCHAR(42),
  deal_name VARCHAR(255) NOT NULL,
  strategy deal_strategy NOT NULL,
  status deal_status NOT NULL DEFAULT 'draft',
  target_purchase_price DECIMAL(14, 2),
  notes TEXT,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_deals_property_idx ON re_deals (property_id);
CREATE INDEX IF NOT EXISTS re_deals_status_idx ON re_deals (status);
CREATE INDEX IF NOT EXISTS re_deals_user_idx ON re_deals (user_id);
CREATE INDEX IF NOT EXISTS re_deals_wallet_idx ON re_deals (created_by_wallet);

-- 11. re_deal_scenarios: scenario variants per deal
CREATE TABLE IF NOT EXISTS re_deal_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  scenario_name VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_deal_scenarios_deal_idx ON re_deal_scenarios (deal_id);
CREATE INDEX IF NOT EXISTS re_deal_scenarios_primary_idx ON re_deal_scenarios (is_primary);

-- 12. re_deal_assumptions: financial inputs per scenario
CREATE TABLE IF NOT EXISTS re_deal_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
  purchase_price DECIMAL(14, 2),
  rehab_budget DECIMAL(12, 2),
  arv_estimate DECIMAL(14, 2),
  down_payment_pct DECIMAL(5, 2),
  interest_rate DECIMAL(5, 3),
  loan_term_years INTEGER,
  closing_cost_pct DECIMAL(5, 2),
  monthly_rent DECIMAL(10, 2),
  vacancy_pct DECIMAL(5, 2),
  property_mgmt_pct DECIMAL(5, 2),
  annual_insurance DECIMAL(10, 2),
  annual_taxes DECIMAL(10, 2),
  annual_capex DECIMAL(10, 2),
  annual_maintenance DECIMAL(10, 2),
  hold_period_months INTEGER,
  appreciation_pct DECIMAL(5, 2),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_deal_assumptions_scenario_idx ON re_deal_assumptions (scenario_id);

-- 13. re_deal_metrics: computed financial outputs per scenario
CREATE TABLE IF NOT EXISTS re_deal_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
  noi DECIMAL(14, 2),
  cap_rate DECIMAL(6, 4),
  cash_on_cash DECIMAL(6, 4),
  dscr DECIMAL(6, 4),
  irr DECIMAL(6, 4),
  total_return DECIMAL(14, 2),
  equity DECIMAL(14, 2),
  monthly_cash_flow DECIMAL(10, 2),
  annual_cash_flow DECIMAL(12, 2),
  break_even_months INTEGER,
  rehab_roi DECIMAL(6, 4),
  rent_to_value DECIMAL(6, 4),
  grm DECIMAL(8, 2),
  deal_score INTEGER,
  deal_grade VARCHAR(2),
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_deal_metrics_scenario_idx ON re_deal_metrics (scenario_id);
CREATE INDEX IF NOT EXISTS re_deal_metrics_computed_idx ON re_deal_metrics (computed_at);

-- 14. re_decision_log: deal approval/rejection audit trail
CREATE TABLE IF NOT EXISTS re_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES re_deals(id),
  decided_by VARCHAR(42),
  decision VARCHAR(50) NOT NULL,
  rationale TEXT,
  snapshot_metrics JSONB,
  decided_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_decision_log_deal_idx ON re_decision_log (deal_id);
CREATE INDEX IF NOT EXISTS re_decision_log_decided_at_idx ON re_decision_log (decided_at);

-- 15. re_risk_flags: per-scenario risk indicators
CREATE TABLE IF NOT EXISTS re_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
  flag_type VARCHAR(100) NOT NULL,
  severity risk_severity NOT NULL,
  message TEXT NOT NULL,
  detail JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS re_risk_flags_scenario_idx ON re_risk_flags (scenario_id);
CREATE INDEX IF NOT EXISTS re_risk_flags_severity_idx ON re_risk_flags (severity);
CREATE INDEX IF NOT EXISTS re_risk_flags_type_idx ON re_risk_flags (flag_type);
