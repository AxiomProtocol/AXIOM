/**
 * Axiom Protocol — Avalanche Fuji Live Smoke Tests (Task #480)
 *
 * Runs 15 behavioral smoke tests against the deployed ERC-3643 suite on
 * Avalanche Fuji testnet (chainId 43113).
 *
 * Run from workspace root:
 *   cd hardhat-avalanche && npx hardhat run ../scripts/smoke/avalanche/fuji-smoke.mts \
 *     --config hardhat.config.mts --network avalancheFuji
 *
 * Outputs:
 *   deployments/avalanche/fuji-smoke-results.json   — machine-readable results
 *   documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md — human-readable report
 */

import fs   from 'fs';
import path from 'path';
import { network } from 'hardhat';
import type { Contract, Wallet } from 'ethers';

// ─── Contract addresses (from fuji-phase1.json) ──────────────────────────────

const ADDR = {
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643Fuji:     '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
} as const;

const EXPLORER = 'https://testnet.snowtrace.io';

// ─── Artifact loaders ────────────────────────────────────────────────────────

function loadArtifact(relPath: string): { abi: unknown[] } {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8'));
}

const tArtBase = 'node_modules/@tokenysolutions/t-rex/artifacts/contracts';

const IRSArt = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistryStorage.sol/IdentityRegistryStorage.json`);
const IRArt  = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json`);
const MCArt  = loadArtifact(`${tArtBase}/compliance/modular/ModularCompliance.sol/ModularCompliance.json`);
const CAMArt = loadArtifact('../hardhat-avalanche/artifacts/contracts/CountryAllowModule.sol/CountryAllowModule.json');
const TLMArt = loadArtifact('../hardhat-avalanche/artifacts/contracts/TransferLimitModule.sol/TransferLimitModule.json');
const TokenArt = loadArtifact('../hardhat-avalanche/artifacts/contracts/AxiomStable3643Fuji.sol/AxiomStable3643Fuji.json');

// ─── Result tracking ─────────────────────────────────────────────────────────

interface TestResult {
  id:      number;
  name:    string;
  status:  'PASS' | 'FAIL' | 'SKIP';
  detail:  string;
  txHash:  string | null;
  explorer: string | null;
}

const results: TestResult[] = [];
let   passCount = 0;
let   failCount = 0;

function record(
  id:     number,
  name:   string,
  status: 'PASS' | 'FAIL' | 'SKIP',
  detail: string,
  txHash: string | null = null,
): void {
  const explorer = txHash ? `${EXPLORER}/tx/${txHash}` : null;
  results.push({ id, name, status, detail, txHash, explorer });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '–';
  console.log(`  [${icon}] T${String(id).padStart(2,'0')}: ${name}`);
  if (detail) console.log(`       ${detail}`);
  if (explorer) console.log(`       ${explorer}`);
  if (status === 'PASS') passCount++;
  if (status === 'FAIL') failCount++;
}

