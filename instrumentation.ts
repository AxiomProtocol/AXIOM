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

      // ── Enums: Field Intelligence (Layer 5) ──
      await exec(enumSafe('inspection_session_status', ['planned','in_progress','submitted','reviewed','completed','cancelled']), 'enum inspection_session_status');
      await exec(enumSafe('unit_condition', ['good','light_rehab','medium_rehab','full_replace','not_inspected']), 'enum unit_condition');
      await exec(enumSafe('system_type', ['kitchen','bathroom','flooring','appliances','hvac','windows','paint','plumbing','electrical','doors','exterior','common_area','site_parking','other']), 'enum system_type');
      await exec(enumSafe('deficiency_severity', ['minor','moderate','major','critical']), 'enum deficiency_severity');

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

      await exec(`CREATE TABLE IF NOT EXISTS auth0_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth0_sub VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        name VARCHAR(255),
        picture TEXT,
        wallet_address VARCHAR(42),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`, 'table auth0_users');

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
      //  FIELD INTELLIGENCE CAPTURE (Layer 5)
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS field_inspection_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        property_id UUID NOT NULL,
        session_name VARCHAR(255),
        status inspection_session_status NOT NULL DEFAULT 'planned',
        inspection_date TIMESTAMP,
        total_units INTEGER NOT NULL,
        units_walked INTEGER DEFAULT 0,
        sampling_confidence_score DECIMAL(5,4),
        inspected_by VARCHAR(255),
        reviewed_by VARCHAR(255),
        submitted_by VARCHAR(255),
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        summary_json JSONB,
        meta JSONB,
        property_type VARCHAR(20) NOT NULL DEFAULT 'multifamily',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table field_inspection_sessions');
      await exec(`ALTER TABLE field_inspection_sessions ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) NOT NULL DEFAULT 'multifamily'`, 'alter field_inspection_sessions.property_type');

      await exec(`CREATE INDEX IF NOT EXISTS field_insp_deal_idx ON field_inspection_sessions(deal_id)`, 'index field_insp_deal_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_insp_property_idx ON field_inspection_sessions(property_id)`, 'index field_insp_property_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_insp_status_idx ON field_inspection_sessions(status)`, 'index field_insp_status_idx');

      await exec(`CREATE TABLE IF NOT EXISTS field_unit_walk_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        unit_number VARCHAR(50) NOT NULL,
        unit_type VARCHAR(50),
        occupancy_status VARCHAR(30),
        kitchen unit_condition NOT NULL DEFAULT 'not_inspected',
        bathroom unit_condition NOT NULL DEFAULT 'not_inspected',
        flooring unit_condition NOT NULL DEFAULT 'not_inspected',
        appliances unit_condition NOT NULL DEFAULT 'not_inspected',
        hvac unit_condition NOT NULL DEFAULT 'not_inspected',
        windows unit_condition NOT NULL DEFAULT 'not_inspected',
        paint unit_condition NOT NULL DEFAULT 'not_inspected',
        plumbing unit_condition NOT NULL DEFAULT 'not_inspected',
        electrical unit_condition NOT NULL DEFAULT 'not_inspected',
        doors unit_condition NOT NULL DEFAULT 'not_inspected',
        exterior unit_condition NOT NULL DEFAULT 'not_inspected',
        common_area unit_condition NOT NULL DEFAULT 'not_inspected',
        site_parking unit_condition NOT NULL DEFAULT 'not_inspected',
        other unit_condition NOT NULL DEFAULT 'not_inspected',
        roof unit_condition DEFAULT 'not_inspected',
        foundation unit_condition DEFAULT 'not_inspected',
        garage unit_condition DEFAULT 'not_inspected',
        landscaping unit_condition DEFAULT 'not_inspected',
        laundry_room unit_condition DEFAULT 'not_inspected',
        general_notes TEXT,
        inspection_completed BOOLEAN DEFAULT FALSE,
        inspection_time INTEGER,
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table field_unit_walk_rows');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS roof unit_condition DEFAULT 'not_inspected'`, 'alter walk_rows.roof');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS foundation unit_condition DEFAULT 'not_inspected'`, 'alter walk_rows.foundation');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS garage unit_condition DEFAULT 'not_inspected'`, 'alter walk_rows.garage');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS landscaping unit_condition DEFAULT 'not_inspected'`, 'alter walk_rows.landscaping');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS laundry_room unit_condition DEFAULT 'not_inspected'`, 'alter walk_rows.laundry_room');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS voice_note TEXT`, 'alter walk_rows.voice_note');
      await exec(`ALTER TABLE field_unit_walk_rows ADD COLUMN IF NOT EXISTS unit_class VARCHAR(30) DEFAULT 'classic'`, 'alter walk_rows.unit_class');

      await exec(`CREATE INDEX IF NOT EXISTS field_walk_session_idx ON field_unit_walk_rows(session_id)`, 'index field_walk_session_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_walk_unit_number_idx ON field_unit_walk_rows(unit_number)`, 'index field_walk_unit_number_idx');

      await exec(`CREATE TABLE IF NOT EXISTS field_unit_walk_deficiencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_walk_id UUID NOT NULL,
        system system_type NOT NULL,
        severity deficiency_severity NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        estimated_repair_cost DECIMAL(12,2),
        estimated_days_to_fix INTEGER,
        needs_immediate_attention BOOLEAN DEFAULT FALSE,
        affects_tenancy BOOLEAN DEFAULT FALSE,
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table field_unit_walk_deficiencies');

      await exec(`CREATE INDEX IF NOT EXISTS field_deficiency_walk_idx ON field_unit_walk_deficiencies(unit_walk_id)`, 'index field_deficiency_walk_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_deficiency_system_idx ON field_unit_walk_deficiencies(system)`, 'index field_deficiency_system_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_deficiency_severity_idx ON field_unit_walk_deficiencies(severity)`, 'index field_deficiency_severity_idx');

      await exec(`CREATE TABLE IF NOT EXISTS field_unit_walk_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_walk_id UUID NOT NULL,
        photo_type VARCHAR(50),
        system system_type,
        is_before BOOLEAN DEFAULT TRUE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        caption TEXT,
        timestamp TIMESTAMP,
        gps_coordinates JSONB,
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table field_unit_walk_photos');

      await exec(`CREATE INDEX IF NOT EXISTS field_photos_walk_idx ON field_unit_walk_photos(unit_walk_id)`, 'index field_photos_walk_idx');
      await exec(`CREATE INDEX IF NOT EXISTS field_photos_type_idx ON field_unit_walk_photos(photo_type)`, 'index field_photos_type_idx');

      await exec(`CREATE TABLE IF NOT EXISTS field_inspection_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        total_units_in_property INTEGER NOT NULL,
        units_inspected INTEGER NOT NULL,
        sampling_percentage DECIMAL(5,2),
        sampling_confidence_percentage DECIMAL(5,2),
        system_issue_distribution JSONB,
        units_in_good_condition INTEGER,
        units_needing_light_rehab INTEGER,
        units_needing_medium_rehab INTEGER,
        units_needing_full_rehab INTEGER,
        units_not_inspected INTEGER,
        total_deficiencies INTEGER DEFAULT 0,
        critical_deficiencies INTEGER DEFAULT 0,
        deficiencies_by_system JSONB,
        estimated_total_rehab_cost DECIMAL(14,2),
        estimated_avg_cost_per_unit DECIMAL(12,2),
        likely_rehab_package VARCHAR(100),
        rehab_package_breakdown JSONB,
        system_condition_patterns JSONB,
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table field_inspection_summaries');

      await exec(`CREATE INDEX IF NOT EXISTS field_summary_session_idx ON field_inspection_summaries(session_id)`, 'index field_summary_session_idx');

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
        analysis_type VARCHAR(50) DEFAULT 'ai_advisory',
        analysis_data JSONB NOT NULL,
        saved_at TIMESTAMPTZ DEFAULT now()
      )`, 're_saved_analysis');
      await exec(`ALTER TABLE re_saved_analysis ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50) DEFAULT 'ai_advisory'`, 'alter re_saved_analysis add analysis_type');
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

      // ── Wealth Practice tables and columns ──
      await exec(`CREATE TABLE IF NOT EXISTS susu_interest_hubs (
        id SERIAL PRIMARY KEY,
        hub_id VARCHAR(100) NOT NULL UNIQUE,
        hub_name VARCHAR(255),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        region_id VARCHAR(100),
        region_display VARCHAR(200),
        region_type VARCHAR(50) DEFAULT 'metro',
        member_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE
      )`, 'susu_interest_hubs');
      await exec(`ALTER TABLE susu_interest_hubs ADD COLUMN IF NOT EXISTS region_id VARCHAR(100)`, 'susu_hubs add region_id');
      await exec(`ALTER TABLE susu_interest_hubs ADD COLUMN IF NOT EXISTS region_display VARCHAR(200)`, 'susu_hubs add region_display');
      await exec(`ALTER TABLE susu_interest_hubs ADD COLUMN IF NOT EXISTS region_type VARCHAR(50) DEFAULT 'metro'`, 'susu_hubs add region_type');
      await exec(`ALTER TABLE susu_interest_hubs ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0`, 'susu_hubs add member_count');
      await exec(`ALTER TABLE susu_interest_hubs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`, 'susu_hubs add is_active');

      await exec(`CREATE TABLE IF NOT EXISTS susu_purpose_groups (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(100) NOT NULL UNIQUE,
        group_name VARCHAR(255),
        purpose TEXT,
        target_amount NUMERIC(18,2),
        current_amount NUMERIC(18,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        hub_id INTEGER,
        purpose_category_id INTEGER,
        custom_purpose_label VARCHAR(200),
        contribution_amount NUMERIC(18,2),
        contribution_currency VARCHAR(10) DEFAULT 'USD',
        cycle_length_days INTEGER,
        display_name VARCHAR(200),
        description TEXT,
        member_count INTEGER DEFAULT 0,
        min_members_to_activate INTEGER DEFAULT 3,
        max_members INTEGER DEFAULT 12,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        graduated_to_pool_id INTEGER,
        graduation_tx_hash VARCHAR(66),
        graduated_at TIMESTAMPTZ,
        contribution_frequency VARCHAR(20) DEFAULT 'monthly',
        rotation_method VARCHAR(20) DEFAULT 'round-robin'
      )`, 'susu_purpose_groups');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0`, 'susu_groups add member_count');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS min_members_to_activate INTEGER DEFAULT 3`, 'susu_groups add min_members_to_activate');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 12`, 'susu_groups add max_members');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`, 'susu_groups add is_active');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ`, 'susu_groups add graduated_at');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS contribution_frequency VARCHAR(20) DEFAULT 'monthly'`, 'susu add contribution_frequency');
      await exec(`ALTER TABLE susu_purpose_groups ADD COLUMN IF NOT EXISTS rotation_method VARCHAR(20) DEFAULT 'round-robin'`, 'susu add rotation_method');

      await exec(`CREATE TABLE IF NOT EXISTS susu_group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER,
        member_id VARCHAR(100),
        wallet_address VARCHAR(42),
        role VARCHAR(20) DEFAULT 'member',
        commitment_status VARCHAR(20) DEFAULT 'pending',
        position_in_rotation INTEGER,
        joined_at TIMESTAMPTZ DEFAULT now(),
        is_active BOOLEAN DEFAULT TRUE
      )`, 'susu_group_members');

      await exec(`CREATE TABLE IF NOT EXISTS susu_analytics_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        hub_id INTEGER,
        group_id INTEGER,
        member_id VARCHAR(100),
        wallet_address VARCHAR(42),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'susu_analytics_events');

      await exec(`CREATE TABLE IF NOT EXISTS susu_purpose_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        is_active BOOLEAN DEFAULT TRUE
      )`, 'susu_purpose_categories');

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

      await exec(`CREATE TABLE IF NOT EXISTS ame_metric_snapshot (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        environment TEXT NOT NULL DEFAULT 'PRODUCTION',
        version TEXT NOT NULL DEFAULT 'AME-v2.0',
        treasury_total_usd NUMERIC(18,8) NOT NULL,
        treasury_liquid_usd NUMERIC(18,8) NOT NULL,
        designated_reserves_usd NUMERIC(18,8) NOT NULL,
        loss_buffer_usd NUMERIC(18,8) NOT NULL,
        net_external_exposure_usd NUMERIC(18,8) NOT NULL,
        gross_issuance_axusd NUMERIC(18,8) NOT NULL DEFAULT 0,
        circulating_exposure_usd NUMERIC(18,8) NOT NULL,
        coverage_ratio NUMERIC(18,8) NOT NULL,
        reserve_ratio NUMERIC(18,8) NOT NULL,
        liquidity_stability_ratio NUMERIC(18,8) NOT NULL,
        redemption_stress_ratio NUMERIC(18,8) NOT NULL,
        volatility_pressure_index NUMERIC(18,8) NOT NULL,
        stability_score NUMERIC(6,2) NOT NULL,
        policy_mode TEXT NOT NULL,
        composition_json JSONB,
        inputs_ref VARCHAR,
        evaluation_id VARCHAR
      )`, 'ame_metric_snapshot');
      await exec(`CREATE INDEX IF NOT EXISTS ame_metric_snapshot_created_idx ON ame_metric_snapshot(created_at)`, 'idx ame_metric_snapshot_created');

      await exec(`CREATE TABLE IF NOT EXISTS ame_stress_run (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        run_name TEXT NOT NULL,
        base_snapshot_id VARCHAR,
        scenarios_json JSONB NOT NULL,
        results_json JSONB NOT NULL,
        conclusion TEXT NOT NULL,
        policy_mode_after TEXT NOT NULL,
        evaluation_id VARCHAR
      )`, 'ame_stress_run');
      await exec(`CREATE INDEX IF NOT EXISTS ame_stress_run_created_idx ON ame_stress_run(created_at)`, 'idx ame_stress_run_created');

      await exec(`CREATE TABLE IF NOT EXISTS scenario_runs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        snapshot_id VARCHAR NOT NULL,
        scenario_id VARCHAR NOT NULL,
        scenario_label VARCHAR NOT NULL,
        input_json JSONB NOT NULL,
        result_json JSONB NOT NULL,
        resulting_policy_mode VARCHAR NOT NULL,
        breaches_threshold BOOLEAN NOT NULL DEFAULT false
      )`, 'scenario_runs');
      await exec(`CREATE INDEX IF NOT EXISTS scenario_runs_snapshot_idx ON scenario_runs(snapshot_id)`, 'idx scenario_runs_snapshot');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        alert_type VARCHAR(50) NOT NULL DEFAULT 'peg_deviation',
        threshold NUMERIC(18,8),
        is_active BOOLEAN DEFAULT true,
        email_notify BOOLEAN DEFAULT true,
        webhook_url VARCHAR,
        last_triggered TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'axusd_alerts');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_alert_history (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER,
        alert_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        current_value NUMERIC(18,8),
        threshold_value NUMERIC(18,8),
        acknowledged BOOLEAN DEFAULT false,
        tx_hash VARCHAR(66),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'axusd_alert_history');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_bridge_routes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        source_chain VARCHAR(50) NOT NULL,
        source_chain_id INTEGER NOT NULL,
        dest_chain VARCHAR(50) NOT NULL,
        dest_chain_id INTEGER NOT NULL,
        bridge_provider VARCHAR(50) NOT NULL,
        bridge_contract VARCHAR(42),
        min_amount NUMERIC(24,8),
        max_amount NUMERIC(24,8),
        estimated_time_minutes INTEGER,
        fee_percent NUMERIC(8,4),
        flat_fee NUMERIC(24,8),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'axusd_bridge_routes');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_bridge_transactions (
        id SERIAL PRIMARY KEY,
        route_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        amount NUMERIC(24,8) NOT NULL,
        fee NUMERIC(24,8),
        status VARCHAR(20) DEFAULT 'pending',
        source_tx_hash VARCHAR(66),
        dest_tx_hash VARCHAR(66),
        initiated_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ
      )`, 'axusd_bridge_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_snapshots (
        id SERIAL PRIMARY KEY,
        total_supply NUMERIC(24,8),
        circulating_supply NUMERIC(24,8),
        backing_ratio NUMERIC(18,8),
        peg_price NUMERIC(18,8),
        treasury_backing NUMERIC(24,8),
        holder_count INTEGER,
        transfer_volume_24h NUMERIC(24,8),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'axusd_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_trading_pools (
        id SERIAL PRIMARY KEY,
        pool_address VARCHAR(42) NOT NULL,
        dex_name VARCHAR(50) NOT NULL,
        token0_symbol VARCHAR(20),
        token1_symbol VARCHAR(20),
        tvl NUMERIC(24,8),
        volume_24h NUMERIC(24,8),
        fee_tier NUMERIC(8,4),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'axusd_trading_pools');

      await exec(`CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address VARCHAR(42) NOT NULL,
        chain_id INTEGER DEFAULT 42161,
        verified BOOLEAN DEFAULT false,
        contract_type VARCHAR(50),
        abi JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'contracts');

      await exec(`CREATE TABLE IF NOT EXISTS early_access_signups (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        wallet_address VARCHAR(42),
        interest VARCHAR(100),
        referral_source VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'early_access_signups');

      await exec(`CREATE TABLE IF NOT EXISTS wallet_sessions (
        id SERIAL PRIMARY KEY,
        session_token VARCHAR(128) UNIQUE NOT NULL,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        chain_id INTEGER NOT NULL,
        domain VARCHAR(255),
        authenticated_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        last_activity_at TIMESTAMPTZ DEFAULT now()
      )`, 'wallet_sessions');

      await exec(`CREATE TABLE IF NOT EXISTS land_candidates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        location VARCHAR(500),
        state VARCHAR(2),
        county VARCHAR(100),
        acreage NUMERIC(10,2),
        asking_price NUMERIC(18,2),
        property_type VARCHAR(50),
        zoning VARCHAR(50),
        status VARCHAR(30) DEFAULT 'pipeline',
        source VARCHAR(100),
        description TEXT,
        coordinates JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_candidates');

      await exec(`CREATE TABLE IF NOT EXISTS land_acquisition_pools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        candidate_id INTEGER,
        target_amount NUMERIC(18,2) NOT NULL,
        total_contributed NUMERIC(18,2) DEFAULT 0,
        member_count INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'funding',
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_acquisition_pools');

      await exec(`CREATE TABLE IF NOT EXISTS land_governance_proposals (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER,
        pool_id INTEGER,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        proposal_type VARCHAR(50) DEFAULT 'acquisition',
        proposer_wallet VARCHAR(42),
        status VARCHAR(30) DEFAULT 'draft',
        votes_for INTEGER DEFAULT 0,
        votes_against INTEGER DEFAULT 0,
        quorum_required INTEGER DEFAULT 10,
        voting_deadline TIMESTAMPTZ,
        executed_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_governance_proposals');

      await exec(`CREATE TABLE IF NOT EXISTS land_options (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER,
        option_type VARCHAR(50),
        strike_price NUMERIC(18,2),
        premium NUMERIC(18,2),
        expiration_date TIMESTAMPTZ,
        status VARCHAR(30) DEFAULT 'active',
        holder_wallet VARCHAR(42),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_options');

      await exec(`CREATE TABLE IF NOT EXISTS lp_incentive_programs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        pool_address VARCHAR(42) NOT NULL,
        reward_token VARCHAR(42) NOT NULL,
        reward_token_symbol VARCHAR(20) NOT NULL,
        total_rewards NUMERIC(24,8) NOT NULL,
        distributed_rewards NUMERIC(24,8) DEFAULT 0,
        rewards_per_day NUMERIC(24,8),
        bonus_multiplier NUMERIC(8,4) DEFAULT 1,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'lp_incentive_programs');

      await exec(`CREATE TABLE IF NOT EXISTS lp_positions (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        pool_address VARCHAR(42) NOT NULL,
        liquidity NUMERIC(24,8) NOT NULL,
        token0_amount NUMERIC(24,8),
        token1_amount NUMERIC(24,8),
        lower_tick INTEGER,
        upper_tick INTEGER,
        nft_id VARCHAR(100),
        rewards_earned NUMERIC(24,8) DEFAULT 0,
        rewards_claimed NUMERIC(24,8) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'lp_positions');

      await exec(`CREATE TABLE IF NOT EXISTS private_credit_notes (
        id SERIAL PRIMARY KEY,
        note_id VARCHAR(50) UNIQUE,
        borrower_name VARCHAR(200),
        borrower_wallet VARCHAR(42),
        principal_amount NUMERIC(18,2) NOT NULL,
        interest_rate NUMERIC(8,4),
        term_months INTEGER,
        collateral_type VARCHAR(100),
        collateral_description TEXT,
        collateral_value NUMERIC(18,2),
        ltv_ratio NUMERIC(5,4),
        origination_date TIMESTAMPTZ,
        maturity_date TIMESTAMPTZ,
        first_payment_date TIMESTAMPTZ,
        status VARCHAR(30) DEFAULT 'draft',
        outstanding_principal NUMERIC(18,2),
        accrued_interest NUMERIC(18,2) DEFAULT 0,
        total_payments_received NUMERIC(18,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'private_credit_notes');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_loan_applications (
        id SERIAL PRIMARY KEY,
        borrower_wallet VARCHAR(42),
        property_address TEXT,
        loan_amount NUMERIC(18,2),
        property_value NUMERIC(18,2),
        monthly_rent NUMERIC(18,2),
        monthly_expenses NUMERIC(18,2),
        dscr_ratio NUMERIC(8,4),
        status VARCHAR(30) DEFAULT 'submitted',
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_loan_applications');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_investor_commitments (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        commitment_type VARCHAR(50) DEFAULT 'equity',
        status VARCHAR(30) DEFAULT 'committed',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_investor_commitments');

      await exec(`CREATE TABLE IF NOT EXISTS produce_reservations (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        cycle_id VARCHAR(50) NOT NULL,
        cycle_season VARCHAR(20) NOT NULL,
        cycle_year INTEGER NOT NULL,
        credits_used INTEGER DEFAULT 1,
        tier INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'reserved',
        reserved_at TIMESTAMPTZ DEFAULT now(),
        confirmed_at TIMESTAMPTZ,
        claimed_at TIMESTAMPTZ,
        metadata JSONB
      )`, 'produce_reservations');

      await exec(`CREATE TABLE IF NOT EXISTS re_sale_history (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR,
        sale_date TIMESTAMPTZ,
        sale_price NUMERIC(18,2),
        buyer VARCHAR(200),
        seller VARCHAR(200),
        deed_type VARCHAR(50),
        source VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 're_sale_history');

      await exec(`CREATE TABLE IF NOT EXISTS re_tax_history (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR,
        tax_year INTEGER,
        assessed_value NUMERIC(18,2),
        tax_amount NUMERIC(18,2),
        status VARCHAR(30),
        source VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 're_tax_history');

      await exec(`CREATE TABLE IF NOT EXISTS doc_extractions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id VARCHAR,
        property_id VARCHAR,
        wallet_address VARCHAR(42),
        doc_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
        original_filename VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes INTEGER,
        extracted_data JSONB,
        raw_text TEXT,
        confidence NUMERIC(5,4),
        field_count INTEGER,
        applied_to_deal BOOLEAN DEFAULT false,
        error_message TEXT,
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'doc_extractions');
      await exec(`CREATE INDEX IF NOT EXISTS doc_extractions_deal_idx ON doc_extractions(deal_id)`, 'idx doc_extractions_deal');
      await exec(`CREATE INDEX IF NOT EXISTS doc_extractions_type_idx ON doc_extractions(doc_type)`, 'idx doc_extractions_type');

      await exec(`CREATE TABLE IF NOT EXISTS doc_extraction_fields (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        extraction_id VARCHAR NOT NULL,
        field_name VARCHAR(200) NOT NULL,
        field_value TEXT,
        field_type VARCHAR(50) NOT NULL DEFAULT 'string',
        confidence NUMERIC(5,4),
        source_location VARCHAR(200),
        mapped_to VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'doc_extraction_fields');
      await exec(`CREATE INDEX IF NOT EXISTS doc_fields_extraction_idx ON doc_extraction_fields(extraction_id)`, 'idx doc_fields_extraction');

      // ═══════════════════════════════════════════
      //  SYNDICATION TABLES (syn_)
      // ═══════════════════════════════════════════

      await exec(enumSafe('syn_offering_status', ['draft','structuring','raising','funded','closed','active','winding_down','dissolved']), 'enum syn_offering_status');
      await exec(enumSafe('syn_offering_type', ['regD506b','regD506c','regCF','communityPool','clubDeal','pilotOffering']), 'enum syn_offering_type');
      await exec(enumSafe('syn_pipeline_stage', ['lead','contacted','interested','softCircled','docsPending','underReview','approved','fundingPending','funded','closedLost','closedWon']), 'enum syn_pipeline_stage');
      await exec(enumSafe('syn_subscription_status', ['draft','submitted','under_review','approved','rejected','funded','cancelled']), 'enum syn_subscription_status');
      await exec(enumSafe('syn_funding_status', ['pending','processing','completed','failed','returned']), 'enum syn_funding_status');
      await exec(enumSafe('syn_distribution_type', ['preferred_return','profit_share','return_of_capital','refinance_proceeds','sale_proceeds']), 'enum syn_distribution_type');
      await exec(enumSafe('syn_distribution_status', ['draft','approved','processing','completed','failed']), 'enum syn_distribution_status');
      await exec(enumSafe('syn_proposal_status', ['draft','active','passed','failed','executed','cancelled']), 'enum syn_proposal_status');

      await exec(`CREATE TABLE IF NOT EXISTS syn_organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        entity_type VARCHAR(50),
        ein VARCHAR(20),
        state VARCHAR(50),
        primary_contact VARCHAR(255),
        contact_email VARCHAR(255),
        wallet_address VARCHAR(42),
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_organizations');
      await exec(`CREATE INDEX IF NOT EXISTS syn_orgs_name_idx ON syn_organizations(name)`, 'idx syn_orgs_name');
      await exec(`CREATE INDEX IF NOT EXISTS syn_orgs_wallet_idx ON syn_organizations(wallet_address)`, 'idx syn_orgs_wallet');

      await exec(`CREATE TABLE IF NOT EXISTS syn_offerings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES syn_organizations(id),
        deal_id UUID REFERENCES re_deals(id),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        status syn_offering_status NOT NULL DEFAULT 'draft',
        offering_type syn_offering_type NOT NULL,
        entity_type VARCHAR(50),
        description TEXT,
        investment_highlights JSONB,
        target_raise NUMERIC(14,2),
        minimum_raise NUMERIC(14,2),
        maximum_raise NUMERIC(14,2),
        minimum_investment NUMERIC(14,2),
        projected_cap_rate NUMERIC(8,4),
        projected_cash_on_cash NUMERIC(8,4),
        projected_irr NUMERIC(8,4),
        projected_dscr NUMERIC(8,4),
        preferred_return NUMERIC(5,2),
        promote_split NUMERIC(5,2),
        waterfall_terms JSONB,
        fee_structure JSONB,
        hold_period_years INTEGER,
        governance_enabled BOOLEAN DEFAULT FALSE,
        settlement_mode VARCHAR(30) DEFAULT 'offchain',
        access_controls JSONB,
        open_date TIMESTAMPTZ,
        close_date TIMESTAMPTZ,
        funded_date TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_offerings');
      await exec(`CREATE INDEX IF NOT EXISTS syn_offerings_org_idx ON syn_offerings(organization_id)`, 'idx syn_offerings_org');
      await exec(`CREATE INDEX IF NOT EXISTS syn_offerings_deal_idx ON syn_offerings(deal_id)`, 'idx syn_offerings_deal');
      await exec(`CREATE INDEX IF NOT EXISTS syn_offerings_status_idx ON syn_offerings(status)`, 'idx syn_offerings_status');
      await exec(`CREATE INDEX IF NOT EXISTS syn_offerings_slug_idx ON syn_offerings(slug)`, 'idx syn_offerings_slug');
      await exec(`CREATE INDEX IF NOT EXISTS syn_offerings_type_idx ON syn_offerings(offering_type)`, 'idx syn_offerings_type');

      await exec(`CREATE TABLE IF NOT EXISTS syn_offering_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        name VARCHAR(255) NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        url TEXT,
        file_size INTEGER,
        mime_type VARCHAR(100),
        visibility VARCHAR(30) NOT NULL DEFAULT 'private',
        uploaded_by VARCHAR(42),
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_offering_documents');
      await exec(`CREATE INDEX IF NOT EXISTS syn_docs_offering_idx ON syn_offering_documents(offering_id)`, 'idx syn_docs_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_docs_type_idx ON syn_offering_documents(doc_type)`, 'idx syn_docs_type');
      await exec(`CREATE INDEX IF NOT EXISTS syn_docs_visibility_idx ON syn_offering_documents(visibility)`, 'idx syn_docs_visibility');

      await exec(`CREATE TABLE IF NOT EXISTS syn_investor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        legal_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(30),
        entity_name VARCHAR(255),
        entity_type VARCHAR(50),
        wallet_address VARCHAR(42),
        accreditation_status VARCHAR(30) DEFAULT 'unverified',
        kyc_status VARCHAR(30) DEFAULT 'pending',
        aml_status VARCHAR(30) DEFAULT 'pending',
        tax_id VARCHAR(30),
        address TEXT,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_investor_profiles');
      await exec(`CREATE INDEX IF NOT EXISTS syn_investor_wallet_idx ON syn_investor_profiles(wallet_address)`, 'idx syn_investor_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS syn_investor_email_idx ON syn_investor_profiles(email)`, 'idx syn_investor_email');
      await exec(`CREATE INDEX IF NOT EXISTS syn_investor_accred_idx ON syn_investor_profiles(accreditation_status)`, 'idx syn_investor_accred');

      await exec(`CREATE TABLE IF NOT EXISTS syn_pipeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        investor_profile_id UUID NOT NULL REFERENCES syn_investor_profiles(id),
        stage syn_pipeline_stage NOT NULL DEFAULT 'lead',
        interest_amount NUMERIC(14,2),
        soft_circle_amount NUMERIC(14,2),
        committed_amount NUMERIC(14,2),
        funded_amount NUMERIC(14,2),
        assigned_rep VARCHAR(255),
        notes TEXT,
        last_contacted_at TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_pipeline');
      await exec(`CREATE INDEX IF NOT EXISTS syn_pipeline_offering_idx ON syn_pipeline(offering_id)`, 'idx syn_pipeline_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_pipeline_investor_idx ON syn_pipeline(investor_profile_id)`, 'idx syn_pipeline_investor');
      await exec(`CREATE INDEX IF NOT EXISTS syn_pipeline_stage_idx ON syn_pipeline(stage)`, 'idx syn_pipeline_stage');

      await exec(`CREATE TABLE IF NOT EXISTS syn_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        investor_profile_id UUID NOT NULL REFERENCES syn_investor_profiles(id),
        amount NUMERIC(14,2) NOT NULL,
        status syn_subscription_status NOT NULL DEFAULT 'draft',
        signature_ref VARCHAR(255),
        funding_method VARCHAR(50),
        payment_currency VARCHAR(20) DEFAULT 'USD',
        investor_wallet VARCHAR(42),
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        funded_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_subscriptions');
      await exec(`CREATE INDEX IF NOT EXISTS syn_subs_offering_idx ON syn_subscriptions(offering_id)`, 'idx syn_subs_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_subs_investor_idx ON syn_subscriptions(investor_profile_id)`, 'idx syn_subs_investor');
      await exec(`CREATE INDEX IF NOT EXISTS syn_subs_status_idx ON syn_subscriptions(status)`, 'idx syn_subs_status');

      await exec(`CREATE TABLE IF NOT EXISTS syn_funding_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES syn_subscriptions(id),
        funding_method VARCHAR(50) NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        status syn_funding_status NOT NULL DEFAULT 'pending',
        settlement_mode VARCHAR(30),
        external_ref VARCHAR(255),
        tx_hash VARCHAR(66),
        processed_at TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_funding_records');
      await exec(`CREATE INDEX IF NOT EXISTS syn_funding_subscription_idx ON syn_funding_records(subscription_id)`, 'idx syn_funding_sub');
      await exec(`CREATE INDEX IF NOT EXISTS syn_funding_status_idx ON syn_funding_records(status)`, 'idx syn_funding_status');

      await exec(`CREATE TABLE IF NOT EXISTS syn_cap_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        investor_profile_id UUID NOT NULL REFERENCES syn_investor_profiles(id),
        share_class VARCHAR(50) DEFAULT 'common',
        units NUMERIC(14,4),
        ownership_pct NUMERIC(8,4),
        capital_contributed NUMERIC(14,2),
        distributions_received NUMERIC(14,2) DEFAULT 0,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_cap_table');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cap_offering_idx ON syn_cap_table(offering_id)`, 'idx syn_cap_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cap_investor_idx ON syn_cap_table(investor_profile_id)`, 'idx syn_cap_investor');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cap_class_idx ON syn_cap_table(share_class)`, 'idx syn_cap_class');

      await exec(`CREATE TABLE IF NOT EXISTS syn_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        report_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        report_data JSONB,
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        published_by VARCHAR(42),
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_reports');
      await exec(`CREATE INDEX IF NOT EXISTS syn_reports_offering_idx ON syn_reports(offering_id)`, 'idx syn_reports_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_reports_type_idx ON syn_reports(report_type)`, 'idx syn_reports_type');
      await exec(`CREATE INDEX IF NOT EXISTS syn_reports_published_idx ON syn_reports(published_at)`, 'idx syn_reports_published');

      await exec(`CREATE TABLE IF NOT EXISTS syn_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        cap_table_entry_id UUID REFERENCES syn_cap_table(id),
        investor_profile_id UUID REFERENCES syn_investor_profiles(id),
        distribution_type syn_distribution_type NOT NULL,
        gross_amount NUMERIC(14,2) NOT NULL,
        net_amount NUMERIC(14,2),
        withholding_amount NUMERIC(14,2),
        status syn_distribution_status NOT NULL DEFAULT 'draft',
        payment_method VARCHAR(50),
        currency VARCHAR(20) DEFAULT 'USD',
        recipient_wallet VARCHAR(42),
        paid_at TIMESTAMPTZ,
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_distributions');
      await exec(`CREATE INDEX IF NOT EXISTS syn_dist_offering_idx ON syn_distributions(offering_id)`, 'idx syn_dist_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_dist_investor_idx ON syn_distributions(investor_profile_id)`, 'idx syn_dist_investor');
      await exec(`CREATE INDEX IF NOT EXISTS syn_dist_status_idx ON syn_distributions(status)`, 'idx syn_dist_status');
      await exec(`CREATE INDEX IF NOT EXISTS syn_dist_type_idx ON syn_distributions(distribution_type)`, 'idx syn_dist_type');

      await exec(`ALTER TABLE syn_offerings ADD COLUMN IF NOT EXISTS created_by VARCHAR(42)`, 'alter syn_offerings created_by');
      await exec(`ALTER TABLE syn_subscriptions ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(20) DEFAULT 'USD'`, 'alter syn_subscriptions payment_currency');
      await exec(`ALTER TABLE syn_subscriptions ADD COLUMN IF NOT EXISTS investor_wallet VARCHAR(42)`, 'alter syn_subscriptions investor_wallet');
      await exec(`ALTER TABLE syn_funding_records ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66)`, 'alter syn_funding_records tx_hash');
      await exec(`ALTER TABLE syn_distributions ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'USD'`, 'alter syn_distributions currency');
      await exec(`ALTER TABLE syn_distributions ADD COLUMN IF NOT EXISTS recipient_wallet VARCHAR(42)`, 'alter syn_distributions recipient_wallet');

      await exec(`CREATE TABLE IF NOT EXISTS syn_capital_calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES syn_subscriptions(id),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        amount_called DECIMAL(14,2) NOT NULL,
        currency VARCHAR(20) DEFAULT 'USD',
        due_date TIMESTAMP,
        status VARCHAR(30) DEFAULT 'sent' NOT NULL,
        unit_payment_id VARCHAR(255),
        sent_at TIMESTAMP DEFAULT now(),
        meta JSONB,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )`, 'create syn_capital_calls');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cc_subscription_idx ON syn_capital_calls(subscription_id)`, 'idx syn_cc_subscription');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cc_offering_idx ON syn_capital_calls(offering_id)`, 'idx syn_cc_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_cc_status_idx ON syn_capital_calls(status)`, 'idx syn_cc_status');

      await exec(`CREATE TABLE IF NOT EXISTS syn_governance_proposals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID NOT NULL REFERENCES syn_offerings(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        proposal_type VARCHAR(50) NOT NULL,
        status syn_proposal_status NOT NULL DEFAULT 'draft',
        quorum_pct NUMERIC(5,2) DEFAULT 50,
        threshold_pct NUMERIC(5,2) DEFAULT 50,
        proposed_by VARCHAR(42),
        voting_opens_at TIMESTAMPTZ,
        voting_closes_at TIMESTAMPTZ,
        executed_at TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_governance_proposals');
      await exec(`CREATE INDEX IF NOT EXISTS syn_gov_offering_idx ON syn_governance_proposals(offering_id)`, 'idx syn_gov_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_gov_status_idx ON syn_governance_proposals(status)`, 'idx syn_gov_status');

      await exec(`CREATE TABLE IF NOT EXISTS syn_governance_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id UUID NOT NULL REFERENCES syn_governance_proposals(id),
        investor_profile_id UUID NOT NULL REFERENCES syn_investor_profiles(id),
        cap_table_entry_id UUID REFERENCES syn_cap_table(id),
        vote VARCHAR(20) NOT NULL,
        voting_power NUMERIC(14,4),
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_governance_votes');
      await exec(`CREATE INDEX IF NOT EXISTS syn_votes_proposal_idx ON syn_governance_votes(proposal_id)`, 'idx syn_votes_proposal');
      await exec(`CREATE INDEX IF NOT EXISTS syn_votes_investor_idx ON syn_governance_votes(investor_profile_id)`, 'idx syn_votes_investor');

      await exec(`CREATE TABLE IF NOT EXISTS syn_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offering_id UUID REFERENCES syn_offerings(id),
        investor_profile_id UUID REFERENCES syn_investor_profiles(id),
        recipient_wallet VARCHAR(42),
        recipient_email VARCHAR(255),
        action_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMPTZ,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'syn_notifications');
      await exec(`CREATE INDEX IF NOT EXISTS syn_notif_offering_idx ON syn_notifications(offering_id)`, 'idx syn_notif_offering');
      await exec(`CREATE INDEX IF NOT EXISTS syn_notif_investor_idx ON syn_notifications(investor_profile_id)`, 'idx syn_notif_investor');
      await exec(`CREATE INDEX IF NOT EXISTS syn_notif_wallet_idx ON syn_notifications(recipient_wallet)`, 'idx syn_notif_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS syn_notif_read_idx ON syn_notifications(is_read)`, 'idx syn_notif_read');

      // ── Due Diligence Tables ──
      await exec(enumSafe('dd_item_status', ['notStarted','inProgress','blocked','complete']), 'enum dd_item_status');

      await exec(`CREATE TABLE IF NOT EXISTS dd_checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'Due Diligence Checklist',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`, 'dd_checklists');
      await exec(`CREATE INDEX IF NOT EXISTS dd_checklists_deal_idx ON dd_checklists(deal_id)`, 'idx dd_checklists_deal');

      await exec(`CREATE TABLE IF NOT EXISTS dd_checklist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checklist_id UUID NOT NULL REFERENCES dd_checklists(id),
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status dd_item_status NOT NULL DEFAULT 'notStarted',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        owner VARCHAR(255),
        notes TEXT,
        evidence_links JSONB,
        completed_at TIMESTAMPTZ,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`, 'dd_checklist_items');
      await exec(`CREATE INDEX IF NOT EXISTS dd_items_checklist_idx ON dd_checklist_items(checklist_id)`, 'idx dd_items_checklist');
      await exec(`CREATE INDEX IF NOT EXISTS dd_items_category_idx ON dd_checklist_items(category)`, 'idx dd_items_category');
      await exec(`CREATE INDEX IF NOT EXISTS dd_items_status_idx ON dd_checklist_items(status)`, 'idx dd_items_status');

            await exec(`CREATE TABLE IF NOT EXISTS ai_usage_meters (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        wallet_address VARCHAR(42),
        model VARCHAR(100),
        tokens_used INTEGER DEFAULT 0,
        cost_usd NUMERIC(10,6) DEFAULT 0,
        request_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'ai_usage_meters');

      await exec(`CREATE TABLE IF NOT EXISTS analytics_alerts (
        id SERIAL PRIMARY KEY,
        alert_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'info',
        title VARCHAR(255),
        message TEXT,
        metric_name VARCHAR(100),
        threshold_value NUMERIC(18,6),
        current_value NUMERIC(18,6),
        is_active BOOLEAN DEFAULT true,
        acknowledged_at TIMESTAMPTZ,
        acknowledged_by VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'analytics_alerts');

      await exec(`CREATE TABLE IF NOT EXISTS asset_oracles (
        id SERIAL PRIMARY KEY,
        asset_id VARCHAR(100) NOT NULL,
        asset_type VARCHAR(50),
        oracle_address VARCHAR(42),
        last_price_usd NUMERIC(18,8),
        last_update_block INTEGER,
        update_frequency_seconds INTEGER DEFAULT 3600,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'asset_oracles');

      await exec(`CREATE TABLE IF NOT EXISTS assumptions (
        id SERIAL PRIMARY KEY,
        assumption_key VARCHAR(100) NOT NULL,
        assumption_value TEXT,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'assumptions');

      await exec(`CREATE TABLE IF NOT EXISTS axusd_certifications (
        id SERIAL PRIMARY KEY,
        certification_id VARCHAR(100) NOT NULL,
        entity_name VARCHAR(255),
        entity_type VARCHAR(100),
        certification_type VARCHAR(100),
        issued_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ,
        document_cid VARCHAR(100),
        is_valid BOOLEAN DEFAULT true
      )`, 'axusd_certifications');

      await exec(`CREATE TABLE IF NOT EXISTS bonds_metadata (
        id SERIAL PRIMARY KEY,
        instrument_id INTEGER NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        coupon_rate NUMERIC(6,4),
        maturity_date TIMESTAMPTZ NOT NULL,
        face_value NUMERIC(15,2),
        rating VARCHAR(10),
        duration NUMERIC(10,4),
        convexity NUMERIC(10,4),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'bonds_metadata');

      await exec(`CREATE TABLE IF NOT EXISTS campaign_milestones (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        milestone_name VARCHAR(255),
        description TEXT,
        target_amount NUMERIC(18,2),
        reached_amount NUMERIC(18,2) DEFAULT 0,
        is_reached BOOLEAN DEFAULT false,
        reached_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'campaign_milestones');

      await exec(`CREATE TABLE IF NOT EXISTS campaign_short_links (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        short_code VARCHAR(50) NOT NULL,
        full_url TEXT,
        click_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'campaign_short_links');

      await exec(`CREATE TABLE IF NOT EXISTS campaign_updates (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        title VARCHAR(255),
        content TEXT,
        author_address VARCHAR(42),
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'campaign_updates');

      await exec(`CREATE TABLE IF NOT EXISTS checking_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        routing_number VARCHAR(9) DEFAULT '021000021',
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        ledger_balance NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
        available_balance NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
        overdraft_enabled BOOLEAN DEFAULT false NOT NULL,
        overdraft_limit NUMERIC(15,2) DEFAULT 0.00,
        daily_spend_cap NUMERIC(15,2),
        limits JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'checking_accounts');

      await exec(`CREATE TABLE IF NOT EXISTS checking_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        transaction_type VARCHAR(30) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'SWF',
        description TEXT,
        merchant_name VARCHAR(255),
        mcc VARCHAR(4),
        reference_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'posted' NOT NULL,
        balance_after NUMERIC(15,2) NOT NULL,
        initiated_by VARCHAR(42),
        related_transfer_id INTEGER,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        posted_at TIMESTAMPTZ DEFAULT now()
      )`, 'checking_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS community_votes (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER,
        voter_address VARCHAR(42) NOT NULL,
        vote_weight NUMERIC(28,8) DEFAULT 1,
        vote_direction VARCHAR(20),
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'community_votes');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_acknowledgements (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        disclosure_id INTEGER,
        acknowledged_at TIMESTAMPTZ DEFAULT now(),
        ip_address VARCHAR(45),
        user_agent TEXT
      )`, 'compliance_acknowledgements');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_audit (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        wallet_address VARCHAR(42),
        event VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        details JSONB,
        timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'compliance_audit');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        actor_address VARCHAR(42),
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_audit_logs');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_claims (
        id SERIAL PRIMARY KEY,
        claim_id VARCHAR(100) NOT NULL,
        claimant_address VARCHAR(42),
        claim_type VARCHAR(100),
        amount_claimed NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'pending',
        evidence_cid VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_claims');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_complaint_updates (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER,
        update_text TEXT,
        updated_by VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_complaint_updates');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_complaints (
        id SERIAL PRIMARY KEY,
        complaint_id VARCHAR(100) NOT NULL,
        complainant_address VARCHAR(42),
        complainant_email VARCHAR(255),
        subject VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'normal',
        assigned_to VARCHAR(42),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_complaints');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_disclosures (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        feature_id VARCHAR(100),
        display_location VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        effective_date TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_disclosures');

      await exec(`CREATE TABLE IF NOT EXISTS compliance_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        description TEXT,
        severity VARCHAR(20) DEFAULT 'info',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'compliance_events');

      await exec(`CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'conversations');

      await exec(`CREATE TABLE IF NOT EXISTS credit_score_updates (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        old_score INTEGER,
        new_score INTEGER,
        reason VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'credit_score_updates');

      await exec(`CREATE TABLE IF NOT EXISTS credit_scores (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        score INTEGER DEFAULT 0,
        score_tier VARCHAR(20),
        last_calculated_at TIMESTAMPTZ,
        factors JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'credit_scores');

      await exec(`CREATE TABLE IF NOT EXISTS credits_ledger (
        id SERIAL PRIMARY KEY,
        operator_id VARCHAR(100) NOT NULL,
        available_balance VARCHAR(50) DEFAULT '0',
        pending_balance VARCHAR(50) DEFAULT '0',
        total_earned VARCHAR(50) DEFAULT '0',
        total_redeemed VARCHAR(50) DEFAULT '0',
        total_slashed VARCHAR(50) DEFAULT '0',
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'credits_ledger');

      await exec(`CREATE TABLE IF NOT EXISTS credits_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) NOT NULL,
        operator_id VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount VARCHAR(50) NOT NULL,
        currency VARCHAR(20) DEFAULT 'USD',
        source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'PENDING',
        reason TEXT,
        tx_hash VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'credits_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS crowdfunding_campaigns (
        id SERIAL PRIMARY KEY,
        land_option_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        subtitle VARCHAR(300),
        description TEXT NOT NULL,
        target_amount NUMERIC(18,2) NOT NULL,
        min_investment NUMERIC(18,2) NOT NULL,
        max_investment NUMERIC(18,2) NOT NULL,
        raised_amount NUMERIC(18,2) DEFAULT 0,
        investor_count INTEGER DEFAULT 0,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'draft',
        issuer_id INTEGER NOT NULL,
        offering_document_cid TEXT,
        requires_accreditation BOOLEAN DEFAULT false,
        reg_cf_form_c TEXT,
        terms_and_conditions TEXT,
        risk_factors TEXT,
        use_of_funds TEXT,
        financial_statements JSONB,
        contract_address VARCHAR(42),
        on_chain_campaign_id INTEGER,
        featured_image TEXT,
        gallery_images JSONB,
        video_url TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        amount_raised NUMERIC(18,2) DEFAULT 0
      )`, 'crowdfunding_campaigns');

      await exec(`CREATE TABLE IF NOT EXISTS crowdfunding_investments (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        investor_address VARCHAR(42) NOT NULL,
        amount_usd NUMERIC(18,2) NOT NULL,
        amount_axm NUMERIC(28,8),
        transaction_hash VARCHAR(66),
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'crowdfunding_investments');

      await exec(`CREATE TABLE IF NOT EXISTS dao_grant_votes (
        id SERIAL PRIMARY KEY,
        grant_id INTEGER,
        voter_address VARCHAR(42) NOT NULL,
        vote_weight NUMERIC(28,8) DEFAULT 1,
        vote_direction VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'dao_grant_votes');

      await exec(`CREATE TABLE IF NOT EXISTS dao_grants (
        id SERIAL PRIMARY KEY,
        proposer_address VARCHAR(42) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'other',
        requested_amount NUMERIC(28,8) NOT NULL,
        milestones JSONB,
        team_info JSONB,
        timeline VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        votes_for NUMERIC(28,8) DEFAULT '0',
        votes_against NUMERIC(28,8) DEFAULT '0',
        votes_abstain NUMERIC(28,8) DEFAULT '0',
        quorum_reached BOOLEAN DEFAULT false,
        voting_start_date TIMESTAMPTZ,
        voting_end_date TIMESTAMPTZ,
        funded_amount NUMERIC(28,8) DEFAULT '0',
        funded_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'dao_grants');

      await exec(`CREATE TABLE IF NOT EXISTS disclosure_events (
        id VARCHAR(255) DEFAULT gen_random_uuid() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        event_type VARCHAR(255) NOT NULL,
        severity VARCHAR(255) DEFAULT 'info' NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        metadata JSONB
      )`, 'disclosure_events');

      await exec(`CREATE TABLE IF NOT EXISTS discord_member_xp (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(100) NOT NULL,
        wallet_address VARCHAR(42),
        xp_total INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        last_activity_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'discord_member_xp');

      await exec(`CREATE TABLE IF NOT EXISTS dismissed_nudges (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        nudge_id VARCHAR(100) NOT NULL,
        dismissed_at TIMESTAMPTZ DEFAULT now()
      )`, 'dismissed_nudges');

      await exec(`CREATE TABLE IF NOT EXISTS dividends_distributions (
        id SERIAL PRIMARY KEY,
        instrument_id INTEGER NOT NULL,
        amount_per_share NUMERIC(15,6) NOT NULL,
        ex_date TIMESTAMPTZ NOT NULL,
        pay_date TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'dividends_distributions');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_applications (
        id SERIAL PRIMARY KEY,
        applicant_id INTEGER,
        property_address TEXT,
        loan_amount NUMERIC(28,8),
        dscr_ratio NUMERIC(10,4),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_applications');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_borrowers (
        id SERIAL PRIMARY KEY,
        borrower_id VARCHAR(100) NOT NULL,
        wallet_address VARCHAR(42),
        entity_name VARCHAR(255),
        contact_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_borrowers');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_distributions (
        id SERIAL PRIMARY KEY,
        distribution_id VARCHAR(100) NOT NULL,
        period_start DATE,
        period_end DATE,
        total_amount_usd NUMERIC(18,2),
        yield_percentage NUMERIC(5,4),
        status VARCHAR(50) DEFAULT 'pending',
        distributed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_distributions');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_investor_onboarding (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(255),
        accreditation_status VARCHAR(50) DEFAULT 'pending',
        kyc_status VARCHAR(50) DEFAULT 'pending',
        aml_status VARCHAR(50) DEFAULT 'pending',
        commitment_amount_usd NUMERIC(18,2),
        subscription_signed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_investor_onboarding');

      await exec(`CREATE TABLE IF NOT EXISTS dscr_properties (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(100) NOT NULL,
        borrower_id INTEGER,
        address TEXT,
        property_type VARCHAR(50),
        estimated_value NUMERIC(18,2),
        monthly_rent NUMERIC(10,2),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'dscr_properties');

      await exec(`CREATE TABLE IF NOT EXISTS due_diligence_reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        report_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        findings JSONB,
        risk_score INTEGER,
        completed_by VARCHAR(42),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'due_diligence_reports');

      await exec(`CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        template_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'sent',
        provider_id VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'email_logs');

      await exec(`CREATE TABLE IF NOT EXISTS error_events (
        id SERIAL PRIMARY KEY,
        error_type VARCHAR(100),
        message TEXT,
        stack_trace TEXT,
        user_address VARCHAR(42),
        endpoint VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'error_events');

      await exec(`CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) DEFAULT 'error',
        message TEXT,
        context JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'error_logs');

      await exec(`CREATE TABLE IF NOT EXISTS evidence_items (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER,
        item_type VARCHAR(50),
        description TEXT,
        document_cid VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'evidence_items');

      await exec(`CREATE TABLE IF NOT EXISTS execution_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_type VARCHAR(20) DEFAULT 'ON_DEMAND' NOT NULL,
        started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        finished_at TIMESTAMPTZ,
        setups_evaluated INTEGER DEFAULT 0,
        decisions_created INTEGER DEFAULT 0,
        decisions_rejected INTEGER DEFAULT 0,
        decisions_wait INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        run_checksum VARCHAR(64),
        model_version VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'execution_runs');

      await exec(`CREATE TABLE IF NOT EXISTS executions (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        fill_qty NUMERIC(20,8) NOT NULL,
        fill_price NUMERIC(15,6) NOT NULL,
        fees NUMERIC(15,6) DEFAULT '0',
        venue VARCHAR(50),
        tx_hash VARCHAR(66),
        timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'executions');

      await exec(`CREATE TABLE IF NOT EXISTS fact_claims (
        id SERIAL PRIMARY KEY,
        claim_id VARCHAR(100) NOT NULL,
        claim_text TEXT,
        source_url TEXT,
        verification_status VARCHAR(50) DEFAULT 'unverified',
        verified_by VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'fact_claims');

      await exec(`CREATE TABLE IF NOT EXISTS familysearch_tokens (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'familysearch_tokens');

      await exec(`CREATE TABLE IF NOT EXISTS fee_rebates (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        rebate_amount NUMERIC(18,8),
        rebate_type VARCHAR(50),
        transaction_hash VARCHAR(66),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'fee_rebates');

      await exec(`CREATE TABLE IF NOT EXISTS governance_proposals (
        id SERIAL PRIMARY KEY,
        proposer_address VARCHAR(42) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        proposal_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        votes_for NUMERIC(28,8) DEFAULT '0',
        votes_against NUMERIC(28,8) DEFAULT '0',
        quorum_reached BOOLEAN DEFAULT false,
        voting_start TIMESTAMPTZ,
        voting_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'governance_proposals');

      await exec(`CREATE TABLE IF NOT EXISTS governance_votes (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER,
        voter_address VARCHAR(42) NOT NULL,
        vote_weight NUMERIC(28,8) DEFAULT 1,
        vote_direction VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'governance_votes');

      await exec(`CREATE TABLE IF NOT EXISTS instruments (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        name TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        exchange VARCHAR(50),
        tick_size NUMERIC(10,6),
        lot_size NUMERIC(10,2),
        quote_source VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'instruments');

      await exec(`CREATE TABLE IF NOT EXISTS insurance_claims (
        id SERIAL PRIMARY KEY,
        claimant_id INTEGER,
        policy_id INTEGER,
        amount NUMERIC(28,8),
        status VARCHAR(50) DEFAULT 'pending',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'insurance_claims');

      await exec(`CREATE TABLE IF NOT EXISTS insurance_policies (
        id SERIAL PRIMARY KEY,
        holder_id INTEGER,
        coverage_amount NUMERIC(28,8),
        premium NUMERIC(28,8),
        status VARCHAR(50) DEFAULT 'active',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'insurance_policies');

      await exec(`CREATE TABLE IF NOT EXISTS investment_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        base_currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'investment_accounts');

      await exec(`CREATE TABLE IF NOT EXISTS investment_acknowledgments (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        investment_id INTEGER,
        acknowledgment_type VARCHAR(100),
        acknowledged_at TIMESTAMPTZ DEFAULT now()
      )`, 'investment_acknowledgments');

      await exec(`CREATE TABLE IF NOT EXISTS investment_commitments (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        fund_id VARCHAR(100),
        committed_amount NUMERIC(18,2),
        funded_amount NUMERIC(18,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pledged',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'investment_commitments');

      await exec(`CREATE TABLE IF NOT EXISTS investment_ledger (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        type VARCHAR(30) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        instrument_id INTEGER,
        ref_id VARCHAR(100),
        description TEXT,
        timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'investment_ledger');

      await exec(`CREATE TABLE IF NOT EXISTS investor_commitments (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        campaign_id INTEGER,
        amount_usd NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'investor_commitments');

      await exec(`CREATE TABLE IF NOT EXISTS investor_documents (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        document_type VARCHAR(100),
        document_name VARCHAR(255),
        document_cid VARCHAR(100),
        uploaded_at TIMESTAMPTZ DEFAULT now()
      )`, 'investor_documents');

      await exec(`CREATE TABLE IF NOT EXISTS investor_kyc (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        kyc_provider VARCHAR(100),
        kyc_status VARCHAR(50) DEFAULT 'pending',
        aml_status VARCHAR(50) DEFAULT 'pending',
        verification_id VARCHAR(100),
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'investor_kyc');

      await exec(`CREATE TABLE IF NOT EXISTS investor_notifications (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        notification_type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'investor_notifications');

      await exec(`CREATE TABLE IF NOT EXISTS investor_sessions (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        session_token VARCHAR(255),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'investor_sessions');

      await exec(`CREATE TABLE IF NOT EXISTS iot_devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) NOT NULL,
        device_type VARCHAR(50),
        property_id VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        last_reading JSONB,
        last_reading_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'iot_devices');

      await exec(`CREATE TABLE IF NOT EXISTS keygrow_enrollments (
        id SERIAL PRIMARY KEY,
        enrollment_id VARCHAR(66) NOT NULL,
        property_id INTEGER,
        tenant_address VARCHAR(42) NOT NULL,
        tenant_name VARCHAR(200),
        tenant_email VARCHAR(255),
        enrollment_date TIMESTAMPTZ DEFAULT now(),
        target_ownership_date TIMESTAMPTZ,
        agreed_term_months INTEGER DEFAULT 240,
        agreed_monthly_rent_axm NUMERIC(28,8),
        agreed_equity_per_payment NUMERIC(5,2),
        total_equity_required NUMERIC(18,8),
        current_equity_percent NUMERIC(10,6) DEFAULT 0,
        total_payments_made INTEGER DEFAULT 0,
        total_axm_paid NUMERIC(28,8) DEFAULT 0,
        missed_payments INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        contract_signature_hash VARCHAR(66),
        kyc_verified BOOLEAN DEFAULT false,
        last_payment_date TIMESTAMPTZ,
        next_payment_due TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'keygrow_enrollments');

      await exec(`CREATE TABLE IF NOT EXISTS keygrow_payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(66) NOT NULL,
        enrollment_id INTEGER,
        payer_address VARCHAR(42) NOT NULL,
        amount_usd NUMERIC(18,2) NOT NULL,
        amount_axm NUMERIC(28,8),
        equity_earned NUMERIC(18,8),
        shares_earned INTEGER DEFAULT 0,
        transaction_hash VARCHAR(66),
        block_number INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        due_date TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        is_late BOOLEAN DEFAULT false,
        late_fee_usd NUMERIC(18,2),
        payment_month INTEGER,
        payment_year INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'keygrow_payments');

      await exec(`CREATE TABLE IF NOT EXISTS keygrow_properties (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(66) NOT NULL,
        owner_address VARCHAR(42) NOT NULL,
        property_name VARCHAR(255),
        property_type VARCHAR(50),
        address_line_1 VARCHAR(500),
        address_line_2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        total_value_usd NUMERIC(18,2),
        total_value_axm NUMERIC(28,8),
        monthly_rent_usd NUMERIC(18,2),
        monthly_rent_axm NUMERIC(28,8),
        equity_percent_per_payment NUMERIC(5,2) DEFAULT 0.75,
        minimum_term_months INTEGER DEFAULT 12,
        maximum_term_months INTEGER DEFAULT 360,
        image_url VARCHAR(500),
        description TEXT,
        bedrooms INTEGER,
        bathrooms NUMERIC(3,1),
        square_feet INTEGER,
        year_built INTEGER,
        status VARCHAR(50) DEFAULT 'available',
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'keygrow_properties');

      await exec(`CREATE TABLE IF NOT EXISTS keygrow_sellers (
        id SERIAL PRIMARY KEY,
        seller_id VARCHAR(66) NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        business_name VARCHAR(255),
        contact_name VARCHAR(200),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        license_number VARCHAR(100),
        license_state VARCHAR(50),
        company_type VARCHAR(100),
        website VARCHAR(500),
        total_listings INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        rating NUMERIC(3,2),
        status VARCHAR(50) DEFAULT 'pending',
        kyc_verified BOOLEAN DEFAULT false,
        kyc_document_cid VARCHAR(100),
        verified_at TIMESTAMPTZ,
        verified_by VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'keygrow_sellers');

      await exec(`CREATE TABLE IF NOT EXISTS kyc_verifications (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        provider VARCHAR(100),
        verification_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        verified_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'kyc_verifications');

      await exec(`CREATE TABLE IF NOT EXISTS land_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(100) NOT NULL,
        land_candidate_id INTEGER,
        title VARCHAR(255),
        description TEXT,
        target_amount_usd NUMERIC(18,2),
        raised_amount_usd NUMERIC(18,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_campaigns');

      await exec(`CREATE TABLE IF NOT EXISTS land_checklist_items (
        id SERIAL PRIMARY KEY,
        land_candidate_id INTEGER,
        item_name VARCHAR(255),
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_checklist_items');

      await exec(`CREATE TABLE IF NOT EXISTS land_comments (
        id SERIAL PRIMARY KEY,
        land_candidate_id INTEGER,
        parent_comment_id INTEGER,
        user_address VARCHAR(100),
        content TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_comments');

      await exec(`CREATE TABLE IF NOT EXISTS land_documents (
        id SERIAL PRIMARY KEY,
        land_submission_id INTEGER,
        document_name VARCHAR(255),
        document_url TEXT,
        document_type VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_documents');

      await exec(`CREATE TABLE IF NOT EXISTS land_fund_attribution (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        referrer_address VARCHAR(42),
        attribution_source VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_fund_attribution');

      await exec(`CREATE TABLE IF NOT EXISTS land_fund_founding_members (
        id SERIAL PRIMARY KEY,
        member_address VARCHAR(42) NOT NULL,
        member_name VARCHAR(255),
        contribution_usd NUMERIC(18,2),
        tier VARCHAR(50),
        joined_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_fund_founding_members');

      await exec(`CREATE TABLE IF NOT EXISTS land_fund_funnel_events (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42),
        event_type VARCHAR(100),
        event_data JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_fund_funnel_events');

      await exec(`CREATE TABLE IF NOT EXISTS land_fund_investment_activity (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        activity_type VARCHAR(50),
        amount_usd NUMERIC(18,2),
        transaction_hash VARCHAR(66),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_fund_investment_activity');

      await exec(`CREATE TABLE IF NOT EXISTS land_fund_subscriptions (
        id SERIAL PRIMARY KEY,
        investor_address VARCHAR(42) NOT NULL,
        subscription_amount NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'pending',
        signed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_fund_subscriptions');

      await exec(`CREATE TABLE IF NOT EXISTS land_history (
        id SERIAL PRIMARY KEY,
        land_candidate_id INTEGER,
        action VARCHAR(100),
        details JSONB,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_history');

      await exec(`CREATE TABLE IF NOT EXISTS land_notification_preferences (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(100),
        land_candidate_id INTEGER,
        notify_updates BOOLEAN DEFAULT true,
        notify_comments BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_notification_preferences');

      await exec(`CREATE TABLE IF NOT EXISTS land_proposal_votes (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER,
        voter_address VARCHAR(42) NOT NULL,
        vote_weight NUMERIC(28,8) DEFAULT 1,
        vote_direction VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_proposal_votes');

      await exec(`CREATE TABLE IF NOT EXISTS land_submissions (
        id SERIAL PRIMARY KEY,
        submission_id VARCHAR(100) NOT NULL,
        submitter_address VARCHAR(42),
        property_address TEXT,
        parcel_number VARCHAR(100),
        acreage NUMERIC(10,2),
        asking_price NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'submitted',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'land_submissions');

      await exec(`CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        lead_id VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(50),
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'leads');

      await exec(`CREATE TABLE IF NOT EXISTS lock_challenge_badges (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        badge_type VARCHAR(100),
        badge_name VARCHAR(255),
        earned_at TIMESTAMPTZ DEFAULT now()
      )`, 'lock_challenge_badges');

      await exec(`CREATE TABLE IF NOT EXISTS market_data_snapshots (
        id SERIAL PRIMARY KEY,
        instrument_id INTEGER NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
        bid NUMERIC(15,6),
        ask NUMERIC(15,6),
        last NUMERIC(15,6),
        volume NUMERIC(20,2),
        open_interest NUMERIC(20,2),
        implied_volatility NUMERIC(8,4)
      )`, 'market_data_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS marketplace_listings (
        id SERIAL PRIMARY KEY,
        listing_id VARCHAR(100) NOT NULL,
        seller_address VARCHAR(42) NOT NULL,
        asset_type VARCHAR(50),
        asset_id VARCHAR(100),
        price_usd NUMERIC(18,2),
        price_axm NUMERIC(28,8),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'marketplace_listings');

      await exec(`CREATE TABLE IF NOT EXISTS member_balances (
        id SERIAL PRIMARY KEY,
        member_address VARCHAR(42) NOT NULL,
        balance_type VARCHAR(50),
        amount NUMERIC(28,8) DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'member_balances');

      await exec(`CREATE TABLE IF NOT EXISTS membership_records (
        id SERIAL PRIMARY KEY,
        member_address VARCHAR(42) NOT NULL,
        membership_tier VARCHAR(50),
        started_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      )`, 'membership_records');

      await exec(`CREATE TABLE IF NOT EXISTS membership_subscriptions (
        id SERIAL PRIMARY KEY,
        member_address VARCHAR(42) NOT NULL,
        tier VARCHAR(50),
        stripe_subscription_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'membership_subscriptions');

      await exec(`CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'messages');

      await exec(`CREATE TABLE IF NOT EXISTS node_chain_sync (
        id SERIAL PRIMARY KEY,
        node_id INTEGER NOT NULL,
        operator_address VARCHAR(42) NOT NULL,
        node_class INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        sync_status VARCHAR(50) DEFAULT 'PENDING',
        linked_operator_id VARCHAR(50),
        synced_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'node_chain_sync');

      await exec(`CREATE TABLE IF NOT EXISTS node_onboarding (
        id SERIAL PRIMARY KEY,
        onboarding_id VARCHAR(50) NOT NULL,
        operator_id VARCHAR(50) NOT NULL,
        current_phase VARCHAR(50) DEFAULT 'APPLICATION',
        application_submitted_at TIMESTAMPTZ,
        verification_completed_at TIMESTAMPTZ,
        provisioning_completed_at TIMESTAMPTZ,
        dry_run_completed_at TIMESTAMPTZ,
        certification_completed_at TIMESTAMPTZ,
        activation_completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'node_onboarding');

      await exec(`CREATE TABLE IF NOT EXISTS node_operators (
        id SERIAL PRIMARY KEY,
        operator_id VARCHAR(50) NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        display_name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(20) DEFAULT 'OBSERVER' NOT NULL,
        status VARCHAR(20) DEFAULT 'APPLIED' NOT NULL,
        suspended BOOLEAN DEFAULT false,
        verification_tier VARCHAR(20) DEFAULT 'NONE',
        settlements_completed INTEGER DEFAULT 0,
        attestations_provided INTEGER DEFAULT 0,
        incident_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        activated_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT now(),
        onboarding_phase VARCHAR(50) DEFAULT 'APPLICATION',
        total_milestones_completed INTEGER DEFAULT 0,
        total_earnings NUMERIC(12,2) DEFAULT 0,
        pending_earnings NUMERIC(12,2) DEFAULT 0,
        attestation_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMPTZ,
        roles JSONB,
        on_chain_node_id INTEGER
      )`, 'node_operators');

      await exec(`CREATE TABLE IF NOT EXISTS note_covenants (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        covenant_name VARCHAR(200) NOT NULL,
        description TEXT,
        check_frequency VARCHAR(20) DEFAULT 'monthly',
        is_compliant BOOLEAN,
        last_checked_at TIMESTAMPTZ,
        last_checked_by INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'note_covenants');

      await exec(`CREATE TABLE IF NOT EXISTS note_documents (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500),
        file_hash VARCHAR(128),
        uploaded_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'note_documents');

      await exec(`CREATE TABLE IF NOT EXISTS note_payment_events (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        event_date TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        principal_portion NUMERIC(18,2) DEFAULT 0,
        interest_portion NUMERIC(18,2) DEFAULT 0,
        late_fee NUMERIC(18,2) DEFAULT 0,
        balance_after NUMERIC(18,2),
        reference VARCHAR(200),
        notes TEXT,
        recorded_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'note_payment_events');

      await exec(`CREATE TABLE IF NOT EXISTS note_submissions (
        id SERIAL PRIMARY KEY,
        note_id VARCHAR(50) NOT NULL,
        seller_name VARCHAR(255),
        seller_email VARCHAR(255),
        seller_company VARCHAR(255),
        performance_status VARCHAR(50) DEFAULT 'PERFORMING',
        note_type VARCHAR(100),
        unpaid_principal_balance NUMERIC(15,2),
        asking_price NUMERIC(15,2),
        ltv NUMERIC(5,2),
        discount_from_upb NUMERIC(5,2),
        property_address TEXT,
        property_city VARCHAR(100),
        property_state VARCHAR(50),
        property_zip VARCHAR(20),
        property_type VARCHAR(100),
        estimated_property_value NUMERIC(15,2),
        monthly_payment NUMERIC(10,2),
        interest_rate NUMERIC(5,3),
        months_delinquent INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'SUBMITTED',
        pipeline_phase VARCHAR(50) DEFAULT 'INTAKE',
        assigned_attestor_a VARCHAR(100),
        assigned_attestor_b VARCHAR(100),
        attestation_a_at TIMESTAMPTZ,
        attestation_b_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'note_submissions');

      await exec(`CREATE TABLE IF NOT EXISTS oauth_states (
        id SERIAL PRIMARY KEY,
        state VARCHAR(255) NOT NULL,
        provider VARCHAR(50),
        redirect_uri TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'oauth_states');

      await exec(`CREATE TABLE IF NOT EXISTS onchain_rewards_sync (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(100) NOT NULL,
        operator_id VARCHAR(100) NOT NULL,
        last_synced_epoch INTEGER DEFAULT 0,
        total_claimed_onchain VARCHAR(50) DEFAULT '0',
        last_synced_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'onchain_rewards_sync');

      await exec(`CREATE TABLE IF NOT EXISTS operator_rewards (
        id SERIAL PRIMARY KEY,
        operator_id VARCHAR(50) NOT NULL,
        usd_accrued NUMERIC(12,2) DEFAULT 0,
        usd_paid NUMERIC(12,2) DEFAULT 0,
        usd_pending NUMERIC(12,2) DEFAULT 0,
        conversion_bucket NUMERIC(12,2) DEFAULT 0,
        slashed_amount NUMERIC(12,2) DEFAULT 0,
        last_payout_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'operator_rewards');

      await exec(`CREATE TABLE IF NOT EXISTS options_contracts (
        id SERIAL PRIMARY KEY,
        instrument_id INTEGER NOT NULL,
        underlying_id INTEGER NOT NULL,
        expiration_date TIMESTAMPTZ NOT NULL,
        strike_price NUMERIC(15,2) NOT NULL,
        option_right VARCHAR(4) NOT NULL,
        multiplier INTEGER DEFAULT 100,
        style VARCHAR(10) DEFAULT 'american',
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'options_contracts');

      await exec(`CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        instrument_id INTEGER NOT NULL,
        side VARCHAR(4) NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        quantity NUMERIC(20,8) NOT NULL,
        limit_price NUMERIC(15,6),
        stop_price NUMERIC(15,6),
        tif VARCHAR(10) DEFAULT 'GTC',
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        filled_qty NUMERIC(20,8) DEFAULT '0',
        avg_fill_price NUMERIC(15,6),
        created_by VARCHAR(42) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'orders');

      await exec(`CREATE TABLE IF NOT EXISTS organizer_certifications (
        id SERIAL PRIMARY KEY,
        organizer_address VARCHAR(42) NOT NULL,
        certification_level VARCHAR(50),
        certified_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'organizer_certifications');

      await exec(`CREATE TABLE IF NOT EXISTS organizer_training_progress (
        id SERIAL PRIMARY KEY,
        organizer_address VARCHAR(42) NOT NULL,
        module_id VARCHAR(100),
        completed BOOLEAN DEFAULT false,
        score INTEGER,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'organizer_training_progress');

      await exec(`CREATE TABLE IF NOT EXISTS participation_actions (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        action_type VARCHAR(100),
        action_data JSONB,
        points_earned INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'participation_actions');

      await exec(`CREATE TABLE IF NOT EXISTS participation_credits (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        credit_type VARCHAR(100),
        amount NUMERIC(18,8) DEFAULT 0,
        reason VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'participation_credits');

      await exec(`CREATE TABLE IF NOT EXISTS participation_interest (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        interest_type VARCHAR(100),
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'participation_interest');

      await exec(`CREATE TABLE IF NOT EXISTS partner_auth (
        id SERIAL PRIMARY KEY,
        partner_id VARCHAR(100) NOT NULL,
        api_key_hash VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'partner_auth');

      await exec(`CREATE TABLE IF NOT EXISTS partner_deal_submissions (
        id SERIAL PRIMARY KEY,
        partner_id VARCHAR(100),
        deal_name VARCHAR(255),
        deal_type VARCHAR(100),
        amount NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'pending',
        submission_data JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'partner_deal_submissions');

      await exec(`CREATE TABLE IF NOT EXISTS partner_portal_config (
        id SERIAL PRIMARY KEY,
        partner_id VARCHAR(100),
        config_key VARCHAR(100),
        config_value TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'partner_portal_config');

      await exec(`CREATE TABLE IF NOT EXISTS payees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        name VARCHAR(255) NOT NULL,
        payee_type VARCHAR(20) NOT NULL,
        ach_routing VARCHAR(9),
        ach_account VARCHAR(20),
        wallet_payee_address VARCHAR(42),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'payees');

      await exec(`CREATE TABLE IF NOT EXISTS payout_state_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_id TEXT NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        changed_by UUID NOT NULL,
        proposal_id UUID,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'payout_state_history');

      await exec(`CREATE TABLE IF NOT EXISTS performance_snapshots (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        snapshot_date TIMESTAMPTZ NOT NULL,
        nav NUMERIC(15,2) NOT NULL,
        contributions NUMERIC(15,2) DEFAULT '0',
        withdrawals NUMERIC(15,2) DEFAULT '0',
        return_amount NUMERIC(15,2),
        return_percent NUMERIC(8,4),
        volatility NUMERIC(8,4),
        sharpe_ratio NUMERIC(8,4),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'performance_snapshots');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_asset_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID NOT NULL,
        record_date TIMESTAMPTZ NOT NULL,
        occupancy_rate NUMERIC(5,2),
        gross_rent NUMERIC(10,2),
        operating_expenses NUMERIC(10,2),
        net_operating_income NUMERIC(10,2),
        cap_rate NUMERIC(5,2),
        current_valuation NUMERIC(14,2),
        reserve_balance NUMERIC(14,2),
        debt_service_payment NUMERIC(10,2),
        maintenance_costs NUMERIC(10,2),
        vacancy_loss NUMERIC(10,2),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_asset_metrics');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_audit_trail (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(50) NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        spv_id UUID,
        investor_id UUID,
        entity_type TEXT,
        entity_id TEXT,
        amount NUMERIC(14,2),
        description TEXT NOT NULL,
        before_state JSONB,
        after_state JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_audit_trail');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        record_date TIMESTAMPTZ NOT NULL,
        local_cap_rate NUMERIC(5,2),
        treasury_yield_10yr NUMERIC(5,2),
        sp500_return NUMERIC(7,2),
        pilot_return NUMERIC(7,2),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_benchmarks');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_capital_calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        call_number INTEGER NOT NULL,
        total_amount NUMERIC(14,2) NOT NULL,
        funded_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        purpose TEXT NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        issued_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_capital_calls');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_contributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        spv_id UUID,
        amount NUMERIC(14,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pledged' NOT NULL,
        capital_call_id UUID,
        payment_method TEXT,
        reference_number TEXT,
        received_at TIMESTAMPTZ,
        confirmed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_contributions');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        gross_revenue NUMERIC(14,2) NOT NULL,
        operating_expenses NUMERIC(14,2) NOT NULL,
        net_income NUMERIC(14,2) NOT NULL,
        distribution_amount NUMERIC(14,2) NOT NULL,
        reserve_amount NUMERIC(14,2) NOT NULL,
        growth_amount NUMERIC(14,2) NOT NULL,
        operating_buffer_amount NUMERIC(14,2) NOT NULL,
        distribution_type VARCHAR(50) DEFAULT 'cash_flow' NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        approved_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_distributions');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        title TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_by TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_documents');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_expansion_gate (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        check_date TIMESTAMPTZ NOT NULL,
        occupancy_above_90 BOOLEAN DEFAULT false NOT NULL,
        reserves_fully_funded BOOLEAN DEFAULT false NOT NULL,
        consecutive_positive_months INTEGER DEFAULT 0 NOT NULL,
        investor_satisfaction_score NUMERIC(5,2),
        total_aum NUMERIC(14,2),
        is_ready_for_expansion BOOLEAN DEFAULT false NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_expansion_gate');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_investor_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        distribution_id UUID NOT NULL,
        investor_id UUID NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        pro_rata_share NUMERIC(8,6) NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        paid_at TIMESTAMPTZ,
        payment_method TEXT,
        reference_number TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_investor_distributions');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_investors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        status VARCHAR(50) DEFAULT 'invited' NOT NULL,
        commitment_amount NUMERIC(14,2) NOT NULL,
        funded_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
        pro_rata_share NUMERIC(8,6),
        accreditation_verified BOOLEAN DEFAULT false NOT NULL,
        kyc_completed BOOLEAN DEFAULT false NOT NULL,
        password_hash TEXT,
        last_login_at TIMESTAMPTZ,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_investors');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID,
        notification_type VARCHAR(50) NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        email_sent BOOLEAN DEFAULT false NOT NULL,
        email_sent_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_notifications');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        report_type VARCHAR(50) NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        data JSONB NOT NULL,
        generated_by TEXT NOT NULL,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_reports');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_spvs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        asset_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'formation' NOT NULL,
        target_purchase_price NUMERIC(14,2) NOT NULL,
        equity_allocated NUMERIC(14,2) NOT NULL,
        debt_amount NUMERIC(14,2) DEFAULT 0,
        current_valuation NUMERIC(14,2),
        occupancy_rate NUMERIC(5,2),
        target_yield NUMERIC(5,2),
        target_appreciation NUMERIC(5,2),
        monthly_net_cash_flow NUMERIC(10,2),
        unit_count INTEGER,
        location TEXT,
        market_type TEXT,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_spvs');

      await exec(`CREATE TABLE IF NOT EXISTS pilot_treasury_buckets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spv_id UUID,
        bucket_name TEXT NOT NULL,
        allocation_percent NUMERIC(5,2) NOT NULL,
        current_balance NUMERIC(14,2) DEFAULT 0 NOT NULL,
        min_reserve NUMERIC(14,2) DEFAULT 0 NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'pilot_treasury_buckets');

      await exec(`CREATE TABLE IF NOT EXISTS portal_investors (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        investor_name VARCHAR(255),
        investor_type VARCHAR(100),
        accreditation_status VARCHAR(50),
        kyc_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'portal_investors');

      await exec(`CREATE TABLE IF NOT EXISTS portfolio_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        portfolio_capital_usd NUMERIC(18,2) DEFAULT 10000 NOT NULL,
        risk_fraction_bps INTEGER DEFAULT 50 NOT NULL,
        max_concurrent_trades INTEGER DEFAULT 5 NOT NULL,
        max_per_asset_exposure_bps INTEGER DEFAULT 2000 NOT NULL,
        drawdown_brake_bps INTEGER DEFAULT 500 NOT NULL,
        system_volatility_tier VARCHAR(20) DEFAULT 'NORMAL' NOT NULL,
        policy_mode VARCHAR(20) DEFAULT 'BOOTSTRAP' NOT NULL,
        global_size_multiplier NUMERIC(5,3) DEFAULT 1.000 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'portfolio_state');

      await exec(`CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        instrument_id INTEGER NOT NULL,
        quantity NUMERIC(20,8) NOT NULL,
        avg_cost NUMERIC(15,6),
        realized_pnl NUMERIC(15,2) DEFAULT '0',
        unrealized_pnl NUMERIC(15,2) DEFAULT '0',
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'positions');

      await exec(`CREATE TABLE IF NOT EXISTS prop_context_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cache_key VARCHAR(500) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )`, 'prop_context_cache');

      await exec(`CREATE TABLE IF NOT EXISTS prop_geo_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_key VARCHAR(500) NOT NULL,
        lat NUMERIC(10,7) NOT NULL,
        lon NUMERIC(10,7) NOT NULL,
        address_normalized VARCHAR(500),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        county VARCHAR(100),
        fips VARCHAR(15),
        census_tract VARCHAR(20),
        amenity_scores JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )`, 'prop_geo_cache');

      await exec(`CREATE TABLE IF NOT EXISTS prop_provider_calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID,
        provider VARCHAR(50) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        status_code INTEGER,
        latency_ms INTEGER,
        cached BOOLEAN DEFAULT false,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'prop_provider_calls');

      await exec(`CREATE TABLE IF NOT EXISTS quests (
        id SERIAL PRIMARY KEY,
        quest_id VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        xp_reward INTEGER DEFAULT 0,
        axm_reward NUMERIC(28,8) DEFAULT 0,
        quest_type VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'quests');

      await exec(`CREATE TABLE IF NOT EXISTS referral_attributions (
        id SERIAL PRIMARY KEY,
        referred_address VARCHAR(42) NOT NULL,
        referrer_address VARCHAR(42) NOT NULL,
        referral_code VARCHAR(50),
        attributed_at TIMESTAMPTZ DEFAULT now()
      )`, 'referral_attributions');

      await exec(`CREATE TABLE IF NOT EXISTS referral_reward_claims (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        reward_type VARCHAR(50),
        reward_amount NUMERIC(28,8),
        transaction_hash VARCHAR(66),
        claimed_at TIMESTAMPTZ DEFAULT now()
      )`, 'referral_reward_claims');

      await exec(`CREATE TABLE IF NOT EXISTS reits_metadata (
        id SERIAL PRIMARY KEY,
        instrument_id INTEGER NOT NULL,
        payout_frequency VARCHAR(20),
        drip_available BOOLEAN DEFAULT true,
        documents JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'reits_metadata');

      await exec(`CREATE TABLE IF NOT EXISTS savings_account_settings (
        id SERIAL PRIMARY KEY,
        savings_account_id INTEGER NOT NULL,
        round_up_enabled BOOLEAN DEFAULT false NOT NULL,
        auto_transfer_enabled BOOLEAN DEFAULT false NOT NULL,
        auto_transfer_amount NUMERIC(18,2),
        auto_transfer_day INTEGER,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'savings_account_settings');

      await exec(`CREATE TABLE IF NOT EXISTS savings_accounts (
        id SERIAL PRIMARY KEY,
        account_number VARCHAR(20),
        user_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        apy NUMERIC(18,2) NOT NULL,
        principal NUMERIC(18,2),
        balance NUMERIC(18,2) NOT NULL,
        accrued_interest NUMERIC(18,2) DEFAULT '0' NOT NULL,
        term_months INTEGER,
        maturity_date TIMESTAMPTZ,
        early_withdrawal_penalty_rate NUMERIC(18,2),
        last_accrued_at TIMESTAMPTZ,
        metadata JSONB,
        opened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'savings_accounts');

      await exec(`CREATE TABLE IF NOT EXISTS savings_transactions (
        id SERIAL PRIMARY KEY,
        savings_account_id INTEGER NOT NULL,
        tx_type TEXT NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        balance_after NUMERIC(18,2) NOT NULL,
        tx_hash VARCHAR(66),
        source VARCHAR(20),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'savings_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS scheduled_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        wallet_address VARCHAR(42) NOT NULL,
        from_account_type VARCHAR(20) NOT NULL,
        from_account_id INTEGER NOT NULL,
        to_payee_id INTEGER,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'SWF',
        frequency VARCHAR(50) NOT NULL,
        next_run_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'scheduled_payments');

      await exec(`CREATE TABLE IF NOT EXISTS secondary_market_listings (
        id SERIAL PRIMARY KEY,
        listing_id VARCHAR(100) NOT NULL,
        seller_address VARCHAR(42) NOT NULL,
        token_id VARCHAR(100),
        token_type VARCHAR(50),
        price_usd NUMERIC(18,2),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'secondary_market_listings');

      await exec(`CREATE TABLE IF NOT EXISTS social_mission_progress (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        mission_id VARCHAR(100),
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'social_mission_progress');

      await exec(`CREATE TABLE IF NOT EXISTS steward_applications (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(100) NOT NULL,
        applicant_address VARCHAR(42) NOT NULL,
        applicant_name VARCHAR(255),
        email VARCHAR(255),
        experience TEXT,
        status VARCHAR(50) DEFAULT 'submitted',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'steward_applications');

      await exec(`CREATE TABLE IF NOT EXISTS steward_cohorts (
        id SERIAL PRIMARY KEY,
        cohort_id VARCHAR(100) NOT NULL,
        cohort_name VARCHAR(255),
        start_date DATE,
        end_date DATE,
        max_members INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'steward_cohorts');

      await exec(`CREATE TABLE IF NOT EXISTS steward_covenants (
        id SERIAL PRIMARY KEY,
        covenant_id VARCHAR(100) NOT NULL,
        steward_address VARCHAR(42) NOT NULL,
        covenant_type VARCHAR(100),
        signed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'steward_covenants');

      await exec(`CREATE TABLE IF NOT EXISTS steward_interest_signups (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        wallet_address VARCHAR(42),
        interest_type VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'steward_interest_signups');

      await exec(`CREATE TABLE IF NOT EXISTS steward_reviews (
        id SERIAL PRIMARY KEY,
        steward_address VARCHAR(42) NOT NULL,
        reviewer_address VARCHAR(42),
        rating INTEGER,
        review_text TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'steward_reviews');

      await exec(`CREATE TABLE IF NOT EXISTS subscription_entitlements (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        entitlement_type VARCHAR(100),
        granted_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ
      )`, 'subscription_entitlements');

      await exec(`CREATE TABLE IF NOT EXISTS system_audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'system_audit_logs');

      await exec(`CREATE TABLE IF NOT EXISTS token_holder_proposals (
        id SERIAL PRIMARY KEY,
        proposal_id VARCHAR(100) NOT NULL,
        proposer_address VARCHAR(42) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        proposal_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        votes_for NUMERIC(28,8) DEFAULT 0,
        votes_against NUMERIC(28,8) DEFAULT 0,
        voting_ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'token_holder_proposals');

      await exec(`CREATE TABLE IF NOT EXISTS training_enrollments (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        course_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'enrolled',
        progress INTEGER DEFAULT 0,
        enrolled_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ
      )`, 'training_enrollments');

      await exec(`CREATE TABLE IF NOT EXISTS transaction_reversals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_transaction_id TEXT NOT NULL,
        reversal_transaction_id TEXT NOT NULL,
        created_by UUID NOT NULL,
        proposal_id UUID,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'transaction_reversals');

      await exec(`CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        from_account_type VARCHAR(20) NOT NULL,
        from_account_id INTEGER NOT NULL,
        to_account_type VARCHAR(20) NOT NULL,
        to_account_id INTEGER NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'SWF',
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        idempotency_key VARCHAR(100),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        settled_at TIMESTAMPTZ
      )`, 'transfers');

      await exec(`CREATE TABLE IF NOT EXISTS treasuries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        purpose TEXT,
        policy_json JSONB DEFAULT '{}',
        total_balance_axusd NUMERIC(28,8) DEFAULT '0',
        created_by INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'treasuries');

      await exec(`CREATE TABLE IF NOT EXISTS treasury_transactions (
        id SERIAL PRIMARY KEY,
        treasury_id INTEGER NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        amount_axusd NUMERIC(28,8) NOT NULL,
        from_address VARCHAR(42),
        to_address VARCHAR(42),
        tx_hash VARCHAR(66),
        memo TEXT,
        proposal_id INTEGER,
        pool_id INTEGER,
        executed_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'treasury_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS user_investing_settings (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL,
        auto_invest JSONB,
        risk_profile VARCHAR(20),
        tax_lot_method VARCHAR(20) DEFAULT 'FIFO',
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'user_investing_settings');

      await exec(`CREATE TABLE IF NOT EXISTS user_quests (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        quest_id INTEGER,
        status VARCHAR(50) DEFAULT 'in_progress',
        progress INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'user_quests');

      await exec(`CREATE TABLE IF NOT EXISTS user_roles (
        user_id UUID NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_by_admin_id UUID
      )`, 'user_roles');

      await exec(`CREATE TABLE IF NOT EXISTS user_xp_levels (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        xp_total INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'user_xp_levels');

      await exec(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )`, 'users');

      await exec(`CREATE TABLE IF NOT EXISTS weekly_digest_subscriptions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        wallet_address VARCHAR(42),
        is_subscribed BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'weekly_digest_subscriptions');

      await exec(`CREATE TABLE IF NOT EXISTS workbook_cases (
        id SERIAL PRIMARY KEY,
        case_id VARCHAR(100) NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        case_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'workbook_cases');

      await exec(`CREATE TABLE IF NOT EXISTS workbook_collaborators (
        id SERIAL PRIMARY KEY,
        workbook_id INTEGER,
        collaborator_address VARCHAR(42) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        added_at TIMESTAMPTZ DEFAULT now()
      )`, 'workbook_collaborators');

      await exec(`CREATE TABLE IF NOT EXISTS workbook_leads (
        id SERIAL PRIMARY KEY,
        workbook_id INTEGER,
        lead_name VARCHAR(255),
        lead_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'workbook_leads');

      await exec(`CREATE TABLE IF NOT EXISTS workbook_notes (
        id SERIAL PRIMARY KEY,
        workbook_id INTEGER,
        note_text TEXT,
        author_address VARCHAR(42),
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'workbook_notes');

      await exec(`CREATE TABLE IF NOT EXISTS workbook_title_chain (
        id SERIAL PRIMARY KEY,
        workbook_id INTEGER,
        title_document_cid VARCHAR(100),
        chain_position INTEGER,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )`, 'workbook_title_chain');

      await exec(`CREATE TABLE IF NOT EXISTS yield_vault_positions (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        vault_address VARCHAR(42) NOT NULL,
        deposited_amount NUMERIC(28,8),
        shares_held NUMERIC(28,8),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`, 'yield_vault_positions');

      // ── UNIT BANKING ──────────────────────────────────────────────────────────

      await exec(enumSafe('unit_application_status', ['Pending','PendingReview','AwaitingDocuments','Approved','Denied','Canceled']), 'enum unit_application_status');
      await exec(enumSafe('unit_account_type', ['member','susu_pool']), 'enum unit_account_type');
      await exec(enumSafe('unit_payment_type', ['book','ach_debit','ach_credit','wire']), 'enum unit_payment_type');
      await exec(enumSafe('unit_payment_status', ['Pending','Sent','Clearing','Returned','Rejected','Canceled','Cleared']), 'enum unit_payment_status');
      await exec(enumSafe('unit_card_type', ['virtual','physical']), 'enum unit_card_type');
      await exec(enumSafe('unit_card_status', ['Active','Inactive','Stolen','Lost','Frozen','ClosedByCustomer','SuspectedFraud']), 'enum unit_card_status');

      await exec(`CREATE TABLE IF NOT EXISTS unit_customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL UNIQUE,
        unit_customer_id VARCHAR(100),
        unit_application_id VARCHAR(100),
        application_status unit_application_status DEFAULT 'Pending',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(30),
        date_of_birth VARCHAR(10),
        ssn_last_four VARCHAR(4),
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(2),
        address_postal_code VARCHAR(10),
        address_country VARCHAR(2) DEFAULT 'US',
        is_approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMPTZ,
        denied_at TIMESTAMPTZ,
        denial_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_customers');

      await exec(`CREATE TABLE IF NOT EXISTS unit_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        unit_customer_id VARCHAR(100) NOT NULL,
        unit_account_id VARCHAR(100) NOT NULL UNIQUE,
        account_type unit_account_type DEFAULT 'member',
        susu_group_id UUID,
        name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Open',
        balance_cents INTEGER DEFAULT 0,
        hold_cents INTEGER DEFAULT 0,
        available_cents INTEGER DEFAULT 0,
        routing_number VARCHAR(9),
        account_number VARCHAR(20),
        currency VARCHAR(3) DEFAULT 'USD',
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_accounts');

      await exec(`CREATE TABLE IF NOT EXISTS unit_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        unit_payment_id VARCHAR(100),
        idempotency_key VARCHAR(100) UNIQUE,
        payment_type unit_payment_type NOT NULL,
        status unit_payment_status DEFAULT 'Pending',
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        description TEXT,
        purpose VARCHAR(100),
        from_account_id VARCHAR(100),
        to_account_id VARCHAR(100),
        susu_group_id UUID,
        settled_at TIMESTAMPTZ,
        returned_at TIMESTAMPTZ,
        return_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_payments');

      await exec(`CREATE TABLE IF NOT EXISTS unit_recurring_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        unit_recurring_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        description TEXT,
        purpose VARCHAR(100),
        from_account_id VARCHAR(100),
        to_account_id VARCHAR(100),
        susu_group_id UUID,
        frequency VARCHAR(50),
        next_payment_date VARCHAR(10),
        total_payments_count INTEGER,
        remaining_payments_count INTEGER,
        canceled_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_recurring_payments');

      await exec(`CREATE TABLE IF NOT EXISTS unit_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        unit_card_id VARCHAR(100) NOT NULL UNIQUE,
        unit_account_id VARCHAR(100) NOT NULL,
        card_type unit_card_type DEFAULT 'virtual',
        status unit_card_status DEFAULT 'Active',
        last_four VARCHAR(4),
        expiration_date VARCHAR(7),
        brand VARCHAR(20),
        shipping_address JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_cards');

      await exec(`CREATE TABLE IF NOT EXISTS unit_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_event_id VARCHAR(100),
        event_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        resource_type VARCHAR(100),
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT false,
        processed_at TIMESTAMPTZ,
        processing_error TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'unit_webhook_events');

      await exec(`CREATE INDEX IF NOT EXISTS idx_unit_customers_wallet ON unit_customers(wallet_address)`, 'idx_unit_customers_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_unit_accounts_wallet ON unit_accounts(wallet_address)`, 'idx_unit_accounts_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_unit_payments_wallet ON unit_payments(wallet_address)`, 'idx_unit_payments_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_unit_payments_status ON unit_payments(status)`, 'idx_unit_payments_status');
      await exec(`CREATE INDEX IF NOT EXISTS idx_unit_webhook_processed ON unit_webhook_events(processed)`, 'idx_unit_webhook_processed');

      // ── BITGO CUSTODY ─────────────────────────────────────────────────────────

      await exec(enumSafe('bitgo_wallet_coin', ['eth','teth','arbitrum','tarbitrum','usdc','axm','axusd']), 'enum bitgo_wallet_coin');
      await exec(enumSafe('bitgo_tx_direction', ['send','receive']), 'enum bitgo_tx_direction');
      await exec(enumSafe('bitgo_tx_state', ['signed','unconfirmed','confirmed','rejected','pendingApproval','removed','failed']), 'enum bitgo_tx_state');
      await exec(enumSafe('bitgo_policy_type', ['spending_limit','address_whitelist','velocity_limit','require_approval']), 'enum bitgo_policy_type');

      await exec(`CREATE TABLE IF NOT EXISTS bitgo_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        bitgo_wallet_id VARCHAR(100) NOT NULL UNIQUE,
        bitgo_enterprise_id VARCHAR(100),
        coin bitgo_wallet_coin DEFAULT 'arbitrum',
        label VARCHAR(255),
        receive_address VARCHAR(100),
        confirmed_balance_str VARCHAR(50) DEFAULT '0',
        spendable_balance_str VARCHAR(50) DEFAULT '0',
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        last_synced_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bitgo_wallets');

      await exec(`CREATE TABLE IF NOT EXISTS bitgo_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        bitgo_tx_id VARCHAR(200),
        bitgo_wallet_id VARCHAR(100) NOT NULL,
        coin VARCHAR(50),
        direction bitgo_tx_direction NOT NULL,
        state bitgo_tx_state DEFAULT 'unconfirmed',
        amount_str VARCHAR(50),
        fee_str VARCHAR(50),
        from_address VARCHAR(100),
        to_address VARCHAR(100),
        tx_hash VARCHAR(200),
        confirmations BIGINT DEFAULT 0,
        block_height BIGINT,
        label TEXT,
        metadata JSONB,
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bitgo_transactions');

      await exec(`CREATE TABLE IF NOT EXISTS bitgo_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bitgo_webhook_id VARCHAR(100),
        event_type VARCHAR(100) NOT NULL,
        coin VARCHAR(50),
        wallet_id VARCHAR(100),
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT false,
        processed_at TIMESTAMPTZ,
        processing_error TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bitgo_webhooks');

      await exec(`CREATE TABLE IF NOT EXISTS bitgo_custody_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        bitgo_wallet_id VARCHAR(100) NOT NULL,
        bitgo_policy_id VARCHAR(100),
        policy_type bitgo_policy_type NOT NULL,
        label VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        config JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bitgo_custody_policies');

      await exec(`CREATE TABLE IF NOT EXISTS bitgo_staking_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        bitgo_wallet_id VARCHAR(100) NOT NULL,
        bitgo_staking_id VARCHAR(100),
        coin VARCHAR(50) NOT NULL,
        amount_str VARCHAR(50) NOT NULL,
        validator_address VARCHAR(200),
        status VARCHAR(50) DEFAULT 'active',
        rewards_str VARCHAR(50) DEFAULT '0',
        unstaking_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bitgo_staking_positions');

      await exec(`CREATE INDEX IF NOT EXISTS idx_bitgo_wallets_wallet ON bitgo_wallets(wallet_address)`, 'idx_bitgo_wallets_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_bitgo_txs_wallet ON bitgo_transactions(wallet_address)`, 'idx_bitgo_txs_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_bitgo_txs_state ON bitgo_transactions(state)`, 'idx_bitgo_txs_state');
      await exec(`CREATE INDEX IF NOT EXISTS idx_bitgo_webhooks_processed ON bitgo_webhooks(processed)`, 'idx_bitgo_webhooks_processed');

      // ── BRIDGE (FIAT <-> CRYPTO) ───────────────────────────────────────────────

      await exec(enumSafe('bridge_direction', ['fiat_to_crypto','crypto_to_fiat']), 'enum bridge_direction');
      await exec(enumSafe('bridge_status', ['initiated','ach_pending','ach_settled','crypto_pending','completed','failed','canceled']), 'enum bridge_status');
      await exec(enumSafe('bridge_crypto_asset', ['AXM','AXUSD','ETH','USDC']), 'enum bridge_crypto_asset');

      await exec(`CREATE TABLE IF NOT EXISTS bridge_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL,
        direction bridge_direction NOT NULL,
        status bridge_status NOT NULL DEFAULT 'initiated',
        fiat_amount_cents INTEGER NOT NULL,
        fiat_currency VARCHAR(3) DEFAULT 'USD',
        crypto_asset bridge_crypto_asset NOT NULL,
        crypto_amount_str VARCHAR(50),
        exchange_rate_str VARCHAR(50),
        fx_snapshot_id UUID,
        fee_cents INTEGER DEFAULT 0,
        estimated_settlement_minutes INTEGER,
        unit_account_id VARCHAR(100),
        unit_payment_id VARCHAR(100),
        bitgo_wallet_id VARCHAR(100),
        bitgo_tx_id VARCHAR(200),
        error_message TEXT,
        ach_settled_at TIMESTAMPTZ,
        crypto_confirmed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bridge_transfers');

      await exec(`CREATE TABLE IF NOT EXISTS bridge_fx_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bridge_transfer_id UUID,
        fiat_currency VARCHAR(3) DEFAULT 'USD',
        crypto_asset bridge_crypto_asset NOT NULL,
        rate_str VARCHAR(50) NOT NULL,
        bid_rate_str VARCHAR(50),
        ask_rate_str VARCHAR(50),
        spread_bps INTEGER,
        source VARCHAR(100) DEFAULT 'coingecko',
        valid_until TIMESTAMPTZ,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`, 'bridge_fx_snapshots');

      await exec(`CREATE INDEX IF NOT EXISTS idx_bridge_transfers_wallet ON bridge_transfers(wallet_address)`, 'idx_bridge_transfers_wallet');
      await exec(`CREATE INDEX IF NOT EXISTS idx_bridge_transfers_status ON bridge_transfers(status)`, 'idx_bridge_transfers_status');
      await exec(`CREATE INDEX IF NOT EXISTS idx_bridge_fx_transfer ON bridge_fx_snapshots(bridge_transfer_id)`, 'idx_bridge_fx_transfer');

      // ═══════════════════════════════════════════
      //  COST INTELLIGENCE ENGINE (Layer 6)
      // ═══════════════════════════════════════════

      await exec(`CREATE TABLE IF NOT EXISTS regional_cost_modifiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_code VARCHAR(20) NOT NULL,
        region_name VARCHAR(100) NOT NULL,
        labor_factor NUMERIC NOT NULL DEFAULT 1.0000,
        material_factor NUMERIC NOT NULL DEFAULT 1.0000,
        overall_factor NUMERIC NOT NULL DEFAULT 1.0000,
        metro_areas TEXT[],
        states TEXT[],
        source VARCHAR(80) DEFAULT 'RSMeans City Cost Index',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table regional_cost_modifiers');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimate_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_name VARCHAR(100) NOT NULL,
        template_slug VARCHAR(60) NOT NULL,
        description TEXT,
        property_type VARCHAR(20) NOT NULL DEFAULT 'both',
        rehab_category VARCHAR(40) NOT NULL,
        scope_items_json JSONB NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimate_templates');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID,
        property_id UUID,
        inspection_session_id UUID,
        estimate_name VARCHAR(255) NOT NULL,
        property_type VARCHAR(20) NOT NULL DEFAULT 'multifamily',
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        region_code VARCHAR(20),
        total_units INTEGER NOT NULL DEFAULT 1,
        avg_unit_sqft NUMERIC,
        total_sqft NUMERIC,
        contingency_pct NUMERIC NOT NULL DEFAULT 0.1000,
        soft_cost_pct NUMERIC NOT NULL DEFAULT 0.05,
        labor_adj_pct NUMERIC NOT NULL DEFAULT 0.0000,
        material_adj_pct NUMERIC NOT NULL DEFAULT 0.0000,
        provider VARCHAR(40) NOT NULL DEFAULT 'craftsman_local',
        arv_estimate NUMERIC,
        hard_cost_total NUMERIC,
        soft_cost_total NUMERIC,
        contingency_total NUMERIC,
        grand_total NUMERIC,
        per_unit_cost NUMERIC,
        per_sqft_cost NUMERIC,
        cost_low NUMERIC,
        cost_high NUMERIC,
        confidence NUMERIC,
        version INTEGER NOT NULL DEFAULT 1,
        generated_at TIMESTAMP,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimates');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimate_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estimate_id UUID NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        snapshot_json JSONB NOT NULL,
        triggered_by VARCHAR(60),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimate_versions');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimate_scope_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estimate_id UUID NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
        area_label VARCHAR(100),
        trade VARCHAR(60) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit VARCHAR(30) NOT NULL DEFAULT 'each',
        condition VARCHAR(30),
        severity VARCHAR(20),
        repair_or_replace VARCHAR(20) NOT NULL DEFAULT 'replace',
        scope_note TEXT,
        photo_refs TEXT[],
        voice_note_ref VARCHAR(255),
        room_observation TEXT,
        applies_to_all_units BOOLEAN NOT NULL DEFAULT FALSE,
        unit_labels TEXT[],
        mapped_benchmark_id UUID,
        mapped_provider VARCHAR(40),
        mapping_confidence NUMERIC,
        mapping_method VARCHAR(30) DEFAULT 'auto',
        regional_factor NUMERIC,
        labor_factor NUMERIC,
        material_factor NUMERIC,
        waste_factor NUMERIC NOT NULL DEFAULT 0.05,
        contingency_factor NUMERIC NOT NULL DEFAULT 0.10,
        cv_inference_ready BOOLEAN NOT NULL DEFAULT FALSE,
        cv_inference_ref VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimate_scope_items');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimate_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estimate_id UUID NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
        scope_item_id UUID REFERENCES cost_estimate_scope_items(id) ON DELETE SET NULL,
        trade VARCHAR(60) NOT NULL,
        description VARCHAR(255) NOT NULL,
        quantity NUMERIC NOT NULL,
        unit VARCHAR(30) NOT NULL,
        unit_material_cost NUMERIC,
        unit_labor_cost NUMERIC,
        unit_equipment_cost NUMERIC,
        unit_total_cost NUMERIC,
        subtotal_material NUMERIC,
        subtotal_labor NUMERIC,
        subtotal_equipment NUMERIC,
        subtotal_pre_adj NUMERIC,
        regional_factor_applied NUMERIC,
        labor_adj_applied NUMERIC,
        material_adj_applied NUMERIC,
        waste_total NUMERIC,
        line_total NUMERIC,
        cost_low NUMERIC,
        cost_high NUMERIC,
        confidence NUMERIC,
        provider VARCHAR(40),
        benchmark_id UUID,
        assumptions_json JSONB,
        is_contingency BOOLEAN NOT NULL DEFAULT FALSE,
        is_soft_cost BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimate_line_items');

      await exec(`CREATE TABLE IF NOT EXISTS cost_estimate_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estimate_id UUID NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
        deal_id UUID,
        property_type VARCHAR(20),
        region_code VARCHAR(20),
        provider_estimate NUMERIC,
        adjusted_estimate NUMERIC,
        contractor_bid NUMERIC,
        approved_budget NUMERIC,
        actual_cost NUMERIC,
        variance_bid NUMERIC,
        variance_bid_pct NUMERIC,
        variance_actual NUMERIC,
        variance_actual_pct NUMERIC,
        trade_variances_json JSONB,
        project_status VARCHAR(30) DEFAULT 'pending',
        geography VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table cost_estimate_benchmarks');

      await exec(`CREATE TABLE IF NOT EXISTS rehab_cost_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        system VARCHAR(60) NOT NULL,
        condition_level VARCHAR(30) NOT NULL,
        property_type VARCHAR(20) NOT NULL DEFAULT 'both',
        cost_unit VARCHAR(20) NOT NULL DEFAULT 'per_unit',
        cost_low NUMERIC NOT NULL,
        cost_mid NUMERIC NOT NULL,
        cost_high NUMERIC NOT NULL,
        region VARCHAR(30) NOT NULL DEFAULT 'national',
        source VARCHAR(80) NOT NULL DEFAULT 'Craftsman National Construction Estimator',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table rehab_cost_benchmarks');

      await exec(`CREATE TABLE IF NOT EXISTS re_rehab_scopes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        inspection_session_id UUID,
        scope_name VARCHAR(255) NOT NULL,
        line_items JSONB NOT NULL,
        package_mix JSONB,
        recommended_budget NUMERIC,
        confidence NUMERIC,
        generated_by VARCHAR(42),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table re_rehab_scopes');

      // Seed Craftsman NCE reference costs (57 rows) — idempotent
      await exec(`
        INSERT INTO rehab_cost_benchmarks (system, condition_level, property_type, cost_unit, cost_low, cost_mid, cost_high, region, source, notes)
        SELECT * FROM (VALUES
          ('appliances','full_replace','both','per_unit',2800,4200,6500,'national','Craftsman National Construction Estimator','Full suite — range, refrigerator, dishwasher, microwave, washer/dryer.'),
          ('appliances','light_rehab','both','per_unit',150,350,600,'national','Craftsman National Construction Estimator','Clean, service, minor repair.'),
          ('appliances','medium_rehab','both','per_unit',1200,2200,3500,'national','Craftsman National Construction Estimator','Replace 1-2 major appliances.'),
          ('bathroom','full_replace','both','per_unit',8500,13000,20000,'national','Craftsman National Construction Estimator','Full gut — tile, tub/shower, vanity, toilet, plumbing rough.'),
          ('bathroom','light_rehab','both','per_unit',1200,2200,3200,'national','Craftsman National Construction Estimator','Recaulk, fixtures, accessories, paint.'),
          ('bathroom','medium_rehab','both','per_unit',4000,6000,9500,'national','Craftsman National Construction Estimator','Vanity, toilet, tub surround, tile, paint.'),
          ('common_area','full_replace','multifamily','per_unit',8000,16000,30000,'national','Craftsman National Construction Estimator','Full common area renovation.'),
          ('common_area','light_rehab','multifamily','per_unit',500,1000,2000,'national','Craftsman National Construction Estimator','Paint corridors, touch up, cleaning.'),
          ('common_area','medium_rehab','multifamily','per_unit',2000,4500,8000,'national','Craftsman National Construction Estimator','Flooring, lighting, mailboxes, paint.'),
          ('doors','full_replace','both','per_door',750,1200,2200,'national','Craftsman National Construction Estimator','Exterior door replace with frame and hardware.'),
          ('doors','light_rehab','both','per_door',150,280,450,'national','Craftsman National Construction Estimator','Hardware replace, paint, adjustment.'),
          ('doors','medium_rehab','both','per_door',280,450,700,'national','Craftsman National Construction Estimator','Interior door replace with hardware and trim.'),
          ('electrical','full_replace','both','per_unit',8000,14000,25000,'national','Craftsman National Construction Estimator','Full rewire — panel, all circuits, fixtures, code compliance.'),
          ('electrical','light_rehab','both','per_unit',400,900,1600,'national','Craftsman National Construction Estimator','Outlets, switches, fixtures, GFCI.'),
          ('electrical','medium_rehab','both','per_unit',2500,4500,7500,'national','Craftsman National Construction Estimator','Panel upgrade, circuit additions, smoke detectors.'),
          ('exterior','full_replace','both','per_sqft',6,10.5,16,'national','Craftsman National Construction Estimator','Full siding replace — vinyl, fiber cement.'),
          ('exterior','light_rehab','both','per_sqft',1.25,2,3,'national','Craftsman National Construction Estimator','Caulk, paint, minor repairs.'),
          ('exterior','medium_rehab','both','per_sqft',2.75,5,8,'national','Craftsman National Construction Estimator','Siding sections, soffit, fascia repair.'),
          ('flooring','full_replace','both','per_sqft',7,10.5,15,'national','Craftsman National Construction Estimator','Hardwood, porcelain tile, subfloor repair included.'),
          ('flooring','light_rehab','both','per_sqft',1.5,2.5,3.75,'national','Craftsman National Construction Estimator','Refinish hardwood, deep clean carpet, repair vinyl.'),
          ('flooring','medium_rehab','both','per_sqft',3.5,5,7,'national','Craftsman National Construction Estimator','LVP/LVT install, new carpet, laminate.'),
          ('foundation','full_replace','both','flat',15000,35000,75000,'national','Craftsman National Construction Estimator','Structural repair, pier and beam, underpinning.'),
          ('foundation','light_rehab','both','flat',500,1500,3500,'national','Craftsman National Construction Estimator','Crack injection, seal, drainage.'),
          ('foundation','medium_rehab','both','flat',3000,7000,15000,'national','Craftsman National Construction Estimator','Waterproofing, French drain, crawlspace encapsulation.'),
          ('garage','full_replace','sfr','flat',3000,7000,18000,'national','Craftsman National Construction Estimator','Structural repair, full conversion or rebuild.'),
          ('garage','light_rehab','sfr','flat',300,700,1200,'national','Craftsman National Construction Estimator','Clean, paint, minor repairs.'),
          ('garage','medium_rehab','sfr','flat',900,1800,3200,'national','Craftsman National Construction Estimator','Door replace, opener, epoxy floor.'),
          ('hvac','full_replace','both','per_unit',6000,9500,16000,'national','Craftsman National Construction Estimator','Full system replace — split system, ductwork repair.'),
          ('hvac','light_rehab','both','per_unit',350,700,1200,'national','Craftsman National Construction Estimator','Service, tune-up, filter, minor repairs.'),
          ('hvac','medium_rehab','both','per_unit',3000,5000,7500,'national','Craftsman National Construction Estimator','Replace condenser, air handler, or major component.'),
          ('kitchen','full_replace','both','per_unit',14000,20000,30000,'national','Craftsman National Construction Estimator','Full gut — cabinets, countertops, appliances, flooring, plumbing rough.'),
          ('kitchen','light_rehab','both','per_unit',2500,3500,4800,'national','Craftsman National Construction Estimator','Paint cabinets, hardware, caulk, minor repairs.'),
          ('kitchen','medium_rehab','both','per_unit',7500,10500,14500,'national','Craftsman National Construction Estimator','New cabinets, countertops, sink, basic appliances.'),
          ('landscaping','full_replace','both','flat',3500,8000,18000,'national','Craftsman National Construction Estimator','Full regrading, irrigation, landscaping design.'),
          ('landscaping','light_rehab','both','flat',300,700,1500,'national','Craftsman National Construction Estimator','Clean, mulch, mow.'),
          ('landscaping','medium_rehab','both','flat',1000,2500,5000,'national','Craftsman National Construction Estimator','Sod, beds, shrubs, irrigation repair.'),
          ('laundry_room','full_replace','multifamily','flat',5000,10000,20000,'national','Craftsman National Construction Estimator','New machines, room build-out, plumbing/electrical.'),
          ('laundry_room','light_rehab','multifamily','flat',200,500,900,'national','Craftsman National Construction Estimator','Machine service, dryer vent clean.'),
          ('laundry_room','medium_rehab','multifamily','flat',1500,2800,5000,'national','Craftsman National Construction Estimator','Machine replace, paint, flooring.'),
          ('other','full_replace','both','flat',5000,12000,25000,'national','Craftsman National Construction Estimator','Major unlisted scope — permits, engineering, contingency.'),
          ('other','light_rehab','both','flat',500,1000,2500,'national','Craftsman National Construction Estimator','General cleanup, haul-out, touch-up items.'),
          ('other','medium_rehab','both','flat',2000,4000,8000,'national','Craftsman National Construction Estimator','Miscellaneous scope items, permits, general conditions.'),
          ('paint','full_replace','both','per_sqft',2,3,4.5,'national','Craftsman National Construction Estimator','Interior + exterior paint, primer, texture repair.'),
          ('paint','light_rehab','both','per_sqft',0.6,0.9,1.25,'national','Craftsman National Construction Estimator','Touch up, patch, spot repaint.'),
          ('paint','medium_rehab','both','per_sqft',1,1.5,2,'national','Craftsman National Construction Estimator','Full interior repaint — walls, ceilings, trim.'),
          ('plumbing','full_replace','both','per_unit',8000,14000,22000,'national','Craftsman National Construction Estimator','Full rough-in — supply, drain, water heater, all fixtures.'),
          ('plumbing','light_rehab','both','per_unit',450,900,1600,'national','Craftsman National Construction Estimator','Fixture repairs, drain cleaning, minor leaks.'),
          ('plumbing','medium_rehab','both','per_unit',1800,3200,5500,'national','Craftsman National Construction Estimator','Fixture replace, water heater, supply lines.'),
          ('roof','full_replace','both','per_sqft',5,8,14,'national','Craftsman National Construction Estimator','Full reroof — tear off and replace.'),
          ('roof','light_rehab','both','per_sqft',0.5,1,2,'national','Craftsman National Construction Estimator','Patch, seal, flashing repair.'),
          ('roof','medium_rehab','both','per_sqft',2.5,4.5,7,'national','Craftsman National Construction Estimator','Partial shingle replace, section reroof.'),
          ('site_parking','full_replace','multifamily','flat',15000,35000,75000,'national','Craftsman National Construction Estimator','Full lot resurface, curbing, lighting.'),
          ('site_parking','light_rehab','both','flat',500,1200,2500,'national','Craftsman National Construction Estimator','Restripe, minor patch, clean.'),
          ('site_parking','medium_rehab','both','flat',3500,8000,16000,'national','Craftsman National Construction Estimator','Section repaving, drainage repair.'),
          ('windows','full_replace','both','per_window',550,850,1400,'national','Craftsman National Construction Estimator','Full window replace — impact or double-pane vinyl.'),
          ('windows','light_rehab','both','per_window',75,175,300,'national','Craftsman National Construction Estimator','Caulk, weather strip, hardware, repair.'),
          ('windows','medium_rehab','both','per_window',350,550,750,'national','Craftsman National Construction Estimator','Partial replace — vinyl double pane.')
        ) AS v(system, condition_level, property_type, cost_unit, cost_low, cost_mid, cost_high, region, source, notes)
        WHERE NOT EXISTS (SELECT 1 FROM rehab_cost_benchmarks LIMIT 1)
      `, 'seed rehab_cost_benchmarks');

      await exec(`
        INSERT INTO regional_cost_modifiers (region_code, region_name, labor_factor, material_factor, overall_factor, metro_areas, states)
        SELECT * FROM (VALUES
          ('SOUTH_ATL','Atlanta Metro',0.88,0.92,0.90,ARRAY['Atlanta','Marietta','Sandy Springs'],ARRAY['GA']),
          ('SOUTH_CLT','Charlotte Metro',0.86,0.90,0.88,ARRAY['Charlotte','Concord','Gastonia'],ARRAY['NC','SC']),
          ('SOUTH_HOU','Houston Metro',0.86,0.90,0.88,ARRAY['Houston','Sugar Land','The Woodlands'],ARRAY['TX']),
          ('SOUTH_DAL','Dallas Metro',0.88,0.92,0.90,ARRAY['Dallas','Fort Worth','Irving'],ARRAY['TX']),
          ('MID_CHI','Chicago Metro',1.02,1.08,1.05,ARRAY['Chicago','Naperville','Joliet'],ARRAY['IL']),
          ('NE_NYC','New York Metro',1.25,1.35,1.30,ARRAY['New York','Newark','Jersey City'],ARRAY['NY','NJ']),
          ('NATIONAL','National Average',1.00,1.00,1.00,ARRAY[]::text[],ARRAY[]::text[])
        ) AS v(region_code, region_name, labor_factor, material_factor, overall_factor, metro_areas, states)
        WHERE NOT EXISTS (SELECT 1 FROM regional_cost_modifiers LIMIT 1)
      `, 'seed regional_cost_modifiers');

      // ═══════════════════════════════════════════
      //  CONTRACT TRACKING TABLES
      // ═══════════════════════════════════════════

      await exec(`DO $$ BEGIN CREATE TYPE contract_domain AS ENUM ('field_intelligence','real_estate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum contract_domain');
      await exec(`DO $$ BEGIN CREATE TYPE contract_entity_type AS ENUM ('inspection_session','property','deal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum contract_entity_type');
      await exec(`DO $$ BEGIN CREATE TYPE contract_status AS ENUM ('draft','intake','under_review','approved','in_execution','completed','blocked','rejected','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum contract_status');
      await exec(`DO $$ BEGIN CREATE TYPE contract_actor_type AS ENUM ('admin','operator','system','investor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum contract_actor_type');
      await exec(`DO $$ BEGIN CREATE TYPE contract_event_type AS ENUM ('status_changed','approval_requested','approval_granted','approval_rejected','comment_added','assignment_changed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum contract_event_type');

      await exec(`CREATE TABLE IF NOT EXISTS contract_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id VARCHAR(255),
        domain contract_domain NOT NULL,
        entity_type contract_entity_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        owner_org_id VARCHAR(255),
        operator_id VARCHAR(255),
        current_status contract_status NOT NULL DEFAULT 'draft',
        current_substatus VARCHAR(120),
        current_status_reason_code VARCHAR(100),
        version INTEGER NOT NULL DEFAULT 1,
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table contract_entities');

      await exec(`CREATE INDEX IF NOT EXISTS contract_entities_domain_entity_idx ON contract_entities(domain, entity_type)`, 'index contract_entities_domain_entity_idx');
      await exec(`CREATE INDEX IF NOT EXISTS contract_entities_status_idx ON contract_entities(current_status)`, 'index contract_entities_status_idx');
      await exec(`CREATE INDEX IF NOT EXISTS contract_entities_external_idx ON contract_entities(external_id)`, 'index contract_entities_external_idx');

      await exec(`CREATE TABLE IF NOT EXISTS contract_adapter_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_entity_id UUID NOT NULL REFERENCES contract_entities(id),
        native_table VARCHAR(120) NOT NULL,
        native_entity_id VARCHAR(255) NOT NULL,
        native_status VARCHAR(120),
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table contract_adapter_links');

      await exec(`CREATE INDEX IF NOT EXISTS contract_adapter_links_entity_idx ON contract_adapter_links(contract_entity_id)`, 'index contract_adapter_links_entity_idx');
      await exec(`CREATE UNIQUE INDEX IF NOT EXISTS contract_adapter_links_native_idx ON contract_adapter_links(native_table, native_entity_id)`, 'index contract_adapter_links_native_idx');

      // ═══════════════════════════════════════════
      //  MISSING TABLE PATCH (production hardening)
      // ═══════════════════════════════════════════

      // -- Enums required by missing tables --
      await exec(`DO $$ BEGIN CREATE TYPE strategy_type AS ENUM ('light_turn','classic_value_add','heavy_reposition','systems_only_stabilization','premium_interior_upgrade','exterior_common_reposition'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum strategy_type');
      await exec(`DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('submitted','under_review','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'enum verification_status');

      // -- Matrix coordination --
      await exec(`CREATE TABLE IF NOT EXISTS matrix_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        matrix_room_id VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        configured BOOLEAN NOT NULL DEFAULT false,
        meta JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table matrix_rooms');

      await exec(`CREATE TABLE IF NOT EXISTS matrix_room_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL,
        user_ref VARCHAR(120) NOT NULL,
        role VARCHAR(40) NOT NULL DEFAULT 'member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table matrix_room_memberships');

      await exec(`CREATE TABLE IF NOT EXISTS matrix_event_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        event_type VARCHAR(80) NOT NULL,
        matrix_event_id VARCHAR(255),
        payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table matrix_event_links');

      // -- Proof of Execution / Verified Outcomes --
      await exec(`CREATE TABLE IF NOT EXISTS verified_project_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        status verification_status NOT NULL DEFAULT 'submitted',
        actual_rehab_cost NUMERIC NOT NULL,
        actual_timeline_days INTEGER NOT NULL,
        actual_sale_price NUMERIC,
        actual_rent NUMERIC,
        actual_dscr NUMERIC,
        actual_monthly_cash_flow NUMERIC,
        funding_path VARCHAR(60),
        capital_source_type VARCHAR(60),
        lender_path_chosen VARCHAR(120),
        refi_outcome VARCHAR(120),
        matrix_room_id VARCHAR(255),
        axm_reward_eligible BOOLEAN NOT NULL DEFAULT false,
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
      )`, 'table verified_project_outcomes');

      await exec(`CREATE TABLE IF NOT EXISTS verification_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_id UUID NOT NULL,
        reviewer VARCHAR(42) NOT NULL,
        decision VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table verification_reviews');

      await exec(`CREATE TABLE IF NOT EXISTS verified_data_rewards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_id UUID,
        session_id UUID,
        wallet_address VARCHAR(42) NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        reward_amount_axm NUMERIC,
        reward_ref VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table verified_data_rewards');

      await exec(`CREATE TABLE IF NOT EXISTS project_outcome_cost_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_id UUID NOT NULL,
        category VARCHAR(80) NOT NULL,
        line_item VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        invoice_ref VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table project_outcome_cost_items');

      await exec(`CREATE TABLE IF NOT EXISTS project_outcome_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_id UUID NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        source_tag VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table project_outcome_documents');

      // -- Prediction variance tracking --
      await exec(`CREATE TABLE IF NOT EXISTS prediction_actual_variances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID NOT NULL,
        scenario_id UUID,
        outcome_id UUID NOT NULL,
        metric_key VARCHAR(80) NOT NULL,
        predicted_value NUMERIC NOT NULL,
        actual_value NUMERIC NOT NULL,
        variance_value NUMERIC NOT NULL,
        variance_pct NUMERIC NOT NULL,
        interpretation TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table prediction_actual_variances');

      // -- Capital intelligence --
      await exec(`CREATE TABLE IF NOT EXISTS capital_intelligence_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id UUID,
        offering_id UUID,
        event_type VARCHAR(80) NOT NULL,
        capital_source_type VARCHAR(60),
        raise_velocity NUMERIC,
        minimum_capital_met BOOLEAN,
        investor_demand_score NUMERIC,
        lender_path_chosen VARCHAR(120),
        refi_outcome VARCHAR(120),
        payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table capital_intelligence_events');

      // -- Contract status history --
      await exec(`CREATE TABLE IF NOT EXISTS contract_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_entity_id UUID NOT NULL,
        status contract_status NOT NULL,
        substatus VARCHAR(120),
        status_reason_code VARCHAR(100),
        changed_by_actor_id VARCHAR(255) NOT NULL,
        changed_by_actor_type contract_actor_type NOT NULL,
        changed_by_display_name VARCHAR(255),
        changed_by_wallet VARCHAR(255),
        request_id VARCHAR(255) NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL,
        correlation_id VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table contract_status_history');

      // -- Market cost signals (requires strategy_type enum) --
      await exec(`CREATE TABLE IF NOT EXISTS market_cost_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zip VARCHAR(20),
        market VARCHAR(120),
        strategy_type strategy_type,
        source_layer VARCHAR(50) NOT NULL,
        capex_per_unit NUMERIC,
        confidence NUMERIC NOT NULL DEFAULT 0,
        sample_size INTEGER NOT NULL DEFAULT 0,
        payload JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table market_cost_signals');

      // -- Operator strategy intelligence --
      await exec(`CREATE TABLE IF NOT EXISTS operator_strategy_profiles (
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
      )`, 'table operator_strategy_profiles');

      await exec(`CREATE TABLE IF NOT EXISTS operator_strategy_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL,
        deal_id UUID,
        outcome_id UUID,
        capex_per_unit NUMERIC,
        rent_lift NUMERIC,
        noi_lift NUMERIC,
        stabilization_days INTEGER,
        confidence NUMERIC,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table operator_strategy_signals');

      // -- Network intelligence --
      await exec(`CREATE TABLE IF NOT EXISTS network_intelligence_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_date DATE NOT NULL,
        scope VARCHAR(80) NOT NULL DEFAULT 'global',
        seeded_baseline_weight NUMERIC DEFAULT 0.2,
        regional_benchmark_weight NUMERIC DEFAULT 0.2,
        verified_local_weight NUMERIC DEFAULT 0.2,
        operator_outcome_weight NUMERIC DEFAULT 0.2,
        capital_outcome_weight NUMERIC DEFAULT 0.2,
        aggregated_signals JSONB NOT NULL,
        confidence_score NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table network_intelligence_snapshots');

      // ─── AXIOM SECONDARY NETWORK V1 ───────────────────────────────────────────

      // Enums
      await exec(`DO $$ BEGIN CREATE TYPE sec_user_status AS ENUM ('active','suspended','pending_verification','deactivated'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_user_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_auth_provider AS ENUM ('siwe','email','auth0'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_auth_provider');
      await exec(`DO $$ BEGIN CREATE TYPE sec_role_code AS ENUM ('investor','issuer','admin','compliance_officer','broker'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_role_code');
      await exec(`DO $$ BEGIN CREATE TYPE sec_entity_type AS ENUM ('individual','llc','lp','corporation','trust','family_office','fund'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_entity_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_investor_category AS ENUM ('accredited_individual','accredited_entity','qualified_purchaser','qualified_institutional_buyer','non_accredited','unverified'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_investor_category');
      await exec(`DO $$ BEGIN CREATE TYPE sec_investor_status AS ENUM ('pending','active','restricted','suspended','offboarded'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_investor_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_wallet_verification_status AS ENUM ('unverified','pending','verified','revoked'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_wallet_verification_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_kyc_status AS ENUM ('not_started','pending','approved','rejected','expired','manual_review'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_kyc_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_kyb_status AS ENUM ('not_required','not_started','pending','approved','rejected','manual_review'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_kyb_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_aml_status AS ENUM ('clear','flagged','blocked','pending_review'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_aml_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_sanctions_status AS ENUM ('clear','flagged','blocked'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_sanctions_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_accreditation_status AS ENUM ('not_verified','pending','verified','expired','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_accreditation_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_compliance_decision AS ENUM ('eligible','conditionally_eligible','manual_review_required','blocked'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_compliance_decision');
      await exec(`DO $$ BEGIN CREATE TYPE sec_risk_tier AS ENUM ('low','medium','high','very_high'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_risk_tier');
      await exec(`DO $$ BEGIN CREATE TYPE sec_asset_class AS ENUM ('fund_interest','private_credit','mortgage_note','dscr_loan','fix_flip_debt','rent_stream','land_interest','treasury_yield'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_asset_class');
      await exec(`DO $$ BEGIN CREATE TYPE sec_offering_status AS ENUM ('draft','structuring','raising','funded','closed','active','winding_down','dissolved'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_offering_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_series_status AS ENUM ('draft','active','paused','closed','redeemed'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_series_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_nav_method AS ENUM ('cost_basis','appraisal','mark_to_model','mark_to_market','par'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_nav_method');
      await exec(`DO $$ BEGIN CREATE TYPE sec_distribution_frequency AS ENUM ('none','monthly','quarterly','semi_annual','annual','event_driven'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_distribution_frequency');
      await exec(`DO $$ BEGIN CREATE TYPE sec_transferability_status AS ENUM ('not_transferable','issuer_approval_required','compliance_only','open_within_platform'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_transferability_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_settlement_asset_type AS ENUM ('axusd','usdc','usdt','manual_wire'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_settlement_asset_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_token_standard AS ENUM ('erc20','erc1155','erc3643','erc4626','off_chain'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_token_standard');
      await exec(`DO $$ BEGIN CREATE TYPE sec_position_status AS ENUM ('active','partially_transferred','fully_transferred','redeemed','frozen'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_position_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_lot_source_type AS ENUM ('primary_subscription','secondary_purchase','distribution_reinvestment','transfer_in'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_lot_source_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_registry_status AS ENUM ('current','superseded','pending_update'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_registry_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_reconciliation_status AS ENUM ('reconciled','discrepancy','pending'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_reconciliation_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_listing_type AS ENUM ('direct_transfer','bulletin_board','issuer_assisted','broker_assisted'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_listing_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_listing_status AS ENUM ('draft','active','under_review','paused','matched','cancelled','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_listing_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_price_type AS ENUM ('fixed','negotiable','minimum_ask'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_price_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_visibility_scope AS ENUM ('all_eligible','invited_only','issuer_curated','admin_curated'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_visibility_scope');
      await exec(`DO $$ BEGIN CREATE TYPE sec_buyer_interest_status AS ENUM ('submitted','acknowledged','converted_to_bid','withdrawn','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_buyer_interest_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_bid_status AS ENUM ('submitted','counter_offered','accepted','rejected','withdrawn','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_bid_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_matched_trade_status AS ENUM ('matched','awaiting_approvals','approved','settlement_pending','settling','settled','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_matched_trade_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_transfer_request_type AS ENUM ('direct','listing','issuer_assisted','broker_assisted'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_transfer_request_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_transfer_request_status AS ENUM ('draft','submitted','checks_running','blocked','awaiting_buyer','awaiting_pricing','awaiting_approvals','approved','settlement_pending','settling','settled','rejected','cancelled','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_transfer_request_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_transfer_check_type AS ENUM ('available_units','buyer_eligibility','wallet_verification','sanctions_aml','hold_period','registry_reconciliation','concentration_limit','nav_discount_threshold','series_transferability','jurisdiction'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_transfer_check_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_transfer_check_result AS ENUM ('pass','fail','warning','review_required'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_transfer_check_result');
      await exec(`DO $$ BEGIN CREATE TYPE sec_approval_type AS ENUM ('issuer_approval','admin_approval','compliance_approval'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_approval_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_approval_status AS ENUM ('pending','approved','rejected','overridden','expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_approval_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_settlement_status AS ENUM ('instruction_created','awaiting_funding','funded','delivery_in_progress','ownership_updated','funds_released','settled','failed','refunded','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_settlement_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_payment_confirmation_status AS ENUM ('pending','confirmed','failed','refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_payment_confirmation_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_fee_type AS ENUM ('platform_fee','transfer_fee','issuer_fee','broker_fee','settlement_fee'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_fee_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_nav_status AS ENUM ('current','stale','provisional','final'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_nav_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_trade_mark_status AS ENUM ('confirmed','pending','voided'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_trade_mark_status');
      await exec(`DO $$ BEGIN CREATE TYPE sec_analytics_event_type AS ENUM ('listing_created','listing_activated','interest_submitted','bid_submitted','bid_accepted','trade_matched','approval_granted','approval_rejected','settlement_funded','settlement_completed','settlement_failed','transfer_blocked','capital_redeployed','position_viewed','series_viewed'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_analytics_event_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_actor_type AS ENUM ('investor','issuer','admin','compliance_officer','system','broker'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_actor_type');
      await exec(`DO $$ BEGIN CREATE TYPE sec_object_type AS ENUM ('wallet','compliance_profile','position','listing','bid','matched_trade','transfer_request','approval_request','settlement_instruction','beneficial_ownership_record','series','offering'); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'enum sec_object_type');

      // Identity tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_investors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER,
        legal_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        entity_type sec_entity_type NOT NULL DEFAULT 'individual',
        investor_category sec_investor_category NOT NULL DEFAULT 'unverified',
        status sec_investor_status NOT NULL DEFAULT 'pending',
        primary_wallet_id UUID,
        syn_investor_profile_id UUID,
        phone VARCHAR(30),
        jurisdiction VARCHAR(10),
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_investors');

      await exec(`CREATE TABLE IF NOT EXISTS sec_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        chain_id INTEGER NOT NULL DEFAULT 42161,
        verification_status sec_wallet_verification_status NOT NULL DEFAULT 'unverified',
        signed_message TEXT,
        signed_at TIMESTAMP,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (wallet_address, chain_id)
      )`, 'table sec_wallets');

      await exec(`CREATE TABLE IF NOT EXISTS sec_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        role_code sec_role_code NOT NULL,
        granted_by UUID,
        granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMP
      )`, 'table sec_roles');

      // Compliance tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_compliance_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL UNIQUE,
        kyc_status sec_kyc_status NOT NULL DEFAULT 'not_started',
        kyb_status sec_kyb_status NOT NULL DEFAULT 'not_required',
        aml_status sec_aml_status NOT NULL DEFAULT 'pending_review',
        sanctions_status sec_sanctions_status NOT NULL DEFAULT 'clear',
        accreditation_status sec_accreditation_status NOT NULL DEFAULT 'not_verified',
        risk_tier sec_risk_tier NOT NULL DEFAULT 'medium',
        last_reviewed_at TIMESTAMP,
        reviewed_by UUID,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_compliance_profiles');

      await exec(`CREATE TABLE IF NOT EXISTS sec_accreditation_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        status sec_accreditation_status NOT NULL,
        method VARCHAR(100),
        verified_by VARCHAR(255),
        verified_at TIMESTAMP,
        expires_at TIMESTAMP,
        document_refs JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_accreditation_records');

      await exec(`CREATE TABLE IF NOT EXISTS sec_sanctions_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        flag_source VARCHAR(100),
        flag_reason TEXT,
        resolved_at TIMESTAMP,
        resolved_by UUID,
        resolution_note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_sanctions_flags');

      // Series tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        syn_offering_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        asset_class sec_asset_class NOT NULL,
        status sec_series_status NOT NULL DEFAULT 'draft',
        description TEXT,
        legal_wrapper VARCHAR(255),
        token_contract_address VARCHAR(42),
        token_standard sec_token_standard NOT NULL DEFAULT 'off_chain',
        chain_id INTEGER NOT NULL DEFAULT 42161,
        nav_method sec_nav_method NOT NULL DEFAULT 'cost_basis',
        distribution_frequency sec_distribution_frequency NOT NULL DEFAULT 'quarterly',
        transferability_status sec_transferability_status NOT NULL DEFAULT 'issuer_approval_required',
        settlement_asset sec_settlement_asset_type NOT NULL DEFAULT 'axusd',
        minimum_investment_units NUMERIC(18,6) NOT NULL DEFAULT 1,
        minimum_transfer_units NUMERIC(18,6) NOT NULL DEFAULT 1,
        total_units_issued NUMERIC(18,6) NOT NULL DEFAULT 0,
        unit_price NUMERIC(18,6),
        current_nav NUMERIC(18,6),
        hold_period_days INTEGER NOT NULL DEFAULT 0,
        allowed_investor_categories JSONB,
        restricted_jurisdictions JSONB,
        max_holder_percent NUMERIC(5,4),
        max_transfer_percent_per_tx NUMERIC(5,4),
        nav_discount_review_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.10,
        requires_issuer_approval BOOLEAN NOT NULL DEFAULT TRUE,
        requires_compliance_approval BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_series');

      await exec(`CREATE TABLE IF NOT EXISTS sec_series_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        rule_type VARCHAR(100) NOT NULL,
        rule_value JSONB NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_series_rules');

      await exec(`CREATE TABLE IF NOT EXISTS sec_valuation_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        nav_method sec_nav_method NOT NULL,
        update_frequency VARCHAR(50),
        external_appraisal_required BOOLEAN NOT NULL DEFAULT FALSE,
        stale_after_days INTEGER NOT NULL DEFAULT 90,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_valuation_policies');

      // Position tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        series_id UUID NOT NULL,
        status sec_position_status NOT NULL DEFAULT 'active',
        total_units NUMERIC(18,6) NOT NULL DEFAULT 0,
        available_units NUMERIC(18,6) NOT NULL DEFAULT 0,
        locked_units NUMERIC(18,6) NOT NULL DEFAULT 0,
        cost_basis NUMERIC(18,6),
        wallet_address VARCHAR(42),
        reconciliation_status sec_reconciliation_status NOT NULL DEFAULT 'reconciled',
        last_reconciled_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (investor_id, series_id),
        CHECK (available_units >= 0),
        CHECK (locked_units >= 0),
        CHECK (total_units >= 0)
      )`, 'table sec_positions');

      await exec(`CREATE TABLE IF NOT EXISTS sec_position_lots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL,
        investor_id UUID NOT NULL,
        series_id UUID NOT NULL,
        source_type sec_lot_source_type NOT NULL,
        units NUMERIC(18,6) NOT NULL,
        price_per_unit NUMERIC(18,6),
        acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
        hold_releases_at TIMESTAMP,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        source_transaction_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_position_lots');

      await exec(`CREATE TABLE IF NOT EXISTS sec_beneficial_ownership_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        investor_id UUID NOT NULL,
        wallet_address VARCHAR(42),
        units NUMERIC(18,6) NOT NULL,
        ownership_percent NUMERIC(10,8),
        status sec_registry_status NOT NULL DEFAULT 'current',
        superseded_by_id UUID,
        effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
        end_date TIMESTAMP,
        settlement_id VARCHAR(255),
        legal_entity_ref VARCHAR(255),
        document_refs JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_beneficial_ownership_records');

      await exec(`CREATE TABLE IF NOT EXISTS sec_position_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL,
        snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),
        total_units NUMERIC(18,6) NOT NULL,
        available_units NUMERIC(18,6) NOT NULL,
        locked_units NUMERIC(18,6) NOT NULL,
        nav_per_unit NUMERIC(18,6),
        total_value NUMERIC(18,6),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_position_balances');

      // Transfer workflow tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_transfer_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_type sec_transfer_request_type NOT NULL DEFAULT 'listing',
        status sec_transfer_request_status NOT NULL DEFAULT 'draft',
        series_id UUID NOT NULL,
        seller_id UUID NOT NULL,
        seller_wallet_address VARCHAR(42),
        buyer_id UUID,
        buyer_wallet_address VARCHAR(42),
        units_requested NUMERIC(18,6) NOT NULL,
        requested_price_per_unit NUMERIC(18,6),
        agreed_price_per_unit NUMERIC(18,6),
        gross_amount NUMERIC(18,6),
        fees_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
        net_amount NUMERIC(18,6),
        settlement_asset sec_settlement_asset_type NOT NULL DEFAULT 'axusd',
        listing_id UUID,
        matched_trade_id UUID,
        blocked_reason TEXT,
        submitted_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CHECK (units_requested > 0)
      )`, 'table sec_transfer_requests');

      await exec(`CREATE TABLE IF NOT EXISTS sec_transfer_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_request_id UUID NOT NULL,
        check_type sec_transfer_check_type NOT NULL,
        result sec_transfer_check_result NOT NULL,
        detail TEXT,
        run_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_transfer_checks');

      // Marketplace tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        seller_id UUID NOT NULL,
        position_id UUID NOT NULL,
        listing_type sec_listing_type NOT NULL DEFAULT 'bulletin_board',
        status sec_listing_status NOT NULL DEFAULT 'draft',
        units_offered NUMERIC(18,6) NOT NULL,
        units_remaining NUMERIC(18,6) NOT NULL,
        price_type sec_price_type NOT NULL DEFAULT 'negotiable',
        ask_price_per_unit NUMERIC(18,6),
        minimum_bid_units NUMERIC(18,6) NOT NULL DEFAULT 1,
        visibility_scope sec_visibility_scope NOT NULL DEFAULT 'all_eligible',
        requires_issuer_approval BOOLEAN NOT NULL DEFAULT TRUE,
        settlement_window_days INTEGER NOT NULL DEFAULT 5,
        description TEXT,
        expires_at TIMESTAMP,
        activated_at TIMESTAMP,
        transfer_request_id UUID,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_listings');

      await exec(`CREATE TABLE IF NOT EXISTS sec_buyer_interests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id UUID NOT NULL,
        buyer_id UUID NOT NULL,
        intended_units NUMERIC(18,6),
        status sec_buyer_interest_status NOT NULL DEFAULT 'submitted',
        message TEXT,
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_buyer_interests');

      await exec(`CREATE TABLE IF NOT EXISTS sec_bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id UUID NOT NULL,
        buyer_id UUID NOT NULL,
        buyer_wallet_address VARCHAR(42),
        units_requested NUMERIC(18,6) NOT NULL,
        bid_price_per_unit NUMERIC(18,6) NOT NULL,
        total_bid_amount NUMERIC(18,6) NOT NULL,
        status sec_bid_status NOT NULL DEFAULT 'submitted',
        counter_price_per_unit NUMERIC(18,6),
        expires_at TIMESTAMP,
        responded_at TIMESTAMP,
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CHECK (units_requested > 0)
      )`, 'table sec_bids');

      await exec(`CREATE TABLE IF NOT EXISTS sec_matched_trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        listing_id UUID NOT NULL,
        bid_id UUID,
        seller_id UUID NOT NULL,
        buyer_id UUID NOT NULL,
        units_traded NUMERIC(18,6) NOT NULL,
        agreed_price_per_unit NUMERIC(18,6) NOT NULL,
        gross_amount NUMERIC(18,6) NOT NULL,
        fees_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
        net_seller_proceeds NUMERIC(18,6),
        settlement_asset sec_settlement_asset_type NOT NULL DEFAULT 'axusd',
        status sec_matched_trade_status NOT NULL DEFAULT 'matched',
        matched_at TIMESTAMP NOT NULL DEFAULT NOW(),
        transfer_request_id UUID,
        settlement_instruction_id UUID,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CHECK (gross_amount >= fees_amount)
      )`, 'table sec_matched_trades');

      // Approval tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_approval_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        approval_type sec_approval_type NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        timeout_hours INTEGER NOT NULL DEFAULT 72,
        auto_approve_on_timeout BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_approval_policies');

      await exec(`CREATE TABLE IF NOT EXISTS sec_approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_request_id UUID NOT NULL,
        matched_trade_id UUID,
        approval_type sec_approval_type NOT NULL,
        status sec_approval_status NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by UUID,
        expires_at TIMESTAMP,
        override_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_approval_requests');

      await exec(`CREATE TABLE IF NOT EXISTS sec_approval_decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        approval_request_id UUID NOT NULL,
        actor_id UUID NOT NULL,
        actor_type sec_actor_type NOT NULL,
        decision sec_approval_status NOT NULL,
        reason TEXT,
        decided_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_approval_decisions');

      // Settlement tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_settlement_instructions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        matched_trade_id UUID NOT NULL,
        transfer_request_id UUID NOT NULL,
        status sec_settlement_status NOT NULL DEFAULT 'instruction_created',
        settlement_asset sec_settlement_asset_type NOT NULL DEFAULT 'axusd',
        gross_amount NUMERIC(18,6) NOT NULL,
        fees_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
        net_seller_amount NUMERIC(18,6),
        buyer_wallet_address VARCHAR(42),
        seller_wallet_address VARCHAR(42),
        escrow_address VARCHAR(42),
        escrow_tx_hash VARCHAR(66),
        delivery_tx_hash VARCHAR(66),
        funds_release_tx_hash VARCHAR(66),
        funding_deadline TIMESTAMP,
        settled_at TIMESTAMP,
        failed_at TIMESTAMP,
        failure_reason TEXT,
        refunded_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_settlement_instructions');

      await exec(`CREATE TABLE IF NOT EXISTS sec_payment_confirmations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_instruction_id UUID NOT NULL,
        status sec_payment_confirmation_status NOT NULL DEFAULT 'pending',
        tx_hash VARCHAR(66),
        amount NUMERIC(18,6),
        confirmed_at TIMESTAMP,
        failed_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_payment_confirmations');

      await exec(`CREATE TABLE IF NOT EXISTS sec_fee_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_instruction_id UUID NOT NULL,
        fee_type sec_fee_type NOT NULL,
        amount NUMERIC(18,6) NOT NULL,
        recipient_wallet VARCHAR(42),
        tx_hash VARCHAR(66),
        settled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_fee_events');

      await exec(`CREATE TABLE IF NOT EXISTS sec_settlement_failures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_instruction_id UUID NOT NULL,
        reason TEXT NOT NULL,
        failed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolution_type VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_settlement_failures');

      // Pricing tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_nav_marks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        nav_per_unit NUMERIC(18,6) NOT NULL,
        nav_status sec_nav_status NOT NULL DEFAULT 'current',
        effective_date TIMESTAMP NOT NULL,
        method_used sec_nav_method NOT NULL,
        issued_by UUID,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_nav_marks');

      await exec(`CREATE TABLE IF NOT EXISTS sec_trade_marks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        matched_trade_id UUID NOT NULL,
        price_per_unit NUMERIC(18,6) NOT NULL,
        units_traded NUMERIC(18,6) NOT NULL,
        premium_discount_to_nav NUMERIC(8,6),
        status sec_trade_mark_status NOT NULL DEFAULT 'confirmed',
        traded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_trade_marks');

      await exec(`CREATE TABLE IF NOT EXISTS sec_series_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),
        active_listings_count INTEGER NOT NULL DEFAULT 0,
        total_bids_count INTEGER NOT NULL DEFAULT 0,
        active_holder_count INTEGER NOT NULL DEFAULT 0,
        avg_days_to_match NUMERIC(8,2),
        avg_days_to_settle NUMERIC(8,2),
        completion_rate NUMERIC(5,4),
        avg_premium_discount_to_nav NUMERIC(8,6),
        rolling_30d_volume_units NUMERIC(18,6),
        rolling_30d_volume_value NUMERIC(18,6),
        yield_rate NUMERIC(8,6),
        distribution_rate NUMERIC(8,6),
        ltv NUMERIC(5,4),
        dscr NUMERIC(8,4),
        delinquency_rate NUMERIC(5,4),
        occupancy_rate NUMERIC(5,4),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_series_metrics');

      // Analytics tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID,
        investor_id UUID,
        event_type sec_analytics_event_type NOT NULL,
        actor_type sec_actor_type NOT NULL DEFAULT 'investor',
        object_id VARCHAR(255),
        object_type sec_object_type,
        value_units NUMERIC(18,6),
        value_currency NUMERIC(18,6),
        metadata JSONB,
        occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_analytics_events');

      await exec(`CREATE TABLE IF NOT EXISTS sec_liquidity_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        score NUMERIC(5,2) NOT NULL,
        score_label VARCHAR(50),
        demand_score NUMERIC(5,2),
        supply_score NUMERIC(5,2),
        velocity_score NUMERIC(5,2),
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_liquidity_scores');

      await exec(`CREATE TABLE IF NOT EXISTS sec_investor_redeployment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        exit_series_id UUID NOT NULL,
        entry_series_id UUID,
        exit_amount NUMERIC(18,6) NOT NULL,
        redeployed_amount NUMERIC(18,6),
        redeployed_at TIMESTAMP,
        settlement_instruction_id UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_investor_redeployment');

      await exec(`CREATE TABLE IF NOT EXISTS sec_series_demand_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL,
        snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),
        buyer_interest_count INTEGER NOT NULL DEFAULT 0,
        active_bids_count INTEGER NOT NULL DEFAULT 0,
        total_bid_units NUMERIC(18,6) NOT NULL DEFAULT 0,
        active_listings_count INTEGER NOT NULL DEFAULT 0,
        total_listing_units NUMERIC(18,6) NOT NULL DEFAULT 0,
        supply_demand_ratio NUMERIC(8,4),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_series_demand_snapshots');

      // Notification table
      await exec(`CREATE TABLE IF NOT EXISTS sec_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID,
        recipient_email VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
        subject VARCHAR(255),
        body TEXT,
        metadata JSONB,
        sent_at TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_notifications');

      // Audit tables
      await exec(`CREATE TABLE IF NOT EXISTS sec_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID,
        actor_type sec_actor_type NOT NULL,
        actor_wallet VARCHAR(42),
        object_type sec_object_type NOT NULL,
        object_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        previous_state JSONB,
        new_state JSONB,
        metadata JSONB,
        ip_address VARCHAR(45),
        occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_audit_logs');

      await exec(`CREATE TABLE IF NOT EXISTS sec_admin_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        target_object_type sec_object_type NOT NULL,
        target_object_id VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        previous_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_admin_actions');

      await exec(`CREATE TABLE IF NOT EXISTS sec_document_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL,
        document_ref VARCHAR(500) NOT NULL,
        series_id UUID,
        access_type VARCHAR(50) NOT NULL DEFAULT 'view',
        accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`, 'table sec_document_access_logs');

      // Indexes for common query paths
      await exec(`CREATE UNIQUE INDEX IF NOT EXISTS sec_investors_email_unique ON sec_investors(email)`, 'unique index sec_investors_email');
      await exec(`CREATE INDEX IF NOT EXISTS sec_wallets_investor_idx ON sec_wallets(investor_id)`, 'index sec_wallets_investor');
      await exec(`CREATE INDEX IF NOT EXISTS sec_compliance_profiles_investor_idx ON sec_compliance_profiles(investor_id)`, 'index sec_compliance_profiles_investor');
      await exec(`CREATE INDEX IF NOT EXISTS sec_positions_investor_idx ON sec_positions(investor_id)`, 'index sec_positions_investor');
      await exec(`CREATE INDEX IF NOT EXISTS sec_positions_series_idx ON sec_positions(series_id)`, 'index sec_positions_series');
      await exec(`CREATE INDEX IF NOT EXISTS sec_listings_series_status_idx ON sec_listings(series_id, status, created_at DESC)`, 'index sec_listings_series_status');
      await exec(`CREATE INDEX IF NOT EXISTS sec_bids_listing_status_idx ON sec_bids(listing_id, status, submitted_at DESC)`, 'index sec_bids_listing_status');
      await exec(`CREATE INDEX IF NOT EXISTS sec_matched_trades_series_status_idx ON sec_matched_trades(series_id, status, matched_at DESC)`, 'index sec_matched_trades_series_status');
      await exec(`CREATE INDEX IF NOT EXISTS sec_transfer_requests_series_status_idx ON sec_transfer_requests(series_id, status, created_at DESC)`, 'index sec_transfer_requests_series_status');
      await exec(`CREATE INDEX IF NOT EXISTS sec_audit_logs_object_idx ON sec_audit_logs(object_type, object_id, occurred_at DESC)`, 'index sec_audit_logs_object');
      await exec(`CREATE INDEX IF NOT EXISTS sec_analytics_events_series_event_idx ON sec_analytics_events(series_id, event_type, occurred_at DESC)`, 'index sec_analytics_events_series_event');
      await exec(`CREATE INDEX IF NOT EXISTS sec_nav_marks_series_date_idx ON sec_nav_marks(series_id, effective_date DESC)`, 'index sec_nav_marks_series_date');

      // ─── END AXIOM SECONDARY NETWORK V1 ──────────────────────────────────────

      console.log('[instrumentation] Database setup complete');

      await pool.end();
    } catch (err) {
      console.error('[instrumentation] Database setup failed:', err);
    }
  }
}
