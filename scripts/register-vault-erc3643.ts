/**
 * ERC-3643 registration script — register a new AxiomTreasuryVault in the
 * on-chain identity + compliance stack so AXUSD flows are not gated out.
 *
 * What this script does:
 *   1. Checks whether the vault already has an on-chain identity (idempotent).
 *   2. Creates an ONCHAINID via IdentityFactory (or reuses existing).
 *   3. Registers the identity in IdentityRegistry (wallet → identity mapping).
 *   4. Issues Topic 1 (KYC_VERIFIED) and Topic 3 (SANCTIONS_CLEAR) claims
 *      directly on the ONCHAINID so identityRegistry.isVerified() returns true.
 *   5. (Optional) whitelists the vault on LendingPlatformModule so it can act
 *      as an LP in the credit market.
 *
 * Claim signing:
 *   Claims are signed by the ClaimIssuer EOA (DEPLOYER_PRIVATE_KEY).
 *   The ClaimIssuer contract at ERC3643_CONTRACTS.CLAIM_ISSUER must have
 *   this key registered as a CLAIM_SIGNER_KEY (purpose 3) or MANAGEMENT_KEY
 *   (purpose 1) on its own ONCHAINID for isClaimValid() to return true.
 *
 * Usage:
 *   NEW_VAULT_ADDRESS=0x<addr> \
 *   DEPLOYER_PRIVATE_KEY=<key> \
 *   npx tsx scripts/register-vault-erc3643.ts
 *
 *   Or with Alchemy RPC:
 *   ALCHEMY_API_KEY=<key> NEW_VAULT_ADDRESS=0x<addr> \
 *   DEPLOYER_PRIVATE_KEY=<key> \
 *   npx tsx scripts/register-vault-erc3643.ts
 *
 * Environment variables required:
 *   NEW_VAULT_ADDRESS      — the newly deployed AxiomTreasuryVault address
 *   DEPLOYER_PRIVATE_KEY   — deployer EOA (must be a ClaimIssuer signer key)
 *
 * Optional:
 *   ALCHEMY_API_KEY        — use Alchemy RPC instead of public fallback
 *   SKIP_LENDING_MODULE=1  — skip LendingPlatformModule whitelist step
 *   DRY_RUN=1              — read-only checks, no transactions sent
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import {
  ERC3643_CONTRACTS,
  CLAIM_TOPICS,
  IDENTITY_REGISTRY_ABI,
  IDENTITY_FACTORY_ABI,
  IDENTITY_ABI,
  LENDING_PLATFORM_MODULE_ABI,
} from '../shared/contracts-3643';

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRY_US = 840; // ISO 3166-1 numeric

// ABI additions not in contracts-3643.ts
const MINIMAL_REGISTRY_ABI = [
  ...IDENTITY_REGISTRY_ABI,
  'function isAgent(address) view returns (bool)',
  'function identity(address) view returns (address)',
  'function contains(address) view returns (bool)',
  'function isVerified(address) view returns (bool)',
] as const;

// ── Provider / signer ─────────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  const rpc = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpc);
}

function getSigner(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  return new ethers.Wallet(key, provider);
}

// ── Claim helpers ─────────────────────────────────────────────────────────────

/**
 * Build and sign an ERC-735 claim.
 *
 * Signature scheme (matches ClaimIssuer.isClaimValid):
 *   hash = keccak256(abi.encode(identityAddress, topic, data))
 *   sig  = eth_sign(hash)          ← EIP-191 personal_sign prefix
 */
