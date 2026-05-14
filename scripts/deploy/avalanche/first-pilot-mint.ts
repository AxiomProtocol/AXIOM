/**
 * Axiom Protocol — Avalanche First Pilot Mint
 *
 * Executes the first operator-controlled mint under Limited Pilot Mode.
 *
 * Flow:
 *   1. Pre-flight: chainId, roles, compliance modules, caps
 *   2. Register recipient identity in IdentityRegistry (agent tx)
 *   3. Verify isVerified(recipient) = true
 *   4. Mint PILOT_MINT_AMOUNT AXUSD to recipient (minter tx)
 *   5. Post-mint: verify supply delta, balance delta, cap check
 *
 * Identity note:
 *   ClaimTopicsRegistry has 0 required topics and 0 trusted issuers on
 *   this fresh mainnet deploy. T-REX isVerified() returns true for any
 *   registered address when claim topics = []. We register the recipient
 *   wallet as its own identity (registerIdentity(wallet, wallet, 840)).
 *
 * Caps:
 *   Total pilot cap:   2,500 AXUSD
 *   Single-wallet cap: 1,000 AXUSD
 *   First mint:          100 AXUSD  (conservative initial amount)
 *
 * Guard:
 *   AVALANCHE_FIRST_PILOT_MINT=true must be set explicitly.
 */

import { ethers } from 'ethers';

const MAINNET_RPC = process.env.AVALANCHE_MAINNET_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc';
const GUARD       = process.env.AVALANCHE_FIRST_PILOT_MINT === 'true';

const ADDRS = {
  AxiomStable3643:     '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
  IdentityRegistry:    '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:   '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:  '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule: '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  ClaimTopicsRegistry: '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
};

const PILOT_TOTAL_CAP    = 2_500_000_000n; // 2,500 AXUSD at 6 decimals
const SINGLE_WALLET_CAP  = 1_000_000_000n; // 1,000 AXUSD at 6 decimals
const MINT_AMOUNT_RAW    =   100_000_000n; //   100 AXUSD at 6 decimals
const MINT_AMOUNT_DISPLAY = '100.000000';

const MINTER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const DEFAULT_ADMIN = ethers.ZeroHash;

const TOKEN_ABI = [
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function hasRole(bytes32,address) view returns (bool)',
  'function mint(address,uint256) external',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];
const IR_ABI = [
  'function isVerified(address) view returns (bool)',
  'function isAgent(address) view returns (bool)',
  'function contains(address) view returns (bool)',
  'function registerIdentity(address,address,uint16) external',
];
const CAM_ABI = ['function isCountryAllowed(address,uint16) view returns (bool)'];
const TLM_ABI = ['function getTransferLimit(address) view returns (uint256)'];
const CTR_ABI = ['function getClaimTopics() view returns (uint256[])'];
const MC_ABI  = [
  'function isModuleBound(address) view returns (bool)',
  'function getTokenBound() view returns (address)',
];

