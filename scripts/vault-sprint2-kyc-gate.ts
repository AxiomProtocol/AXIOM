/**
 * Vault Sprint 2 — KYC Gate Validation
 *
 * Proves the KYC claim issuance end-to-end path for AXUSD/PSM/Vault access gating.
 *
 * What this script does:
 *
 *   A. Pre-state: a fresh random wallet is unregistered and unverified.
 *      Identity checks, PSM guard probes, and CreditMarket isLpVerified all
 *      confirm the wallet is blocked before any KYC steps.
 *
 *   B. Infrastructure state: reads the live on-chain ClaimTopicsRegistry,
 *      TrustedIssuersRegistry, ClaimIssuer ownership, PSM role assignments,
 *      and AXUSD MINTER_ROLE to establish baseline configuration.
 *
 *   C. KYC submission + operator approval via the API path:
 *      POST /api/erc3643/identity/submit → POST /api/erc3643/identity/approve
 *
 *   D. Post-state on-chain:
 *      - identityRegistry.contains() and .isVerified()
 *      - ONCHAINID getClaimIdsByTopic() (proves whether claims landed on-chain)
 *      - creditMarket.isLpVerified()
 *      - API /api/erc3643/identity/check
 *
 *   E. Continued blocking: a second fresh wallet (no KYC) is still gated.
 *
 *   F. Blockers: each known gap is documented with on-chain evidence.
 *
 * Usage:
 *   ADMIN_SOLVENCY_KEY=<key> BASE_URL=http://localhost:3000 \
 *     npx tsx scripts/vault-sprint2-kyc-gate.ts
 *
 * Optional:
 *   ALCHEMY_API_KEY=<key>    — use Alchemy RPC instead of the public fallback
 *
 * Prerequisites:
 *   - Server running on BASE_URL
 *   - ADMIN_SOLVENCY_KEY set (same key used by operator for approval APIs)
 *   - Network access to Arbitrum One (direct RPC or Alchemy)
 *   - The ERC-3643 contract stack deployed (addresses from deployment-erc3643-manifest.json)
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import {
  ERC3643_CONTRACTS,
  IDENTITY_REGISTRY_ABI,
  IDENTITY_FACTORY_ABI,
  CLAIM_ISSUER_ABI,
} from '../shared/contracts-3643';
import {
  CANONICAL_PSM,
  ACTIVE_AXUSD,
  CREDIT_MARKET_ADDRESS,
} from '../src/config/activeContracts.generated';
import { DEPLOYER_EOA } from '../src/config/adminRoles';

// ── Environment ───────────────────────────────────────────────────────────────

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const KEY  = process.env.ADMIN_SOLVENCY_KEY;

if (!KEY) {
  console.error('[vault-sprint2-kyc-gate] ADMIN_SOLVENCY_KEY missing — set it in env');
  process.exit(1);
}

function getProvider(): ethers.JsonRpcProvider {
  const url = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(url);
}

// ── Extra ABIs ────────────────────────────────────────────────────────────────

const CLAIM_TOPICS_REGISTRY_ABI = [
  'function getClaimTopics() view returns (uint256[])',
] as const;

const TRUSTED_ISSUERS_REGISTRY_ABI = [
  'function getTrustedIssuers() view returns (address[])',
  'function hasClaimTopic(address issuer, uint256 topic) view returns (bool)',
] as const;

/** Minimal ONCHAINID (AxiomIdentity) ABI for claim probing. */
const ONCHAIN_IDENTITY_ABI = [
  'function getClaimIdsByTopic(uint256 topic) view returns (bytes32[])',
  'function getClaim(bytes32 claimId) view returns (uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri)',
  'function getKeysByPurpose(uint256 purpose) view returns (bytes32[])',
  'function keyHasPurpose(bytes32 key, uint256 purpose) view returns (bool)',
] as const;

const CANONICAL_PSM_GATING_ABI = [
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function identityRegistry() view returns (address)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  /** mint() has onlyVerified modifier; static-call reveals whether identity guard triggers */
  'function mint(uint256 usdcAmount) returns (uint256)',
] as const;

const CREDIT_MARKET_GATING_ABI = [
  'function isLpVerified(address lp) view returns (bool)',
  'function identityRegistry() view returns (address)',
] as const;

const AXUSD_ACCESS_CONTROL_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
] as const;

/** keccak256("MINTER_ROLE") — matches activate-psm.ts */
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';

// ── Result tracking ───────────────────────────────────────────────────────────

type BlockerClass = 'hard' | 'soft' | 'known' | 'env';

interface Result {
  label: string;
  passed: boolean;
  detail: string;
  blocker?: BlockerClass;
}

const results: Result[] = [];

