import { pool } from '../../server/db';

export interface CollisionWarning {
  type: 'name_variant' | 'date_range' | 'location_spread' | 'generation_gap';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEvidenceIds?: number[];
}

export async function detectCollisions(caseId: number): Promise<CollisionWarning[]> {
  const warnings: CollisionWarning[] = [];

  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 LIMIT 1`,
    [caseId]
  );
  const caseData = caseResult.rows[0];

  if (!caseData) return warnings;

  const evidenceResult = await pool.query(
    `SELECT * FROM evidence_items WHERE case_id = $1`,
    [caseId]
  );
  const evidence = evidenceResult.rows;

  const claimsResult = await pool.query(
    `SELECT * FROM fact_claims WHERE case_id = $1`,
    [caseId]
  );
  const claims = claimsResult.rows;

  const counties = new Map<string, number[]>();
  const states = new Map<string, number[]>();
  const years: { id: number; start: number; end: number }[] = [];

  for (const e of evidence) {
    if (e.county) {
      const existing = counties.get(e.county.toLowerCase()) || [];
      existing.push(e.id);
      counties.set(e.county.toLowerCase(), existing);
    }
    if (e.state) {
      const existing = states.get(e.state.toLowerCase()) || [];
      existing.push(e.id);
      states.set(e.state.toLowerCase(), existing);
    }
    if (e.year_range_start || e.year_range_end) {
      years.push({
        id: e.id,
        start: e.year_range_start || e.year_range_end || 0,
        end: e.year_range_end || e.year_range_start || 0,
      });
    }
  }

  if (counties.size > 3) {
    warnings.push({
      type: 'location_spread',
      severity: 'medium',
      message: `Evidence spans ${counties.size} different counties. Verify all relate to the same ancestor or document family movement.`,
      affectedEvidenceIds: Array.from(counties.values()).flat(),
    });
  }

  if (states.size > 2) {
    warnings.push({
      type: 'location_spread',
      severity: 'high',
      message: `Evidence spans ${states.size} different states. This may indicate multiple individuals with similar names.`,
      affectedEvidenceIds: Array.from(states.values()).flat(),
    });
  }

  if (years.length >= 2) {
    const allYears = years.flatMap(y => [y.start, y.end]).filter(y => y > 1700);
    if (allYears.length >= 2) {
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      const span = maxYear - minYear;

      if (span > 80) {
        warnings.push({
          type: 'generation_gap',
          severity: span > 120 ? 'high' : 'medium',
          message: `Evidence spans ${span} years (${minYear}-${maxYear}). This exceeds a typical lifespan and may indicate multiple generations or individuals.`,
          affectedEvidenceIds: years.map(y => y.id),
        });
      }
    }
  }

  const birthClaims = claims.filter(c => c.claim_type === 'birth');
  const deathClaims = claims.filter(c => c.claim_type === 'death');

  if (birthClaims.length > 1) {
    warnings.push({
      type: 'date_range',
      severity: 'high',
      message: `Multiple birth dates recorded for the primary ancestor. Please reconcile or document as an assumption.`,
    });
  }

  if (deathClaims.length > 1) {
    warnings.push({
      type: 'date_range',
      severity: 'high',
      message: `Multiple death dates recorded for the primary ancestor. Please reconcile or document as an assumption.`,
    });
  }

  const nameVariants = (caseData.ancestor_name_variants as string[]) || [];
  if (nameVariants.length > 5) {
    warnings.push({
      type: 'name_variant',
      severity: 'low',
      message: `${nameVariants.length} name variants recorded. Consider verifying these all refer to the same individual.`,
    });
  }

  return warnings;
}

export async function shouldBlockProgress(caseId: number): Promise<{ blocked: boolean; reason?: string }> {
  const collisions = await detectCollisions(caseId);
  const highSeverity = collisions.filter(c => c.severity === 'high');

  if (highSeverity.length > 0) {
    return {
      blocked: true,
      reason: `${highSeverity.length} high-severity collision warning(s) require resolution before proceeding.`,
    };
  }

  return { blocked: false };
}
