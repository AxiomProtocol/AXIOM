/**
 * Next.js Instrumentation Hook (Next.js 14+)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs once when the Next.js server starts. Ensures critical database
 * extensions, enums, and tables exist. Uses inline SQL so it works
 * in serverless environments (Vercel) where migration files may not
 * be present on disk.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (!process.env.DATABASE_URL) {
      console.warn('[instrumentation] DATABASE_URL not set — skipping DB setup');
      return;
    }

    try {
      const { Pool } = await import('pg');

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('neon.tech') ? true : undefined,
        max: 1,
        connectionTimeoutMillis: 10000,
      });

      const exec = async (sql: string, label: string) => {
        try {
          await pool.query(sql);
        } catch (err: any) {
          if (err.code === '42P07' || err.code === '42710' || err.code === '42P16') {
            return;
          }
          console.warn(`[instrumentation] ${label}:`, err.message);
        }
      };

      const enumSafe = (name: string, values: string[]) =>
        `DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${values.map(v => `'${v}'`).join(',')}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

      // ── Extensions ──
      await exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm`, 'pg_trgm');
      await exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`, 'pgcrypto');
      try { await exec(`CREATE EXTENSION IF NOT EXISTS postgis`, 'postgis'); } catch {}

      // ── Enums: Real Estate ──
      await exec(enumSafe('deal_strategy', ['brrrr','flip','hold','note','multifamily']), 'enum deal_strategy');
      await exec(enumSafe('deal_status', ['draft','analyzing','underwriting','approved','rejected','closed','archived']), 'enum deal_status');
      await exec(enumSafe('risk_severity', ['low','medium','high','critical']), 'enum risk_severity');

      // ── Enums: MIRDT ──
      await exec(enumSafe('mirdt_asset_type', ['CRYPTO','EQUITY']), 'enum mirdt_asset_type');
      await exec(enumSafe('mirdt_setup_status', ['ACTIVE','EXPIRED','INVALIDATED']), 'enum mirdt_setup_status');
      await exec(enumSafe('mirdt_trade_outcome', ['WIN','LOSS','FLAT']), 'enum mirdt_trade_outcome');

      // ── Enums: Sentinel ──
      await exec(enumSafe('sentinel_action_type', ['TREASURY_DEPLOY','LEND_ISSUE','MINT','BURN','PARAMETER_CHANGE','SWAP','LP_ACTION','BRIDGE']), 'enum sentinel_action_type');
      await exec(enumSafe('sentinel_decision_outcome', ['APPROVED','DENIED']), 'enum sentinel_decision_outcome');
      await exec(enumSafe('sentinel_regime', ['TREND_UP','TREND_DOWN','RANGE_LOW_VOL','HIGH_VOL_DISLOCATION']), 'enum sentinel_regime');
      await exec(enumSafe('sentinel_signal_direction', ['LONG','SHORT','NEUTRAL']), 'enum sentinel_signal_direction');

      // ── Enums: Property Reports ──
      await exec(enumSafe('prop_report_status', ['pending','paid','generating','ready','failed','expired']), 'enum prop_report_status');
      await exec(enumSafe('prop_report_tier', ['free','base','premium']), 'enum prop_report_tier');

      // ── Enums: Other ──
      await exec(enumSafe('treasury_transaction_type', ['deposit','withdrawal','commitment','release','disbursement','fee','adjustment']), 'enum treasury_transaction_type');

      // ═══════════════════════════════════════════
      //  CORE APPLICATION TABLES
      // ═══════════════════════════════════════════

      // ── Admin / Auth ──
      await exec(`CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR NOT NULL,
        role VARCHAR DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )`, 'table admin_users');

      await exec(`CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        session_token VARCHAR,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, 'table admin_sessions');

      await exec(`CREATE TABLE IF NOT EXISTS siwe_nonces (
        id SERIAL PRIMARY KEY,
        nonce VARCHAR NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, 'table siwe_nonces');

      await exec(`CREATE TABLE IF NOT EXISTS admin_proposals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        proposed_by VARCHAR NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        required_approvals INTEGER NOT NULL DEFAULT 2,
        current_approvals INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP
      )`, 'table admin_proposals');

      await exec(`CREATE TABLE IF NOT EXISTS admin_proposal_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id VARCHAR NOT NULL,
        actor VARCHAR NOT NULL,
        event_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table admin_proposal_events');

      await exec(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_wallet VARCHAR NOT NULL,
        action VARCHAR NOT NULL,
        target_operator_id VARCHAR NOT NULL,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, 'table admin_audit_logs');

      await exec(`CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id UUID NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        before_state JSONB,
        after_state JSONB,
        reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table admin_audit_log');

      await exec(`CREATE TABLE IF NOT EXISTS admin_controls (
        id SERIAL PRIMARY KEY,
        key VARCHAR NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )`, 'table admin_controls');

      // ── Contact ──
      await exec(`CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR,
        email VARCHAR NOT NULL,
        subject VARCHAR,
        message TEXT,
        status VARCHAR DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, 'table contact_submissions');

      // ── Founder Ops ──
      await exec(`CREATE TABLE IF NOT EXISTS founder_ops_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        category VARCHAR(50) NOT NULL,
        action VARCHAR(128) NOT NULL,
        actor VARCHAR(64),
        detail JSONB,
        severity VARCHAR(20) NOT NULL DEFAULT 'info'
      )`, 'table founder_ops_log');

      // ── Solvency ──
      await exec(`CREATE TABLE IF NOT EXISTS solvency_snapshots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        payload JSONB NOT NULL
      )`, 'table solvency_snapshots');

      // ── AME ──
      await exec(`CREATE TABLE IF NOT EXISTS ame_input_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        inputs JSONB NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'manual'
      )`, 'table ame_input_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS ame_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        input_snapshot_id UUID,
        metrics JSONB NOT NULL,
        policy JSONB,
        waterfall JSONB,
        yield_permission JSONB,
        model_version VARCHAR(32)
      )`, 'table ame_evaluations');

      await exec(`CREATE TABLE IF NOT EXISTS ame_policy_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        policy_mode VARCHAR(20) NOT NULL,
        hard_brake_active BOOLEAN NOT NULL DEFAULT FALSE,
        evaluation_id UUID,
        meta JSONB
      )`, 'table ame_policy_state');

      await exec(`CREATE TABLE IF NOT EXISTS ame_metrics_timeseries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metric_key VARCHAR(100) NOT NULL,
        metric_value DECIMAL NOT NULL,
        evaluation_id UUID,
        tags JSONB
      )`, 'table ame_metrics_timeseries');

      await exec(`CREATE TABLE IF NOT EXISTS ame_stress_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        scenario_name VARCHAR(100) NOT NULL,
        inputs JSONB NOT NULL,
        results JSONB NOT NULL,
        evaluation_id UUID
      )`, 'table ame_stress_scenarios');

      await exec(`CREATE TABLE IF NOT EXISTS ame_enforcement_event (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        event_type VARCHAR(50) NOT NULL,
        evaluation_id UUID,
        detail JSONB
      )`, 'table ame_enforcement_event');

      await exec(`CREATE TABLE IF NOT EXISTS ame_data_snapshot (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        provider VARCHAR(100) NOT NULL,
        raw_ref TEXT,
        checksum VARCHAR(128)
      )`, 'table ame_data_snapshot');

      // ── Property Reports (pay-per-report) ──
      await exec(`CREATE TABLE IF NOT EXISTS property_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address_raw VARCHAR(500) NOT NULL,
        tier prop_report_tier NOT NULL DEFAULT 'free',
        status prop_report_status NOT NULL DEFAULT 'pending',
        sqft INTEGER, bedrooms INTEGER, bathrooms VARCHAR(10),
        year_built INTEGER, property_type VARCHAR(50),
        buyer_email VARCHAR(255), buyer_wallet VARCHAR(42),
        buyer_ip VARCHAR(45),
        stripe_session_id VARCHAR(255),
        stripe_payment_intent VARCHAR(255),
        report_json JSONB,
        generated_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table property_reports');

      // ── Idempotency Keys ──
      await exec(`CREATE TABLE IF NOT EXISTS idempotency_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR NOT NULL,
        response JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, 'table idempotency_keys');

      // ═══════════════════════════════════════════
      //  MIRDT TABLES
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_data_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        provider VARCHAR(100) NOT NULL,
        raw_ref TEXT,
        checksum VARCHAR(128)
      )`, 'table mirdt_data_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_setups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        asset_type mirdt_asset_type NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        venue VARCHAR(100),
        horizon_days INTEGER NOT NULL,
        entry_zone_low DECIMAL NOT NULL,
        entry_zone_high DECIMAL NOT NULL,
        invalidation_price DECIMAL NOT NULL,
        thesis_summary TEXT NOT NULL,
        confidence_score INTEGER NOT NULL,
        signal_z DECIMAL NOT NULL,
        expected_p5 DECIMAL,
        expected_p50 DECIMAL,
        expected_p95 DECIMAL,
        volatility_estimate DECIMAL,
        liquidity_notes TEXT,
        model_version VARCHAR(50) NOT NULL,
        data_snapshot_ref UUID,
        rationale_trace_json JSONB,
        status mirdt_setup_status NOT NULL DEFAULT 'ACTIVE',
        expires_at TIMESTAMP NOT NULL
      )`, 'table mirdt_setups');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_execution_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        run_type VARCHAR(20) NOT NULL,
        started_at TIMESTAMP NOT NULL,
        finished_at TIMESTAMP,
        processed_count INTEGER NOT NULL DEFAULT 0,
        eligible_count INTEGER NOT NULL DEFAULT 0,
        authorized_count INTEGER NOT NULL DEFAULT 0,
        opened_count INTEGER NOT NULL DEFAULT 0,
        invalidated_count INTEGER NOT NULL DEFAULT 0,
        expired_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        failure_details JSONB NOT NULL DEFAULT '[]',
        checksum VARCHAR(64) NOT NULL
      )`, 'table mirdt_execution_runs');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_execution_decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID,
        setup_id UUID NOT NULL,
        snapshot_id UUID,
        symbol VARCHAR(20) NOT NULL,
        asset_type VARCHAR(20) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        current_price DECIMAL NOT NULL,
        signal_z DECIMAL NOT NULL,
        volatility_estimate DECIMAL,
        confidence_score INTEGER,
        liquidity_tier VARCHAR(20),
        regime_tier VARCHAR(20),
        grade VARCHAR(10) NOT NULL,
        grade_signal_score DECIMAL,
        grade_asymmetry_score DECIMAL,
        grade_regime_score DECIMAL,
        grade_liquidity_score DECIMAL,
        grade_total DECIMAL,
        eligibility_status VARCHAR(20) NOT NULL,
        eligibility_reason_codes JSONB,
        risk_fraction_bps INTEGER,
        risk_budget_usd DECIMAL,
        invalidation_distance DECIMAL,
        position_size_qty DECIMAL,
        position_notional_usd DECIMAL,
        stop_price DECIMAL,
        take_profit_p50 DECIMAL,
        take_profit_p95 DECIMAL,
        entry_trigger VARCHAR(20),
        entry_allowed BOOLEAN DEFAULT FALSE,
        policy_mode VARCHAR(20),
        decision_checksum VARCHAR(64),
        decision_trace JSONB,
        model_version VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )`, 'table mirdt_execution_decisions');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_execution_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(30) NOT NULL,
        setup_id UUID NOT NULL,
        decision_id UUID,
        run_id UUID,
        event_data JSONB,
        event_checksum VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      )`, 'table mirdt_execution_events');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_execution_timeseries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metric_key VARCHAR(100) NOT NULL,
        metric_value DECIMAL NOT NULL,
        tags JSONB,
        run_id UUID
      )`, 'table mirdt_execution_timeseries');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_paper_trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setup_id UUID NOT NULL,
        opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP,
        entry_price DECIMAL NOT NULL,
        quantity DECIMAL NOT NULL,
        exit_price DECIMAL,
        pnl DECIMAL,
        pnl_pct DECIMAL,
        max_adverse_excursion DECIMAL,
        max_favorable_excursion DECIMAL,
        outcome mirdt_trade_outcome,
        notes TEXT,
        direction VARCHAR(10),
        decision_id UUID,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        exit_reason VARCHAR(50)
      )`, 'table mirdt_paper_trades');

      await exec(`CREATE TABLE IF NOT EXISTS mirdt_portfolio_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        portfolio_capital_usd DECIMAL NOT NULL,
        risk_fraction_bps INTEGER NOT NULL DEFAULT 50,
        max_concurrent_trades INTEGER NOT NULL DEFAULT 5,
        max_per_asset_exposure_bps INTEGER NOT NULL DEFAULT 2000,
        drawdown_brake_bps INTEGER NOT NULL DEFAULT 500,
        system_volatility_tier VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        policy_mode VARCHAR(20) NOT NULL DEFAULT 'BOOTSTRAP',
        global_size_multiplier DECIMAL NOT NULL DEFAULT 1.0,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )`, 'table mirdt_portfolio_state');

      // ═══════════════════════════════════════════
      //  SENTINEL TABLES
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_regime_snapshots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        regime sentinel_regime NOT NULL,
        confidence DECIMAL NOT NULL,
        sma20_slope DECIMAL,
        sma50_slope DECIMAL,
        volatility_20d DECIMAL,
        volatility_ratio DECIMAL,
        breadth_score DECIMAL,
        notes TEXT,
        snapshot_json JSONB
      )`, 'table sentinel_regime_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_signals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        symbol VARCHAR(20) NOT NULL,
        asset_type VARCHAR(20) NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        horizon_days INTEGER NOT NULL,
        direction sentinel_signal_direction NOT NULL,
        entry_zone_low DECIMAL NOT NULL,
        entry_zone_high DECIMAL NOT NULL,
        entry_mid DECIMAL NOT NULL,
        invalidation_level DECIMAL NOT NULL,
        p_raw DECIMAL NOT NULL,
        p_calibrated DECIMAL,
        regime_state sentinel_regime NOT NULL,
        confirmation_score DECIMAL,
        final_score DECIMAL,
        vol_estimate DECIMAL NOT NULL,
        liquidity_score DECIMAL,
        model_version VARCHAR(32) NOT NULL,
        data_snapshot_ref VARCHAR(64),
        source_setup_id VARCHAR,
        rationale_json JSONB,
        qualified BOOLEAN DEFAULT FALSE,
        qualified_at TIMESTAMP
      )`, 'table sentinel_signals');

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_decisions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        scope VARCHAR(64) NOT NULL,
        action_type sentinel_action_type NOT NULL,
        subject VARCHAR(128) NOT NULL,
        max_notional DECIMAL NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        decision sentinel_decision_outcome NOT NULL,
        reason_code VARCHAR(64) NOT NULL,
        plain_language TEXT NOT NULL,
        signal_id VARCHAR,
        log_hash VARCHAR(128) NOT NULL,
        prev_hash VARCHAR(128) NOT NULL,
        signature TEXT,
        nonce INTEGER NOT NULL,
        consumed BOOLEAN DEFAULT FALSE,
        consumed_at TIMESTAMP,
        consumed_tx_hash VARCHAR(128)
      )`, 'table sentinel_decisions');

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_trades (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        signal_id VARCHAR NOT NULL,
        decision_id VARCHAR,
        symbol VARCHAR(20) NOT NULL,
        direction sentinel_signal_direction NOT NULL,
        entry_price DECIMAL NOT NULL,
        quantity DECIMAL NOT NULL,
        target_price DECIMAL,
        stop_price DECIMAL,
        exit_price DECIMAL,
        exit_at TIMESTAMP,
        pnl DECIMAL,
        pnl_pct DECIMAL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        notes TEXT
      )`, 'table sentinel_trades');

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_audit_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        actor VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        resource_type VARCHAR(64) NOT NULL,
        resource_id VARCHAR(128),
        payload_json JSONB NOT NULL,
        prev_hash VARCHAR(128) NOT NULL,
        row_hash VARCHAR(128) NOT NULL
      )`, 'table sentinel_audit_log');

      await exec(`CREATE TABLE IF NOT EXISTS sentinel_calibration_runs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        model_version VARCHAR(32) NOT NULL,
        total_signals INTEGER NOT NULL,
        calibration_method VARCHAR(32) NOT NULL,
        brier_score DECIMAL,
        ece DECIMAL,
        reliability_json JSONB,
        regime_split_json JSONB,
        notes TEXT
      )`, 'table sentinel_calibration_runs');

      // ═══════════════════════════════════════════
      //  REAL ESTATE TABLES
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS re_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE, type VARCHAR(50) NOT NULL,
        base_url VARCHAR(500), credential_ref VARCHAR(255), rate_limit INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT TRUE, meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_sources');

      await exec(`CREATE TABLE IF NOT EXISTS re_ingest_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID NOT NULL REFERENCES re_sources(id),
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP, finished_at TIMESTAMP,
        records_processed INTEGER DEFAULT 0, records_failed INTEGER DEFAULT 0,
        meta JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_ingest_runs');

      await exec(`CREATE TABLE IF NOT EXISTS re_record_errors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingest_run_id UUID NOT NULL REFERENCES re_ingest_runs(id),
        error_type VARCHAR(50) NOT NULL, raw_payload JSONB,
        error_message TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_record_errors');

      await exec(`CREATE TABLE IF NOT EXISTS re_properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES re_sources(id),
        external_id VARCHAR(255),
        address_raw VARCHAR(500) NOT NULL, address_normalized VARCHAR(500),
        street_number VARCHAR(20), street_name VARCHAR(200), unit VARCHAR(50),
        city VARCHAR(100), state VARCHAR(50), zip VARCHAR(20),
        county VARCHAR(100), fips VARCHAR(15), apn VARCHAR(50),
        lat DECIMAL(10,7), lon DECIMAL(10,7),
        property_type VARCHAR(50), year_built INTEGER,
        sqft INTEGER, lot_sqft INTEGER, bedrooms INTEGER,
        bathrooms DECIMAL(3,1), stories SMALLINT, garage VARCHAR(50),
        pool BOOLEAN DEFAULT FALSE, zoning VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE, meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_properties');

      await exec(`CREATE TABLE IF NOT EXISTS re_property_facts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES re_properties(id),
        fact_type VARCHAR(50) NOT NULL, fact_value TEXT,
        fact_numeric DECIMAL(18,4), as_of DATE,
        source_id UUID REFERENCES re_sources(id),
        confidence DECIMAL(5,4), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_property_facts');

      await exec(`CREATE TABLE IF NOT EXISTS re_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES re_properties(id),
        sale_date DATE NOT NULL, sale_price DECIMAL(14,2),
        price_per_sqft DECIMAL(10,2), buyer VARCHAR(255), seller VARCHAR(255),
        deed_type VARCHAR(50), document_number VARCHAR(100),
        is_arms_length BOOLEAN DEFAULT TRUE,
        source_id UUID REFERENCES re_sources(id), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_sales');

      await exec(`CREATE TABLE IF NOT EXISTS re_taxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES re_properties(id),
        tax_year INTEGER NOT NULL, assessed_total DECIMAL(14,2),
        assessed_land DECIMAL(14,2), assessed_improvement DECIMAL(14,2),
        market_value DECIMAL(14,2), tax_amount DECIMAL(12,2),
        tax_rate DECIMAL(8,6), exemptions JSONB,
        source_id UUID REFERENCES re_sources(id), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_taxes');

      await exec(`CREATE TABLE IF NOT EXISTS re_deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES re_properties(id),
        user_id UUID, created_by_wallet VARCHAR(42),
        deal_name VARCHAR(255) NOT NULL,
        strategy deal_strategy NOT NULL,
        status deal_status NOT NULL DEFAULT 'draft',
        target_purchase_price DECIMAL(14,2), notes TEXT, meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_deals');

      await exec(`CREATE TABLE IF NOT EXISTS re_deal_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL REFERENCES re_deals(id),
        scenario_name VARCHAR(255) NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE, description TEXT, meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_deal_scenarios');

      await exec(`CREATE TABLE IF NOT EXISTS re_deal_assumptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
        purchase_price DECIMAL(14,2), rehab_budget DECIMAL(12,2),
        arv_estimate DECIMAL(14,2), down_payment_pct DECIMAL(5,2),
        interest_rate DECIMAL(5,3), loan_term_years INTEGER,
        closing_cost_pct DECIMAL(5,2), monthly_rent DECIMAL(10,2),
        vacancy_pct DECIMAL(5,2), property_mgmt_pct DECIMAL(5,2),
        annual_insurance DECIMAL(10,2), annual_taxes DECIMAL(10,2),
        annual_capex DECIMAL(10,2), annual_maintenance DECIMAL(10,2),
        hold_period_months INTEGER, appreciation_pct DECIMAL(5,2), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_deal_assumptions');

      await exec(`CREATE TABLE IF NOT EXISTS re_deal_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
        noi DECIMAL(14,2), cap_rate DECIMAL(6,4), cash_on_cash DECIMAL(6,4),
        dscr DECIMAL(6,4), irr DECIMAL(6,4), total_return DECIMAL(14,2),
        equity DECIMAL(14,2), monthly_cash_flow DECIMAL(10,2),
        annual_cash_flow DECIMAL(12,2), break_even_months INTEGER,
        rehab_roi DECIMAL(6,4), rent_to_value DECIMAL(6,4),
        grm DECIMAL(8,2), deal_score INTEGER, deal_grade VARCHAR(2),
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_deal_metrics');

      await exec(`CREATE TABLE IF NOT EXISTS re_decision_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL REFERENCES re_deals(id),
        decided_by VARCHAR(42), decision VARCHAR(50) NOT NULL,
        rationale TEXT, snapshot_metrics JSONB,
        decided_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_decision_log');

      await exec(`CREATE TABLE IF NOT EXISTS re_risk_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id UUID NOT NULL REFERENCES re_deal_scenarios(id),
        flag_type VARCHAR(100) NOT NULL, severity risk_severity NOT NULL,
        message TEXT NOT NULL, detail JSONB,
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE, resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_risk_flags');

      await exec(`CREATE TABLE IF NOT EXISTS re_comparables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL REFERENCES re_deals(id),
        property_id UUID REFERENCES re_properties(id),
        address TEXT NOT NULL, city VARCHAR(100), state VARCHAR(2), zip VARCHAR(10),
        lat DECIMAL(10,7), lon DECIMAL(10,7),
        distance_miles DECIMAL(6,2), property_type VARCHAR(50),
        sqft INTEGER, lot_sqft INTEGER, bedrooms SMALLINT,
        bathrooms DECIMAL(3,1), year_built INTEGER,
        sale_price DECIMAL(14,2), sale_date TIMESTAMP,
        price_per_sqft DECIMAL(10,2), days_on_market INTEGER,
        condition VARCHAR(50), source VARCHAR(50),
        similarity_score DECIMAL(5,4), is_selected BOOLEAN NOT NULL DEFAULT TRUE,
        meta JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_comparables');

      await exec(`CREATE TABLE IF NOT EXISTS re_parcels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        apn VARCHAR(50), fips VARCHAR(15), acreage DECIMAL(12,4),
        land_use VARCHAR(100), zoning VARCHAR(50), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_parcels');

      await exec(`CREATE TABLE IF NOT EXISTS re_property_parcel_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES re_properties(id),
        parcel_id UUID NOT NULL REFERENCES re_parcels(id),
        link_confidence DECIMAL(5,4),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_property_parcel_links');

      // ═══════════════════════════════════════════
      //  INDEXES & CONSTRAINTS
      // ═══════════════════════════════════════════

      await exec(`CREATE INDEX IF NOT EXISTS re_properties_city_state_idx ON re_properties (city, state)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS re_properties_zip_idx ON re_properties (zip)`, 'idx');
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS re_properties_address_trgm_idx ON re_properties USING GIN (address_normalized gin_trgm_ops)`);
      } catch {}
      await exec(`CREATE INDEX IF NOT EXISTS re_sales_property_idx ON re_sales (property_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS re_taxes_property_idx ON re_taxes (property_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS re_deals_property_idx ON re_deals (property_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS re_deal_scenarios_deal_idx ON re_deal_scenarios (deal_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS re_prop_facts_property_idx ON re_property_facts (property_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS mirdt_setups_status_idx ON mirdt_setups (status)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS mirdt_paper_trades_setup_idx ON mirdt_paper_trades (setup_id)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS sentinel_signals_qualified_idx ON sentinel_signals (qualified)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS sentinel_decisions_created_idx ON sentinel_decisions (created_at)`, 'idx');

      await exec(`DO $$ BEGIN ALTER TABLE re_sales ADD CONSTRAINT re_sales_property_date_unique UNIQUE (property_id, sale_date); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_sales');
      await exec(`DO $$ BEGIN ALTER TABLE re_taxes ADD CONSTRAINT re_taxes_property_year_unique UNIQUE (property_id, tax_year); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_taxes');
      await exec(`DO $$ BEGIN ALTER TABLE re_property_facts ADD CONSTRAINT re_property_facts_type_source_unique UNIQUE (property_id, fact_type, source_id); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_facts');

      console.log('[instrumentation] Database setup complete');

      await pool.end();
    } catch (err) {
      console.error('[instrumentation] Database setup failed:', err);
    }
  }
}
