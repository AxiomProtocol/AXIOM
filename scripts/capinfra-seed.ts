/**
 * Capital Infrastructure — seed script (Phase 1 + Phase 2 bootstrap).
 *
 * Idempotently seeds:
 *   Phase 1
 *     - Asset registry (AXAU, AXUSD-TREASURY, PAXG)
 *   Phase 2 (additive)
 *     - Internal settlement adapter row (cap_adapters)
 *     - Two ledger accounts used by `applySettlement`:
 *         · cap_internal_assets       (ASSET / TRADING)
 *         · cap_internal_liabilities  (LIABILITY / CASH)
 *     - A smoke-test user with a full claim set so the Phase 2 smoke
 *       harness can drive a real settlement end-to-end.
 *
 * Run with:  npx tsx scripts/capinfra-seed.ts
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createAsset, getAssetBySymbol } from '../lib/capinfra';
import {
  createAdapter,
  getAdapterRowByName,
} from '../lib/capinfra/adapters/registry';
import { generateId } from '../lib/capinfra/ids';
import { db } from '../server/db';
import {
  capUsers,
  capIdentityProfiles,
  capClaims,
} from '../shared/capInfraSchema';
import { capAccounts } from '../shared/schema';
import type { AssetCreateInput } from '../lib/capinfra/types';

const SEEDS: AssetCreateInput[] = [
  {
    symbol: 'AXAU',
    displayName: 'Axiom Gold Reserve Instrument',
    assetType: 'PHYSICAL_METAL',
    assetSubtype: 'GOLD',
    custodyModel: 'ALLOCATED_PHYSICAL',
    redemptionType: 'PHYSICAL_DELIVERY',
    settlementType: 'EVM',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
    decimals: 18,
    issuer: 'Axiom Protocol',
    exposureClass: 'RESTRICTED',
    status: 'ACTIVE',
    collateralClass: 'GREEN',
    collateralClassificationRationale:
      'Native AXAU is fully backed by allocated PAXG with active reserve attestation and a primary/secondary oracle profile. Meets §3 controls for GREEN admission.',
    basePolicyJson: { perTransactionMax: null, requiresIdentity: true },
    metadataJson: {
      reservePolicy: 'allocated_physical_paxg_backing',
      oracleProfile: {
        primarySource: 'paxos',
        secondarySource: 'alphavantage',
        staleSec: 900,
        divergenceBps: 200,
      },
    },
  },
  {
    symbol: 'AXUSD-TREASURY',
    displayName: 'AXUSD Treasury Segment',
    assetType: 'STABLE_ASSET',
    assetSubtype: 'NONE',
    custodyModel: 'SEGREGATED_CUSTODY',
    redemptionType: 'CASH',
    settlementType: 'INTERNAL',
    chain: 'arbitrum-one',
    chainId: 42161,
    decimals: 6,
    issuer: 'Axiom Protocol',
    exposureClass: 'RESTRICTED',
    status: 'ACTIVE',
    collateralClass: 'YELLOW',
    collateralClassificationRationale:
      'AXUSD treasury segment is admitted with mandatory per-asset cap (perTransactionMax 1,000,000) and isolated-market constraint. YELLOW until reserve attestation cadence reaches GREEN policy threshold.',
    basePolicyJson: { perTransactionMax: '1000000', requiresIdentity: true },
    metadataJson: {
      segment: 'treasury_managed_reserve',
      oracleProfile: {
        primarySource: 'manual',
        secondarySource: 'manual',
        staleSec: 3600,
        divergenceBps: 50,
      },
    },
  },
  {
    symbol: 'AXUSD-FUJI',
    displayName: 'Axiom Stable 3643 Fuji (testnet)',
    assetType: 'STABLE_ASSET',
    assetSubtype: 'NONE',
    custodyModel: 'ON_CHAIN_NATIVE',
    redemptionType: 'NONE',
    settlementType: 'AVALANCHE',
    chain: 'avalanche-fuji',
    chainId: 43113,
    contractAddress: '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
    decimals: 6,
    issuer: 'Axiom Protocol',
    exposureClass: 'RESTRICTED',
    status: 'ACTIVE',
    collateralClass: 'YELLOW',
    collateralClassificationRationale:
      'Fuji testnet asset. Not eligible for production collateral. YELLOW until mainnet promotion gate is satisfied.',
    basePolicyJson: { perTransactionMax: '1', requiresIdentity: true },
    metadataJson: {
      testnet: true,
      network: 'avalanche-fuji',
      chainId: 43113,
      gate5Satisfied: true,
    },
  },
  {
    symbol: 'PAXG',
    displayName: 'Paxos Gold',
    assetType: 'PHYSICAL_METAL',
    assetSubtype: 'GOLD',
    custodyModel: 'ISSUER_CUSTODY',
    redemptionType: 'PHYSICAL_DELIVERY',
    settlementType: 'EVM',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
    decimals: 18,
    issuer: 'Paxos Trust Company',
    exposureClass: 'UNRESTRICTED',
    status: 'ACTIVE',
    collateralClass: 'GREEN',
    collateralClassificationRationale:
      'Paxos Gold is issuer-attested allocated gold with redemption rights and primary/secondary oracle inputs. Meets §3 controls for GREEN admission as the AXAU reserve input.',
    basePolicyJson: { perTransactionMax: null, requiresIdentity: false },
    metadataJson: {
      external: true,
      reference: 'oracle_input',
      oracleProfile: {
        primarySource: 'coinbase',
        secondarySource: 'alphavantage',
        staleSec: 300,
        divergenceBps: 150,
      },
    },
  },
];

const SMOKE_USER_ID = 'usr_capinfra_smoke';
const SMOKE_USER_EXTERNAL = 'capinfra-smoke@axiom.local';

const REQUIRED_CLAIMS = [
  'KYC_VERIFIED',
  'SANCTIONS_CLEARED',
  'AML_CLEARED',
  'JURISDICTION_ALLOWED',
] as const;

async function seedAssets() {
  for (const seed of SEEDS) {
    const existing = await getAssetBySymbol(seed.symbol);
    if (existing) {
      console.log(`  ↪ ${seed.symbol} already present (id=${existing.id})`);
      continue;
    }
    const created = await createAsset(seed, 'capinfra-seed', 'capinfra-seed-bootstrap');
    console.log(`  ✓ created ${created.symbol} → ${created.id}`);
  }
}

async function seedAdapter() {
  const existing = await getAdapterRowByName('capinfra-internal');
  if (existing) {
    console.log(`  ↪ adapter capinfra-internal present (id=${existing.id})`);
    return;
  }
  const created = await createAdapter(
    {
      name: 'capinfra-internal',
      kind: 'INTERNAL',
      configJson: { description: 'Internal settlement adapter (no external rail)' },
      isActive: true,
    },
    'capinfra-seed',
  );
  console.log(`  ✓ created adapter ${created.name} → ${created.id}`);
}

async function seedAccounts() {
  const accountSeeds = [
    {
      name: 'cap_internal_assets',
      accountType: 'ASSET' as const,
      subtype: 'TRADING' as const,
    },
    {
      name: 'cap_internal_liabilities',
      accountType: 'LIABILITY' as const,
      subtype: 'CASH' as const,
    },
  ];
  for (const a of accountSeeds) {
    const rows = await db.select().from(capAccounts).where(eq(capAccounts.name, a.name)).limit(1);
    if (rows[0]) {
      console.log(`  ↪ account ${a.name} present (id=${rows[0].id})`);
      continue;
    }
    const [created] = await db
      .insert(capAccounts)
      .values({
        name: a.name,
        accountType: a.accountType,
        subtype: a.subtype,
        currency: 'AXUSD',
        isActive: true,
      })
      .returning();
    console.log(`  ✓ created account ${created.name} → ${created.id}`);
  }
}

async function seedSmokeUser() {
  const existing = await db
    .select()
    .from(capUsers)
    .where(eq(capUsers.id, SMOKE_USER_ID))
    .limit(1);
  if (!existing[0]) {
    await db.insert(capUsers).values({
      id: SMOKE_USER_ID,
      externalId: SMOKE_USER_EXTERNAL,
      entityType: 'NATURAL_PERSON',
      primaryEmail: SMOKE_USER_EXTERNAL,
      jurisdiction: 'US',
      status: 'ACTIVE',
    });
    console.log(`  ✓ created smoke user ${SMOKE_USER_ID}`);
  } else {
    console.log(`  ↪ smoke user ${SMOKE_USER_ID} present`);
  }

  const profileRows = await db
    .select()
    .from(capIdentityProfiles)
    .where(eq(capIdentityProfiles.userId, SMOKE_USER_ID))
    .limit(1);
  if (!profileRows[0]) {
    await db.insert(capIdentityProfiles).values({
      id: generateId('ip'),
      userId: SMOKE_USER_ID,
      legalName: 'Capinfra Smoke Test',
      countryOfResidence: 'US',
      countryOfCitizenship: 'US',
      exposureClass: 'RESTRICTED',
    });
    console.log(`  ✓ created smoke identity profile`);
  }

  const existingClaims = await db
    .select()
    .from(capClaims)
    .where(eq(capClaims.userId, SMOKE_USER_ID));
  const existingClaimTypes = new Set(existingClaims.map((c) => c.claimType));
  for (const ct of REQUIRED_CLAIMS) {
    if (existingClaimTypes.has(ct)) continue;
    await db.insert(capClaims).values({
      id: generateId('cl'),
      userId: SMOKE_USER_ID,
      claimType: ct,
      status: 'VALID',
      issuer: 'capinfra-seed',
    });
    console.log(`  ✓ issued ${ct} claim to smoke user`);
  }
}

async function main() {
  console.log('[capinfra-seed] start');
  console.log(' phase-1: assets');
  await seedAssets();
  console.log(' phase-2: adapters');
  await seedAdapter();
  console.log(' phase-2: accounts');
  await seedAccounts();
  console.log(' phase-2: smoke user');
  await seedSmokeUser();
  console.log('[capinfra-seed] done');
  process.exit(0);
}

main().catch((err) => {
  console.error('[capinfra-seed] failed', err);
  process.exit(1);
});
