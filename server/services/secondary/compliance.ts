import { pool } from '../../db';

export type ComplianceDecision = 'eligible' | 'conditionally_eligible' | 'manual_review_required' | 'blocked';

export interface ComplianceCheckResult {
  decision: ComplianceDecision;
  reasons: string[];
  checks: Record<string, { pass: boolean; detail: string }>;
}

export async function getComplianceProfile(investorId: string) {
  const result = await pool.query(
    `SELECT * FROM sec_compliance_profiles WHERE investor_id = $1 LIMIT 1`,
    [investorId]
  );
  return result.rows[0] || null;
}

export async function checkTransferEligibility(
  sellerId: string,
  buyerId: string,
  seriesId: string,
  unitsRequested: number,
  pricePerUnit?: number
): Promise<ComplianceCheckResult> {
  const checks: Record<string, { pass: boolean; detail: string }> = {};
  const reasons: string[] = [];

  const [seriesResult, sellerProfile, buyerProfile, sellerPosition] = await Promise.all([
    pool.query(`SELECT * FROM sec_series WHERE id = $1 LIMIT 1`, [seriesId]),
    pool.query(`SELECT * FROM sec_compliance_profiles WHERE investor_id = $1 LIMIT 1`, [sellerId]),
    pool.query(`SELECT * FROM sec_compliance_profiles WHERE investor_id = $1 LIMIT 1`, [buyerId]),
    pool.query(`SELECT * FROM sec_positions WHERE investor_id = $1 AND series_id = $2 LIMIT 1`, [sellerId, seriesId]),
  ]);

  const series = seriesResult.rows[0];
  const sellerComp = sellerProfile.rows[0];
  const buyerComp = buyerProfile.rows[0];
  const position = sellerPosition.rows[0];

  // 1. Series transferability
  if (!series) {
    checks['series_exists'] = { pass: false, detail: 'Series not found' };
    reasons.push('Series not found');
    return { decision: 'blocked', reasons, checks };
  }

  const notTransferable = series.transferability_status === 'not_transferable';
  checks['series_transferability'] = {
    pass: !notTransferable,
    detail: notTransferable ? 'Series is not transferable' : `Series transferability: ${series.transferability_status}`,
  };
  if (notTransferable) reasons.push('Series is not transferable');

  // 2. Available units
  const availableUnits = parseFloat(position?.available_units || '0');
  const enoughUnits = availableUnits >= unitsRequested;
  checks['available_units'] = {
    pass: enoughUnits,
    detail: enoughUnits
      ? `Seller has ${availableUnits} available units; requested ${unitsRequested}`
      : `Insufficient units: ${availableUnits} available, ${unitsRequested} requested`,
  };
  if (!enoughUnits) reasons.push('Seller has insufficient available units');

  // 3. Seller sanctions / AML
  const sellerBlocked = sellerComp?.sanctions_status === 'blocked' || sellerComp?.aml_status === 'blocked';
  checks['seller_sanctions_aml'] = {
    pass: !sellerBlocked,
    detail: sellerBlocked ? 'Seller has a sanctions or AML block' : 'Seller sanctions/AML clear',
  };
  if (sellerBlocked) reasons.push('Seller has a compliance block');

  // 4. Buyer sanctions / AML
  const buyerBlocked = buyerComp?.sanctions_status === 'blocked' || buyerComp?.aml_status === 'blocked';
  checks['buyer_sanctions_aml'] = {
    pass: !buyerBlocked,
    detail: buyerBlocked ? 'Buyer has a sanctions or AML block' : 'Buyer sanctions/AML clear',
  };
  if (buyerBlocked) reasons.push('Buyer has a compliance block');

  // 5. Buyer KYC
  const buyerKycOk = ['approved'].includes(buyerComp?.kyc_status);
  checks['buyer_kyc'] = {
    pass: buyerKycOk,
    detail: buyerKycOk ? 'Buyer KYC approved' : `Buyer KYC status: ${buyerComp?.kyc_status || 'not_started'}`,
  };
  if (!buyerKycOk) reasons.push('Buyer KYC not approved');

  // 6. Buyer accreditation
  const buyerAccOk = buyerComp?.accreditation_status === 'verified';
  checks['buyer_accreditation'] = {
    pass: buyerAccOk,
    detail: buyerAccOk ? 'Buyer accreditation verified' : `Buyer accreditation: ${buyerComp?.accreditation_status || 'not_verified'}`,
  };
  if (!buyerAccOk) reasons.push('Buyer accreditation not verified');

  // 7. Hold period
  const holdPeriodDays = series.hold_period_days || 0;
  let holdOk = true;
  if (holdPeriodDays > 0 && position) {
    const lotResult = await pool.query(
      `SELECT MIN(hold_releases_at) as earliest_release
       FROM sec_position_lots
       WHERE position_id = $1 AND units > 0 AND is_locked = TRUE`,
      [position.id]
    );
    const earliestRelease = lotResult.rows[0]?.earliest_release;
    if (earliestRelease && new Date(earliestRelease) > new Date()) {
      holdOk = false;
      reasons.push(`Hold period active until ${new Date(earliestRelease).toDateString()}`);
    }
  }
  checks['hold_period'] = {
    pass: holdOk,
    detail: holdOk ? 'Hold period satisfied' : 'Units are within hold period',
  };

  // 8. NAV discount review
  if (pricePerUnit && series.current_nav && series.nav_discount_review_threshold) {
    const nav = parseFloat(series.current_nav);
    const threshold = parseFloat(series.nav_discount_review_threshold);
    const discount = (nav - pricePerUnit) / nav;
    const discountFlag = discount > threshold;
    checks['nav_discount_threshold'] = {
      pass: !discountFlag,
      detail: discountFlag
        ? `Price is ${(discount * 100).toFixed(1)}% below NAV (threshold: ${(threshold * 100).toFixed(1)}%)`
        : `Price within acceptable range of NAV`,
    };
    if (discountFlag) reasons.push('Price is below NAV discount review threshold');
  }

  // 9. Registry reconciliation
  const reconcileResult = await pool.query(
    `SELECT reconciliation_status FROM sec_positions WHERE investor_id = $1 AND series_id = $2 LIMIT 1`,
    [sellerId, seriesId]
  );
  const reconciled = reconcileResult.rows[0]?.reconciliation_status === 'reconciled';
  checks['registry_reconciliation'] = {
    pass: reconciled,
    detail: reconciled ? 'Position registry reconciled' : 'Registry discrepancy detected',
  };
  if (!reconciled) reasons.push('Position registry discrepancy — transfer blocked pending resolution');

  // Determine decision
  const hardBlocks = ['series_transferability', 'available_units', 'seller_sanctions_aml',
    'buyer_sanctions_aml', 'hold_period', 'registry_reconciliation'];
  const reviewTriggers = ['nav_discount_threshold', 'buyer_kyc', 'buyer_accreditation'];

  const hasHardBlock = hardBlocks.some(k => checks[k] && !checks[k].pass);
  const hasReviewTrigger = reviewTriggers.some(k => checks[k] && !checks[k].pass);

  if (hasHardBlock) return { decision: 'blocked', reasons, checks };
  if (hasReviewTrigger) return { decision: 'manual_review_required', reasons, checks };
  if (reasons.length > 0) return { decision: 'conditionally_eligible', reasons, checks };
  return { decision: 'eligible', reasons, checks };
}

export async function runTransferChecks(
  transferRequestId: string,
  sellerId: string,
  buyerId: string,
  seriesId: string,
  unitsRequested: number,
  pricePerUnit?: number
): Promise<ComplianceDecision> {
  const result = await checkTransferEligibility(sellerId, buyerId, seriesId, unitsRequested, pricePerUnit);

  for (const [checkType, check] of Object.entries(result.checks)) {
    const checkResult = check.pass
      ? 'pass'
      : result.decision === 'blocked' ? 'fail' : 'review_required';

    await pool.query(
      `INSERT INTO sec_transfer_checks (transfer_request_id, check_type, result, detail)
       VALUES ($1, $2::sec_transfer_check_type, $3::sec_transfer_check_result, $4)`,
      [transferRequestId, checkType, checkResult, check.detail]
    );
  }

  return result.decision;
}