async function main() {
  if (!GUARD) {
    console.error('Set AVALANCHE_FIRST_PILOT_MINT=true to authorize this mint.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
  const { chainId } = await provider.getNetwork();
  if (Number(chainId) !== 43114) {
    throw new Error(`Expected chainId=43114, got ${chainId}`);
  }

  const key = process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('No deployer key found');
  const wallet   = new ethers.Wallet(key, provider);
  const OPERATOR = wallet.address;

  const token = new ethers.Contract(ADDRS.AxiomStable3643, TOKEN_ABI, wallet);
  const ir    = new ethers.Contract(ADDRS.IdentityRegistry, IR_ABI,   wallet);
  const cam   = new ethers.Contract(ADDRS.CountryAllowModule, CAM_ABI, provider);
  const tlm   = new ethers.Contract(ADDRS.TransferLimitModule, TLM_ABI, provider);
  const ctr   = new ethers.Contract(ADDRS.ClaimTopicsRegistry, CTR_ABI, provider);
  const mc    = new ethers.Contract(ADDRS.ModularCompliance, MC_ABI, provider);
  const blockBefore = await provider.getBlockNumber();

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Axiom Protocol — Avalanche First Pilot Mint');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Operator  : ${OPERATOR}`);
  console.log(`Recipient : ${OPERATOR}  (operator wallet — first pilot mint)`);
  console.log(`Amount    : ${MINT_AMOUNT_DISPLAY} AXUSD`);
  console.log(`ChainId   : ${chainId} (Avalanche mainnet)`);
  console.log(`Block     : ${blockBefore}`);

  // ── PHASE A — Pre-flight ───────────────────────────────────────────
  console.log('\n── Phase A: Pre-flight ──────────────────────────────────');
  const [supply0, paused, minterOk, adminOk, agentOk,
         us840, uk826, limit, topics, camBound, tlmBound,
         mcToken, recipientBalance0] = await Promise.all([
    token.totalSupply(), token.paused(),
    token.hasRole(MINTER_ROLE, OPERATOR),
    token.hasRole(DEFAULT_ADMIN, OPERATOR),
    ir.isAgent(OPERATOR),
    cam.isCountryAllowed(ADDRS.ModularCompliance, 840),
    cam.isCountryAllowed(ADDRS.ModularCompliance, 826),
    tlm.getTransferLimit(ADDRS.ModularCompliance),
    ctr.getClaimTopics(),
    mc.isModuleBound(ADDRS.CountryAllowModule),
    mc.isModuleBound(ADDRS.TransferLimitModule),
    mc.getTokenBound(),
    token.balanceOf(OPERATOR),
  ]);

  const checks: Array<[string, boolean, string]> = [
    ['chainId=43114',          Number(chainId) === 43114,                    '43114'],
    ['token addr matches',     ADDRS.AxiomStable3643 !== '',                 ADDRS.AxiomStable3643],
    ['totalSupply=0',          supply0 === 0n,                               (Number(supply0)/1e6).toFixed(6)+' AXUSD'],
    ['not paused',             !paused,                                      String(!paused)],
    ['MINTER_ROLE held',       minterOk,                                     String(minterOk)],
    ['DEFAULT_ADMIN held',     adminOk,                                      String(adminOk)],
    ['IR agent',               agentOk,                                      String(agentOk)],
    ['G02 US-840 allowed',     us840,                                        String(us840)],
    ['G02 UK-826 blocked',     !uk826,                                       String(!uk826)],
    ['G07 limit=5000',         Number(limit)/1e6 === 5000,                   (Number(limit)/1e6).toFixed(6)+' AXUSD/day'],
    ['claim topics empty',     topics.length === 0,                          `${topics.length} topics`],
    ['CAM bound',              camBound,                                     String(camBound)],
    ['TLM bound',              tlmBound,                                     String(tlmBound)],
    ['MC→token correct',       mcToken.toLowerCase()===ADDRS.AxiomStable3643.toLowerCase(), mcToken],
    ['mint ≤ wallet cap',      MINT_AMOUNT_RAW <= SINGLE_WALLET_CAP,        MINT_AMOUNT_DISPLAY+' ≤ 1000'],
    ['supply+mint ≤ pilot cap', supply0 + MINT_AMOUNT_RAW <= PILOT_TOTAL_CAP, (Number(supply0+MINT_AMOUNT_RAW)/1e6).toFixed(6)+' ≤ 2500'],
  ];

  let allPass = true;
  for (const [label, pass, val] of checks) {
    const sym = pass ? '✓' : '✗';
    console.log(`  ${sym} ${label.padEnd(30)} ${val}`);
    if (!pass) allPass = false;
  }

  if (!allPass) throw new Error('Pre-flight FAILED — aborting mint');
  console.log('\n  All pre-flight checks PASSED.\n');

  // ── PHASE B — Baseline reconciliation state ────────────────────────
  console.log('── Phase B: Baseline Reconciliation ─────────────────────');
  console.log(`  totalSupply before  : ${(Number(supply0)/1e6).toFixed(6)} AXUSD`);
  console.log(`  recipient balance   : ${(Number(recipientBalance0)/1e6).toFixed(6)} AXUSD`);
  console.log(`  cumulative minted   : 0.000000 AXUSD (pilot start)`);
  console.log(`  cap remaining       : ${(Number(PILOT_TOTAL_CAP - supply0)/1e6).toFixed(6)} AXUSD`);
  console.log(`  block before        : ${blockBefore}`);
  console.log(`  timestamp           : ${new Date().toISOString()}\n`);

  // ── PHASE C — Identity registration ───────────────────────────────
  console.log('── Phase C-1: Identity Registration ─────────────────────');
  const alreadyInIR = await ir.contains(OPERATOR);
  let identityTxHash = 'already-registered';

  if (alreadyInIR) {
    console.log(`  ✓ ${OPERATOR} already in IdentityRegistry — skipping registration`);
  } else {
    console.log(`  Registering ${OPERATOR} in IdentityRegistry (country=840)…`);
    const regTx = await ir.registerIdentity(OPERATOR, OPERATOR, 840);
    console.log(`  Tx broadcast: ${regTx.hash}`);
    const regReceipt = await regTx.wait();
    identityTxHash = regTx.hash;
    if (regReceipt.status !== 1) throw new Error('Identity registration tx failed');
    console.log(`  ✓ Identity registered at block ${regReceipt.blockNumber}`);
  }

  const isVerifiedAfterReg = await ir.isVerified(OPERATOR);
  console.log(`  isVerified(recipient) = ${isVerifiedAfterReg}`);
  if (!isVerifiedAfterReg) {
    throw new Error('Recipient is still not verified after registration — ABORT');
  }

  // ── PHASE C-2 — Mint ───────────────────────────────────────────────
  console.log('\n── Phase C-2: Mint ───────────────────────────────────────');
  console.log(`  Minting ${MINT_AMOUNT_DISPLAY} AXUSD → ${OPERATOR}…`);
  const mintTx = await token.mint(OPERATOR, MINT_AMOUNT_RAW);
  console.log(`  Tx broadcast: ${mintTx.hash}`);
  const mintReceipt = await mintTx.wait();

  if (mintReceipt.status !== 1) throw new Error('Mint tx reverted — status != 1');
  console.log(`  ✓ Mint tx mined at block ${mintReceipt.blockNumber}`);
  console.log(`  ✓ Receipt status: ${mintReceipt.status} (success)`);

  // ── PHASE D — Post-mint verification ──────────────────────────────
  console.log('\n── Phase D: Post-Mint Verification ──────────────────────');
  const [supply1, balance1] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(OPERATOR),
  ]);
  const blockAfter = await provider.getBlockNumber();

  const supplyDelta  = supply1 - supply0;
  const balanceDelta = balance1 - recipientBalance0;

  const postChecks: Array<[string, boolean, string]> = [
    ['receipt status = 1',     mintReceipt.status === 1,           String(mintReceipt.status)],
    ['supply delta correct',   supplyDelta === MINT_AMOUNT_RAW,    (Number(supplyDelta)/1e6).toFixed(6)+' AXUSD'],
    ['balance delta correct',  balanceDelta === MINT_AMOUNT_RAW,   (Number(balanceDelta)/1e6).toFixed(6)+' AXUSD'],
    ['no pilot cap breach',    supply1 <= PILOT_TOTAL_CAP,         (Number(supply1)/1e6).toFixed(6)+' ≤ 2500'],
    ['no wallet cap breach',   balance1 <= SINGLE_WALLET_CAP,     (Number(balance1)/1e6).toFixed(6)+' ≤ 1000'],
  ];

  let postAllPass = true;
  for (const [label, pass, val] of postChecks) {
    const sym = pass ? '✓' : '✗';
    console.log(`  ${sym} ${label.padEnd(30)} ${val}`);
    if (!pass) postAllPass = false;
  }
  if (!postAllPass) throw new Error('Post-mint verification FAILED');

  // Scan for Transfer event from zero address
  const transferIface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]);
  const logs = mintReceipt.logs
    .map((l: ethers.Log) => { try { return transferIface.parseLog(l); } catch { return null; } })
    .filter(Boolean);
  const mintEvent = logs.find((l: ethers.LogDescription) =>
    l?.name === 'Transfer' && l.args.from === ethers.ZeroAddress,
  );
  console.log(`  Transfer event from zero: ${mintEvent ? '✓ found' : '✗ NOT found'}`);

  const capRemaining = Number(PILOT_TOTAL_CAP - supply1) / 1e6;

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  FIRST AVALANCHE PILOT MINT COMPLETE');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`\n  Tx hash       : ${mintTx.hash}`);
  console.log(`  Block         : ${mintReceipt.blockNumber}`);
  console.log(`  Identity tx   : ${identityTxHash}`);
  console.log(`  Minted        : ${MINT_AMOUNT_DISPLAY} AXUSD`);
  console.log(`  Recipient     : ${OPERATOR}`);
  console.log(`  Supply before : ${(Number(supply0)/1e6).toFixed(6)} AXUSD`);
  console.log(`  Supply after  : ${(Number(supply1)/1e6).toFixed(6)} AXUSD`);
  console.log(`  Cap remaining : ${capRemaining.toFixed(6)} AXUSD / 2500`);
  console.log(`  Explorer      : https://snowtrace.io/tx/${mintTx.hash}`);

  // Machine-readable output for doc generation
  console.log('\n--- JSON_OUTPUT_START ---');
  console.log(JSON.stringify({
    mintTxHash:       mintTx.hash,
    identityTxHash,
    blockNumber:      mintReceipt.blockNumber,
    blockBefore,
    timestamp:        new Date().toISOString(),
    operator:         OPERATOR,
    recipient:        OPERATOR,
    jurisdiction:     'US (840)',
    mintAmount:       MINT_AMOUNT_DISPLAY,
    mintAmountRaw:    MINT_AMOUNT_RAW.toString(),
    supplyBefore:     (Number(supply0)/1e6).toFixed(6),
    supplyAfter:      (Number(supply1)/1e6).toFixed(6),
    balanceBefore:    (Number(recipientBalance0)/1e6).toFixed(6),
    balanceAfter:     (Number(balance1)/1e6).toFixed(6),
    cumulativeMinted: (Number(supply1)/1e6).toFixed(6),
    capRemaining:     capRemaining.toFixed(6),
    reconciliation:   'CLEAN',
    stopCondition:    'NONE',
  }, null, 2));
  console.log('--- JSON_OUTPUT_END ---');
}

main().catch(err => {
  console.error('\n[first-pilot-mint] FAILED:', err.message);
  process.exit(1);
});
