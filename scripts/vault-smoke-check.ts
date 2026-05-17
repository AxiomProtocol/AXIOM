/**
 * Vault post-deployment smoke check.
 *
 * Asserts three invariants that must hold after the vault stack redeploy:
 *   1. vault.totalAssets() >= MIN_USDC_PRINCIPAL (25 USDC)
 *   2. aaveStrategy.currentValue() > 0 (Aave yield is active)
 *   3. registry.contains(vault) = true (identity registered)
 *
 * Prints a one-line PASS / FAIL summary per check and exits:
 *   0  — all checks passed
 *   1  — one or more checks failed (or a hard RPC error)
 *
 * Usage:
 *   npx tsx scripts/vault-smoke-check.ts
 *
 * Environment variables (all optional — defaults to the deployed addresses):
 *   AXIOM_TREASURY_VAULT_ADDRESS      — vault address (default: deployed value)
 *   AXIOM_AAVE_V3_STRATEGY_ADDRESS    — AaveV3Strategy address (default: deployed value)
 *   IDENTITY_REGISTRY_ADDRESS         — IdentityRegistry address (default: ERC3643 registry)
 *   ALCHEMY_API_KEY                   — Alchemy RPC key (falls back to public Arbitrum RPC)
 *   MIN_USDC_PRINCIPAL                — minimum expected vault totalAssets, raw uint256 (default: 25_000000)
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS } from '../shared/contracts-3643';

// ── Default deployed addresses ────────────────────────────────────────────────

const DEFAULT_VAULT     = '0x8c9761D465CB95306266a68FF8935C4690EC6092';
const DEFAULT_STRATEGY  = '0x7d500015C5765456C16Ce2CF38AAF14075C01DD4';
const DEFAULT_REGISTRY  = ERC3643_CONTRACTS.IDENTITY_REGISTRY;
const DEFAULT_MIN_USDC  = 25_000_000n; // 25 USDC (6 decimals)

// ── ABIs ──────────────────────────────────────────────────────────────────────

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
] as const;

const STRATEGY_ABI = [
  'function currentValue() view returns (uint256)',
] as const;

const REGISTRY_ABI = [
  'function contains(address) view returns (bool)',
  'function isVerified(address) view returns (bool)',
] as const;

// ── Typed contract interfaces ─────────────────────────────────────────────────

interface IVault {
  totalAssets(): Promise<bigint>;
}

interface IStrategy {
  currentValue(): Promise<bigint>;
}

interface IRegistry {
  contains(wallet: string): Promise<boolean>;
  isVerified(wallet: string): Promise<boolean>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pass(label: string, detail: string): void {
  console.log(`  ✓ PASS  ${label.padEnd(40)} ${detail}`);
}

function fail(label: string, detail: string): void {
  console.error(`  ✗ FAIL  ${label.padEnd(40)} ${detail}`);
}

function info(label: string, detail: string): void {
  console.log(`  ·       ${label.padEnd(40)} ${detail}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const vaultAddr    = process.env.AXIOM_TREASURY_VAULT_ADDRESS    ?? DEFAULT_VAULT;
  const strategyAddr = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS  ?? DEFAULT_STRATEGY;
  const registryAddr = process.env.IDENTITY_REGISTRY_ADDRESS        ?? DEFAULT_REGISTRY;
  const minUsdc      = BigInt(process.env.MIN_USDC_PRINCIPAL        ?? String(DEFAULT_MIN_USDC));

  const rpc = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  const provider = new ethers.JsonRpcProvider(rpc);

  const vault    = new ethers.Contract(vaultAddr,    VAULT_ABI,    provider) as ethers.Contract & IVault;
  const strategy = new ethers.Contract(strategyAddr, STRATEGY_ABI, provider) as ethers.Contract & IStrategy;
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider) as ethers.Contract & IRegistry;

  console.log('Axiom Vault Smoke Check');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Vault:         ${vaultAddr}`);
  console.log(`  Strategy:      ${strategyAddr}`);
  console.log(`  Registry:      ${registryAddr}`);
  console.log(`  Min principal: ${Number(minUsdc) / 1e6} USDC`);
  console.log('═══════════════════════════════════════════════════════════\n');

  let failures = 0;

  // ── Check 1: vault.totalAssets() >= minUsdc ───────────────────────────────

  try {
    const totalAssets = await vault.totalAssets();
    const usdc = Number(totalAssets) / 1e6;
    const label = 'vault.totalAssets() >= min';
    if (totalAssets >= minUsdc) {
      pass(label, `${usdc.toFixed(6)} USDC`);
    } else {
      fail(label, `got ${usdc.toFixed(6)} USDC — expected >= ${Number(minUsdc) / 1e6}`);
      failures++;
    }
  } catch (err) {
    fail('vault.totalAssets()', `RPC error: ${err instanceof Error ? err.message : String(err)}`);
    failures++;
  }

  // ── Check 2: strategy.currentValue() > 0 (Aave yield active) ────────────

  try {
    const currentValue = await strategy.currentValue();
    const usdc = Number(currentValue) / 1e6;
    const label = 'strategy.currentValue() > 0';
    if (currentValue > 0n) {
      pass(label, `${usdc.toFixed(6)} USDC (aUSDC balance)`);
    } else {
      fail(label, 'currentValue = 0 — USDC may not be deployed to Aave yet');
      failures++;
    }
  } catch (err) {
    fail('strategy.currentValue()', `RPC error: ${err instanceof Error ? err.message : String(err)}`);
    failures++;
  }

  // ── Check 3: registry.contains(vault) = true ─────────────────────────────

  try {
    const contains = await registry.contains(vaultAddr);
    const label = 'registry.contains(vault)';
    if (contains) {
      pass(label, 'true — vault has an ONCHAINID registered');
    } else {
      fail(label, 'false — run register-vault-erc3643.ts first');
      failures++;
    }
  } catch (err) {
    fail('registry.contains(vault)', `RPC error: ${err instanceof Error ? err.message : String(err)}`);
    failures++;
  }

  // ── Informational: isVerified (known-pending, not a gating check) ─────────

  try {
    const isVerified = await registry.isVerified(vaultAddr);
    const label = 'registry.isVerified(vault) [info]';
    if (isVerified) {
      info(label, 'true — AXUSD flows are unblocked');
    } else {
      info(label, 'false — follow-up #547 required (does not affect USDC→Aave yield)');
    }
  } catch {
    info('registry.isVerified(vault) [info]', 'RPC error — skipped');
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  if (failures === 0) {
    console.log('SMOKE CHECK PASSED — vault is active and Aave yield is running.');
  } else {
    console.error(`SMOKE CHECK FAILED — ${failures} check(s) did not pass.`);
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err instanceof Error ? err.message : err);
  process.exit(1);
});
