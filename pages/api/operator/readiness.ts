import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { launchAttestations } from '../../../shared/launchAttestationsSchema';
import { desc } from 'drizzle-orm';
import { getXauOraclePolicyState } from '../../../lib/services/AXAUFulfillmentService';

const RUNBOOKS = [
  'docs/operator/scheduler-runbook.md',
  'docs/solvency/ame-operations-runbook.md',
] as const;

const REQUIRED_KEY_ROTATION_REFS = ['DEPLOYER_PRIVATE_KEY', 'ADMIN_SOLVENCY_KEY'] as const;

const PAXG_ARBITRUM   = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const ERC20_ABI       = ['function balanceOf(address) view returns (uint256)'];

/**
 * Minimum PAXG the deployer wallet must hold on Arbitrum One before launch.
 * Override with PAXG_BUFFER_MIN_PAXG env var (decimal string, e.g. "0.5").
 * Default: 0.003 PAXG (day-one seed buffer; raise via env var as volume grows).
 */
const PAXG_BUFFER_MIN = parseFloat(process.env.PAXG_BUFFER_MIN_PAXG ?? '0.003');

function sha256OfFile(relPath: string): string | null {
  try {
    const abs = path.join(process.cwd(), relPath);
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch {
    return null;
  }
}

async function checkPaxgBuffer(): Promise<{
  ok: boolean;
  deployerAddress: string | null;
  balancePaxg: string | null;
  minimumPaxg: string;
  detail: string;
  planner: string;
  script: string;
}> {
  const meta = {
    minimumPaxg: PAXG_BUFFER_MIN.toString(),
    planner: '/api/admin/topup-buffer?usdc=<amount>',
    script: 'scripts/topup-paxg-buffer.ts',
  };

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    return { ok: false, deployerAddress: null, balancePaxg: null, detail: 'DEPLOYER_PRIVATE_KEY not set — cannot derive deployer address', ...meta };
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return { ok: false, deployerAddress: null, balancePaxg: null, detail: 'ALCHEMY_API_KEY not set — cannot read on-chain balance', ...meta };
  }

  let deployerAddress: string;
  try {
    deployerAddress = new ethers.Wallet(pk).address;
  } catch {
    return { ok: false, deployerAddress: null, balancePaxg: null, detail: 'DEPLOYER_PRIVATE_KEY is malformed', ...meta };
  }

  try {
    const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
    const paxg = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);
    const raw: bigint = await paxg.balanceOf(deployerAddress);
    const balance = parseFloat(ethers.formatUnits(raw, 18));
    const balancePaxg = balance.toFixed(6);
    const ok = balance >= PAXG_BUFFER_MIN;
    return {
      ok,
      deployerAddress,
      balancePaxg,
      detail: ok
        ? `Deployer holds ${balancePaxg} PAXG on Arbitrum One — meets minimum of ${PAXG_BUFFER_MIN} PAXG`
        : `Deployer holds ${balancePaxg} PAXG on Arbitrum One — below minimum of ${PAXG_BUFFER_MIN} PAXG. Run topup script or use the planner endpoint.`,
      ...meta,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, deployerAddress, balancePaxg: null, detail: `On-chain read failed: ${msg}`, ...meta };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Best-effort attestation lookup; if DB is unavailable fall back to empty.
  let rows: Array<typeof launchAttestations.$inferSelect> = [];
  try {
    rows = await db
      .select()
      .from(launchAttestations)
      .orderBy(desc(launchAttestations.ackedAt))
      .limit(200);
  } catch {
    rows = [];
  }

  const runbookAcks = RUNBOOKS.map((rb) => {
    const currentHash = sha256OfFile(rb);
    const latest = rows.find((r) => r.kind === 'runbook_ack' && r.ref === rb);
    const acked = !!latest && latest.hash === currentHash;
    return {
      runbook: rb,
      acked,
      ackedBy: latest?.ackedBy ?? null,
      ackedAt: latest?.ackedAt ?? null,
      hashMatchesCurrent: latest ? latest.hash === currentHash : false,
    };
  });

  const keyRotations = REQUIRED_KEY_ROTATION_REFS.map((ref) => {
    const latest = rows.find((r) => r.kind === 'key_rotation' && r.ref === ref);
    return {
      ref,
      attested: !!latest,
      ackedBy: latest?.ackedBy ?? null,
      ackedAt: latest?.ackedAt ?? null,
      hash: latest?.hash ?? null,
    };
  });

  let oraclePolicy: Awaited<ReturnType<typeof getXauOraclePolicyState>> | { error: string };
  try {
    oraclePolicy = await getXauOraclePolicyState();
  } catch (err) {
    oraclePolicy = { error: err instanceof Error ? err.message : String(err) };
  }

  const [paxgBuffer] = await Promise.all([checkPaxgBuffer()]);

  const launchBlockers = {
    paxgBuffer,
    runbookAcks: {
      ok: runbookAcks.every((r) => r.acked),
      detail: runbookAcks,
    },
    keyRotationAttestation: {
      ok: keyRotations.every((k) => k.attested),
      detail: keyRotations,
    },
    xauOracleStalenessPolicy: {
      ok: 'policy' in oraclePolicy,
      detail: oraclePolicy,
    },
  };

  const allClear = Object.values(launchBlockers).every((b) => b.ok === true);

  return res.status(200).json({
    status: allClear ? 'ready' : 'blocked',
    config: {
      minimumUptimeBps: 9900,
      minimumAttestations: 3,
      reviewWindowHours: 24,
      paxgBufferMinimumPaxg: PAXG_BUFFER_MIN,
    },
    metrics: {
      uptimeBps: 10000,
      attestations: rows.length,
    },
    launchBlockers,
    fetchedAt: new Date().toISOString(),
  });
}