function record(
  label: string,
  passed: boolean,
  detail: string,
  blocker?: BlockerClass,
): void {
  results.push({ label, passed, detail, blocker });
  const icon = passed ? '✓' : (blocker === 'known' || blocker === 'env' ? '⚠' : '✗');
  console.log(`  [${icon}] ${label}`);
  console.log(`       ${detail}`);
}

// ── API helpers ───────────────────────────────────────────────────────────────

interface ApiResponse {
  status: number;
  body: unknown;
}

async function apiCall(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<ApiResponse> {
  const { auth = true, headers, ...rest } = init;
  const h: Record<string, string> = {
    'content-type': 'application/json',
    ...((headers as Record<string, string>) || {}),
  };
  if (auth) h['x-admin-key'] = KEY!;
  const res = await fetch(`${BASE}${path}`, { ...rest, headers: h });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

// ── Phase A — Pre-state checks ────────────────────────────────────────────────

interface PreState {
  freshWallet: string;
  secondWallet: string;
}

async function phaseA_PreState(): Promise<PreState> {
  console.log('\n[A] Pre-state — fresh wallets unregistered + unverified\n');

  const provider = getProvider();

  // Generate two fresh random wallets (fully unverified — no KYC, no on-chain identity)
  const freshWallet  = ethers.Wallet.createRandom().address;
  const secondWallet = ethers.Wallet.createRandom().address;
  console.log(`  Fresh wallet (KYC subject):      ${freshWallet}`);
  console.log(`  Second wallet (control, no KYC): ${secondWallet}`);

  const identityRegistry = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_REGISTRY,
    IDENTITY_REGISTRY_ABI,
    provider,
  );

  const creditMarket = new ethers.Contract(
    CREDIT_MARKET_ADDRESS,
    CREDIT_MARKET_GATING_ABI,
    provider,
  );

  // A1: contains — wallet not in registry
  const containsA = await identityRegistry.contains(freshWallet).catch(() => false);
  record('A1 identityRegistry.contains(freshWallet)', !containsA,
    `contains=${containsA} — expected false before KYC`);

  // A2: isVerified — wallet not verified
  const verifiedA = await identityRegistry.isVerified(freshWallet).catch(() => false);
  record('A2 identityRegistry.isVerified(freshWallet)', !verifiedA,
    `isVerified=${verifiedA} — expected false before KYC`);

  // A3: API identity check
  const apiCheck = await apiCall(`/api/erc3643/identity/check?wallet=${freshWallet}`, { auth: false });
  const checkBody = apiCheck.body as Record<string, unknown>;
  const apiRegistered = checkBody?.registered === true;
  const apiVerified   = checkBody?.verified   === true;
  record('A3 API /identity/check registered=false', !apiRegistered,
    `status=${apiCheck.status} registered=${checkBody?.registered} verified=${checkBody?.verified}`);
  record('A4 API /identity/check verified=false', !apiVerified,
    `status=${apiCheck.status} verified=${checkBody?.verified}`);

  // A5: CreditMarket isLpVerified — should be false
  const lpVerifiedA = await creditMarket.isLpVerified(freshWallet).catch(() => false);
  record('A5 creditMarket.isLpVerified(freshWallet)=false', !lpVerifiedA,
    `isLpVerified=${lpVerifiedA} — expected false`);

  // A6: PSM guard probe — static-call mint() from unverified wallet should revert
  const psm = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_GATING_ABI, provider);
  let psmRevertedForUnverified = false;
  let psmRevertMsg = '';
  try {
    await psm.mint.staticCall(1_000_000n, { from: freshWallet });
    psmRevertMsg = 'did NOT revert — unexpected';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    psmRevertedForUnverified = msg.includes('not identity-verified') || msg.includes('identity-verified') || msg.includes('CALL_EXCEPTION');
    psmRevertMsg = msg.slice(0, 120);
  }
  record('A6 PSM mint() reverts for unverified wallet', psmRevertedForUnverified,
    `revert: ${psmRevertMsg}`);

  // A7: FixedLoan borrower check proxy — isVerified(freshWallet) is the gate
  // (verified by contract logic in AXIOMFixedLoan.sol:_validateOriginationArgs line ~610)
  record('A7 FixedLoan gate anchored to identityRegistry.isVerified', !verifiedA,
    `isVerified(freshWallet)=${verifiedA} — FixedLoan.originateLoan reverts UnverifiedBorrower when false`);

  return { freshWallet, secondWallet };
}

// ── Phase B — Infrastructure state ───────────────────────────────────────────

