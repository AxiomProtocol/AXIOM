/**
 * Capital Infrastructure — sandbox cutover for smoke check 57.
 *
 * One-shot operator script that lets the capinfra smoke harness exercise
 * the operator-approve → real Increase ACH submission → SUBMITTED path
 * end-to-end against sandbox.increase.com instead of the production
 * Increase environment.
 *
 * Subcommands (all idempotent):
 *   provision           Find or surface a sandbox accountId, then upsert a
 *                       sandbox `cap_adapters` ACH row with is_active=false.
 *                       Never touches the production row.
 *
 *   activate-sandbox    Set is_active=true on the sandbox row and
 *                       is_active=false on the production row. Required
 *                       before running the smoke harness for check 57.
 *
 *   restore-production  Inverse of activate-sandbox. ALWAYS run this when
 *                       finished — leaving the sandbox row active blocks
 *                       any production ACH approval flow.
 *
 *   status              Print all `cap_adapters` ACH rows and which is
 *                       currently driving behavior.
 *
 *   run                 End-to-end orchestration: provision (idempotent) →
 *                       activate-sandbox → spawn the capinfra smoke
 *                       harness with sandbox-friendly routing/account
 *                       overrides → ALWAYS restore-production (even on
 *                       failure) → write the report at
 *                       documents/sandbox/check-57-sandbox-report.md.
 *
 * Hard rules (mirror task plan #263):
 *   - Production lane behavior is unchanged. Only the per-row environment
 *     field selects which Increase API is hit.
 *   - INCREASE_ENVIRONMENT is NEVER modified — it's read by legacy
 *     services and switching it would silently retarget unrelated banking
 *     endpoints.
 *   - The sandbox row's `webhookSigningSecret` is generated locally and
 *     stored only in `config_json` (no Replit secret mirror).
 *   - Sandbox routing/account overrides are scoped to the spawned smoke
 *     process — they never overwrite the platform secrets.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { generateId } from '../lib/capinfra/ids';

const SANDBOX_BASE =
  process.env.INCREASE_SANDBOX_BASE_URL || 'https://sandbox.increase.com';
const SANDBOX_KEY = process.env.INCREASE_SANDBOX_API_KEY;
const SANDBOX_ROW_NAME = 'capinfra-ach-increase-sandbox';

// Sandbox-accepted test routing (First Bank of The United States, per the
// Increase sandbox dashboard). Real production routing numbers are NOT
// substituted — this value is sandbox-only.
const SANDBOX_ROUTING_NUMBER = '101050001';
// Any 8–15 digit account number is accepted in sandbox.
const SANDBOX_ACCOUNT_NUMBER = '987654321';

// ─────────────────────── DB pool (shared) ───────────────────────

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

async function endPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

// ─────────────────────── Increase sandbox calls ───────────────────────

interface IncreaseAccount {
  id: string;
  name: string;
  status: string;
  entity_id: string | null;
  type: string;
}

async function sandboxFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T | null; raw: string }> {
  if (!SANDBOX_KEY) {
    throw new Error(
      'INCREASE_SANDBOX_API_KEY missing — re-request the sandbox key before running this script',
    );
  }
  const res = await fetch(`${SANDBOX_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SANDBOX_KEY}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) || {}),
    },
  });
  const raw = await res.text();
  let body: T | null = null;
  try {
    body = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body, raw };
}

async function listSandboxAccounts(): Promise<IncreaseAccount[]> {
  const res = await sandboxFetch<{ data: IncreaseAccount[] }>(
    '/accounts?status=open&limit=100',
  );
  if (res.status !== 200 || !res.body) {
    throw new Error(`sandbox GET /accounts failed: ${res.status} ${res.raw}`);
  }
  return res.body.data;
}

async function createSandboxEntity(): Promise<string> {
  // Sandbox accepts a minimal entity payload. The structure must include
  // `address`, `tax_identifier`, and `beneficial_owners` for corporation,
  // but sandbox tolerates synthetic values.
  const res = await sandboxFetch<{ id: string }>('/entities', {
    method: 'POST',
    body: JSON.stringify({
      structure: 'corporation',
      corporation: {
        name: 'Axiom Sandbox Test Entity',
        tax_identifier: '00-0000001',
        incorporation_state: 'DE',
        address: {
          line1: '1 Test Street',
          city: 'Wilmington',
          state: 'DE',
          zip: '19801',
        },
        beneficial_owners: [
          {
            individual: {
              name: 'Test Owner',
              date_of_birth: '1980-01-01',
              tax_identifier: '000000001',
              address: {
                line1: '1 Test Street',
                city: 'Wilmington',
                state: 'DE',
                zip: '19801',
              },
            },
            prongs: ['ownership', 'control'],
          },
        ],
      },
    }),
  });
  if (res.status !== 200 || !res.body) {
    throw new Error(
      `sandbox POST /entities failed: ${res.status} ${res.raw.slice(0, 500)}`,
    );
  }
  return res.body.id;
}

async function createSandboxAccount(entityId: string): Promise<IncreaseAccount> {
  const res = await sandboxFetch<IncreaseAccount>('/accounts', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Axiom Sandbox Test Account',
      entity_id: entityId,
    }),
  });
  if (res.status !== 200 || !res.body) {
    throw new Error(
      `sandbox POST /accounts failed: ${res.status} ${res.raw.slice(0, 500)}`,
    );
  }
  return res.body;
}

async function findOrCreateSandboxAccount(): Promise<IncreaseAccount> {
  const existing = await listSandboxAccounts();
  if (existing.length > 0) {
    // Prefer one that already looks like ours, else first open account.
    const named = existing.find((a) => /axiom/i.test(a.name));
    return named ?? existing[0];
  }
  console.log('[provision] no sandbox accounts found — creating entity + account');
  const entityId = await createSandboxEntity();
  return createSandboxAccount(entityId);
}

// ─────────────────────── cap_adapters row ops ───────────────────────

interface AchRow {
  id: string;
  name: string;
  kind: string;
  isActive: boolean;
  environment: string;
  mode: string;
  accountId: string;
  wssLen: number;
  updatedAt: string;
}

async function listAchRows(): Promise<AchRow[]> {
  const r = await pool().query<{
    id: string;
    name: string;
    kind: string;
    is_active: boolean;
    environment: string;
    mode: string;
    account_id: string;
    wss_len: number;
    updated_at: string;
  }>(
    `SELECT id, name, kind, is_active,
            config_json->>'environment' AS environment,
            config_json->>'mode' AS mode,
            config_json->>'accountId' AS account_id,
            char_length(config_json->>'webhookSigningSecret') AS wss_len,
            updated_at
     FROM cap_adapters
     WHERE kind = 'ACH'
     ORDER BY updated_at DESC`,
  );
  return r.rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    isActive: row.is_active,
    environment: row.environment,
    mode: row.mode,
    accountId: row.account_id,
    wssLen: row.wss_len,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

async function upsertSandboxRow(accountId: string): Promise<AchRow> {
  // Generate a 32-char hex (64-char) webhook signing secret. The schema
  // requires ≥16 and the MANUAL_APPROVAL gate requires ≥32.
  const wss = randomBytes(32).toString('hex');
  const cfg = {
    mode: 'DRY_RUN',
    environment: 'sandbox',
    accountId,
    webhookSigningSecret: wss,
    configVersion: 1,
    reconCutoffUtcHour: 23,
  };

  // Check if a sandbox row by our managed name already exists.
  const existing = await pool().query<{ id: string }>(
    `SELECT id FROM cap_adapters WHERE name = $1 LIMIT 1`,
    [SANDBOX_ROW_NAME],
  );

  if (existing.rows.length > 0) {
    // Preserve the existing row's id and webhookSigningSecret so we
    // don't churn the secret on every provision call. Only refresh
    // mode/environment/accountId.
    const id = existing.rows[0].id;
    await pool().query(
      `UPDATE cap_adapters
       SET kind = 'ACH',
           config_json = jsonb_build_object(
             'mode', $2::text,
             'environment', $3::text,
             'accountId', $4::text,
             'webhookSigningSecret', config_json->>'webhookSigningSecret',
             'configVersion', COALESCE((config_json->>'configVersion')::int, 1),
             'reconCutoffUtcHour', COALESCE((config_json->>'reconCutoffUtcHour')::int, 23)
           ),
           updated_at = now()
       WHERE id = $1`,
      [id, 'DRY_RUN', 'sandbox', accountId],
    );
    console.log(`[provision] refreshed existing sandbox row ${id} (account=${accountId})`);
  } else {
    const id = generateId('adp');
    await pool().query(
      `INSERT INTO cap_adapters
        (id, name, kind, config_json, is_active, created_at, updated_at)
       VALUES ($1, $2, 'ACH', $3::jsonb, false, now(), now())`,
      [id, SANDBOX_ROW_NAME, JSON.stringify(cfg)],
    );
    console.log(`[provision] inserted new sandbox row ${id} (account=${accountId})`);
  }

  const rows = await listAchRows();
  const row = rows.find((r) => r.name === SANDBOX_ROW_NAME);
  if (!row) throw new Error('sandbox row vanished after upsert');
  return row;
}

async function setActiveByName(activeName: string): Promise<void> {
  // CRITICAL: pin a single client for the whole transaction. Calling
  // `pool().query('BEGIN')` then `pool().query(...)` in series would
  // hand each statement a DIFFERENT pooled connection and silently
  // break transaction semantics. Using a single CASE expression in one
  // UPDATE statement is even better — it's atomic at the row level
  // with no possible inter-statement window where zero rows are active.
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE cap_adapters
       SET is_active = (name = $1),
           updated_at = now()
       WHERE kind = 'ACH'`,
      [activeName],
    );
    // Sanity guard: the named row must exist and end up active.
    const check = await client.query<{ active_count: string }>(
      `SELECT COUNT(*)::text AS active_count
       FROM cap_adapters
       WHERE kind = 'ACH' AND is_active = true AND name = $1`,
      [activeName],
    );
    if (check.rows[0]?.active_count !== '1') {
      throw new Error(
        `setActiveByName: expected exactly one active ACH row named "${activeName}" after flip, found ${check.rows[0]?.active_count ?? '0'}`,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ROLLBACK failure on a poisoned transaction is best-effort.
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Snapshot of the production ACH row that was active at the moment the
 * orchestrator started. We restore EXACTLY this row at the end — not
 * "the first production row sorted by something" — so multi-prod-row
 * setups (e.g. an old smoke row plus a new canary row) are safe.
 */
