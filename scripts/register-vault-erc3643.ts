/**
 * ERC-3643 registration script — register a new AxiomTreasuryVault in the
 * on-chain identity + compliance stack so AXUSD flows are not gated out.
 *
 * Identity creation strategy (proven working):
 *   The IdentityFactory.createIdentity(wallet, managementKey) must receive the
 *   DEPLOYER address as `managementKey` (not `vaultAddr`) so the deployer EOA
 *   holds MANAGEMENT_KEY (purpose 1) on the resulting ONCHAINID and can call
 *   addClaim() directly.
 *
 *   However, if the factory already has an entry for this wallet
 *   (IDENTITY_EXISTS), a fresh EIP-1167 minimal proxy is deployed directly
 *   against the ONCHAINID implementation (0xD18632586d…) and initialised with
 *   the deployer as management key.  The registry is then updated to point to
 *   the new proxy via registerIdentity() (or updateIdentity() if wallet is
 *   already registered).
 *
 * Claim signing:
 *   Claims are signed by the deployer EOA using eth_sign (EIP-191).
 *   For isVerified() to return true, the ClaimIssuer contract at
 *   ERC3643_CONTRACTS.CLAIM_ISSUER must have the deployer key registered as a
 *   CLAIM_SIGNER_KEY (purpose 3).  If not, claims are stored on-chain but
 *   isVerified() will remain false — see KNOWN LIMITATION below.
 *
 * Claim signing (corrected encoding):
 *   Claims are signed using keccak256(abi.encode(identity, topic, data)) — standard
 *   ABI encoding, not abi.encodePacked.  This matches ClaimIssuer.isClaimValid()
 *   on-chain.  After each addClaim(), the script calls isClaimValid() to verify
 *   the signature is accepted before continuing.
 *
 * KNOWN LIMITATION (2026-05, follow-up #547):
 *   Even with correct abi.encode hashing, isVerified() may return false if the
 *   deployer key is not registered as a CLAIM_SIGNER_KEY (purpose 3) on the
 *   ClaimIssuer at 0x579A367ead….  The isClaimValid() post-check will report
 *   false if this is the case, and the script will exit 2 with remediation steps.
 *   The USDC→Aave yield path does NOT require isVerified and works correctly.
 *
 * Exit codes:
 *   0 — vault is fully registered AND isVerified() is true
 *   2 — vault is registered and claims are on-chain, but isVerified() is false
 *       (ClaimIssuer signer key not configured — see follow-up #547)
 *   1 — hard error (unrecoverable failure)
 *
 * Usage:
 *   NEW_VAULT_ADDRESS=0x<addr> \
 *   DEPLOYER_PRIVATE_KEY=<key> \
 *   npx tsx scripts/register-vault-erc3643.ts
 *
 *   Dry-run (read-only, no transactions):
 *   DRY_RUN=1 NEW_VAULT_ADDRESS=0x<addr> npx tsx scripts/register-vault-erc3643.ts
 *
 *   Skip LendingPlatformModule whitelist:
 *   SKIP_LENDING_MODULE=1 NEW_VAULT_ADDRESS=0x<addr> \
 *   npx tsx scripts/register-vault-erc3643.ts
 *
 * Environment variables required:
 *   NEW_VAULT_ADDRESS      — the newly deployed AxiomTreasuryVault address
 *   DEPLOYER_PRIVATE_KEY   — deployer EOA (must be a ClaimIssuer signer key
 *                            for isVerified() to return true — see #547)
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

// ── Narrow typed interfaces for ethers.Contract casts ─────────────────────────
// These replace (contract as any) calls with typed surfaces that match the ABIs
// declared in shared/contracts-3643.ts and MINIMAL_REGISTRY_ABI below.

interface IIdentityRegistry {
  contains(wallet: string): Promise<boolean>;
  identity(wallet: string): Promise<string>;
  isVerified(wallet: string): Promise<boolean>;
  isAgent(account: string): Promise<boolean>;
  registerIdentity(
    wallet: string,
    identity: string,
    country: number,
  ): Promise<ethers.ContractTransactionResponse>;
  updateIdentity(
    wallet: string,
    newIdentity: string,
  ): Promise<ethers.ContractTransactionResponse>;
}

interface IIdentityFactory {
  walletToIdentity(wallet: string): Promise<string>;
  createIdentity(
    wallet: string,
    managementKey: string,
  ): Promise<ethers.ContractTransactionResponse>;
}

interface IIdentity {
  getKeysByPurpose(purpose: number): Promise<string[]>;
  getClaimIdsByTopic(topic: number): Promise<string[]>;
  addClaim(
    topic: number,
    scheme: number,
    issuer: string,
    signature: string,
    data: Uint8Array,
    uri: string,
  ): Promise<ethers.ContractTransactionResponse>;
}

interface ILendingPlatformModule {
  isPlatformWhitelisted(token: string, platform: string): Promise<boolean>;
  addPlatform(
    token: string,
    platform: string,
  ): Promise<ethers.ContractTransactionResponse>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRY_US = 840;

/**
 * EIP-1167 minimal proxy implementation address for ONCHAINID.
 * Deploying a raw clone lets us set the deployer as management key without
 * going through the factory (which rejects IDENTITY_EXISTS wallets).
 */