async function signClaim(
  signer: ethers.Wallet,
  identityAddress: string,
  topic: number,
  data: Uint8Array,
): Promise<string> {
  const packed = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'bytes'],
    [identityAddress, topic, data],
  );
  return signer.signMessage(ethers.getBytes(packed));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const newVaultAddress = process.env.NEW_VAULT_ADDRESS;
  if (!newVaultAddress || !ethers.isAddress(newVaultAddress)) {
    throw new Error('NEW_VAULT_ADDRESS must be set to a valid checksummed address');
  }

  const dryRun         = process.env.DRY_RUN === '1';
  const skipLending    = process.env.SKIP_LENDING_MODULE === '1';
  const vaultAddr      = ethers.getAddress(newVaultAddress);

  const provider = getProvider();
  const signer   = getSigner(provider);

  console.log('ERC-3643 Vault Registration');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  New vault:    ${vaultAddr}`);
  console.log(`  Deployer:     ${signer.address}`);
  console.log(`  Dry run:      ${dryRun ? 'YES — no transactions' : 'NO'}`);
  console.log(`  Lending step: ${skipLending ? 'SKIPPED' : 'ENABLED'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const registry = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_REGISTRY,
    MINIMAL_REGISTRY_ABI,
    signer,
  );
  const factory = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_FACTORY,
    IDENTITY_FACTORY_ABI,
    signer,
  );

  // ── Step 1: Check existing state ──────────────────────────────────────────

  console.log('[1/5] Checking existing registry state...');
  const alreadyContains: boolean = await registry.contains(vaultAddr);
  let existingIdentity: string   = alreadyContains
    ? await registry.identity(vaultAddr)
    : ethers.ZeroAddress;
  const alreadyVerified: boolean = alreadyContains
    ? await registry.isVerified(vaultAddr)
    : false;

  console.log(`  contains(vault):  ${alreadyContains}`);
  console.log(`  identity(vault):  ${existingIdentity}`);
  console.log(`  isVerified(vault):${alreadyVerified}`);

  if (alreadyVerified) {
    console.log('\n  Vault already registered AND verified — nothing to do.');
    console.log('  Run with DRY_RUN=1 to confirm on-chain state. Exiting.');
    return;
  }

  // ── Step 2: Create or reuse ONCHAINID ─────────────────────────────────────

  console.log('\n[2/5] Creating / reusing ONCHAINID for vault...');

  let identityAddress: string;

  if (existingIdentity !== ethers.ZeroAddress) {
    identityAddress = existingIdentity;
    console.log(`  Reusing existing identity: ${identityAddress}`);
  } else {
    // Check if factory already has an identity for this wallet
    const factoryIdentity: string = await factory.walletToIdentity(vaultAddr)
      .catch(() => ethers.ZeroAddress);

    if (factoryIdentity && factoryIdentity !== ethers.ZeroAddress) {
      identityAddress = factoryIdentity;
      console.log(`  Factory already has identity for vault: ${identityAddress}`);
    } else {
      if (dryRun) {
        console.log('  [DRY RUN] Would call factory.createIdentity(vault, vault)');
        console.log('  Exiting dry run at identity creation. Run without DRY_RUN=1 to execute.');
        return;
      }
      console.log(`  Calling factory.createIdentity(${vaultAddr}, ${vaultAddr})...`);
      const createTx = await factory.createIdentity(vaultAddr, vaultAddr);
      console.log(`  tx: ${createTx.hash}  |  https://arbiscan.io/tx/${createTx.hash}`);
      const createReceipt = await createTx.wait();
      if (createReceipt?.status !== 1) throw new Error(`createIdentity reverted: ${createTx.hash}`);
      identityAddress = await factory.walletToIdentity(vaultAddr);
      console.log(`  Identity created: ${identityAddress}`);
    }
  }

  existingIdentity = identityAddress;

  // ── Step 3: Register identity in IdentityRegistry ─────────────────────────

  console.log('\n[3/5] Registering identity in IdentityRegistry...');

  if (alreadyContains) {
    console.log('  Already registered — skipping registerIdentity()');
  } else {
    if (dryRun) {
      console.log(`  [DRY RUN] Would call registry.registerIdentity(${vaultAddr}, ${identityAddress}, ${COUNTRY_US})`);
    } else {
      // IdentityRegistry.registerIdentity requires caller to be an AGENT
      const isAgent: boolean = await registry.isAgent(signer.address);
      if (!isAgent) {
        throw new Error(
          `Signer ${signer.address} is NOT an agent on IdentityRegistry.\n` +
          'Call registry.addAgent(signerAddress) from the registry owner first.',
        );
      }

      console.log(`  Calling registry.registerIdentity(${vaultAddr}, ${identityAddress}, ${COUNTRY_US})...`);
      const regTx = await registry.registerIdentity(vaultAddr, identityAddress, COUNTRY_US);
      console.log(`  tx: ${regTx.hash}  |  https://arbiscan.io/tx/${regTx.hash}`);
      const regReceipt = await regTx.wait();
      if (regReceipt?.status !== 1) throw new Error(`registerIdentity reverted: ${regTx.hash}`);
      console.log('  Identity registered.');
    }
  }

  // ── Step 4: Issue claims on ONCHAINID ─────────────────────────────────────

  console.log('\n[4/5] Issuing KYC (topic 1) and Sanctions (topic 3) claims...');

  const identity = new ethers.Contract(identityAddress, IDENTITY_ABI, signer);

  // Check existing claims to avoid duplicates
  const existingKycClaims: string[]  = await identity.getClaimIdsByTopic(CLAIM_TOPICS.KYC_VERIFIED).catch(() => []);
  const existingSanClaims: string[]  = await identity.getClaimIdsByTopic(CLAIM_TOPICS.SANCTIONS_CLEAR).catch(() => []);
  console.log(`  Existing KYC claims on-chain:      ${existingKycClaims.length}`);
  console.log(`  Existing Sanctions claims on-chain:${existingSanClaims.length}`);

  const claimsToIssue: Array<{ topic: number; label: string; existing: number }> = [];
  if (existingKycClaims.length === 0) {
    claimsToIssue.push({ topic: CLAIM_TOPICS.KYC_VERIFIED,   label: 'KYC_VERIFIED (1)',    existing: existingKycClaims.length });
  }
  if (existingSanClaims.length === 0) {
    claimsToIssue.push({ topic: CLAIM_TOPICS.SANCTIONS_CLEAR, label: 'SANCTIONS_CLEAR (3)', existing: existingSanClaims.length });
  }

  if (claimsToIssue.length === 0) {
    console.log('  All required claims already present on ONCHAINID.');
  }

  for (const { topic, label } of claimsToIssue) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would issue ${label} claim on identity ${identityAddress}`);
      continue;
    }

    const data      = ethers.toUtf8Bytes(`axiom-vault:${vaultAddr.toLowerCase()}:topic${topic}`);
    const signature = await signClaim(signer, identityAddress, topic, data);

    console.log(`  Issuing ${label}...`);
    const claimTx = await identity.addClaim(
      topic,
      1,              // scheme = 1 (ECDSA)
      ERC3643_CONTRACTS.CLAIM_ISSUER,
      signature,
      data,
      '',             // uri — empty for operator-issued claims
    );
    console.log(`  tx: ${claimTx.hash}  |  https://arbiscan.io/tx/${claimTx.hash}`);
    const claimReceipt = await claimTx.wait();
    if (claimReceipt?.status !== 1) throw new Error(`addClaim(${topic}) reverted: ${claimTx.hash}`);
    console.log(`  ${label} claim issued.`);
  }

  // ── Step 5: LendingPlatformModule whitelist (optional) ────────────────────

  if (!skipLending) {
    console.log('\n[5/5] Whitelisting vault on LendingPlatformModule...');
    const lendingModule = new ethers.Contract(
      ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      LENDING_PLATFORM_MODULE_ABI,
      signer,
    );

    const axusd = process.env.AXUSD_ADDRESS ?? '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
    const alreadyWhitelisted: boolean = await lendingModule.isPlatformWhitelisted(axusd, vaultAddr)
      .catch(() => false);

    if (alreadyWhitelisted) {
      console.log('  Already whitelisted on LendingPlatformModule.');
    } else if (dryRun) {
      console.log(`  [DRY RUN] Would call lendingModule.addPlatform(${axusd}, ${vaultAddr})`);
    } else {
      console.log(`  Calling lendingModule.addPlatform(${axusd}, ${vaultAddr})...`);
      const lpTx = await lendingModule.addPlatform(axusd, vaultAddr);
      console.log(`  tx: ${lpTx.hash}  |  https://arbiscan.io/tx/${lpTx.hash}`);
      const lpReceipt = await lpTx.wait();
      if (lpReceipt?.status !== 1) throw new Error(`addPlatform reverted: ${lpTx.hash}`);
      console.log('  Vault whitelisted on LendingPlatformModule.');
    }
  } else {
    console.log('\n[5/5] LendingPlatformModule step SKIPPED (SKIP_LENDING_MODULE=1).');
  }

  // ── Final verification ─────────────────────────────────────────────────────

  console.log('\n[verification] Post-registration on-chain state...');
  const nowContains: boolean  = await registry.contains(vaultAddr);
  const nowVerified: boolean  = await registry.isVerified(vaultAddr);
  const nowIdentity: string   = await registry.identity(vaultAddr);

  console.log(`  contains(vault):   ${nowContains}`);
  console.log(`  identity(vault):   ${nowIdentity}`);
  console.log(`  isVerified(vault): ${nowVerified}`);

  if (!dryRun && (!nowContains || !nowVerified)) {
    console.warn('\nWARNING: vault is registered but isVerified() is false.');
    console.warn('Check that ClaimTopicsRegistry requires topics 1 and 3, and that');
    console.warn('the ClaimIssuer is listed in TrustedIssuersRegistry for those topics.');
    console.warn('Run vault-sprint2-kyc-gate.ts to diagnose the registry configuration.');
  } else if (!dryRun) {
    console.log('\n  Vault fully registered and verified.');
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('Registration complete. Vault is ready for AXUSD flows.');
  console.log('══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