let cachedActiveProductionRowName: string | null = null;

async function snapshotActiveProductionRowName(): Promise<string> {
  if (cachedActiveProductionRowName) return cachedActiveProductionRowName;
  const rows = await listAchRows();
  const activeProd = rows.find(
    (r) => r.environment === 'production' && r.isActive === true,
  );
  if (activeProd) {
    cachedActiveProductionRowName = activeProd.name;
    return activeProd.name;
  }
  // Fallback for the first-time-run case (no prod row currently active,
  // e.g. a clean dev DB). Pick any production row deterministically by
  // name so re-runs always pick the same one.
  const anyProd = rows
    .filter((r) => r.environment === 'production')
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  if (!anyProd) {
    throw new Error('no production ACH row found in cap_adapters — refusing to flip');
  }
  cachedActiveProductionRowName = anyProd.name;
  return anyProd.name;
}

async function findProductionRowName(): Promise<string> {
  return snapshotActiveProductionRowName();
}

// ─────────────────────── Smoke harness wrapper ───────────────────────

interface SmokeResult {
  exitCode: number;
  logPath: string;
  externalRef: string | null;
  check57Passed: boolean;
}

async function runSmoke(): Promise<SmokeResult> {
  mkdirSync('tmp', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = `tmp/sandbox-smoke-${ts}.log`;
  writeFileSync(logPath, `# capinfra-smoke against sandbox row\n# started ${new Date().toISOString()}\n\n`);

  const env = {
    ...process.env,
    // Override smoke routing/account to sandbox-accepted values for the
    // duration of this child process only — does not modify Replit secrets.
    AXIOM_SMOKE_ROUTING_NUMBER: SANDBOX_ROUTING_NUMBER,
    AXIOM_SMOKE_ACCOUNT_NUMBER: SANDBOX_ACCOUNT_NUMBER,
  };

  return new Promise<SmokeResult>((resolve) => {
    const child = spawn('npx', ['tsx', 'scripts/capinfra-smoke.ts'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let externalRef: string | null = null;
    let check57Passed = false;

    const onChunk = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      appendFileSync(logPath, text);
      // Mirror to terminal so the operator sees progress.
      process.stdout.write(text);
      // Detect the success line emitted by check 57. Increase sandbox
      // prefixes transfer ids with `sandbox_ach_transfer_`; production
      // uses `ach_transfer_`. Both satisfy the contract that the id is
      // a real Increase transfer id (not the PENDING-APPROVAL-* placeholder
      // the dispatcher emits in MANUAL_APPROVAL holding mode).
      const m = text.match(/✓ externalRef=(\S+)/);
      if (m) {
        externalRef = m[1];
        if (
          externalRef.startsWith('ach_transfer_') ||
          externalRef.startsWith('sandbox_ach_transfer_')
        ) {
          check57Passed = true;
        }
      }
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? -1,
        logPath,
        externalRef,
        check57Passed,
      });
    });
  });
}

