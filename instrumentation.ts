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
        noi DECIMAL(14,2), cap_rate DECIMAL(8,4), cash_on_cash DECIMAL(8,4),
        dscr DECIMAL(8,4), irr DECIMAL(8,4), total_return DECIMAL(14,2),
        equity DECIMAL(14,2), monthly_cash_flow DECIMAL(10,2),
        annual_cash_flow DECIMAL(12,2), break_even_months INTEGER,
        rehab_roi DECIMAL(8,4), rent_to_value DECIMAL(8,4),
        grm DECIMAL(8,2), deal_score INTEGER, deal_grade VARCHAR(2),
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(), meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_deal_metrics');

      await exec(`DO $$ BEGIN
        ALTER TABLE re_deal_metrics ALTER COLUMN cap_rate TYPE DECIMAL(8,4);
        ALTER TABLE re_deal_metrics ALTER COLUMN cash_on_cash TYPE DECIMAL(8,4);
        ALTER TABLE re_deal_metrics ALTER COLUMN dscr TYPE DECIMAL(8,4);
        ALTER TABLE re_deal_metrics ALTER COLUMN irr TYPE DECIMAL(8,4);
        ALTER TABLE re_deal_metrics ALTER COLUMN rehab_roi TYPE DECIMAL(8,4);
        ALTER TABLE re_deal_metrics ALTER COLUMN rent_to_value TYPE DECIMAL(8,4);
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$`, 'widen re_deal_metrics columns');

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

      // ── Sentinel Subscriptions ──
      await exec(`CREATE TABLE IF NOT EXISTS sentinel_subscriptions (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        plan_key VARCHAR(50) NOT NULL DEFAULT 'sentinel_monthly',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        email VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(wallet_address)
      )`, 'table sentinel_subscriptions');

      // ═══════════════════════════════════════════
      //  COLUMN SAFETY: ADD MISSING COLUMNS
      // ═══════════════════════════════════════════

      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN decision_id UUID; EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add decision_id');
      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'OPEN'; EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add status');
      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN exit_reason VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add exit_reason');
      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN direction VARCHAR(10); EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add direction');

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
      await exec(`CREATE UNIQUE INDEX IF NOT EXISTS mirdt_paper_trades_decision_id_open_unique ON mirdt_paper_trades (decision_id) WHERE status = 'OPEN'`, 'idx unique decision_id open');
      await exec(`CREATE INDEX IF NOT EXISTS sentinel_signals_qualified_idx ON sentinel_signals (qualified)`, 'idx');
      await exec(`CREATE INDEX IF NOT EXISTS sentinel_decisions_created_idx ON sentinel_decisions (created_at)`, 'idx');

      await exec(`DO $$ BEGIN ALTER TABLE re_sales ADD CONSTRAINT re_sales_property_date_unique UNIQUE (property_id, sale_date); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_sales');
      await exec(`DO $$ BEGIN ALTER TABLE re_taxes ADD CONSTRAINT re_taxes_property_year_unique UNIQUE (property_id, tax_year); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_taxes');
      await exec(`DO $$ BEGIN ALTER TABLE re_property_facts ADD CONSTRAINT re_property_facts_type_source_unique UNIQUE (property_id, fact_type, source_id); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$`, 'constraint re_facts');

      // ═══════════════════════════════════════════
      //  GEF: GRADUATED EXECUTION FRAMEWORK
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS gef_policy_modes (
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
      )`, 'table gef_policy_modes');

      await exec(`CREATE TABLE IF NOT EXISTS gef_regime_multipliers (
        regime_id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        risk_multiplier NUMERIC NOT NULL,
        direction_bias TEXT,
        requires_high_conviction BOOLEAN NOT NULL DEFAULT FALSE,
        max_correlated_exposure NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`, 'table gef_regime_multipliers');

      await exec(`CREATE TABLE IF NOT EXISTS gef_tier_thresholds (
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
      )`, 'table gef_tier_thresholds');

      await exec(`CREATE TABLE IF NOT EXISTS gef_user_execution_profiles (
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
      )`, 'table gef_user_execution_profiles');

      await exec(`CREATE TABLE IF NOT EXISTS gef_execution_intents (
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
      )`, 'table gef_execution_intents');

      await exec(`CREATE TABLE IF NOT EXISTS gef_executions (
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
      )`, 'table gef_executions');

      await exec(`CREATE TABLE IF NOT EXISTS gef_audit_hash_chain (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        event_type TEXT NOT NULL,
        payload_json JSONB NOT NULL,
        prev_hash TEXT,
        hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`, 'table gef_audit_hash_chain');

      await exec(`CREATE TABLE IF NOT EXISTS gef_violation_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        severity TEXT NOT NULL DEFAULT 'LOW',
        code TEXT NOT NULL,
        description TEXT NOT NULL,
        related_intent_id UUID,
        related_execution_id UUID,
        action_taken TEXT
      )`, 'table gef_violation_events');

      await exec(`CREATE TABLE IF NOT EXISTS gef_qualification_snapshots (
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
      )`, 'table gef_qualification_snapshots');

      // ── GEF: MAE/MFE columns on existing paper trades ──
      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN mae NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add mae');
      await exec(`DO $$ BEGIN ALTER TABLE mirdt_paper_trades ADD COLUMN mfe NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$`, 'alter mirdt_paper_trades add mfe');

      // ── GEF: Indexes ──
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_user_exec_wallet ON gef_user_execution_profiles(wallet_address)`, 'idx gef wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_user ON gef_execution_intents(user_id)`, 'idx gef intents user');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_symbol ON gef_execution_intents(symbol)`, 'idx gef intents symbol');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_exec_intents_status ON gef_execution_intents(status)`, 'idx gef intents status');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_executions_intent ON gef_executions(intent_id)`, 'idx gef executions intent');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_audit_entity ON gef_audit_hash_chain(entity_type, entity_id)`, 'idx gef audit entity');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_audit_created ON gef_audit_hash_chain(created_at)`, 'idx gef audit created');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_violations_user ON gef_violation_events(user_id)`, 'idx gef violations user');
      await exec(`CREATE INDEX IF NOT EXISTS idx_gef_qual_snapshots_user ON gef_qualification_snapshots(user_id)`, 'idx gef qual user');

      // ── GEF: Seed default policy modes ──
      await exec(`INSERT INTO gef_policy_modes (mode_id, name, description, rcf, risk_fraction_default, risk_fraction_max, drawdown_limit, vpi_freeze_threshold, min_stability_to_resume, global_size_multiplier, is_execution_enabled)
        VALUES
          ('BOOTSTRAP', 'Bootstrap', 'Initial system mode with conservative defaults', 0.5, 0.005, 0.01, 0.06, 0.8, 0.3, 0.5, true),
          ('NORMAL', 'Normal', 'Standard operating mode', 1.0, 0.01, 0.02, 0.08, 0.7, 0.4, 1.0, true),
          ('CAUTION', 'Caution', 'Elevated risk environment, reduced exposure', 0.7, 0.005, 0.01, 0.05, 0.6, 0.5, 0.6, true),
          ('RESTRICTED', 'Restricted', 'Severe conditions, minimal new exposure', 0.3, 0.0025, 0.005, 0.03, 0.5, 0.6, 0.3, false),
          ('EMERGENCY', 'Emergency', 'System freeze, no new positions', 0.0, 0.0, 0.0, 0.01, 0.0, 1.0, 0.0, false)
        ON CONFLICT (mode_id) DO NOTHING`, 'seed gef_policy_modes');

      // ── GEF: Seed default regime multipliers ──
      await exec(`INSERT INTO gef_regime_multipliers (regime_id, name, risk_multiplier, direction_bias, requires_high_conviction, max_correlated_exposure)
        VALUES
          ('TREND_UP', 'Trend Up', 1.2, 'LONG', false, 0.40),
          ('TREND_DOWN', 'Trend Down', 0.8, 'SHORT', true, 0.30),
          ('RANGE_LOW_VOL', 'Range Low Volatility', 1.0, NULL, false, 0.35),
          ('HIGH_VOL_DISLOCATION', 'High Volatility Dislocation', 0.5, NULL, true, 0.20)
        ON CONFLICT (regime_id) DO NOTHING`, 'seed gef_regime_multipliers');

      // ── GEF: Seed default tier thresholds ──
      await exec(`INSERT INTO gef_tier_thresholds (tier_id, name, min_qualification_score, min_governance_weight, min_days_paper, min_trades_paper, max_drawdown_paper, min_sharpe, requires_axm_commitment, requires_axusd_reserve, min_axm_balance, min_axusd_reserve, max_risk_per_trade, max_concurrent_positions, max_correlated_exposure, execution_enabled)
        VALUES
          ('PAPER', 'Paper Only', 0, 0, 0, 0, 1.0, NULL, false, false, 0, 0, 0.01, 5, 0.50, false),
          ('TIER_1', 'Execution Tier 1', 0.70, 0.1, 30, 60, 0.06, 0.5, true, true, 100, 500, 0.0025, 2, 0.40, true),
          ('TIER_2', 'Execution Tier 2', 0.78, 0.25, 60, 120, 0.04, 0.8, true, true, 500, 2000, 0.0035, 4, 0.30, true),
          ('TIER_3', 'Execution Tier 3', 0.85, 0.5, 90, 200, 0.03, 1.0, true, true, 2000, 10000, 0.005, 6, 0.25, true)
        ON CONFLICT (tier_id) DO NOTHING`, 'seed gef_tier_thresholds');

      // ── Capital Accounting Enums ──
      await exec(enumSafe('cap_account_type', ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']), 'enum cap_account_type');
      await exec(enumSafe('cap_account_subtype', ['CASH','TRADING','FEE_RESERVE','UNREALIZED','REALIZED','OPERATING']), 'enum cap_account_subtype');
      await exec(enumSafe('cap_position_status', ['OPEN','CLOSED']), 'enum cap_position_status');
      await exec(enumSafe('cap_trade_side', ['BUY','SELL']), 'enum cap_trade_side');
      await exec(enumSafe('cap_fee_type', ['TRADING','NETWORK','MANAGEMENT','ADJUSTMENT']), 'enum cap_fee_type');
      await exec(enumSafe('cap_drawdown_status', ['ACTIVE','RECOVERED']), 'enum cap_drawdown_status');
      await exec(enumSafe('cap_risk_severity', ['INFO','WARNING','ELEVATED','CRITICAL']), 'enum cap_risk_severity');

      // ── Capital Accounting Tables ──
      await exec(`CREATE TABLE IF NOT EXISTS cap_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        account_type cap_account_type NOT NULL,
        subtype cap_account_subtype NOT NULL,
        currency VARCHAR(20) NOT NULL DEFAULT 'AXUSD',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_accounts');

      await exec(`CREATE TABLE IF NOT EXISTS cap_ledger_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tx_group_id UUID NOT NULL,
        account_id UUID NOT NULL,
        debit_amount NUMERIC(24,8) NOT NULL DEFAULT 0,
        credit_amount NUMERIC(24,8) NOT NULL DEFAULT 0,
        currency VARCHAR(20) NOT NULL DEFAULT 'AXUSD',
        description TEXT NOT NULL DEFAULT '',
        external_id VARCHAR(255),
        source_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_ledger_entries');

      await exec(`CREATE TABLE IF NOT EXISTS cap_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instrument VARCHAR(50) NOT NULL,
        venue VARCHAR(50) NOT NULL DEFAULT 'PAPER',
        strategy_id VARCHAR(100),
        status cap_position_status NOT NULL DEFAULT 'OPEN',
        side cap_trade_side NOT NULL,
        quantity NUMERIC(24,8) NOT NULL,
        avg_entry_price NUMERIC(24,8) NOT NULL,
        avg_exit_price NUMERIC(24,8),
        realized_pnl NUMERIC(24,8),
        opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP,
        mirdt_setup_id UUID,
        mirdt_trade_id UUID
      )`, 'cap_positions');

      await exec(`CREATE TABLE IF NOT EXISTS cap_trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL,
        side cap_trade_side NOT NULL,
        quantity NUMERIC(24,8) NOT NULL,
        price NUMERIC(24,8) NOT NULL,
        venue VARCHAR(50) NOT NULL DEFAULT 'PAPER',
        executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        external_id VARCHAR(255)
      )`, 'cap_trades');

      await exec(`CREATE TABLE IF NOT EXISTS cap_fees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trade_id UUID,
        fee_type cap_fee_type NOT NULL,
        amount NUMERIC(24,8) NOT NULL,
        currency VARCHAR(20) NOT NULL DEFAULT 'AXUSD',
        description TEXT NOT NULL DEFAULT '',
        incurred_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_fees');

      await exec(`CREATE TABLE IF NOT EXISTS cap_price_marks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instrument VARCHAR(50) NOT NULL,
        price NUMERIC(24,8) NOT NULL,
        source VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        marked_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_price_marks');

      await exec(`CREATE TABLE IF NOT EXISTS cap_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        as_of TIMESTAMP NOT NULL,
        checksum VARCHAR(128) NOT NULL,
        sources_used JSONB NOT NULL DEFAULT '[]'::jsonb,
        confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH',
        warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
        regime_band VARCHAR(50),
        policy_state VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS cap_snapshot_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id UUID NOT NULL,
        metric_key VARCHAR(100) NOT NULL,
        metric_value VARCHAR(200) NOT NULL,
        period VARCHAR(20) NOT NULL,
        instrument VARCHAR(50)
      )`, 'cap_snapshot_lines');

      await exec(`CREATE TABLE IF NOT EXISTS cap_drawdowns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        peak_value NUMERIC(24,8) NOT NULL,
        trough_value NUMERIC(24,8) NOT NULL,
        depth_pct NUMERIC(10,6) NOT NULL,
        peak_at TIMESTAMP NOT NULL,
        trough_at TIMESTAMP NOT NULL,
        recovered_at TIMESTAMP,
        status cap_drawdown_status NOT NULL DEFAULT 'ACTIVE',
        snapshot_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_drawdowns');

      await exec(`CREATE TABLE IF NOT EXISTS cap_drift_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        as_of TIMESTAMP NOT NULL,
        expected_value NUMERIC(24,8) NOT NULL,
        actual_value NUMERIC(24,8) NOT NULL,
        variance_pct NUMERIC(10,6) NOT NULL,
        snapshot_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_drift_series');

      await exec(`CREATE TABLE IF NOT EXISTS cap_decision_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id UUID,
        setup_id UUID,
        position_id UUID,
        action VARCHAR(100) NOT NULL,
        rationale TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_decision_log');

      await exec(`CREATE TABLE IF NOT EXISTS cap_risk_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        severity cap_risk_severity NOT NULL,
        category VARCHAR(100) NOT NULL,
        explanation TEXT NOT NULL,
        snapshot_id UUID,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'cap_risk_flags');

      // ── Capital Accounting Indexes ──
      await exec(`CREATE INDEX IF NOT EXISTS cap_acct_type_idx ON cap_accounts(account_type)`, 'idx cap_acct_type');
      await exec(`CREATE INDEX IF NOT EXISTS cap_ledger_tx_group_idx ON cap_ledger_entries(tx_group_id)`, 'idx cap_ledger_tx');
      await exec(`CREATE INDEX IF NOT EXISTS cap_ledger_account_idx ON cap_ledger_entries(account_id)`, 'idx cap_ledger_acct');
      await exec(`CREATE INDEX IF NOT EXISTS cap_ledger_external_idx ON cap_ledger_entries(external_id)`, 'idx cap_ledger_ext');
      await exec(`CREATE INDEX IF NOT EXISTS cap_ledger_created_idx ON cap_ledger_entries(created_at)`, 'idx cap_ledger_created');
      await exec(`CREATE INDEX IF NOT EXISTS cap_pos_instrument_idx ON cap_positions(instrument)`, 'idx cap_pos_instr');
      await exec(`CREATE INDEX IF NOT EXISTS cap_pos_status_idx ON cap_positions(status)`, 'idx cap_pos_status');
      await exec(`CREATE INDEX IF NOT EXISTS cap_pos_opened_idx ON cap_positions(opened_at)`, 'idx cap_pos_opened');
      await exec(`CREATE INDEX IF NOT EXISTS cap_trade_position_idx ON cap_trades(position_id)`, 'idx cap_trade_pos');
      await exec(`CREATE INDEX IF NOT EXISTS cap_trade_executed_idx ON cap_trades(executed_at)`, 'idx cap_trade_exec');
      await exec(`CREATE INDEX IF NOT EXISTS cap_fee_incurred_idx ON cap_fees(incurred_at)`, 'idx cap_fee_incurred');
      await exec(`CREATE INDEX IF NOT EXISTS cap_mark_instrument_idx ON cap_price_marks(instrument)`, 'idx cap_mark_instr');
      await exec(`CREATE INDEX IF NOT EXISTS cap_mark_marked_idx ON cap_price_marks(marked_at)`, 'idx cap_mark_marked');
      await exec(`CREATE INDEX IF NOT EXISTS cap_snap_as_of_idx ON cap_snapshots(as_of)`, 'idx cap_snap_asof');
      await exec(`CREATE INDEX IF NOT EXISTS cap_snapline_snapshot_idx ON cap_snapshot_lines(snapshot_id)`, 'idx cap_snapline_snap');
      await exec(`CREATE INDEX IF NOT EXISTS cap_drift_as_of_idx ON cap_drift_series(as_of)`, 'idx cap_drift_asof');
      await exec(`CREATE INDEX IF NOT EXISTS cap_decision_snapshot_idx ON cap_decision_log(snapshot_id)`, 'idx cap_decision_snap');
      await exec(`CREATE INDEX IF NOT EXISTS cap_risk_severity_idx ON cap_risk_flags(severity)`, 'idx cap_risk_sev');

      // ── Seed default capital accounts ──
      await exec(`INSERT INTO cap_accounts (name, account_type, subtype, currency)
        VALUES
          ('Trading Capital', 'ASSET', 'CASH', 'AXUSD'),
          ('Paper Trading', 'ASSET', 'TRADING', 'AXUSD'),
          ('Fee Reserve', 'EXPENSE', 'FEE_RESERVE', 'AXUSD'),
          ('Realized Gains', 'REVENUE', 'REALIZED', 'AXUSD'),
          ('Unrealized Position Value', 'ASSET', 'UNREALIZED', 'AXUSD'),
          ('Operating Expenses', 'EXPENSE', 'OPERATING', 'AXUSD')
        ON CONFLICT DO NOTHING`, 'seed cap_accounts');

      // ── Saved AI Analysis Results ──
      await exec(`CREATE TABLE IF NOT EXISTS re_saved_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID NOT NULL,
        analysis_data JSONB NOT NULL,
        saved_at TIMESTAMPTZ DEFAULT now()
      )`, 're_saved_analysis');
      await exec(`CREATE INDEX IF NOT EXISTS re_saved_analysis_deal_idx ON re_saved_analysis(deal_id)`, 'idx re_saved_analysis_deal');
      await exec(`CREATE INDEX IF NOT EXISTS re_saved_analysis_scenario_idx ON re_saved_analysis(deal_id, scenario_id)`, 'idx re_saved_analysis_scenario');

      // ── IVCEE (Institutional Viability & Capital Efficiency Engine) Tables ──
      await exec(`CREATE TABLE IF NOT EXISTS ivcee_probability_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        base_viability_score NUMERIC,
        viability_probability NUMERIC,
        failure_probability NUMERIC,
        dominant_risk_factor TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_probability_models');

      await exec(`CREATE TABLE IF NOT EXISTS ivcee_sensitivity_matrix (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        price_delta NUMERIC,
        rent_delta NUMERIC,
        rate_delta NUMERIC,
        dscr_output NUMERIC,
        cashflow_output NUMERIC,
        viability_shift NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_sensitivity_matrix');

      await exec(`CREATE TABLE IF NOT EXISTS ivcee_stress_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        scenario_type TEXT NOT NULL,
        dscr_stressed NUMERIC,
        cashflow_stressed NUMERIC,
        drawdown_projection NUMERIC,
        survival_status TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_stress_tests');

      await exec(`CREATE TABLE IF NOT EXISTS ivcee_refinance_risk (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        refinance_ltv NUMERIC,
        refinance_dscr NUMERIC,
        equity_extracted NUMERIC,
        refinance_probability NUMERIC,
        failure_conditions TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_refinance_risk');

      await exec(`CREATE TABLE IF NOT EXISTS ivcee_downside_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        break_even_rent NUMERIC,
        break_even_price NUMERIC,
        max_safe_ltv NUMERIC,
        margin_of_safety NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_downside_metrics');

      await exec(`CREATE TABLE IF NOT EXISTS ivcee_capital_efficiency (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        roi_adjusted NUMERIC,
        volatility_penalty NUMERIC,
        leverage_penalty NUMERIC,
        efficiency_score NUMERIC,
        capital_rank INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ivcee_capital_efficiency');

      // ── IVCEE Indexes ──
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_prob_deal_idx ON ivcee_probability_models(deal_id)`, 'idx ivcee_prob_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_prob_created_idx ON ivcee_probability_models(created_at)`, 'idx ivcee_prob_created');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_sens_deal_idx ON ivcee_sensitivity_matrix(deal_id)`, 'idx ivcee_sens_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_sens_created_idx ON ivcee_sensitivity_matrix(created_at)`, 'idx ivcee_sens_created');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_stress_deal_idx ON ivcee_stress_tests(deal_id)`, 'idx ivcee_stress_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_stress_created_idx ON ivcee_stress_tests(created_at)`, 'idx ivcee_stress_created');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_refi_deal_idx ON ivcee_refinance_risk(deal_id)`, 'idx ivcee_refi_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_refi_created_idx ON ivcee_refinance_risk(created_at)`, 'idx ivcee_refi_created');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_down_deal_idx ON ivcee_downside_metrics(deal_id)`, 'idx ivcee_down_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_down_created_idx ON ivcee_downside_metrics(created_at)`, 'idx ivcee_down_created');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_cap_deal_idx ON ivcee_capital_efficiency(deal_id)`, 'idx ivcee_cap_deal');
      await exec(`CREATE INDEX IF NOT EXISTS ivcee_cap_created_idx ON ivcee_capital_efficiency(created_at)`, 'idx ivcee_cap_created');

      // ── ERC-3643 Tables (t3_) ──
      await exec(`CREATE TABLE IF NOT EXISTS t3_identities (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet VARCHAR(42) NOT NULL UNIQUE,
        onchain_id_address VARCHAR(42) NOT NULL,
        country_code INTEGER NOT NULL DEFAULT 840,
        verification_level INTEGER NOT NULL DEFAULT 1,
        kyc_submission_id VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      )`, 't3_identities');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_identities_wallet ON t3_identities(wallet)`, 'idx t3_identities_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_identities_status ON t3_identities(status)`, 'idx t3_identities_status');

      await exec(`CREATE TABLE IF NOT EXISTS t3_claims (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_id VARCHAR NOT NULL REFERENCES t3_identities(id),
        topic INTEGER NOT NULL,
        issuer_address VARCHAR(42) NOT NULL,
        claim_data TEXT,
        signature TEXT,
        valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
        valid_until TIMESTAMPTZ,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 't3_claims');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_claims_identity ON t3_claims(identity_id)`, 'idx t3_claims_identity');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_claims_topic ON t3_claims(topic)`, 'idx t3_claims_topic');

      await exec(`CREATE TABLE IF NOT EXISTS t3_compliance_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tx_hash VARCHAR(66),
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42) NOT NULL,
        amount NUMERIC(24,8) NOT NULL,
        module_checked VARCHAR(64) NOT NULL,
        result VARCHAR(10) NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 't3_compliance_events');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_compliance_from ON t3_compliance_events(from_address)`, 'idx t3_compliance_from');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_compliance_to ON t3_compliance_events(to_address)`, 'idx t3_compliance_to');

      await exec(`CREATE TABLE IF NOT EXISTS t3_platform_whitelist (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_address VARCHAR(42) NOT NULL UNIQUE,
        platform_name VARCHAR(128) NOT NULL,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        added_by VARCHAR(42),
        active BOOLEAN NOT NULL DEFAULT TRUE
      )`, 't3_platform_whitelist');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_platform_active ON t3_platform_whitelist(active)`, 'idx t3_platform_active');

      await exec(`CREATE TABLE IF NOT EXISTS t3_kyc_submissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        full_name VARCHAR(256) NOT NULL,
        date_of_birth VARCHAR(10) NOT NULL,
        country VARCHAR(3) NOT NULL DEFAULT 'US',
        document_type VARCHAR(32) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'submitted',
        review_note TEXT,
        reviewed_by VARCHAR(42),
        reviewed_at TIMESTAMPTZ,
        bridged_at TIMESTAMPTZ,
        bridge_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 't3_kyc_submissions');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_kyc_wallet ON t3_kyc_submissions(wallet_address)`, 'idx t3_kyc_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_t3_kyc_status ON t3_kyc_submissions(status)`, 'idx t3_kyc_status');

      // Add expires_at and refresh_required_by to t3_claims if missing
      await exec(`ALTER TABLE t3_claims ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`, 't3_claims add expires_at');
      await exec(`ALTER TABLE t3_claims ADD COLUMN IF NOT EXISTS refresh_required_by TIMESTAMPTZ`, 't3_claims add refresh_required_by');

      // ── Wealth Practice group charter columns ──
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS contribution_frequency VARCHAR(20) DEFAULT 'monthly'`, 'susu add contribution_frequency');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS rotation_method VARCHAR(20) DEFAULT 'round_robin'`, 'susu add rotation_method');

      // ── Lending Fund Tables (lf_) ──
      await exec(`CREATE TABLE IF NOT EXISTS lf_accreditation_records (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42),
        email VARCHAR(255),
        full_name VARCHAR(200),
        method VARCHAR(50) NOT NULL,
        income_threshold VARCHAR(50),
        net_worth_threshold VARCHAR(50),
        entity_assets_threshold VARCHAR(50),
        professional_certification VARCHAR(100),
        filing_status VARCHAR(50),
        self_certified BOOLEAN DEFAULT FALSE,
        self_certification_statement TEXT,
        verification_status VARCHAR(50) DEFAULT 'pending',
        admin_reviewed_by VARCHAR(200),
        admin_notes TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        reviewed_at TIMESTAMPTZ
      )`, 'lf_accreditation_records');

      await exec(`CREATE TABLE IF NOT EXISTS loan_applications (
        id SERIAL PRIMARY KEY,
        borrower_name VARCHAR(200) NOT NULL,
        borrower_email VARCHAR(255) NOT NULL,
        borrower_phone VARCHAR(20),
        company_name VARCHAR(255),
        borrower_address VARCHAR(500),
        years_experience INTEGER,
        projects_completed INTEGER,
        property_address VARCHAR(500) NOT NULL,
        property_city VARCHAR(100),
        property_state VARCHAR(50),
        property_zip VARCHAR(20),
        property_type VARCHAR(50),
        purchase_price VARCHAR(50),
        rehab_budget VARCHAR(50),
        arv_estimate VARCHAR(50),
        loan_amount_requested VARCHAR(50) NOT NULL,
        loan_term_months INTEGER,
        acquisition_status VARCHAR(50),
        rehab_scope TEXT,
        exit_strategy VARCHAR(50),
        timeline_months INTEGER,
        has_contractor BOOLEAN,
        contractor_name VARCHAR(200),
        additional_notes TEXT,
        status VARCHAR(50),
        admin_notes TEXT,
        rejection_reason TEXT,
        wallet_address VARCHAR(42),
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        reviewed_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        funded_at TIMESTAMPTZ
      )`, 'loan_applications');

      // ── Distressed Property Feed Tables (dp_) ──
      await exec(`DO $$ BEGIN
        CREATE TYPE dp_distress_type AS ENUM ('foreclosure','tax_lien','reo','wholesale','short_sale','auction','government');
      EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum dp_distress_type');
      await exec(`DO $$ BEGIN
        CREATE TYPE dp_listing_status AS ENUM ('active','under_contract','sold','expired','pending_review');
      EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum dp_listing_status');
      await exec(`DO $$ BEGIN
        CREATE TYPE dp_submission_status AS ENUM ('pending','approved','rejected','expired');
      EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum dp_submission_status');
      await exec(`DO $$ BEGIN
        CREATE TYPE dp_source AS ENUM ('hud','fannie_mae','freddie_mac','usda','wholesaler','tax_sale','manual');
      EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum dp_source');

      await exec(`CREATE TABLE IF NOT EXISTS dp_listings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        source dp_source NOT NULL,
        source_id VARCHAR,
        address VARCHAR NOT NULL,
        city VARCHAR NOT NULL,
        state VARCHAR(2) NOT NULL,
        zip VARCHAR(10) NOT NULL,
        county VARCHAR,
        lat NUMERIC(10,7),
        lon NUMERIC(10,7),
        property_type VARCHAR DEFAULT 'single_family',
        bedrooms INTEGER,
        bathrooms NUMERIC(3,1),
        sqft INTEGER,
        lot_sqft INTEGER,
        year_built INTEGER,
        list_price NUMERIC(14,2),
        estimated_value NUMERIC(14,2),
        discount_pct NUMERIC(5,2),
        distress_type dp_distress_type NOT NULL,
        source_url VARCHAR,
        photos JSONB DEFAULT '[]',
        description TEXT,
        status dp_listing_status NOT NULL DEFAULT 'active',
        auction_date TIMESTAMPTZ,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ
      )`, 'dp_listings');
      await exec(`CREATE INDEX IF NOT EXISTS dp_listings_status_state_idx ON dp_listings(status, state)`, 'idx dp_listings_status_state');
      await exec(`CREATE INDEX IF NOT EXISTS dp_listings_distress_type_idx ON dp_listings(distress_type)`, 'idx dp_listings_distress_type');
      await exec(`CREATE INDEX IF NOT EXISTS dp_listings_city_idx ON dp_listings(city, state)`, 'idx dp_listings_city');
      await exec(`CREATE INDEX IF NOT EXISTS dp_listings_price_idx ON dp_listings(list_price)`, 'idx dp_listings_price');

      await exec(`CREATE TABLE IF NOT EXISTS dp_buy_boxes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_wallet VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        target_cities JSONB DEFAULT '[]',
        target_states JSONB DEFAULT '[]',
        min_price NUMERIC(14,2),
        max_price NUMERIC(14,2),
        property_types JSONB DEFAULT '[]',
        distress_types JSONB DEFAULT '[]',
        min_bedrooms INTEGER,
        min_sqft INTEGER,
        max_price_per_sqft NUMERIC(10,2),
        min_dscr NUMERIC(5,2),
        min_cap_rate NUMERIC(5,2),
        max_risk_level VARCHAR,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'dp_buy_boxes');
      await exec(`CREATE INDEX IF NOT EXISTS dp_buy_boxes_wallet_idx ON dp_buy_boxes(user_wallet)`, 'idx dp_buy_boxes_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS dp_buy_boxes_active_idx ON dp_buy_boxes(active)`, 'idx dp_buy_boxes_active');

      await exec(`CREATE TABLE IF NOT EXISTS dp_matches (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id VARCHAR NOT NULL,
        buy_box_id VARCHAR NOT NULL,
        match_score NUMERIC(5,2) NOT NULL,
        notified BOOLEAN NOT NULL DEFAULT FALSE,
        notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'dp_matches');
      await exec(`CREATE INDEX IF NOT EXISTS dp_matches_buy_box_idx ON dp_matches(buy_box_id)`, 'idx dp_matches_buy_box');
      await exec(`CREATE INDEX IF NOT EXISTS dp_matches_listing_idx ON dp_matches(listing_id)`, 'idx dp_matches_listing');

      await exec(`CREATE TABLE IF NOT EXISTS dp_wholesaler_submissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        submitter_name VARCHAR NOT NULL,
        submitter_email VARCHAR NOT NULL,
        submitter_phone VARCHAR,
        property_address VARCHAR NOT NULL,
        city VARCHAR NOT NULL,
        state VARCHAR(2) NOT NULL,
        zip VARCHAR(10) NOT NULL,
        asking_price NUMERIC(14,2) NOT NULL,
        arv NUMERIC(14,2),
        rehab_estimate NUMERIC(14,2),
        property_type VARCHAR DEFAULT 'single_family',
        bedrooms INTEGER,
        bathrooms NUMERIC(3,1),
        sqft INTEGER,
        year_built INTEGER,
        description TEXT,
        photos JSONB DEFAULT '[]',
        contract_end_date TIMESTAMPTZ,
        status dp_submission_status NOT NULL DEFAULT 'pending',
        reviewed_at TIMESTAMPTZ,
        reviewer_notes TEXT,
        listing_id VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'dp_wholesaler_submissions');
      await exec(`CREATE INDEX IF NOT EXISTS dp_submissions_status_idx ON dp_wholesaler_submissions(status)`, 'idx dp_submissions_status');

      // ── Agent Governance Tables (ag_) ──
      await exec(`DO $$ BEGIN CREATE TYPE ag_agent_status AS ENUM ('ACTIVE','SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_agent_status');
      await exec(`DO $$ BEGIN CREATE TYPE ag_agent_mode AS ENUM ('ADVISORY','CONSTRAINED'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_agent_mode');
      await exec(`DO $$ BEGIN CREATE TYPE ag_policy_status AS ENUM ('DRAFT','ACTIVE','DEPRECATED'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_policy_status');
      await exec(`DO $$ BEGIN CREATE TYPE ag_intent_type AS ENUM ('TRADE','UNDERWRITE','PARAM_CHANGE_PROPOSAL','REPORT'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_intent_type');
      await exec(`DO $$ BEGIN CREATE TYPE ag_intent_status AS ENUM ('PENDING','APPROVED','REJECTED','EXECUTED','SIMULATED'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_intent_status');
      await exec(`DO $$ BEGIN CREATE TYPE ag_decision AS ENUM ('APPROVE','REJECT','THROTTLE','DOWNGRADE','HALT'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_decision');
      await exec(`DO $$ BEGIN CREATE TYPE ag_execution_mode AS ENUM ('PAPER','LIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_execution_mode');
      await exec(`DO $$ BEGIN CREATE TYPE ag_execution_action AS ENUM ('BUY','SELL','NOOP'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_execution_action');
      await exec(`DO $$ BEGIN CREATE TYPE ag_execution_status AS ENUM ('SIMULATED','SUBMITTED','FILLED','FAILED','SKIPPED'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_execution_status');
      await exec(`DO $$ BEGIN CREATE TYPE ag_audit_entity_type AS ENUM ('INTENT','DECISION','EXECUTION','POLICY','REGIME','AGENT','BUDGET'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum ag_audit_entity_type');

      await exec(`CREATE TABLE IF NOT EXISTS ag_agents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        operator_id TEXT,
        model_provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0.0',
        permission_scope JSONB NOT NULL DEFAULT '{"allowed_domains":[],"venues":[],"symbols":[]}'::jsonb,
        default_mode ag_agent_mode NOT NULL DEFAULT 'ADVISORY',
        status ag_agent_status NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_agents');

      await exec(`CREATE TABLE IF NOT EXISTS ag_policies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        status ag_policy_status NOT NULL DEFAULT 'DRAFT',
        rules JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_policies');

      await exec(`CREATE TABLE IF NOT EXISTS ag_budgets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR NOT NULL,
        policy_id VARCHAR NOT NULL,
        denom TEXT NOT NULL DEFAULT 'AXUSD',
        max_notional_per_trade NUMERIC(24,8) NOT NULL,
        max_notional_per_day NUMERIC(24,8) NOT NULL,
        max_daily_loss NUMERIC(24,8) NOT NULL,
        max_open_positions INTEGER NOT NULL,
        allowed_venues JSONB NOT NULL DEFAULT '[]'::jsonb,
        allowed_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_budgets');

      await exec(`CREATE TABLE IF NOT EXISTS ag_intents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR NOT NULL,
        intent_type ag_intent_type NOT NULL,
        payload JSONB NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        correlation_id TEXT,
        status ag_intent_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_intents');
      await exec(`CREATE INDEX IF NOT EXISTS ag_intents_agent_requested_idx ON ag_intents(agent_id, requested_at)`, 'idx ag_intents_agent_requested');

      await exec(`CREATE TABLE IF NOT EXISTS ag_decisions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id VARCHAR NOT NULL,
        policy_id VARCHAR NOT NULL,
        regime_id VARCHAR,
        decision ag_decision NOT NULL,
        reason TEXT NOT NULL,
        checks JSONB NOT NULL,
        decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_decisions');
      await exec(`CREATE INDEX IF NOT EXISTS ag_decisions_intent_idx ON ag_decisions(intent_id)`, 'idx ag_decisions_intent');

      await exec(`CREATE TABLE IF NOT EXISTS ag_executions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id VARCHAR NOT NULL,
        mode ag_execution_mode NOT NULL DEFAULT 'PAPER',
        venue TEXT,
        action ag_execution_action NOT NULL,
        requested_notional NUMERIC(24,8) NOT NULL,
        executed_notional NUMERIC(24,8),
        status ag_execution_status NOT NULL,
        result JSONB,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_executions');
      await exec(`CREATE INDEX IF NOT EXISTS ag_executions_intent_idx ON ag_executions(intent_id)`, 'idx ag_executions_intent');

      await exec(`CREATE TABLE IF NOT EXISTS ag_audit_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type ag_audit_entity_type NOT NULL,
        entity_id VARCHAR NOT NULL,
        canonical JSONB NOT NULL,
        prev_hash VARCHAR(128) NOT NULL,
        hash VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'ag_audit_log');
      await exec(`CREATE INDEX IF NOT EXISTS ag_audit_log_created_idx ON ag_audit_log(created_at)`, 'idx ag_audit_log_created');
      await exec(`CREATE INDEX IF NOT EXISTS ag_audit_log_entity_idx ON ag_audit_log(entity_type, entity_id)`, 'idx ag_audit_log_entity');

      console.log('[instrumentation] Database setup complete');

      await pool.end();
    } catch (err) {
      console.error('[instrumentation] Database setup failed:', err);
    }
  }
}