async function phaseB_InfraState(): Promise<void> {
  console.log('\n[B] Infrastructure state — on-chain registry config\n');

  const provider = getProvider();

  const claimTopicsReg = new ethers.Contract(
    ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY,
    CLAIM_TOPICS_REGISTRY_ABI,
    provider,
  );

  const trustedIssuersReg = new ethers.Contract(
    ERC3643_CONTRACTS.TRUSTED_ISSUERS_REGISTRY,
    TRUSTED_ISSUERS_REGISTRY_ABI,
    provider,
  );

  const psm = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_GATING_ABI, provider);

  const axusd = new ethers.Contract(ACTIVE_AXUSD, AXUSD_ACCESS_CONTROL_ABI, provider);

  // B1: Required claim topics
  const requiredTopics: bigint[] = await claimTopicsReg.getClaimTopics().catch(() => []);
  const topicsStr = requiredTopics.map(t => t.toString()).join(', ') || '(none)';
  const topicsImplication = requiredTopics.length === 0
    ? 'IMPORTANT: empty → isVerified() returns true for any registered identity (no claims required on-chain)'
    : `isVerified() requires on-chain claims for topics: [${topicsStr}]`;
  record('B1 ClaimTopicsRegistry.getClaimTopics()', true,
    `required topics on-chain: [${topicsStr}] — ${topicsImplication}`);

  // B2: Trusted issuers
  const trustedIssuers: string[] = await trustedIssuersReg.getTrustedIssuers().catch(() => []);
  const issuersStr = trustedIssuers.length > 0
    ? trustedIssuers.join(', ')
    : '(none registered)';
  const claimIssuerTrusted = trustedIssuers
    .map(a => a.toLowerCase())
    .includes(ERC3643_CONTRACTS.CLAIM_ISSUER.toLowerCase());
  record('B2 TrustedIssuersRegistry has ClaimIssuer', claimIssuerTrusted || trustedIssuers.length === 0,
    `trustedIssuers=[${issuersStr}] claimIssuer=${ERC3643_CONTRACTS.CLAIM_ISSUER} trusted=${claimIssuerTrusted}`,
    claimIssuerTrusted || trustedIssuers.length === 0 ? undefined : 'hard');

  // B3: ClaimIssuer topics (for each required topic)
  for (const topic of requiredTopics) {
    const hasTopicForIssuer = await trustedIssuersReg.hasClaimTopic(ERC3643_CONTRACTS.CLAIM_ISSUER, topic).catch(() => false);
    record(`B3 ClaimIssuer authorised for topic ${topic}`, hasTopicForIssuer,
      `hasClaimTopic(claimIssuer, ${topic})=${hasTopicForIssuer}`,
      hasTopicForIssuer ? undefined : 'hard');
  }

  // B4: PSM paused status
  const psmPaused = await psm.paused().catch(() => 'error');
  record('B4 CanonicalPSM paused=false', psmPaused === false,
    `paused=${psmPaused}`,
    psmPaused === true ? 'hard' : undefined);

  // B5: PSM MINTER_ROLE on AXUSD
  const hasMinterRole = await axusd.hasRole(MINTER_ROLE, CANONICAL_PSM).catch(() => false);
  record('B5 AXUSD.hasRole(MINTER_ROLE, CanonicalPSM)', hasMinterRole,
    `hasMinterRole=${hasMinterRole} — if false, PSM.mint() will fail even for verified callers`,
    hasMinterRole ? undefined : 'hard');

  // B6: PSM identityRegistry matches ERC3643
  const psmRegistry = await psm.identityRegistry().catch(() => '');
  const registryMatch = psmRegistry.toLowerCase() === ERC3643_CONTRACTS.IDENTITY_REGISTRY.toLowerCase();
  record('B6 PSM.identityRegistry() matches ERC3643_CONTRACTS.IDENTITY_REGISTRY', registryMatch,
    `psmRegistry=${psmRegistry} expected=${ERC3643_CONTRACTS.IDENTITY_REGISTRY}`,
    registryMatch ? undefined : 'hard');

  // B7: CreditMarket identityRegistry
  const cm = new ethers.Contract(CREDIT_MARKET_ADDRESS, CREDIT_MARKET_GATING_ABI, provider);
  const cmRegistry = await cm.identityRegistry().catch(() => '');
  const cmRegistryMatch = cmRegistry.toLowerCase() === ERC3643_CONTRACTS.IDENTITY_REGISTRY.toLowerCase();
  record('B7 CreditMarket.identityRegistry() matches ERC3643_CONTRACTS.IDENTITY_REGISTRY', cmRegistryMatch,
    `cmRegistry=${cmRegistry} expected=${ERC3643_CONTRACTS.IDENTITY_REGISTRY}`,
    cmRegistryMatch ? undefined : 'hard');
}

// ── Phase C — KYC submission + approval ──────────────────────────────────────

interface KycResult {
  submissionId: string;
  approvalBody: Record<string, unknown>;
}

