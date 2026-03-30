/**
 * Deploy CanonicalPSM (ERC-3643 Identity-Gated Peg Stability Module)
 *
 * All key parameters are configurable via environment variables or fall back to documented defaults.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-canonical-psm.ts --network arbitrum
 *
 * Environment overrides (all optional — defaults shown below):
 *   CANONICAL_PSM_AXUSD       ERC-3643 AXUSD token address    (default: activeContracts ACTIVE_AXUSD)
 *   CANONICAL_PSM_COLLATERAL  Collateral token address         (default: Arbitrum One USDC)
 *   CANONICAL_PSM_REGISTRY    ERC-3643 IdentityRegistry addr   (default: activeContracts IDENTITY_REGISTRY)
 *   CANONICAL_PSM_CEILING     Debt ceiling (AXUSD, 18 dec)     (default: 1_000_000)
 *   CANONICAL_PSM_MINT_FEE    Mint fee in basis points (bps)   (default: 10  = 0.10%)
 *   CANONICAL_PSM_REDEEM_FEE  Redeem fee in basis points (bps) (default: 10  = 0.10%)
 *   CANONICAL_PSM_OWNER       Final owner address              (default: GOVERNANCE_SAFE)
 *   CANONICAL_PSM_DRY_RUN     Set to "true" to simulate only, no on-chain tx (default: false)
 *
 * Access control model:
 *   This contract uses OpenZeppelin Ownable2Step (owner-only).
 *   There is no separate operator role. All admin functions
 *   (pause, setFee, setCeiling, sweepFees, transferOwnership)
 *   require the Governance Safe. This is intentional — the Safe's 3-of-5
 *   threshold provides the multi-party authorization guarantee without
 *   a separate on-chain operator key.
 *
 * Post-deploy (must be executed via Governance Safe):
 *   1. axusd.addAgent(PSM_ADDRESS)                 → enables PSM mint/burn authority
 *   2. LendingPlatformModule.addPlatform(AXUSD, PSM_ADDRESS) → compliance whitelist
 */

import { ethers } from 'hardhat';

const DEFAULTS = {
  AXUSD:        '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', // ERC-3643 Unified AXUSD
  COLLATERAL:   '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum One
  REGISTRY:     '0x58f64a1262d5434d6C7637a2309b0999bB6D1970', // Axiom ERC-3643 IdentityRegistry
  CEILING:      ethers.parseUnits('1000000', 18),             // 1M AXUSD (18 dec)
  MINT_FEE:     10n,                                          // 10 bps = 0.10%
  REDEEM_FEE:   10n,                                          // 10 bps = 0.10%
  OWNER:        '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d', // Governance Safe (3-of-5)
};

function envAddr(key: string, fallback: string): string {
  const v = process.env[key];
  if (!v) return fallback;
  if (!v.match(/^0x[0-9a-fA-F]{40}$/)) throw new Error(`${key} is not a valid address: ${v}`);
  return v;
}

function envBigInt(key: string, fallback: bigint): bigint {
  const v = process.env[key];
  if (!v) return fallback;
  return BigInt(v);
}

function envUnit(key: string, decimals: number, fallback: bigint): bigint {
  const v = process.env[key];
  if (!v) return fallback;
  return ethers.parseUnits(v, decimals);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log(`\n=== CanonicalPSM Deployment ===`);
  console.log(`Network  : ${network.name} (chainId ${network.chainId})`);
  console.log(`Deployer : ${deployer.address}`);

  // ── Resolve parameters ──────────────────────────────────────────────────────
  const axusd       = envAddr('CANONICAL_PSM_AXUSD',      DEFAULTS.AXUSD);
  const collateral  = envAddr('CANONICAL_PSM_COLLATERAL', DEFAULTS.COLLATERAL);
  const registry    = envAddr('CANONICAL_PSM_REGISTRY',   DEFAULTS.REGISTRY);
  const ceiling     = envUnit('CANONICAL_PSM_CEILING', 18, DEFAULTS.CEILING);
  const mintFee     = envBigInt('CANONICAL_PSM_MINT_FEE',    DEFAULTS.MINT_FEE);
  const redeemFee   = envBigInt('CANONICAL_PSM_REDEEM_FEE',  DEFAULTS.REDEEM_FEE);
  const finalOwner  = envAddr('CANONICAL_PSM_OWNER',      DEFAULTS.OWNER);
  const dryRun      = process.env.CANONICAL_PSM_DRY_RUN === 'true';

  console.log(`\nDeployment Parameters:`);
  console.log(`  axusd       : ${axusd}`);
  console.log(`  collateral  : ${collateral}  (USDC)`);
  console.log(`  registry    : ${registry}`);
  console.log(`  debtCeiling : ${ethers.formatUnits(ceiling, 18)} AXUSD`);
  console.log(`  mintFee     : ${mintFee} bps (${Number(mintFee) / 100}%)`);
  console.log(`  redeemFee   : ${redeemFee} bps (${Number(redeemFee) / 100}%)`);
  console.log(`  finalOwner  : ${finalOwner}`);
  console.log(`  dryRun      : ${dryRun}`);
  console.log(`\nAccess Control: owner-only (Ownable2Step). No separate operator role.`);
  console.log(`All admin ops require Governance Safe authorization.\n`);

  if (dryRun) {
    console.log('[DRY RUN] Simulation only — no on-chain transactions will be submitted.');
    console.log('[DRY RUN] Constructor args that would be used:');
    console.log(`  CanonicalPSM(${axusd}, ${collateral}, ${registry}, ${ceiling}, ${mintFee}, ${redeemFee})`);
    return;
  }

  // ── Deploy ──────────────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory('CanonicalPSM');
  console.log('Deploying CanonicalPSM...');
  const psm = await Factory.deploy(axusd, collateral, registry, ceiling, mintFee, redeemFee);
  await psm.waitForDeployment();
  const psmAddress = await psm.getAddress();
  console.log(`CanonicalPSM deployed at: ${psmAddress}`);
  console.log(`Deploy TX: ${psm.deploymentTransaction()?.hash}`);

  // ── Transfer ownership ───────────────────────────────────────────────────────
  if (finalOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`\nTransferring ownership to ${finalOwner}...`);
    const tx = await psm.transferOwnership(finalOwner);
    await tx.wait();
    console.log(`transferOwnership TX: ${tx.hash}`);
    console.log(`Note: final owner must call acceptOwnership() to complete the 2-step transfer.`);
  } else {
    console.log(`\nOwner is deployer — no ownership transfer needed.`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n=== Deployment Complete ===`);
  console.log(`PSM Address    : ${psmAddress}`);
  console.log(`Network        : ${network.name} (${network.chainId})`);
  console.log(`AXUSD          : ${axusd}`);
  console.log(`Collateral     : ${collateral}`);
  console.log(`IdentityReg    : ${registry}`);
  console.log(`Debt Ceiling   : ${ethers.formatUnits(ceiling, 18)} AXUSD`);
  console.log(`Mint Fee       : ${mintFee} bps`);
  console.log(`Redeem Fee     : ${redeemFee} bps`);
  console.log(`Pending Owner  : ${finalOwner}`);
  console.log(`\nPost-Deploy (Governance Safe required):`);
  console.log(`  1. finalOwner.acceptOwnership()                    (completes Ownable2Step)`);
  console.log(`  2. axusd.addAgent(${psmAddress})  (enables mint/burn)`);
  console.log(`  3. LendingPlatformModule.addPlatform(axusd, ${psmAddress})`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