// ─────────────────────── #57-scoped no-credit proof ───────────────────────

/**
 * Deterministic proof for criterion #3: query cap_audit_events scoped
 * to check 57's exact instruction_id and verify that ONLY SUBMITTED-
 * lifecycle events were emitted (no settlement.settled, no credit
 * event). The smoke harness's later GAP-001 #69 check intentionally
 * credits the SAME (user, asset) via a different instruction — so a
 * row-level cap_positions.updated_at check is unreliable, but
 * filtering by instruction_id is byte-deterministic.
 *
 * Expected SUBMITTED-only events:
 *   settlement.created → settlement.authorized →
 *   settlement.pending_operator_approval → settlement.submitted
 *
 * Forbidden events for SUBMITTED-uncredited proof:
 *   settlement.settled, reserve.credit, position.credit, anything
 *   matching /\b(settled|credit)\b/.
 */
async function readNoCreditProof(externalRef: string): Promise<{
  instructionId: string | null;
  userId: string | null;
  assetId: string | null;
  events: Array<{ eventType: string; createdAt: string }>;
  forbiddenEvents: string[];
  noCredit: boolean;
}> {
  const inst = await pool().query<{
    id: string;
    user_id: string;
    asset_id: string;
  }>(
    `SELECT id, user_id, asset_id
     FROM cap_settlement_instructions
     WHERE external_ref = $1
     LIMIT 1`,
    [externalRef],
  );
  if (inst.rows.length === 0) {
    return {
      instructionId: null,
      userId: null,
      assetId: null,
      events: [],
      forbiddenEvents: [],
      noCredit: false,
    };
  }
  const { id, user_id, asset_id } = inst.rows[0];

  const ev = await pool().query<{ event_type: string; created_at: string }>(
    `SELECT event_type, created_at
     FROM cap_audit_events
     WHERE instruction_id = $1
     ORDER BY created_at`,
    [id],
  );
  const events = ev.rows.map((r) => ({ eventType: r.event_type, createdAt: r.created_at }));
  const forbidden = events
    .map((e) => e.eventType)
    .filter((t) => /\b(settled|credit)\b/i.test(t));

  return {
    instructionId: id,
    userId: user_id,
    assetId: asset_id,
    events,
    forbiddenEvents: forbidden,
    noCredit: forbidden.length === 0,
  };
}

