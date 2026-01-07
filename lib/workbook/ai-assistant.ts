import { chat } from '../server/gemini';
import { pool } from '../../server/db';
import { incrementAssistantCalls } from './usage-meter';
import { checkEntitlement } from './entitlements';

export type AssistantMode = 'research_planner' | 'evidence_clerk' | 'dossier_drafter';

interface AssistantContext {
  caseId: number;
  userId: number;
  mode: AssistantMode;
  message: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
}

interface AssistantResponse {
  success: boolean;
  response?: string;
  error?: string;
  refusalReason?: string;
  hypothesisMode?: boolean;
}

const REFUSAL_CONDITIONS = {
  insufficientEvidence: 'Insufficient evidence to proceed. Please add more primary source documentation.',
  conflictingEvidence: 'Conflicting evidence detected that has not been resolved. Please review and reconcile the conflicts before proceeding.',
  prerequisitesNotMet: 'Prerequisites for this action have not been completed. Please complete earlier sections first.',
  identityCollision: 'Potential identity collision detected. Please resolve or document this as an assumption before proceeding.',
};

const MODE_PROMPTS: Record<AssistantMode, string> = {
  research_planner: `You are a Research Planner assistant for genealogical land research. Your role is to:
- Create ordered task lists based on the current case state
- Suggest specific records to search for (census, deeds, tax records, probate)
- Provide section-by-section checklists
- Recommend courthouse visit sequences
- Never provide legal advice or claim entitlement
- Label speculative suggestions as [HYPOTHESIS]
- If evidence is insufficient, say so clearly`,

  evidence_clerk: `You are an Evidence Clerk assistant for genealogical research. Your role is to:
- Help organize and categorize evidence items
- Suggest provenance improvements for documentation
- Link claims to supporting evidence
- Flag gaps in primary source documentation
- Assess confidence levels based on source quality
- Never provide legal advice or claim entitlement
- If evidence is conflicting, identify the conflicts clearly`,

  dossier_drafter: `You are a Dossier Drafter assistant. Your role is to:
- Draft summaries using ONLY verified facts from the evidence record
- Cite evidence item IDs in all statements
- Clearly label facts vs hypotheses
- Never claim legal entitlement or guaranteed outcomes
- Never provide legal advice
- Format output for professional documentation
- Refuse to draft if critical evidence is missing`,
};

async function checkIdentityCollisions(caseId: number): Promise<string[]> {
  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 LIMIT 1`,
    [caseId]
  );
  const caseData = caseResult.rows[0];

  if (!caseData) return [];

  const evidenceResult = await pool.query(
    `SELECT * FROM evidence_items WHERE case_id = $1`,
    [caseId]
  );
  const evidence = evidenceResult.rows;

  const warnings: string[] = [];

  const counties = new Set(evidence.map(e => e.county).filter(Boolean));
  const years = evidence.flatMap(e => {
    const start = e.year_range_start || 0;
    const end = e.year_range_end || e.year_range_start || 0;
    return [start, end].filter(y => y > 0);
  });

  if (counties.size > 3) {
    warnings.push(`Multiple counties (${counties.size}) detected. Verify these relate to the same ancestor.`);
  }

  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    if (maxYear - minYear > 100) {
      warnings.push(`Time span of ${maxYear - minYear} years detected. Verify evidence relates to the correct generation.`);
    }
  }

  return warnings;
}

async function getRelevantResources(sectionKey: string): Promise<string> {
  const result = await pool.query(
    `SELECT * FROM resource_directory_items WHERE section_key = $1 AND active = true`,
    [sectionKey]
  );
  const resources = result.rows;

  if (resources.length === 0) return '';

  return 'Relevant resources:\n' + resources.map(r =>
    `- ${r.title}: ${r.url || 'No URL'} (${r.notes || 'No notes'})`
  ).join('\n');
}

async function buildContext(caseId: number, mode: AssistantMode): Promise<string> {
  const caseResult = await pool.query(
    `SELECT * FROM workbook_cases WHERE id = $1 LIMIT 1`,
    [caseId]
  );
  const caseData = caseResult.rows[0];

  if (!caseData) {
    throw new Error('Case not found');
  }

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

  const sectionsResult = await pool.query(
    `SELECT * FROM workbook_section_states WHERE case_id = $1`,
    [caseId]
  );
  const sections = sectionsResult.rows;

  let context = `Case: ${caseData.case_title}\n`;
  context += `Primary Ancestor: ${caseData.ancestor_primary_name}\n`;
  if (caseData.jurisdiction_code) {
    context += `Jurisdiction: ${caseData.jurisdiction_code}\n`;
  }

  context += `\nEvidence Items (${evidence.length}):\n`;
  evidence.forEach(e => {
    context += `[E${e.id}] ${e.title} (${e.record_type}, ${e.confidence_level})\n`;
    context += `  Source: ${e.source_name}, Accessed: ${e.date_accessed?.toISOString().split('T')[0] || 'Unknown'}\n`;
  });

  context += `\nFact Claims (${claims.length}):\n`;
  claims.forEach(c => {
    context += `[C${c.id}] ${c.claim_type}: ${c.claim_text} (${c.confidence_level})\n`;
    const evidenceRefs = (c.related_evidence_ids as number[]) || [];
    if (evidenceRefs.length > 0) {
      context += `  Supported by: E${evidenceRefs.join(', E')}\n`;
    }
  });

  context += `\nSection States:\n`;
  sections.forEach(s => {
    context += `${s.section_key}: ${s.completion_status}${s.blocked_reason ? ` (Blocked: ${s.blocked_reason})` : ''}\n`;
  });

  return context;
}

export async function runAssistant(ctx: AssistantContext): Promise<AssistantResponse> {
  const entitlement = await checkEntitlement(ctx.userId);
  if (!entitlement.canUseAI) {
    return {
      success: false,
      error: 'Active subscription required to use AI assistant',
    };
  }

  const canProceed = await incrementAssistantCalls(ctx.userId);
  if (!canProceed) {
    return {
      success: false,
      error: 'Monthly AI usage limit reached',
    };
  }

  try {
    const collisions = await checkIdentityCollisions(ctx.caseId);
    if (collisions.length > 0 && ctx.mode === 'dossier_drafter') {
      return {
        success: false,
        refusalReason: REFUSAL_CONDITIONS.identityCollision,
        response: `Identity collision warnings:\n${collisions.join('\n')}\n\nPlease resolve these before drafting.`,
      };
    }

    const context = await buildContext(ctx.caseId, ctx.mode);
    const systemPrompt = MODE_PROMPTS[ctx.mode];

    const fullPrompt = `${context}\n\n---\n\nUser Request: ${ctx.message}`;

    const history = ctx.history || [];
    history.push({ role: 'user' as const, content: fullPrompt });

    const response = await chat(history, {
      model: 'gemini-2.5-flash',
      systemPrompt,
    });

    const isHypothesis = response.includes('[HYPOTHESIS]') || response.includes('speculative') || response.includes('may have');

    return {
      success: true,
      response,
      hypothesisMode: isHypothesis,
    };
  } catch (error) {
    console.error('AI Assistant error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