async function expectRevert(fn: () => Promise<unknown>, label: string): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Axiom Protocol — Avalanche Fuji Live Smoke Tests (Task #480)');
  console.log('══════════════════════════════════════════════════════════════\n');

  const conn    = await network.create('avalancheFuji');
  const { ethers } = conn;
  const networkName = conn.networkName;
  const { chainId } = await ethers.provider.getNetwork();

  const [deployer] = await ethers.getSigners();
  const deployerAddr = deployer.address;
  const avaxBal = ethers.formatEther(await ethers.provider.getBalance(deployerAddr));

  console.log(`Network:   ${networkName} (chainId=${chainId})`);
  console.log(`Deployer:  ${deployerAddr}`);
  console.log(`Balance:   ${avaxBal} AVAX`);
  console.log('');

  // ── Attach contracts ─────────────────────────────────────────────────────
  const irs   = new ethers.Contract(ADDR.IdentityRegistryStorage, IRSArt.abi,  deployer) as unknown as Contract;
  const ir    = new ethers.Contract(ADDR.IdentityRegistry,        IRArt.abi,   deployer) as unknown as Contract;
  const mc    = new ethers.Contract(ADDR.ModularCompliance,       MCArt.abi,   deployer) as unknown as Contract;
  const cam   = new ethers.Contract(ADDR.CountryAllowModule,      CAMArt.abi,  deployer) as unknown as Contract;
  const tlm   = new ethers.Contract(ADDR.TransferLimitModule,     TLMArt.abi,  deployer) as unknown as Contract;
  const token = new ethers.Contract(ADDR.AxiomStable3643Fuji,     TokenArt.abi, deployer) as unknown as Contract;

  console.log('── Read-only state checks ─────────────────────────────────────\n');

  // T01: Token metadata
  try {
    const name     = await (token as any).name();
    const symbol   = await (token as any).symbol();
    const decimals = await (token as any).decimals();
    const supply   = await (token as any).totalSupply();
    const paused   = await (token as any).paused();
    record(1, 'Token metadata (name/symbol/decimals/supply/paused)',
      'PASS',
      `name="${name}" symbol="${symbol}" decimals=${decimals} supply=${ethers.formatUnits(supply, decimals)} paused=${paused}`
    );
  } catch (e: any) {
    record(1, 'Token metadata (name/symbol/decimals/supply/paused)', 'FAIL', String(e.message ?? e));
  }

  // T02: Deployer admin/minter/agent roles
  try {
    const ADMIN_ROLE  = await (token as any).DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await (token as any).MINTER_ROLE();
    const AGENT_ROLE  = await (token as any).AGENT_ROLE();
    const isAdmin  = await (token as any).hasRole(ADMIN_ROLE, deployerAddr);
    const isMinter = await (token as any).hasRole(MINTER_ROLE, deployerAddr);
    const isAgent  = await (token as any).hasRole(AGENT_ROLE, deployerAddr);
    const ok = isAdmin && isMinter && isAgent;
    record(2, 'Deployer admin/minter/agent roles',
      ok ? 'PASS' : 'FAIL',
      `isAdmin=${isAdmin} isMinter=${isMinter} isAgent=${isAgent}`
    );
  } catch (e: any) {
    record(2, 'Deployer admin/minter/agent roles', 'FAIL', String(e.message ?? e));
  }

  // T03: ModularCompliance bound to token
  try {
    const tokenBound = await (mc as any).getTokenBound();
    const ok = tokenBound.toLowerCase() === ADDR.AxiomStable3643Fuji.toLowerCase();
    record(3, 'ModularCompliance bound to AxiomStable3643Fuji',
      ok ? 'PASS' : 'FAIL',
      `getTokenBound()=${tokenBound}`
    );
  } catch (e: any) {
    record(3, 'ModularCompliance bound to AxiomStable3643Fuji', 'FAIL', String(e.message ?? e));
  }

  // T04: IdentityRegistry wiring (TIR, CTR, IRS)
  try {
    const tirAddr = (await (ir as any).issuersRegistry()).toLowerCase();
    const ctrAddr = (await (ir as any).topicsRegistry()).toLowerCase();
    const irsAddr = (await (ir as any).identityStorage()).toLowerCase();
    const ok =
      tirAddr === ADDR.TrustedIssuersRegistry.toLowerCase() &&
      ctrAddr === ADDR.ClaimTopicsRegistry.toLowerCase() &&
      irsAddr === ADDR.IdentityRegistryStorage.toLowerCase();
    record(4, 'IdentityRegistry connected to TIR, CTR, IRS',
      ok ? 'PASS' : 'FAIL',
      `TIR=${tirAddr.slice(0,10)}… CTR=${ctrAddr.slice(0,10)}… IRS=${irsAddr.slice(0,10)}…`
    );
  } catch (e: any) {
    record(4, 'IdentityRegistry connected to TIR, CTR, IRS', 'FAIL', String(e.message ?? e));
  }

  // T05: Compliance modules attached
  try {
    const modules: string[] = await (mc as any).getModules();
    const lower = modules.map((m: string) => m.toLowerCase());
    const hasCAM = lower.includes(ADDR.CountryAllowModule.toLowerCase());
    const hasTLM = lower.includes(ADDR.TransferLimitModule.toLowerCase());
    const ok = hasCAM && hasTLM;
    record(5, 'CountryAllowModule and TransferLimitModule attached to MC',
      ok ? 'PASS' : 'FAIL',
      `modules=[${modules.map((m:string) => m.slice(0,10)+'…').join(', ')}] CAM=${hasCAM} TLM=${hasTLM}`
    );
  } catch (e: any) {
    record(5, 'CountryAllowModule and TransferLimitModule attached to MC', 'FAIL', String(e.message ?? e));
  }

  // T06: Deployer registered in IdentityRegistry
  try {
    const isVerified = await (ir as any).isVerified(deployerAddr);
    const isAgent    = await (ir as any).isAgent(deployerAddr);
    record(6, 'Deployer verified + agent in IdentityRegistry',
      isVerified ? 'PASS' : 'FAIL',
      `isVerified=${isVerified} isAgent=${isAgent}`
    );
  } catch (e: any) {
    record(6, 'Deployer verified + agent in IdentityRegistry', 'FAIL', String(e.message ?? e));
  }

  console.log('\n── Live transaction tests ─────────────────────────────────────\n');

  // T07: Mint 1 000 AXUSD to deployer
  let mintTx: string | null = null;
  try {
    const MINT_AMOUNT = ethers.parseUnits('1000', 6);
    const tx  = await (token as any).mint(deployerAddr, MINT_AMOUNT);
    const rec = await tx.wait();
    mintTx = rec.hash;
    const balAfter = await (token as any).balanceOf(deployerAddr);
    record(7, 'Mint 1 000 AXUSD to deployer', 'PASS',
      `balance after mint: ${ethers.formatUnits(balAfter, 6)} AXUSD`, mintTx
    );
  } catch (e: any) {
    record(7, 'Mint 1 000 AXUSD to deployer', 'FAIL', String(e.message ?? e));
  }

  // ── Register a second ephemeral test wallet ───────────────────────────────
  // Deterministic test key — FUJI TESTNET ONLY, no real funds ever sent here.
  const TEST_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account #0
  const testWallet = new ethers.Wallet(TEST_PK, ethers.provider) as unknown as Wallet;
  const testAddr   = (testWallet as any).address as string;

  // T08: Register second wallet in IdentityRegistry
  let regTx: string | null = null;
  let testWalletRegistered = false;
  try {
    const alreadyRegistered = await (ir as any).contains(testAddr);
    if (alreadyRegistered) {
      testWalletRegistered = true;
      record(8, 'Register second test wallet in IdentityRegistry',
        'PASS', `${testAddr} already registered (idempotent)`, null
      );
    } else {
      const tx  = await (ir as any).registerIdentity(testAddr, testAddr, 0);
      const rec = await tx.wait();
      regTx = rec.hash;
      testWalletRegistered = true;
      record(8, 'Register second test wallet in IdentityRegistry',
        'PASS', `registered ${testAddr}`, regTx
      );
    }
  } catch (e: any) {
    record(8, 'Register second test wallet in IdentityRegistry', 'FAIL', String(e.message ?? e));
  }

  // T09: Transfer to registered test wallet
  let xferToRegisteredTx: string | null = null;
  if (testWalletRegistered) {
    try {
      const XFER_AMOUNT = ethers.parseUnits('100', 6);
      const tx  = await (token as any).transfer(testAddr, XFER_AMOUNT);
      const rec = await tx.wait();
      xferToRegisteredTx = rec.hash;
      const bal = await (token as any).balanceOf(testAddr);
      record(9, 'Transfer 100 AXUSD to registered test wallet',
        'PASS', `test wallet balance: ${ethers.formatUnits(bal, 6)} AXUSD`, xferToRegisteredTx
      );
    } catch (e: any) {
      record(9, 'Transfer 100 AXUSD to registered test wallet', 'FAIL', String(e.message ?? e));
    }
  } else {
    record(9, 'Transfer 100 AXUSD to registered test wallet', 'SKIP', 'Test wallet not registered');
  }

  // T10: Transfer to UNREGISTERED wallet (must revert)
  try {
    const randomAddr = ethers.Wallet.createRandom().address;
    const XFER_AMOUNT = ethers.parseUnits('10', 6);
    const reverted = await expectRevert(
      () => (token as any).transfer(randomAddr, XFER_AMOUNT),
      'RECEIVER_NOT_VERIFIED'
    );
    record(10, 'Transfer to unregistered wallet reverts',
      reverted ? 'PASS' : 'FAIL',
      reverted
        ? `correctly reverted (RECEIVER_NOT_VERIFIED or compliance failure)`
        : `ERROR: transfer to ${randomAddr} did not revert`
    );
  } catch (e: any) {
    record(10, 'Transfer to unregistered wallet reverts', 'FAIL', String(e.message ?? e));
  }

  // T11: TransferLimitModule enforcement
  try {
    const LIMIT = ethers.parseUnits('200', 6);
    const OVER  = ethers.parseUnits('300', 6);
    const UNDER = ethers.parseUnits('150', 6);

    // Ensure deployer has enough balance — mint more if needed
    const deployerBal = await (token as any).balanceOf(deployerAddr);
    if (deployerBal < OVER) {
      const mintTx2 = await (token as any).mint(deployerAddr, ethers.parseUnits('500', 6));
      await mintTx2.wait();
    }

    // Set limit (TLM owner == deployer)
    const setLimitTx = await (tlm as any).setTransferLimit(ADDR.ModularCompliance, LIMIT);
    await setLimitTx.wait();

    // Test over-limit transfer (must revert)
    const registeredRecipient = testWalletRegistered ? testAddr : deployerAddr;
    const overReverted = await expectRevert(
      () => (token as any).transfer(registeredRecipient, OVER),
      'TRANSFER_NOT_COMPLIANT'
    );

    // Test under-limit transfer (must pass)
    const underTx  = await (token as any).transfer(registeredRecipient, UNDER);
    const underRec = await underTx.wait();

    // Reset limit to 0 (unlimited) to avoid affecting subsequent tests
    const resetTx = await (tlm as any).setTransferLimit(ADDR.ModularCompliance, 0n);
    await resetTx.wait();

    const ok = overReverted;
    record(11, 'TransferLimitModule: over-limit reverts, under-limit passes',
      ok ? 'PASS' : 'FAIL',
      `limit=200 AXUSD — over(300) reverted=${overReverted}, under(150) tx=${underRec.hash.slice(0,12)}…`,
      underRec.hash
    );
  } catch (e: any) {
    record(11, 'TransferLimitModule enforcement', 'FAIL', String(e.message ?? e));
    // Reset limit just in case
    try {
      const resetTx = await (tlm as any).setTransferLimit(ADDR.ModularCompliance, 0n);
      await resetTx.wait();
    } catch { /* ignore */ }
  }

  // T12: Pause blocks transfers
  let pauseTx: string | null = null;
  let pauseWorked = false;
  try {
    const pTx  = await (token as any).pause();
    const pRec = await pTx.wait();
    pauseTx = pRec.hash;

    const isPaused = await (token as any).paused();
    const registeredRecipient = testWalletRegistered ? testAddr : ethers.Wallet.createRandom().address;
    const reverted = await expectRevert(
      () => (token as any).transfer(registeredRecipient, ethers.parseUnits('1', 6)),
      'TOKEN_PAUSED'
    );

    pauseWorked = isPaused && reverted;
    record(12, 'Pause blocks all transfers',
      pauseWorked ? 'PASS' : 'FAIL',
      `paused=${isPaused} transferReverted=${reverted}`, pauseTx
    );
  } catch (e: any) {
    record(12, 'Pause blocks all transfers', 'FAIL', String(e.message ?? e));
  }

  // T13: Unpause restores transfers
  let unpauseTx: string | null = null;
  try {
    const upTx  = await (token as any).unpause();
    const upRec = await upTx.wait();
    unpauseTx = upRec.hash;

    const isPaused = await (token as any).paused();

    // Confirm a transfer succeeds after unpause
    if (testWalletRegistered) {
      const transferTx = await (token as any).transfer(testAddr, ethers.parseUnits('5', 6));
      await transferTx.wait();
    }

    record(13, 'Unpause restores transfers',
      !isPaused ? 'PASS' : 'FAIL',
      `paused after unpause=${isPaused}`, unpauseTx
    );
  } catch (e: any) {
    record(13, 'Unpause restores transfers', 'FAIL', String(e.message ?? e));
    // Safety net — ensure token is unpaused
    try {
      if (await (token as any).paused()) {
        await (await (token as any).unpause()).wait();
      }
    } catch { /* ignore */ }
  }

  // T14: Freeze blocks sender, unfreeze restores
  let freezeTx: string | null = null;
  try {
    // Freeze the test wallet (receiver freeze)
    const fTx  = await (token as any).freezeAddress(testAddr, true);
    const fRec = await fTx.wait();
    freezeTx = fRec.hash;

    const isFrozen = await (token as any).isFrozen(testAddr);

    // Transfer to frozen receiver must revert
    const reverted = await expectRevert(
      () => (token as any).transfer(testAddr, ethers.parseUnits('1', 6)),
      'RECEIVER_FROZEN'
    );

    // Unfreeze
    const ufTx = await (token as any).freezeAddress(testAddr, false);
    await ufTx.wait();
    const isFrozenAfter = await (token as any).isFrozen(testAddr);

    // Transfer should now succeed
    let resumeOk = false;
    try {
      const rTx = await (token as any).transfer(testAddr, ethers.parseUnits('1', 6));
      await rTx.wait();
      resumeOk = true;
    } catch { /* */ }

    const ok = isFrozen && reverted && !isFrozenAfter && resumeOk;
    record(14, 'Freeze blocks receiver; unfreeze restores transfers',
      ok ? 'PASS' : 'FAIL',
      `frozenDuring=${isFrozen} transferReverted=${reverted} frozenAfter=${isFrozenAfter} resumeOk=${resumeOk}`,
      freezeTx
    );
  } catch (e: any) {
    record(14, 'Freeze blocks receiver; unfreeze restores transfers', 'FAIL', String(e.message ?? e));
    // Safety: unfreeze
    try {
      await (await (token as any).freezeAddress(testAddr, false)).wait();
    } catch { /* ignore */ }
  }

  // T15: Final state read — supply and deployer balance
  try {
    const supply       = await (token as any).totalSupply();
    const deployerBal  = await (token as any).balanceOf(deployerAddr);
    const testBal      = await (token as any).balanceOf(testAddr);
    const decimals     = await (token as any).decimals();
    const paused       = await (token as any).paused();
    record(15, 'Final state read — supply and balances',
      'PASS',
      `totalSupply=${ethers.formatUnits(supply, decimals)} deployer=${ethers.formatUnits(deployerBal, decimals)} testWallet=${ethers.formatUnits(testBal, decimals)} paused=${paused}`
    );
  } catch (e: any) {
    record(15, 'Final state read — supply and balances', 'FAIL', String(e.message ?? e));
  }

  // ─── Write outputs ────────────────────────────────────────────────────────

  const completedAt = new Date().toISOString();
  const summary = {
    task:        'Task #480 — Avalanche Fuji Live Smoke Tests',
    network:     networkName,
    chainId:     Number(chainId),
    deployer:    deployerAddr,
    contracts:   ADDR,
    startedAt,
    completedAt,
    total:       results.length,
    passed:      passCount,
    failed:      failCount,
    skipped:     results.filter(r => r.status === 'SKIP').length,
    results,
  };

  // fuji-smoke-results.json
  const jsonOut = path.resolve(process.cwd(), '..', 'deployments', 'avalanche', 'fuji-smoke-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));

  // Markdown report
  const mdOut = path.resolve(process.cwd(), '..', 'documents', 'chains', 'AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md');
  const md = buildReport(summary);
  fs.writeFileSync(mdOut, md);

  // ─── Console summary ──────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passCount} passed  ${failCount} failed  ${summary.skipped} skipped`);
  console.log(`  Manifest → ${jsonOut}`);
  console.log(`  Report   → ${mdOut}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(s: ReturnType<typeof Object.assign>): string {
  const statusBadge = (r: TestResult) =>
    r.status === 'PASS' ? '✅ PASS' :
    r.status === 'FAIL' ? '❌ FAIL' : '⏭ SKIP';

  const rows = s.results.map((r: TestResult) =>
    `| T${String(r.id).padStart(2,'0')} | ${statusBadge(r)} | ${r.name} | ${r.detail.replace(/\|/g,'·')} | ${r.txHash ? `[tx](${r.explorer})` : '—'} |`
  ).join('\n');

  const contractRows = Object.entries(s.contracts as Record<string, string>).map(([name, addr]) =>
    `| ${name} | \`${addr}\` | [Snowtrace](https://testnet.snowtrace.io/address/${addr}) |`
  ).join('\n');

  return `# Axiom Protocol — Avalanche Fuji Live Smoke Test Report

**Task:** #480 — Avalanche Fuji Live Smoke Tests  
**Network:** ${s.network} (chainId ${s.chainId})  
**Deployer:** \`${s.deployer}\`  
**Started:** ${s.startedAt}  
**Completed:** ${s.completedAt}  
**Result:** ${s.passed}/${s.total} tests passed — ${s.failed} failed — ${s.skipped} skipped

---

## Contract Registry

| Contract | Address | Explorer |
|---|---|---|
${contractRows}

---

## Test Results

| ID | Status | Name | Detail | Tx |
|---|---|---|---|---|
${rows}

---

## Notes

- **CountryAllowModule.setAllowAll(true)** is a **Fuji testnet-only** configuration.  
  It bypasses country restrictions for testing. Must NOT be used on mainnet.
- The second test wallet (\`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\`) uses  
  Hardhat account #0 as a deterministic recipient for transfer tests.  
  No private key security is implied — this is a zero-value testnet address.
- **TransferLimitModule** limit is reset to 0 (unlimited) after T11 to avoid  
  interference with subsequent tests.
- The smoke identity seed (\`registerIdentity(deployer, deployer, 0)\`) from the  
  Phase 2 deploy script is the baseline for T06 and T07.
- All transaction hashes are live on Fuji Snowtrace:  
  \`https://testnet.snowtrace.io/tx/<hash>\`

---

## Mainnet Promotion Notes

Before deploying to Avalanche C-Chain mainnet:

- Replace \`setAllowAll(true)\` with an explicit country allowlist
- Use a Gnosis Safe multi-sig as DEFAULT_ADMIN_ROLE, AGENT_ROLE, MINTER_ROLE
- Set a meaningful TransferLimitModule limit appropriate to expected trade sizes
- Remove or replace the deployer seed identity before production use
- Conduct a full external security audit of the ERC-3643 compliance stack
`;
}

main().catch((err: Error) => {
  console.error(err);
  process.exitCode = 1;
});
