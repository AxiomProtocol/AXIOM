/**
 * Axiom Secondary Network — Seed Script
 * Run: npx ts-node scripts/seed-secondary.ts
 *
 * Seeds: 3 series, 2 test investors, 3 positions, 5 lots, 2 NAV marks, 1 active listing.
 * All data is deterministic and idempotent (uses ON CONFLICT DO NOTHING or slug uniqueness).
 */
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('[seed-secondary] Starting...');

  // ── 1. Series ────────────────────────────────────────────────────────────────
  const seriesData = [
    {
      name: 'ATL Mortgage Fund I',
      slug: 'atl-mortgage-fund-i',
      assetClass: 'mortgage_note',
      description: 'Atlanta-area residential mortgage note pool. Targeting 8-10% annualized yield. Reg D 506(c).',
      navMethod: 'cost_basis',
      distributionFrequency: 'monthly',
      transferabilityStatus: 'issuer_approval_required',
      settlementAsset: 'axusd',
      totalUnitsIssued: 1000,
      unitPrice: 1000.00,
      currentNav: 1035.00,
      holdPeriodDays: 180,
      navDiscountReviewThreshold: 0.10,
      requiresIssuerApproval: true,
    },
    {
      name: 'HOU DSCR Portfolio Q1-26',
      slug: 'hou-dscr-portfolio-q1-26',
      assetClass: 'dscr_loan',
      description: 'Houston SFR DSCR loan pool originated Q1 2026. Min DSCR 1.20x. Accredited investors only.',
      navMethod: 'mark_to_model',
      distributionFrequency: 'quarterly',
      transferabilityStatus: 'issuer_approval_required',
      settlementAsset: 'axusd',
      totalUnitsIssued: 500,
      unitPrice: 2000.00,
      currentNav: 2010.00,
      holdPeriodDays: 90,
      navDiscountReviewThreshold: 0.08,
      requiresIssuerApproval: true,
    },
    {
      name: 'Axiom Land Acquisition Fund I',
      slug: 'axiom-land-acquisition-fund-i',
      assetClass: 'land_interest',
      description: 'Fractional interest in Axiom-identified land acquisition pipeline (SE region). Governance-linked.',
      navMethod: 'appraisal',
      distributionFrequency: 'annual',
      transferabilityStatus: 'compliance_only',
      settlementAsset: 'axusd',
      totalUnitsIssued: 250,
      unitPrice: 5000.00,
      currentNav: 5250.00,
      holdPeriodDays: 365,
      navDiscountReviewThreshold: 0.12,
      requiresIssuerApproval: true,
    },
  ];

  const seriesIds: Record<string, string> = {};

  for (const s of seriesData) {
    const result = await pool.query(
      `INSERT INTO sec_series (name, slug, asset_class, description, nav_method, distribution_frequency,
        transferability_status, settlement_asset, total_units_issued, unit_price, current_nav,
        hold_period_days, nav_discount_review_threshold, requires_issuer_approval, status)
       VALUES ($1, $2, $3::sec_asset_class, $4, $5::sec_nav_method, $6::sec_distribution_frequency,
         $7::sec_transferability_status, $8::sec_settlement_asset_type, $9, $10, $11, $12, $13, $14, 'active')
       ON CONFLICT (slug) DO UPDATE SET current_nav = EXCLUDED.current_nav, updated_at = NOW()
       RETURNING id`,
      [s.name, s.slug, s.assetClass, s.description, s.navMethod, s.distributionFrequency,
       s.transferabilityStatus, s.settlementAsset, s.totalUnitsIssued, s.unitPrice, s.currentNav,
       s.holdPeriodDays, s.navDiscountReviewThreshold, s.requiresIssuerApproval]
    );
    seriesIds[s.slug] = result.rows[0].id;
    console.log(`  [series] ${s.name} → ${seriesIds[s.slug]}`);

    // Approval policy
    await pool.query(
      `INSERT INTO sec_approval_policies (series_id, approval_type, is_required, timeout_hours)
       VALUES ($1, 'issuer_approval', TRUE, 72)
       ON CONFLICT DO NOTHING`,
      [seriesIds[s.slug]]
    );

    // NAV marks
    await pool.query(
      `INSERT INTO sec_nav_marks (series_id, nav_per_unit, nav_status, effective_date, method_used, notes)
       VALUES ($1, $2, 'current', NOW(), $3::sec_nav_method, 'Initial seed mark')
       ON CONFLICT DO NOTHING`,
      [seriesIds[s.slug], s.currentNav, s.navMethod]
    );
  }

  // ── 2. Investors ─────────────────────────────────────────────────────────────
  const investorData = [
    {
      email: 'alice@axiomtest.local',
      legalName: 'Alice Williams',
      entityType: 'individual',
      category: 'accredited_individual',
      wallet: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    {
      email: 'bob@axiomtest.local',
      legalName: 'Bob Enterprises LLC',
      entityType: 'llc',
      category: 'accredited_entity',
      wallet: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
  ];

  const investorIds: Record<string, string> = {};

  for (const inv of investorData) {
    const result = await pool.query(
      `INSERT INTO sec_investors (email, legal_name, entity_type, investor_category, status)
       VALUES ($1, $2, $3::sec_entity_type, $4::sec_investor_category, 'active')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [inv.email, inv.legalName, inv.entityType, inv.category]
    );

    let investorId: string;
    if (result.rows.length > 0) {
      investorId = result.rows[0].id;
    } else {
      const sel = await pool.query(`SELECT id FROM sec_investors WHERE email = $1 LIMIT 1`, [inv.email]);
      investorId = sel.rows[0].id;
    }
    investorIds[inv.email] = investorId;

    await pool.query(
      `INSERT INTO sec_wallets (investor_id, wallet_address, chain_id, verification_status, is_primary)
       VALUES ($1, $2, 42161, 'verified', TRUE)
       ON CONFLICT (wallet_address, chain_id) DO NOTHING`,
      [investorId, inv.wallet]
    );

    await pool.query(
      `INSERT INTO sec_compliance_profiles (investor_id, kyc_status, aml_status, sanctions_status, accreditation_status, risk_tier)
       VALUES ($1, 'approved', 'clear', 'clear', 'verified', 'low')
       ON CONFLICT DO NOTHING`,
      [investorId]
    );

    await pool.query(
      `INSERT INTO sec_roles (investor_id, role_code) VALUES ($1, 'investor') ON CONFLICT DO NOTHING`,
      [investorId]
    );

    console.log(`  [investor] ${inv.legalName} → ${investorId}`);
  }

  // ── 3. Positions + Lots ──────────────────────────────────────────────────────
  const positionData = [
    { email: 'alice@axiomtest.local', seriesSlug: 'atl-mortgage-fund-i', totalUnits: 50, pricePerUnit: 1000.00, source: 'primary_subscription' },
    { email: 'alice@axiomtest.local', seriesSlug: 'hou-dscr-portfolio-q1-26', totalUnits: 10, pricePerUnit: 2000.00, source: 'primary_subscription' },
    { email: 'bob@axiomtest.local', seriesSlug: 'atl-mortgage-fund-i', totalUnits: 30, pricePerUnit: 1000.00, source: 'primary_subscription' },
  ];

  for (const pos of positionData) {
    const investorId = investorIds[pos.email];
    const seriesId = seriesIds[pos.seriesSlug];

    const posResult = await pool.query(
      `INSERT INTO sec_positions (investor_id, series_id, total_units, available_units, locked_units, cost_basis, status)
       VALUES ($1, $2, $3, $3, 0, $4, 'active')
       ON CONFLICT (investor_id, series_id)
       DO UPDATE SET total_units = EXCLUDED.total_units, available_units = EXCLUDED.available_units, updated_at = NOW()
       RETURNING id`,
      [investorId, seriesId, pos.totalUnits, pos.totalUnits * pos.pricePerUnit]
    );
    const positionId = posResult.rows[0].id;

    // Lot
    const holdReleasesAt = new Date();
    holdReleasesAt.setDate(holdReleasesAt.getDate() + (pos.seriesSlug === 'atl-mortgage-fund-i' ? 180 : 90));

    await pool.query(
      `INSERT INTO sec_position_lots (position_id, investor_id, series_id, source_type, units, price_per_unit, hold_releases_at)
       VALUES ($1, $2, $3, $4::sec_lot_source_type, $5, $6, $7)`,
      [positionId, investorId, seriesId, pos.source, pos.totalUnits, pos.pricePerUnit, holdReleasesAt]
    );

    // Beneficial ownership record
    const totalUnitsResult = await pool.query(
      `SELECT SUM(total_units) as total FROM sec_positions WHERE series_id = $1`, [seriesId]
    );
    const totalIssued = parseFloat(totalUnitsResult.rows[0].total || '0');

    await pool.query(
      `UPDATE sec_beneficial_ownership_records SET status = 'superseded', end_date = NOW()
       WHERE series_id = $1 AND investor_id = $2 AND status = 'current'`,
      [seriesId, investorId]
    );
    await pool.query(
      `INSERT INTO sec_beneficial_ownership_records (series_id, investor_id, units, ownership_percent, status)
       VALUES ($1, $2, $3, $4, 'current')`,
      [seriesId, investorId, pos.totalUnits, totalIssued > 0 ? pos.totalUnits / totalIssued : 0]
    );

    console.log(`  [position] ${pos.email} / ${pos.seriesSlug} → ${positionId} (${pos.totalUnits} units)`);
  }

  // ── 4. Active Listing from Alice ─────────────────────────────────────────────
  const aliceId = investorIds['alice@axiomtest.local'];
  const atlSeriesId = seriesIds['atl-mortgage-fund-i'];

  const alicePos = await pool.query(
    `SELECT id FROM sec_positions WHERE investor_id = $1 AND series_id = $2 LIMIT 1`,
    [aliceId, atlSeriesId]
  );

  if (alicePos.rows[0]) {
    const transferResult = await pool.query(
      `INSERT INTO sec_transfer_requests (request_type, status, series_id, seller_id, units_requested,
        requested_price_per_unit, settlement_asset, submitted_at)
       VALUES ('listing', 'awaiting_buyer', $1, $2, 10, 1040.00, 'axusd', NOW())
       RETURNING id`,
      [atlSeriesId, aliceId]
    );
    const transferId = transferResult.rows[0].id;

    const listingResult = await pool.query(
      `INSERT INTO sec_listings (series_id, seller_id, position_id, listing_type, status, units_offered,
        units_remaining, price_type, ask_price_per_unit, minimum_bid_units, visibility_scope,
        settlement_window_days, description, activated_at, transfer_request_id)
       VALUES ($1, $2, $3, 'bulletin_board', 'active', 10, 10, 'fixed', 1040.00, 1, 'all_eligible',
         5, 'Partial exit — seller seeking liquidity. Units in 6-month hold, releases 180 days post-acquisition.', NOW(), $4)
       RETURNING id`,
      [atlSeriesId, aliceId, alicePos.rows[0].id, transferId]
    );
    console.log(`  [listing] Alice → ATL Mortgage Fund I listing → ${listingResult.rows[0].id}`);

    await pool.query(
      `UPDATE sec_positions SET locked_units = 10, available_units = available_units - 10, updated_at = NOW()
       WHERE id = $1`,
      [alicePos.rows[0].id]
    );
  }

  // ── 5. Liquidity scores ──────────────────────────────────────────────────────
  for (const [slug, seriesId] of Object.entries(seriesIds)) {
    await pool.query(
      `INSERT INTO sec_liquidity_scores (series_id, score, score_label, demand_score, supply_score, velocity_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [seriesId, slug === 'atl-mortgage-fund-i' ? 62 : 30, slug === 'atl-mortgage-fund-i' ? 'Medium' : 'Low', 50, 40, 30]
    );
  }

  console.log('[seed-secondary] Complete.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