const ONCHAINID_IMPLEMENTATION = '0xD18632586d723234e302B240A65A6eD92E24a0c0';

const MINIMAL_REGISTRY_ABI = [
  ...IDENTITY_REGISTRY_ABI,
  'function isAgent(address) view returns (bool)',
  'function identity(address) view returns (address)',
  'function contains(address) view returns (bool)',
  'function isVerified(address) view returns (bool)',
  'function updateIdentity(address wallet, address newIdentity)',
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

// ── EIP-1167 proxy deployment ─────────────────────────────────────────────────

/**
 * Deploy a fresh EIP-1167 minimal proxy pointing to ONCHAINID_IMPLEMENTATION,
 * then call initialize(deployer) so the deployer holds MANAGEMENT_KEY
 * (purpose 1).  Returns the deployed proxy address.
 */
async function deployFreshIdentityProxy(signer: ethers.Wallet): Promise<string> {
  const impl20 = ONCHAINID_IMPLEMENTATION.toLowerCase().replace('0x', '');
  // Standard EIP-1167 + constructor wrapper bytecode
  const proxyBytecode =
    '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' + impl20 + '5af43d82803e903d91602b57fd5bf3';

  console.log('  Deploying EIP-1167 proxy of ONCHAINID implementation...');
  const deployTx = await signer.sendTransaction({ data: proxyBytecode });
  const receipt = await deployTx.wait();
  if (receipt?.status !== 1 || !receipt.contractAddress) {
    throw new Error(`EIP-1167 proxy deploy failed, tx: ${deployTx.hash}`);
  }
  const proxyAddr = receipt.contractAddress;
  console.log(`  Proxy deployed: ${proxyAddr}  tx: ${deployTx.hash}`);

  // Initialize with deployer as management key
  const initSel = ethers.id('initialize(address)').slice(0, 10);
  const initData = initSel + ethers.AbiCoder.defaultAbiCoder().encode(['address'], [signer.address]).slice(2);
  console.log(`  Calling initialize(${signer.address}) on proxy...`);
  const initTx = await signer.sendTransaction({ to: proxyAddr, data: initData });
  const initReceipt = await initTx.wait();
  if (initReceipt?.status !== 1) throw new Error(`initialize() failed, tx: ${initTx.hash}`);
  console.log(`  Initialized.  tx: ${initTx.hash}`);

  // Verify deployer holds management key (purpose 1)
  const idRO = new ethers.Contract(
    proxyAddr, IDENTITY_ABI, signer.provider!,
  ) as ethers.Contract & IIdentity;
  const mgmtKeys: string[] = await idRO.getKeysByPurpose(1).catch((): string[] => []);
  const deployerHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['address'], [signer.address]),
  );
  const hasMgmtKey = mgmtKeys.some((k) => k.toLowerCase() === deployerHash.toLowerCase());
  if (!hasMgmtKey) {
    throw new Error(
      `Deployer does not hold MANAGEMENT_KEY on new proxy ${proxyAddr}. ` +
        `Keys found: ${JSON.stringify(mgmtKeys)}`,
    );
  }
  console.log('  Deployer confirmed as MANAGEMENT_KEY on proxy.');
  return proxyAddr;
}