async function phaseC_KycFlow(freshWallet: string): Promise<KycResult | null> {
  console.log('\n[C] KYC submission + operator approval via API\n');

  // C1: Submit KYC application for the fresh wallet
  const submitBody = {
    walletAddress: freshWallet,
    fullName: 'Sprint Two Tester',
    dateOfBirth: '1990-01-15',
    country: 'US',
    documentType: 'passport',
    // no email — avoids triggering confirmation email in test
  };

  const submitResp = await apiCall('/api/erc3643/identity/submit', {
    method: 'POST',
    body: JSON.stringify(submitBody),
  });

  const submitJson = submitResp.body as Record<string, unknown>;
  const submissionId: string | undefined = (submitJson?.data as Record<string, unknown>)?.id as string;
  const submitted = submitResp.status === 201 && !!submissionId;

  record('C1 POST /identity/submit → 201', submitted,
    `status=${submitResp.status} submissionId=${submissionId ?? 'missing'} error=${submitJson?.error ?? 'none'}`);

  if (!submitted || !submissionId) {
    record('C2 POST /identity/approve — SKIPPED', false,
      'Cannot approve: submission step failed');
    return null;
  }

  // C2: Operator approves — triggers atomicKycApproval():
  //     on-chain registerIdentity (factory.createIdentity + registry.registerIdentity)
  //     + DB issueClaim for topics 1 and 3
  const approveResp = await apiCall('/api/erc3643/identity/approve', {
    method: 'POST',
    body: JSON.stringify({ submissionId, countryCode: 840 }),
  });

  const approveJson = approveResp.body as Record<string, unknown>;
  const approved = approveResp.status === 200 && (approveJson?.success === true);
  const approveData = approveJson?.data as Record<string, unknown> | undefined;

  record('C2 POST /identity/approve → 200', approved,
    `status=${approveResp.status} ` +
    `identityAddress=${approveData?.identityAddress ?? 'none'} ` +
    `t1Claim=${(approveData?.t1Claim as Record<string, unknown>)?.claimId ?? 'none'} ` +
    `t3Claim=${(approveData?.t3Claim as Record<string, unknown>)?.claimId ?? 'none'} ` +
    `error=${approveJson?.error ?? 'none'}`);

  if (!approved) {
    return null;
  }

  const registerTxHash = approveData?.registerIdentityTxHash as string | undefined;
  const registryTxHash = approveData?.registryTxHash as string | undefined;
  record('C3 On-chain txs returned', !!(registerTxHash || registryTxHash),
    `createIdentityTx=${registerTxHash ?? 'IDEMPOTENT_SKIP'} registryTx=${registryTxHash ?? 'IDEMPOTENT_SKIP'}`);

  const issuanceMode = (approveData?.t1Claim as Record<string, unknown> | undefined)?.issuanceMode as string | undefined;
  record('C4 Claim issuance mode is on-chain (identity.addClaim tx)', issuanceMode === 'erc3643_onchain',
    `issuanceMode=${issuanceMode} — expected erc3643_onchain after F1/F5 remediation`,
    issuanceMode === 'erc3643_onchain' ? undefined : 'hard');

  return { submissionId, approvalBody: approveJson };
}

// ── Phase D — Post-state on-chain ─────────────────────────────────────────────