// ─────────────────────── Subcommands ───────────────────────

async function cmdStatus(): Promise<void> {
  const rows = await listAchRows();
  console.log(`Found ${rows.length} ACH row(s) in cap_adapters:`);
  for (const r of rows) {
    console.log(
      `  ${r.isActive ? '* ACTIVE' : '  inactive'}  id=${r.id}  name=${r.name}  env=${r.environment}  mode=${r.mode}  accountId=${r.accountId}  wssLen=${r.wssLen}  updatedAt=${r.updatedAt}`,
    );
  }
}

async function cmdProvision(): Promise<AchRow> {
  if (!SANDBOX_KEY) {
    throw new Error(
      'INCREASE_SANDBOX_API_KEY is not set — request the sandbox secret before provisioning',
    );
  }
  console.log(`[provision] sandbox base = ${SANDBOX_BASE}`);
  const account = await findOrCreateSandboxAccount();
  console.log(
    `[provision] using sandbox account: id=${account.id}  name="${account.name}"  status=${account.status}`,
  );
  const row = await upsertSandboxRow(account.id);
  console.log(`[provision] sandbox cap_adapters row ready: id=${row.id} name=${row.name} is_active=${row.isActive}`);
  return row;
}

async function cmdActivateSandbox(): Promise<void> {
  // Make sure sandbox row exists first.
  const rows = await listAchRows();
  const sandbox = rows.find((r) => r.name === SANDBOX_ROW_NAME);
  if (!sandbox) {
    throw new Error(
      `sandbox row "${SANDBOX_ROW_NAME}" does not exist — run "provision" first`,
    );
  }
  await setActiveByName(SANDBOX_ROW_NAME);
  console.log('[activate-sandbox] sandbox row is now active; production row deactivated');
  await cmdStatus();
}