// ── Claim helpers ─────────────────────────────────────────────────────────────

/**
 * Build and sign an ERC-735 claim using standard ABI encoding parity with
 * the T-REX ClaimIssuer.isClaimValid() verification logic:
 *
 *   dataHash = keccak256(abi.encode(identityAddress, topic, data))
 *   sig      = eth_sign(dataHash)   — EIP-191 personal_sign prefix added by signMessage()
 *
 * IMPORTANT: uses abi.encode (not abi.encodePacked / solidityPackedKeccak256).
 * ClaimIssuer.isClaimValid() hashes with abi.encode; using encodePacked produces
 * an irrecoverable signature mismatch and permanently invalidates the claim.
 *
 * After signing, a local recovery check asserts ecrecover(dataHash, sig) == signer.
 * This catches any local encoding divergence before an on-chain transaction is sent.
 */
async function signClaim(
  signer: ethers.Wallet,
  identityAddress: string,
  topic: number,
  data: Uint8Array,
): Promise<{ signature: string; digest: string }> {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'bytes'],
    [identityAddress, topic, data],
  );
  const digest = ethers.keccak256(encoded);
  const signature = await signer.signMessage(ethers.getBytes(digest));

  // Local recovery preflight — fail fast before spending gas on addClaim()
  const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
  if (recovered.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `signClaim: local recovery mismatch — expected ${signer.address}, got ${recovered}`,
    );
  }

  return { signature, digest };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const newVaultAddress = process.env.NEW_VAULT_ADDRESS;
  if (!newVaultAddress || !ethers.isAddress(newVaultAddress)) {
    throw new Error('NEW_VAULT_ADDRESS must be set to a valid checksummed address');
  }

  const dryRun      = process.env.DRY_RUN === '1';
  const skipLending = process.env.SKIP_LENDING_MODULE === '1';
  const vaultAddr   = ethers.getAddress(newVaultAddress);

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
  ) as ethers.Contract & IIdentityRegistry;
  const factory = new ethers.Contract(
    ERC3643_CONTRACTS.IDENTITY_FACTORY,
    IDENTITY_FACTORY_ABI,
    signer,
  ) as ethers.Contract & IIdentityFactory;

  // ── Step 1: Check existing state ──────────────────────────────────────────

  console.log('[1/5] Checking existing registry state...');
  const alreadyContains: boolean = await registry.contains(vaultAddr);
  const existingRegistryIdentity: string = alreadyContains
    ? await registry.identity(vaultAddr)
    : ethers.ZeroAddress;
  const alreadyVerified: boolean = alreadyContains
    ? await registry.isVerified(vaultAddr)
    : false;

  console.log(`  contains(vault):   ${alreadyContains}`);
  console.log(`  identity(vault):   ${existingRegistryIdentity}`);
  console.log(`  isVerified(vault): ${alreadyVerified}`);

  if (alreadyVerified) {
    console.log('\n  Vault already registered AND verified — nothing to do.');
    return;
  }

  // ── Step 2: Resolve identity address (deployer-controlled) ────────────────

  console.log('\n[2/5] Resolving ONCHAINID for vault...');

  let identityAddress: string;

  if (dryRun) {
    const factoryIdentity: string = await factory.walletToIdentity(vaultAddr)
      .catch(() => ethers.ZeroAddress);
    const hasFactoryEntry = factoryIdentity && factoryIdentity !== ethers.ZeroAddress;

    console.log(`  factory.walletToIdentity(vault): ${hasFactoryEntry ? factoryIdentity : '(none)'}`);
    if (alreadyContains) {
      console.log('  [DRY RUN] Vault is in registry — would check if identity has deployer as mgmt key');
    } else if (hasFactoryEntry) {
      console.log('  [DRY RUN] IDENTITY_EXISTS in factory — would deploy fresh EIP-1167 proxy');
      console.log('    → signer.sendTransaction({ data: EIP1167_BYTECODE })');
      console.log('    → proxy.initialize(deployer)');
      console.log(`  [DRY RUN] Would call registry.registerIdentity(vault, newProxy, ${COUNTRY_US})`);
    } else {
      console.log(`  [DRY RUN] Would call factory.createIdentity(vault, ${signer.address})`);
      console.log(`  [DRY RUN] Would call registry.registerIdentity(vault, identity, ${COUNTRY_US})`);
    }
    console.log('\n  Dry run complete — no transactions sent. Re-run without DRY_RUN=1 to execute.');
    return;
  }

  // Live path: prefer factory if it hasn't recorded this wallet yet
  const factoryIdentity: string = await factory.walletToIdentity(vaultAddr)
    .catch(() => ethers.ZeroAddress);
  const hasFactoryEntry = factoryIdentity && factoryIdentity !== ethers.ZeroAddress;

  if (alreadyContains && existingRegistryIdentity !== ethers.ZeroAddress) {
    // Registry already has an entry — reuse the registered identity
    identityAddress = existingRegistryIdentity;
    console.log(`  Reusing existing registered identity: ${identityAddress}`);
    console.log('  NOTE: will verify deployer holds MANAGEMENT_KEY before issuing claims.');
  } else if (!hasFactoryEntry) {
    // Factory does not know this wallet — use createIdentity with deployer as mgmt key
    console.log(`  Calling factory.createIdentity(vault=${vaultAddr}, mgmtKey=${signer.address})...`);
    const createTx = await factory.createIdentity(vaultAddr, signer.address);
    console.log(`  tx: ${createTx.hash}`);
    const createReceipt = await createTx.wait();
    if (createReceipt?.status !== 1) throw new Error(`createIdentity reverted: ${createTx.hash}`);
    identityAddress = await factory.walletToIdentity(vaultAddr);
    console.log(`  Identity created: ${identityAddress}`);
  } else {
    // IDENTITY_EXISTS in factory (vault was registered before with vault as mgmt key).
    // Deploy a fresh EIP-1167 proxy where deployer holds management key.
    console.log(`  Factory has existing entry: ${factoryIdentity}`);
    console.log('  IDENTITY_EXISTS — deploying fresh EIP-1167 proxy with deployer as mgmt key...');
    identityAddress = await deployFreshIdentityProxy(signer);
  }

  // ── Step 3: Register / update in IdentityRegistry ─────────────────────────

  console.log('\n[3/5] Registering / updating identity in IdentityRegistry...');

  const isAgent: boolean = await registry.isAgent(signer.address);
  if (!isAgent) {
    throw new Error(
      `Signer ${signer.address} is NOT an agent on IdentityRegistry.\n` +
        'Call registry.addAgent(signerAddress) from the registry owner first.',
    );
  }

  const nowContainsBefore: boolean = await registry.contains(vaultAddr);
  if (!nowContainsBefore) {
    console.log(`  Calling registry.registerIdentity(${vaultAddr}, ${identityAddress}, ${COUNTRY_US})...`);
    const regTx = await registry.registerIdentity(vaultAddr, identityAddress, COUNTRY_US);
    console.log(`  tx: ${regTx.hash}`);
    const regReceipt = await regTx.wait();
    if (regReceipt?.status !== 1) throw new Error(`registerIdentity reverted: ${regTx.hash}`);
    console.log('  Identity registered.');
  } else {
    // Already in registry — update if identity address differs
    const currentIdentity: string = await registry.identity(vaultAddr);
    if (currentIdentity.toLowerCase() !== identityAddress.toLowerCase()) {
      console.log(`  Updating registry entry: ${currentIdentity} → ${identityAddress}`);
      const updTx = await registry.updateIdentity(vaultAddr, identityAddress);
      console.log(`  tx: ${updTx.hash}`);
      const updReceipt = await updTx.wait();
      if (updReceipt?.status !== 1) throw new Error(`updateIdentity reverted: ${updTx.hash}`);
      console.log('  Identity updated.');
    } else {
      console.log('  Already registered with correct identity — skipping registerIdentity().');
    }
  }

  // ── Step 4: Issue claims on ONCHAINID ─────────────────────────────────────

  console.log('\n[4/5] Issuing KYC (topic 1) and Sanctions (topic 3) claims...');

  const identity = new ethers.Contract(
    identityAddress, IDENTITY_ABI, signer,
  ) as ethers.Contract & IIdentity;

  const existingKycClaims: string[] = await identity
    .getClaimIdsByTopic(CLAIM_TOPICS.KYC_VERIFIED)
    .catch((): string[] => []);
  const existingSanClaims: string[] = await identity
    .getClaimIdsByTopic(CLAIM_TOPICS.SANCTIONS_CLEAR)
    .catch((): string[] => []);

  console.log(`  Existing KYC claims on-chain:      ${existingKycClaims.length}`);
  console.log(`  Existing Sanctions claims on-chain:${existingSanClaims.length}`);

  const claimsToIssue = [
    ...(existingKycClaims.length === 0
      ? [{ topic: CLAIM_TOPICS.KYC_VERIFIED,   label: 'KYC_VERIFIED (1)' }]
      : []),
    ...(existingSanClaims.length === 0
      ? [{ topic: CLAIM_TOPICS.SANCTIONS_CLEAR, label: 'SANCTIONS_CLEAR (3)' }]
      : []),
  ];

  if (claimsToIssue.length === 0) {
    console.log('  All required claims already present on ONCHAINID.');
  }

  // ClaimIssuer read-only interface for post-claim validation
  const claimIssuer = new ethers.Contract(
    ERC3643_CONTRACTS.CLAIM_ISSUER,
    [
      'function isClaimValid(address _identity, uint256 _claimTopic, bytes calldata _sig, bytes calldata _data) view returns (bool)',
    ],
    provider,
  );

  for (const { topic, label } of claimsToIssue) {
    const data = ethers.toUtf8Bytes(`axiom-vault:${vaultAddr.toLowerCase()}:topic${topic}`);
    const { signature } = await signClaim(signer, identityAddress, topic, data);

    console.log(`  Issuing ${label}...`);
    const claimTx = await identity.addClaim(
      topic,
      1,
      ERC3643_CONTRACTS.CLAIM_ISSUER,
      signature,
      data,
      '',
    );
    console.log(`  tx: ${claimTx.hash}  |  https://arbiscan.io/tx/${claimTx.hash}`);
    const claimReceipt = await claimTx.wait();
    if (claimReceipt?.status !== 1) throw new Error(`addClaim(${topic}) reverted: ${claimTx.hash}`);
    console.log(`  ${label} claim issued.`);

    // On-chain post-check: verify ClaimIssuer accepts this signature
    const claimValid: boolean = await (claimIssuer as ethers.Contract & {
      isClaimValid(identity: string, topic: number, sig: string, data: Uint8Array): Promise<boolean>;
    }).isClaimValid(identityAddress, topic, signature, data).catch(() => false);

    if (claimValid) {
      console.log(`  ✓ ClaimIssuer.isClaimValid() = true  — signature accepted by issuer.`);
    } else {
      console.warn(`  ✗ ClaimIssuer.isClaimValid() = false — deployer key may not be a CLAIM_SIGNER_KEY on`);
      console.warn(`    ${ERC3643_CONTRACTS.CLAIM_ISSUER}`);
      console.warn(`    Claim is stored on-chain but isVerified() will return false until resolved (#547).`);
    }
  }

  // ── Step 5: LendingPlatformModule whitelist (optional) ────────────────────

  if (!skipLending) {
    console.log('\n[5/5] Whitelisting vault on LendingPlatformModule...');
    const lendingModule = new ethers.Contract(
      ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      LENDING_PLATFORM_MODULE_ABI,
      signer,
    ) as ethers.Contract & ILendingPlatformModule;
    const axusd = process.env.AXUSD_ADDRESS ?? '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';

    const alreadyWhitelisted: boolean = await lendingModule
      .isPlatformWhitelisted(axusd, vaultAddr)
      .catch((): boolean => false);

    if (alreadyWhitelisted) {
      console.log('  Already whitelisted on LendingPlatformModule.');
    } else {
      try {
        console.log(`  Calling lendingModule.addPlatform(${axusd}, ${vaultAddr})...`);
        const lpTx = await lendingModule.addPlatform(axusd, vaultAddr);
        console.log(`  tx: ${lpTx.hash}  |  https://arbiscan.io/tx/${lpTx.hash}`);
        const lpReceipt = await lpTx.wait();
        if (lpReceipt?.status !== 1) throw new Error(`addPlatform reverted: ${lpTx.hash}`);
        console.log('  Vault whitelisted on LendingPlatformModule.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isBound = msg.includes('COMPLIANCE_NOT_BOUND');
        console.warn(
          `  WARNING: LendingPlatformModule.addPlatform() failed — ${isBound ? 'COMPLIANCE_NOT_BOUND' : msg}`,
        );
        if (isBound) {
          console.warn('  The LendingPlatformModule compliance contract is not bound to AXUSD.');
          console.warn('  This must be resolved separately (follow-up #547).');
          console.warn('  It does NOT affect USDC→Aave yield which is already active.');
        }
      }
    }
  } else {
    console.log('\n[5/5] LendingPlatformModule step SKIPPED (SKIP_LENDING_MODULE=1).');
  }

  // ── Final verification ─────────────────────────────────────────────────────

  console.log('\n[verification] Post-registration on-chain state...');
  const nowContains: boolean = await registry.contains(vaultAddr);
  const nowVerified: boolean = await registry.isVerified(vaultAddr);
  const nowIdentity: string  = await registry.identity(vaultAddr);

  const idContract = new ethers.Contract(
    nowIdentity, IDENTITY_ABI, provider,
  ) as ethers.Contract & IIdentity;
  const kycClaims: string[] = await idContract
    .getClaimIdsByTopic(CLAIM_TOPICS.KYC_VERIFIED)
    .catch((): string[] => []);
  const sanClaims: string[] = await idContract
    .getClaimIdsByTopic(CLAIM_TOPICS.SANCTIONS_CLEAR)
    .catch((): string[] => []);

  console.log(`  contains(vault):          ${nowContains}`);
  console.log(`  identity(vault):          ${nowIdentity}`);
  console.log(`  isVerified(vault):        ${nowVerified}`);
  console.log(`  KYC claims on-chain:      ${kycClaims.length}`);
  console.log(`  Sanctions claims on-chain:${sanClaims.length}`);

  if (!nowContains) {
    throw new Error('FATAL: vault is not in the IdentityRegistry after registration step.');
  }

  const claimsPresent = kycClaims.length > 0 && sanClaims.length > 0;

  if (nowVerified) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('REGISTRATION COMPLETE — vault is fully verified (isVerified=true).');
    console.log('AXUSD flows through the vault are not gated.');
    console.log('══════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    // Partial success — registered + claims present, but isVerified still false
    console.warn('\n══════════════════════════════════════════════════════════');
    console.warn('PARTIAL SUCCESS — vault is registered, claims are on-chain,');
    console.warn('but isVerified() = false.');
    console.warn('');
    console.warn('Root cause: The ClaimIssuer contract at');
    console.warn(`  ${ERC3643_CONTRACTS.CLAIM_ISSUER}`);
    console.warn('does not have the deployer key registered as a CLAIM_SIGNER_KEY');
    console.warn('(purpose 3). ClaimIssuer.isClaimValid() therefore rejects the');
    console.warn('claims, and IdentityRegistry.isVerified() returns false.');
    console.warn('');
    if (claimsPresent) {
      console.warn('Claims ARE stored on the ONCHAINID — re-issuing will not help.');
    }
    console.warn('Action required (follow-up #547):');
    console.warn('  1. Identify the key registered on ClaimIssuer as CLAIM_SIGNER_KEY.');
    console.warn('  2. Re-issue Topic 1 and Topic 3 claims signed by that key.');
    console.warn('  3. Re-run this script to confirm isVerified=true.');
    console.warn('');
    console.warn('NOTE: USDC→Aave yield path is active and does NOT require isVerified.');
    console.warn('══════════════════════════════════════════════════════════');
    // Exit 2 = partial success (registered, claims present, not yet verified)
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err instanceof Error ? err.message : err);
  process.exit(1);
});