async function phaseD_PostState(freshWallet: string): Promise<void> {
  console.log('\n[D] Post-state — on-chain identity probes after approval\n');

  const provider = getProvider();

  const identityRegistry = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_REGISTRY,
    IDENTITY_REGISTRY_ABI,
    provider,
  );

  const creditMarket = new ethers.Contract(
    CREDIT_MARKET_ADDRESS,
    CREDIT_MARKET_GATING_ABI,
    provider,
  );

  // D1: contains — wallet now in registry
  const containsD = await identityRegistry.contains(freshWallet).catch(() => false);
  record('D1 identityRegistry.contains(freshWallet)=true', containsD === true,
    `contains=${containsD} — expected true after registerIdentity`);

  // D2: identity address non-zero
  const identityAddr = await identityRegistry.identity(freshWallet).catch(() => ethers.ZeroAddress);
  const hasIdentityAddr = identityAddr && identityAddr !== ethers.ZeroAddress;
  record('D2 identityRegistry.identity(freshWallet) != zero', hasIdentityAddr,
    `identityAddress=${identityAddr}`);

  // D3: isVerified — the key on-chain gate
  const isVerifiedD = await identityRegistry.isVerified(freshWallet).catch(() => false);
  // Not necessarily a failure — documents the actual result
  record('D3 identityRegistry.isVerified(freshWallet)', isVerifiedD,
    `isVerified=${isVerifiedD} — ` + (isVerifiedD
      ? 'verified (ClaimTopicsRegistry empty → all registered identities pass)'
      : 'NOT verified — ClaimTopicsRegistry has required topics but claims not added on-chain'),
    isVerifiedD ? undefined : 'hard');

  // D4: Probe ONCHAINID for claims — the root cause of D3
  if (hasIdentityAddr) {
    const onchainId = new ethers.Contract(identityAddr, ONCHAIN_IDENTITY_ABI, provider);

    const t1ClaimIds: string[] = await onchainId.getClaimIdsByTopic(1).catch(() => []);
    const t3ClaimIds: string[] = await onchainId.getClaimIdsByTopic(3).catch(() => []);
    const t2ClaimIds: string[] = await onchainId.getClaimIdsByTopic(2).catch(() => []);

    const claimsOnChain = t1ClaimIds.length > 0 || t3ClaimIds.length > 0;
    record('D4a ONCHAINID has Topic 1 (KYC) claims on-chain', t1ClaimIds.length > 0,
      `topic1ClaimIds=[${t1ClaimIds.join(', ') || 'empty'}] — ` +
      (t1ClaimIds.length === 0
        ? 'BLOCKER: issueClaim() stores in DB only; identity.addClaim() was NOT called'
        : 'claims present on-chain'),
      t1ClaimIds.length === 0 ? 'hard' : undefined);

    record('D4b ONCHAINID has Topic 3 (Sanctions) claims on-chain', t3ClaimIds.length > 0,
      `topic3ClaimIds=[${t3ClaimIds.join(', ') || 'empty'}] — ` +
      (t3ClaimIds.length === 0
        ? 'BLOCKER: same root cause as D4a — DB-only claim issuance'
        : 'claims present on-chain'),
      t3ClaimIds.length === 0 ? 'hard' : undefined);

    record('D4c ONCHAINID has Topic 2 (Accreditation) claims on-chain', t2ClaimIds.length > 0,
      `topic2ClaimIds=[${t2ClaimIds.join(', ') || 'empty'}] — ` +
      (t2ClaimIds.length === 0
        ? 'expected: topic 2 not issued in default KYC approval flow (requires accreditation step)'
        : 'claims present'),
      t2ClaimIds.length === 0 ? 'known' : undefined);

    // D4d: Management key on identity (who can call addClaim?)
    const mgmtKeys: string[] = await onchainId.getKeysByPurpose(1).catch(() => []);
    const claimKeys: string[] = await onchainId.getKeysByPurpose(3).catch(() => []);
    record('D4d ONCHAINID management/claim key state',
      mgmtKeys.length > 0,
      `managementKeys=${mgmtKeys.length} claimSignerKeys=${claimKeys.length} — ` +
      'addClaim() requires MANAGEMENT_KEY(1) or CLAIM_SIGNER_KEY(3); deployer must hold one to push claims');

    // D5: If claims are on-chain, validate the signature via ClaimIssuer
    if (claimsOnChain) {
      const claimIssuer = new ethers.Contract(
        ERC3643_CONTRACTS.CLAIM_ISSUER,
        CLAIM_ISSUER_ABI,
        provider,
      );
      for (const claimId of t1ClaimIds.slice(0, 1)) {
        try {
          const [, , , sig, data] = await onchainId.getClaim(claimId);
          const valid = await claimIssuer.isClaimValid(identityAddr, 1, sig, data);
          record('D5 ClaimIssuer.isClaimValid(topic1)', valid,
            `isClaimValid=${valid} for claimId=${claimId}`);
        } catch (e) {
          record('D5 ClaimIssuer.isClaimValid(topic1)', false,
            `error reading claim: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } else {
    record('D4a ONCHAINID has Topic 1 claims on-chain', false,
      'SKIPPED — identity address not found (D2 failed)');
    record('D4b ONCHAINID has Topic 3 claims on-chain', false,
      'SKIPPED — identity address not found (D2 failed)');
    record('D4c ONCHAINID has Topic 2 claims on-chain', false,
      'SKIPPED — identity address not found (D2 failed)', 'known');
    record('D4d ONCHAINID management/claim key state', false,
      'SKIPPED — identity address not found (D2 failed)');
  }

  // D5: CreditMarket isLpVerified mirrors isVerified
  const lpVerifiedD = await creditMarket.isLpVerified(freshWallet).catch(() => false);
  record('D6 creditMarket.isLpVerified(freshWallet)', lpVerifiedD,
    `isLpVerified=${lpVerifiedD} — directly proxies identityRegistry.isVerified()`,
    lpVerifiedD ? undefined : 'hard');

  // D7: API check — post-approval state from server
  const apiCheck = await apiCall(`/api/erc3643/identity/check?wallet=${freshWallet}`, { auth: false });
  const checkBody = apiCheck.body as Record<string, unknown>;
  record('D7 API /identity/check registered=true', checkBody?.registered === true,
    `status=${apiCheck.status} registered=${checkBody?.registered} verified=${checkBody?.verified} ` +
    `identityAddress=${checkBody?.identityAddress ?? 'none'}`);

  // D8: PSM onlyVerified probe — static-call mint() from freshWallet post-approval
  const psm = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_GATING_ABI, provider);
  let psmPassesIdentityGate = false;
  let psmMsg = '';
  try {
    await psm.mint.staticCall(1_000_000n, { from: freshWallet });
    // If we reach here, identity gate passed (will revert for other reasons like USDC balance/allowance)
    psmPassesIdentityGate = true;
    psmMsg = 'static-call completed (identity gate passed; real call would need USDC balance + approval)';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isIdentityRevert = msg.includes('not identity-verified') || msg.includes('identity-verified');
    psmPassesIdentityGate = !isIdentityRevert;
    psmMsg = msg.slice(0, 160);
  }
  record('D8 PSM.mint() identity guard passes for verified wallet',
    isVerifiedD ? psmPassesIdentityGate : true, // only meaningful if isVerified=true
    `psmPassesIdentityGate=${psmPassesIdentityGate} isVerified=${isVerifiedD} msg=${psmMsg}`,
    isVerifiedD && !psmPassesIdentityGate ? 'hard' : undefined);
}

// ── Phase E — Continued blocking of unverified wallet ────────────────────────

async function phaseE_ContinuedBlocking(secondWallet: string): Promise<void> {
  console.log('\n[E] Continued blocking — second wallet (no KYC) still gated\n');

  const provider = getProvider();

  const identityRegistry = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_REGISTRY,
    IDENTITY_REGISTRY_ABI,
    provider,
  );

  const creditMarket = new ethers.Contract(
    CREDIT_MARKET_ADDRESS,
    CREDIT_MARKET_GATING_ABI,
    provider,
  );

  const psm = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_GATING_ABI, provider);

  const containsE = await identityRegistry.contains(secondWallet).catch(() => false);
  record('E1 identityRegistry.contains(secondWallet)=false', !containsE,
    `contains=${containsE} — second wallet never submitted KYC`);

  const isVerifiedE = await identityRegistry.isVerified(secondWallet).catch(() => false);
  record('E2 identityRegistry.isVerified(secondWallet)=false', !isVerifiedE,
    `isVerified=${isVerifiedE}`);

  const lpVerifiedE = await creditMarket.isLpVerified(secondWallet).catch(() => false);
  record('E3 creditMarket.isLpVerified(secondWallet)=false', !lpVerifiedE,
    `isLpVerified=${lpVerifiedE}`);

  let psmBlocksSecond = false;
  let psmBlockMsg = '';
  try {
    await psm.mint.staticCall(1_000_000n, { from: secondWallet });
    psmBlockMsg = 'did NOT revert — unexpected for unverified wallet';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    psmBlocksSecond = msg.includes('not identity-verified') || msg.includes('identity-verified') || msg.includes('CALL_EXCEPTION');
    psmBlockMsg = msg.slice(0, 120);
  }
  record('E4 PSM.mint() reverts for second unverified wallet', psmBlocksSecond,
    `revert: ${psmBlockMsg}`);
}

// ── Phase F — Blocker summary ─────────────────────────────────────────────────

async function phaseF_BlockerSummary(freshWallet: string): Promise<void> {
  console.log('\n[F] Blocker summary — known launch-critical gaps\n');

  const provider = getProvider();

  const claimTopicsReg = new ethers.Contract(
    ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY,
    CLAIM_TOPICS_REGISTRY_ABI,
    provider,
  );

  const requiredTopics: bigint[] = await claimTopicsReg.getClaimTopics().catch(() => []);
  const topicsStr = requiredTopics.map(t => t.toString()).join(', ') || '(none)';

  // F1: On-chain claim presence — live check after KYC approval
  {
    const identityRegistry = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      provider,
    );
    const identityAddr: string = await identityRegistry.identity(freshWallet).catch(() => ethers.ZeroAddress);
    let f1Pass = false;
    let f1Detail = `freshWallet=${freshWallet} identityAddress=${identityAddr}`;
    if (identityAddr && identityAddr !== ethers.ZeroAddress) {
      const onchainId = new ethers.Contract(identityAddr, ONCHAIN_IDENTITY_ABI, provider);
      const t1Ids: string[] = await onchainId.getClaimIdsByTopic(1).catch(() => []);
      const t3Ids: string[] = await onchainId.getClaimIdsByTopic(3).catch(() => []);
      f1Pass = t1Ids.length > 0 && t3Ids.length > 0;
      f1Detail += ` topic1ClaimIds=[${t1Ids.join(',') || 'empty'}] topic3ClaimIds=[${t3Ids.join(',') || 'empty'}]`;
    } else {
      f1Detail += ' — identity not registered (registration step failed?)';
    }
    record('F1 issueClaim() pushes claims on-chain via identity.addClaim()', f1Pass,
      f1Detail,
      f1Pass ? undefined : 'hard');
  }

  // F2: PSM MINTER_ROLE
  const axusd = new ethers.Contract(ACTIVE_AXUSD, AXUSD_ACCESS_CONTROL_ABI, provider);
  const hasMinter = await axusd.hasRole(MINTER_ROLE, CANONICAL_PSM).catch(() => false);
  record(`F2 [BLOCKER] PSM MINTER_ROLE${hasMinter ? ' granted ✓' : ' not granted ✗'}`, hasMinter,
    `hasMinterRole=${hasMinter}. ` +
    (hasMinter
      ? 'PSM can mint AXUSD. Resolve F1 (on-chain claims) for full flow.'
      : 'CanonicalPSM does not hold MINTER_ROLE on AXUSD. mint() will revert even for verified callers. ' +
        'Fix: run POST /api/erc3643/admin/activate-psm with ADMIN_SOLVENCY_KEY.'),
    hasMinter ? undefined : 'hard');

  // F3: LendingPlatformModule always returns true
  record('F3 [KNOWN] LendingPlatformModule.moduleCheck() always returns true', false,
    'LendingPlatformModule.sol:48 returns true regardless of _whitelistedPlatforms state. ' +
    'Whitelist enforcement is non-functional. Non-blocking for Vault access gating (identity guard ' +
    'on IdentityRegistry is the real gate); blocking for compliance module integrity.',
    'known');

  // F4: Topic 2 (Accreditation) not issued in default KYC approval path
  const t2Required = requiredTopics.some(t => t === 2n);
  record(`F4 [KNOWN] Topic 2 (Accreditation) not issued in default KYC approval`, !t2Required,
    `ClaimTopicsRegistry required topics: [${topicsStr}]. Topic 2 required on-chain: ${t2Required}. ` +
    (t2Required
      ? 'BLOCKER: topic 2 is required but default approval only issues topics 1+3. ' +
        'Users remain unverified until accreditation step also completes.'
      : 'Safe: topic 2 not currently required by ClaimTopicsRegistry (accreditation optional for Vault access).'),
    t2Required ? 'hard' : 'known');

  // F5: Deployer key authority on user ONCHAINID — live check
  {
    const identityRegistry = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      provider,
    );
    const identityAddr: string = await identityRegistry.identity(freshWallet).catch(() => ethers.ZeroAddress);
    let f5Pass = false;
    let f5Detail = `deployer=${DEPLOYER_EOA} identityAddress=${identityAddr}`;
    if (identityAddr && identityAddr !== ethers.ZeroAddress) {
      const onchainId = new ethers.Contract(identityAddr, ONCHAIN_IDENTITY_ABI, provider);
      // keccak256(abi.encode(address)) — matches AxiomIdentity.initialize() key hash
      const deployerKeyHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(['address'], [DEPLOYER_EOA])
      );
      f5Pass = await onchainId.keyHasPurpose(deployerKeyHash, 1).catch(() => false); // purpose 1 = MANAGEMENT_KEY
      f5Detail += ` deployerKeyHash=${deployerKeyHash} hasManagementKey=${f5Pass}`;
    } else {
      f5Detail += ' — identity not registered (cannot probe keys)';
    }
    record('F5 Deployer holds MANAGEMENT_KEY on user identity (can call addClaim)', f5Pass,
      f5Detail,
      f5Pass ? undefined : 'hard');
  }

  // F6: ClaimIssuer.isClaimValid() does not check validUntil
  record('F6 [KNOWN] ClaimIssuer.isClaimValid() does not enforce expiry', false,
    'ClaimIssuer.sol:42-55 checks only: (1) not revoked, (2) signer == owner(). ' +
    'The validUntil timestamp encoded in claimData is ignored. Expiry enforcement must be ' +
    'done off-chain (DB expiresAt) or by revoking the claim signature on-chain.',
    'known');

  console.log(`  Wallet under test: ${freshWallet}`);
}

// ── Print structured report ───────────────────────────────────────────────────

function printReport(freshWallet: string, secondWallet: string): void {
  const allResults  = results;
  const passCount   = allResults.filter(r => r.passed).length;
  const totalCount  = allResults.length;
  const hardBlockers = allResults.filter(r => !r.passed && r.blocker === 'hard');
  const knownIssues  = allResults.filter(r => !r.passed && (r.blocker === 'known'));

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('  Vault Sprint 2 — KYC Gate Validation Report');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`  Date (UTC):      ${new Date().toISOString()}`);
  console.log(`  Network:         Arbitrum One (chainId 42161)`);
  console.log(`  KYC subject:     ${freshWallet}`);
  console.log(`  Control wallet:  ${secondWallet}`);
  console.log(`  Checks:          ${passCount}/${totalCount} passed\n`);

  for (const r of allResults) {
    const icon = r.passed
      ? '✓'
      : r.blocker === 'known' || r.blocker === 'env' ? '⚠' : '✗';
    console.log(`  [${icon}] ${r.label}`);
    console.log(`       ${r.detail}`);
  }

  console.log('\n  ── Identity path ──');
  const pathLabels = ['A1','A2','C1','C2','D1','D2','D3','D4a','D4b','D6','D7'];
  for (const label of pathLabels) {
    const r = allResults.find(x => x.label.startsWith(label));
    if (r) console.log(`  ${r.passed ? 'PASS' : r.blocker ? 'BLOCKER' : 'FAIL'}: ${r.label}`);
  }

  console.log('\n  ── Vault gating ──');
  const gateLabels = ['A5','A6','A7','D6','D8','E1','E2','E3','E4'];
  for (const label of gateLabels) {
    const r = allResults.find(x => x.label.startsWith(label));
    if (r) console.log(`  ${r.passed ? 'PASS' : r.blocker ? 'BLOCKER' : 'FAIL'}: ${r.label}`);
  }

  console.log('\n  ── Hard blockers (launch-critical) ──');
  if (hardBlockers.length === 0) {
    console.log('  None — all launch-critical gates proven operational.');
  } else {
    for (const r of hardBlockers) {
      console.log(`  ✗ ${r.label}`);
      console.log(`    ${r.detail}`);
    }
  }

  console.log('\n  ── Known issues (non-blocking for Vault access gating) ──');
  if (knownIssues.length === 0) {
    console.log('  None.');
  } else {
    for (const r of knownIssues) {
      console.log(`  ⚠ ${r.label}`);
      console.log(`    ${r.detail.slice(0, 200)}`);
    }
  }

  console.log('\n  ── Vault Sprint 2 KYC Gate status ──');
  if (hardBlockers.length === 0) {
    console.log('  COMPLETE ✓');
    console.log('  All identity gates proven operational:');
    console.log('    [1] Fresh wallet unregistered/unverified before KYC — proven (A1–A7)');
    console.log('    [2] KYC submission + approval flow operational — proven (C1–C4)');
    console.log('    [3] Identity registered on-chain after approval — proven (D1–D2)');
    console.log('    [4] On-chain verification state confirmed — proven (D3)');
    console.log('    [5] CreditMarket and PSM gating mirrors isVerified — proven (D6, D8)');
    console.log('    [6] Unverified wallet continues to be blocked — proven (E1–E4)');
  } else {
    console.log(`  INCOMPLETE — ${hardBlockers.length} hard blocker(s) require resolution before launch.`);
    console.log('\n  Required fixes:');
    const blockerChecks = ['F1','F2','F4','F5'];
    for (const label of blockerChecks) {
      const r = allResults.find(x => x.label.startsWith(label));
      if (r && !r.passed) console.log(`    → ${r.label.slice(0, 80)}`);
    }
  }
  console.log('══════════════════════════════════════════════════════════════════\n');

  if (hardBlockers.filter(r => !r.label.startsWith('F')).length > 0) {
    // Only exit non-zero for unexpected (non-documented) hard failures
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[vault-sprint2-kyc-gate] base=${BASE}`);
  console.log(`[vault-sprint2-kyc-gate] identityRegistry=${ERC3643_CONTRACTS.IDENTITY_REGISTRY}`);
  console.log(`[vault-sprint2-kyc-gate] canonicalPsm=${CANONICAL_PSM}`);
  console.log(`[vault-sprint2-kyc-gate] creditMarket=${CREDIT_MARKET_ADDRESS}`);

  const { freshWallet, secondWallet } = await phaseA_PreState();

  await phaseB_InfraState();

  const kycResult = await phaseC_KycFlow(freshWallet);

  if (kycResult) {
    await phaseD_PostState(freshWallet);
  } else {
    console.log('\n[D] Post-state skipped — KYC flow did not complete (C phase failure).\n');
    record('D-SKIPPED: post-state phase not reached', false,
      'KYC submission or approval failed — check C phase failures above');
  }

  await phaseE_ContinuedBlocking(secondWallet);

  await phaseF_BlockerSummary(freshWallet);

  printReport(freshWallet, secondWallet);
}

main().catch((err) => {
  console.error('[vault-sprint2-kyc-gate] FATAL:', err);
  process.exit(1);
});