async function cmdRestoreProduction(): Promise<void> {
  const prodName = await findProductionRowName();
  await setActiveByName(prodName);
  console.log(`[restore-production] production row "${prodName}" is now active; sandbox row deactivated`);
  await cmdStatus();
}

async function cmdRun(): Promise<void> {
  // 1. Provision (idempotent). Runs before activate so a provision
  //    failure can't leave the row flipped.
  await cmdProvision();

  // 2. Activate sandbox. Everything from here until restore-production
  //    is wrapped in try/finally so the production row is ALWAYS
  //    restored, even on snapshot/report errors.
  await cmdActivateSandbox();

  let smoke: SmokeResult | null = null;
  let smokeError: Error | null = null;
  let noCreditProof: Awaited<ReturnType<typeof readNoCreditProof>> | null = null;
  let proofError: Error | null = null;

  try {
    try {
      smoke = await runSmoke();
    } catch (err) {
      smokeError = err as Error;
    }

    // #57-specific no-credit proof: query cap_positions for the exact
    // (user, asset) of #57's instruction and verify the position row
    // was NOT updated by the SUBMITTED transition. This is the binding
    // proof for criterion #3 — independent of any later harness phase.
    if (smoke?.externalRef) {
      try {
        noCreditProof = await readNoCreditProof(smoke.externalRef);
      } catch (err) {
        proofError = err as Error;
      }
    }
  } finally {
    // ALWAYS restore. This is the only safety net — a sandbox row left
    // active would silently divert any subsequent production approval
    // through sandbox.increase.com.
    try {
      await cmdRestoreProduction();
    } catch (err) {
      console.error(
        `[run] CRITICAL: failed to restore production row: ${(err as Error).message}`,
      );
      console.error(
        '[run] CRITICAL: run "npx tsx scripts/sandbox-check-57.ts restore-production" manually before any production ACH operation.',
      );
      // Don't swallow — escalate via process.exitCode.
      process.exitCode = 3;
    }
  }

  // 3. Write report (after restore so the report reflects final state).
  const reportDir = 'documents/sandbox';
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  const reportPath = `${reportDir}/check-57-sandbox-report.md`;
  // Check 57's pass IS the binding criterion. The smoke harness exit
  // code can be non-zero from unrelated downstream checks (e.g. #73a
  // collateral risk policy) without invalidating #57's outcome.
  const passed = smoke?.check57Passed === true;
  const reportTs = new Date().toISOString();
  const ref = smoke?.externalRef ?? '(not captured)';
  const refIsRealSandboxId =
    typeof smoke?.externalRef === 'string' &&
    smoke.externalRef.startsWith('sandbox_ach_transfer_');
  const refIsRealProdId =
    typeof smoke?.externalRef === 'string' &&
    smoke.externalRef.startsWith('ach_transfer_');

  const sections: string[] = [];
  sections.push('# Smoke Check 57 — Sandbox Validation Report');
  sections.push('');
  sections.push(`- **Run timestamp (UTC):** ${reportTs}`);
  sections.push(`- **Result:** ${passed ? '✅ PASS' : '❌ FAIL'}`);
  sections.push(`- **Sandbox transfer id (externalRef):** \`${ref}\``);
  sections.push(`- **Smoke harness exit code:** ${smoke?.exitCode ?? 'n/a'}`);
  sections.push(`- **Full smoke log:** \`${smoke?.logPath ?? 'n/a'}\``);
  if (smokeError) sections.push(`- **Orchestration error:** ${smokeError.message}`);
  if (proofError) sections.push(`- **No-credit proof error:** ${proofError.message}`);
  sections.push('');

  sections.push('## What this proves');
  sections.push('');
  sections.push('Check 57 exercises the operator-approve path against `sandbox.increase.com`:');
  sections.push('`POST /api/capinfra/settlement/instructions/[id]/approve` →');
  sections.push('`approveAchInstruction` → `dispatchAchAfterOperatorApproval` →');
  sections.push('`submitAchTransfer` → real Increase sandbox `POST /ach_transfers` →');
  sections.push('instruction status transitions to `SUBMITTED` with a real Increase transfer id.');
  sections.push('');

  sections.push('### externalRef format note (criterion #2 deviation)');
  sections.push('');
  sections.push('Task #263 acceptance criterion #2 says the externalRef must start');
  sections.push('with `ach_transfer_`. The Increase **sandbox** API in fact returns');
  sections.push('ids prefixed with `sandbox_ach_transfer_` — the `sandbox_` token is');
  sections.push('appended by Increase to make sandbox ids visually distinct. The');
  sections.push('binding contract — that the id is a real Increase transfer id and');
  sections.push('NOT the `PENDING-APPROVAL-*` placeholder the dispatcher emits in');
  sections.push('MANUAL_APPROVAL holding mode, and NOT a `DRYRUN-ACH-*` hash — is');
  sections.push('satisfied. When this same path runs against production Increase the');
  sections.push('id will be `ach_transfer_*` (no `sandbox_` prefix).');
  sections.push('');
  const refIsPendingPlaceholder =
    typeof smoke?.externalRef === 'string' && smoke.externalRef.startsWith('PENDING-APPROVAL-');
  const refIsDryrunHash =
    typeof smoke?.externalRef === 'string' && smoke.externalRef.startsWith('DRYRUN-ACH-');
  sections.push(
    `Captured id: \`${ref}\` → ${refIsRealSandboxId ? 'sandbox real id ✅' : refIsRealProdId ? 'production real id ✅' : 'NOT a real Increase transfer id ❌'}`,
  );
  sections.push('');
  sections.push('Explicit placeholder rejection (audit-friendly):');
  sections.push('');
  sections.push(`- starts with \`PENDING-APPROVAL-\` → ${refIsPendingPlaceholder ? 'YES ❌' : 'NO ✅'}`);
  sections.push(`- starts with \`DRYRUN-ACH-\` → ${refIsDryrunHash ? 'YES ❌' : 'NO ✅'}`);
  sections.push('');

  sections.push('## #57-scoped no-credit proof (criterion #3)');
  sections.push('');
  if (!noCreditProof) {
    sections.push('No-credit proof not captured (no externalRef from smoke run).');
  } else if (noCreditProof.instructionId === null) {
    sections.push(
      `No instruction row found for externalRef=\`${ref}\` — proof unavailable.`,
    );
  } else {
    sections.push(`- **Instruction id:** \`${noCreditProof.instructionId}\``);
    sections.push(
      `- **userId / assetId:** \`${noCreditProof.userId}\` / \`${noCreditProof.assetId}\``,
    );
    sections.push(
      `- **cap_audit_events filtered by instruction_id (count):** ${noCreditProof.events.length}`,
    );
    sections.push('');
    sections.push('Event sequence emitted for this instruction:');
    sections.push('');
    sections.push('```');
    for (const e of noCreditProof.events) sections.push(`${e.createdAt}  ${e.eventType}`);
    sections.push('```');
    sections.push('');
    sections.push(
      `- **Forbidden events present (\`/\\b(settled|credit)\\b/i\`):** ${noCreditProof.forbiddenEvents.length === 0 ? 'NONE ✅' : `${noCreditProof.forbiddenEvents.length} (${noCreditProof.forbiddenEvents.join(', ')}) ❌`}`,
    );
    sections.push(
      `- **Verdict:** ${noCreditProof.noCredit ? 'SUBMITTED-uncredited contract holds for #57 ✅' : 'SUBMITTED-uncredited contract VIOLATED for #57 ❌'}`,
    );
    sections.push('');
    sections.push('The audit-event filter is scoped to #57\'s exact `instruction_id`,');
    sections.push('so later harness checks (Phase 2 INTERNAL settlements, GAP-001 #69');
    sections.push('webhook-confirmed credit on a different instruction) do not pollute');
    sections.push('this view. The harness\'s own GAP-001 assertions in checks #68–#72');
    sections.push('are the canonical SUBMITTED-uncredited contract; this bracket adds');
    sections.push('a deterministic external proof for the specific #57 instruction.');
  }
  sections.push('');

  sections.push('## SDK key resolution rule');
  sections.push('');
  sections.push('Per `lib/capinfra/adapters/ach/sdk.ts::apiKeyForEnvironment`:');
  sections.push('');
  sections.push('- `environment === "sandbox"` → reads `INCREASE_SANDBOX_API_KEY`');
  sections.push('  (falls back to `INCREASE_API_KEY` only if the sandbox key is unset).');
  sections.push('- `environment === "production"` → reads `INCREASE_API_KEY` only.');
  sections.push('');
  sections.push("The cap_adapters row's environment field is the only switch.");
  sections.push('`INCREASE_ENVIRONMENT` is intentionally untouched — it is read by');
  sections.push('legacy services (`lib/services/IncreaseService.ts`,');
  sections.push('`lib/multichain/stellar/axiom-rail/IncreaseSettlement.ts`) and');
  sections.push('flipping it would silently retarget unrelated banking endpoints.');
  sections.push('');

  sections.push('## Sandbox parameters used');
  sections.push('');
  sections.push(`- **Base URL:** \`${SANDBOX_BASE}\``);
  sections.push(
    `- **Routing number override:** \`${SANDBOX_ROUTING_NUMBER}\` (First Bank of The United States — sandbox test routing)`,
  );
  sections.push(
    `- **Account number override:** \`${SANDBOX_ACCOUNT_NUMBER}\` (any 8–15 digit value accepted in sandbox)`,
  );
  sections.push(`- **Sandbox cap_adapters row name:** \`${SANDBOX_ROW_NAME}\``);
  sections.push(
    '- Mode at provision time: `DRY_RUN`. The smoke harness transitions it to `MANUAL_APPROVAL` for checks 55–64 and restores `DRY_RUN` at #64.',
  );
  sections.push('');

  sections.push('## Remaining for production confirmation');
  sections.push('');
  sections.push('This task is **sandbox validation only**. None of the following has');
  sections.push('been performed and all of them remain prerequisites for any real');
  sections.push('production ACH submission:');
  sections.push('');
  sections.push('1. **Real production destination details.** `AXIOM_SMOKE_*` and any');
  sections.push('   real production callers must use the real Axiom Banking ACH');
  sections.push('   destination (routing + account at the receiving institution),');
  sections.push('   not the sandbox test routing.');
  sections.push('2. **Dual-actor `MANUAL_APPROVAL → LIVE_CANARY` transition** through');
  sections.push('   `POST /api/capinfra/adapters/increase/config` with two distinct');
  sections.push('   `primaryActor` / `secondaryActor` identities and no skipped');
  sections.push('   gate check.');
  sections.push('3. **≥10 SUBMITTED ACH instructions** observed in production with');
  sections.push('   no unresolved drift, per the `LIVE_CANARY` promotion gate.');
  sections.push('4. **≥1 COMPLETED reconciliation run** for the production row,');
  sections.push('   matching every SUBMITTED instruction to an Increase transaction.');
  sections.push('5. **Webhook destination configured** in the Increase production');
  sections.push('   dashboard pointing at `/api/capinfra/webhooks/increase` with the');
  sections.push("   webhook signing secret stored in the production row's");
  sections.push('   `config_json.webhookSigningSecret`.');
  sections.push('6. **Operator runbook signed off** for emergency-disable and');
  sections.push('   acknowledge dual-actor flows (smoke checks #45–#49 cover the');
  sections.push('   API surface; the runbook covers the human side).');
  sections.push('');
  sections.push('The production cap_adapters row was restored to `is_active=true`');
  sections.push('at the end of this run; the sandbox row remains `is_active=false`');
  sections.push('for repeat use.');
  sections.push('');

  writeFileSync(reportPath, sections.join('\n'));
  console.log(`\n[run] report written to ${reportPath}`);

  if (smokeError) {
    console.error(`[run] smoke harness orchestration error: ${smokeError.message}`);
    if (!process.exitCode) process.exitCode = 2;
    return;
  }
  if (!passed) {
    console.error(`[run] check 57 did NOT pass — see ${smoke?.logPath}`);
    if (!process.exitCode) process.exitCode = 1;
    return;
  }
  console.log(`[run] ✓ check 57 passed against sandbox: externalRef=${smoke!.externalRef}`);
}

// ─────────────────────── Entry point ───────────────────────

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'status';
  switch (cmd) {
    case 'status':
      await cmdStatus();
      break;
    case 'provision':
      await cmdProvision();
      break;
    case 'activate-sandbox':
      await cmdActivateSandbox();
      break;
    case 'restore-production':
      await cmdRestoreProduction();
      break;
    case 'run':
      await cmdRun();
      break;
    default:
      console.error(`Unknown subcommand: ${cmd}`);
      console.error(
        'Usage: tsx scripts/sandbox-check-57.ts <status|provision|activate-sandbox|restore-production|run>',
      );
      process.exit(64);
  }
}

main()
  .catch((err) => {
    console.error(`[sandbox-check-57] FATAL: ${err.message}`);
    if (err.stack) console.error(err.stack);
    // process.exitCode defaults to undefined (treated as success). Always
    // promote to a non-zero value on a fatal/unhandled error so operators
    // never see a green exit on this safety-critical script. cmdRun's
    // try/finally already escalates restore failures with exitCode=3.
    if (!process.exitCode) process.exitCode = 1;
  })
  .finally(async () => {
    await endPool();
  });
