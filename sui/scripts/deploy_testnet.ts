// =============================================================================
// Axiom Protocol — Sui Testnet Deployment Script
// Package: axiom_claim_prototype (Sprint 1 — allowlist claim)
//
// TESTNET ONLY. Will not run against mainnet.
// Uses @mysten/sui v2 API (SuiJsonRpcClient, Ed25519Keypair, Transaction).
// Reads SUI_DEPLOYER_KEY from environment. Key is never printed.
//
// Prerequisites:
//   1. Move package compiled → bytecode.json present in package dir
//      Run locally: sh sui/scripts/build_local.sh
//      OR on any machine with sui CLI installed
//   2. SUI_DEPLOYER_KEY set in Replit Secrets
//   3. Deployer address funded on testnet: https://faucet.testnet.sui.io
//
// Run:
//   npm run sui:deploy
// =============================================================================

import { Ed25519Keypair }       from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey }  from '@mysten/sui/cryptography';
import { SuiJsonRpcClient,
         getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { Transaction }           from '@mysten/sui/transactions';
import { execSync }              from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname }      from 'path';
import { fileURLToPath }         from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Config
// =============================================================================

const NETWORK         = 'testnet' as const;
const PACKAGE_PATH    = resolve(__dirname, '../packages/axiom_claim_prototype');
const BYTECODE_FILE   = resolve(PACKAGE_PATH, 'bytecode.json');
const RESULT_FILE     = resolve(PACKAGE_PATH, 'deployment_result.json');
const EXPECTED_ADDR   = '0x4917ffea5289fba211976448c50103ba96a86e49a57e4dd1f22222c3b412e5ad';
const GAS_BUDGET      = 200_000_000n; // 0.2 SUI testnet — sufficient for package publish

// =============================================================================
// Step 1 — Load keypair from SUI_DEPLOYER_KEY
// =============================================================================

const rawKey = process.env.SUI_DEPLOYER_KEY;
if (!rawKey) {
  console.error('\nERROR: SUI_DEPLOYER_KEY is not set in environment.');
  console.error('Add it in the Replit Secrets panel.\n');
  process.exit(1);
}

let keypair: Ed25519Keypair;
try {
  const { secretKey } = decodeSuiPrivateKey(rawKey);
  keypair = Ed25519Keypair.fromSecretKey(secretKey);
} catch (e: any) {
  console.error('\nERROR: Failed to decode SUI_DEPLOYER_KEY:', e.message);
  console.error('Key must be a Bech32-encoded suiprivkey (starts with "suiprivkey1...").\n');
  process.exit(1);
}

const signerAddress = keypair.getPublicKey().toSuiAddress();

console.log('\n=== Axiom Protocol — Sui Testnet Deploy ===');
console.log('Network:        ', NETWORK);
console.log('Signer address: ', signerAddress);

if (signerAddress !== EXPECTED_ADDR) {
  console.warn(`\nWARNING: Derived address differs from recorded deployer.`);
  console.warn(`  Expected: ${EXPECTED_ADDR}`);
  console.warn(`  Got:      ${signerAddress}`);
  console.warn(`  Proceeding — update EXPECTED_ADDR in this script if intentional.\n`);
}

// =============================================================================
// Step 2 — Load Move bytecode
//
// Priority:
//   A. Run `sui move build` if Sui CLI is available in PATH (caches result)
//   B. Load from bytecode.json if cached from a prior build
//   C. Exit with clear instructions
// =============================================================================

interface BytecodePayload {
  modules: string[];       // base64-encoded module bytecode
  dependencies: string[];  // full 0x... object IDs (Move stdlib, Sui framework, etc.)
  digest?: number[];
}

function tryCliBuild(): BytecodePayload | null {
  try {
    console.log('\nAttempting sui move build via CLI...');
    const raw = execSync(
      `sui move build --dump-bytecode-as-base64 --path "${PACKAGE_PATH}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 120_000 }
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON block in CLI output');
    const parsed = JSON.parse(jsonMatch[0]) as BytecodePayload;
    console.log(`CLI build success — ${parsed.modules.length} module(s), ${parsed.dependencies.length} dep(s)`);
    writeFileSync(BYTECODE_FILE, JSON.stringify(parsed, null, 2));
    console.log(`Bytecode cached → ${BYTECODE_FILE}`);
    return parsed;
  } catch {
    return null;
  }
}

function loadBytecodeFile(): BytecodePayload | null {
  if (!existsSync(BYTECODE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(BYTECODE_FILE, 'utf8')) as BytecodePayload;
    console.log(`\nLoaded cached bytecode from: ${BYTECODE_FILE}`);
    console.log(`Modules: ${parsed.modules.length}, Dependencies: ${parsed.dependencies.length}`);
    return parsed;
  } catch (e: any) {
    console.error('ERROR: bytecode.json is malformed:', e.message);
    return null;
  }
}

const bytecode: BytecodePayload = tryCliBuild() ?? loadBytecodeFile() ?? (() => {
  console.error('\n========================================');
  console.error('  Move bytecode not found');
  console.error('========================================');
  console.error('\nThe Sui CLI is not installed in this environment, so the Move');
  console.error('package must be compiled on your local machine first.\n');
  console.error('Steps:\n');
  console.error('  1. Install Sui CLI on your local machine:');
  console.error('       brew install sui                  # macOS');
  console.error('       cargo install --locked sui        # Rust/Linux');
  console.error('       https://docs.sui.io/guides/developer/getting-started/sui-install\n');
  console.error('  2. In your local clone of this repo, run:');
  console.error('       sh sui/scripts/build_local.sh\n');
  console.error('  3. That creates: sui/packages/axiom_claim_prototype/bytecode.json');
  console.error('       Commit it or upload it to Replit, then re-run:');
  console.error('       npm run sui:deploy\n');
  process.exit(1);
})();

// =============================================================================
// Step 3 — Connect to Sui Testnet
// =============================================================================

const client = new SuiJsonRpcClient({
  url:     getJsonRpcFullnodeUrl(NETWORK),
  network: NETWORK,
});

// =============================================================================
// Main deploy flow
// =============================================================================

async function deploy() {

  // --- Balance check ----------------------------------------------------------
  const balanceResp = await client.getBalance({ owner: signerAddress, coinType: '0x2::sui::SUI' });
  const balanceMist = BigInt(balanceResp.totalBalance);
  const balanceSui  = Number(balanceMist) / 1_000_000_000;

  console.log(`\nWallet balance: ${balanceMist} MIST (${balanceSui.toFixed(4)} SUI testnet)`);

  if (balanceMist === 0n) {
    console.error('\nERROR: Wallet has no testnet SUI. Cannot pay gas.');
    console.error(`Fund at: https://faucet.testnet.sui.io/`);
    console.error(`Address: ${signerAddress}\n`);
    process.exit(1);
  }

  if (balanceMist < GAS_BUDGET) {
    console.warn(`\nWARNING: Balance (${balanceMist} MIST) is below gas budget (${GAS_BUDGET} MIST).`);
    console.warn('Transaction may fail. Fund more SUI at https://faucet.testnet.sui.io/\n');
  }

  // --- Build publish transaction -----------------------------------------------
  console.log('\nBuilding publish transaction...');

  const modules: number[][] = bytecode.modules.map(b64 =>
    Array.from(Buffer.from(b64, 'base64'))
  );

  const tx = new Transaction();
  tx.setGasBudget(GAS_BUDGET);

  const [upgradeCap] = tx.publish({
    modules,
    dependencies: bytecode.dependencies,
  });

  // Transfer UpgradeCap to deployer — retains upgrade authority
  tx.transferObjects([upgradeCap], signerAddress);

  // --- Submit ------------------------------------------------------------------
  console.log('Submitting to Sui Testnet...');
  console.log('(This typically takes 5–15 seconds)\n');

  const result = await client.signAndExecuteTransaction({
    signer:      keypair,
    transaction: tx,
    options: {
      showEffects:       true,
      showObjectChanges: true,
      showEvents:        true,
    },
  });

  // --- Parse results -----------------------------------------------------------
  const status    = result.effects?.status?.status ?? 'unknown';
  const digest    = result.digest;
  const published = result.objectChanges?.find(c => c.type === 'published');
  const packageId = (published as any)?.packageId ?? 'NOT_FOUND';

  const upgCapObj = result.objectChanges?.find(
    c => c.type === 'created' && 'objectType' in c &&
    typeof (c as any).objectType === 'string' &&
    (c as any).objectType.includes('UpgradeCap')
  );
  const upgradeCapId = (upgCapObj as any)?.objectId ?? 'NOT_FOUND';

  console.log('========================================');
  console.log('  DEPLOYMENT RESULT');
  console.log('========================================');
  console.log('Status:         ', status);
  console.log('Digest:         ', digest);
  console.log('Package ID:     ', packageId);
  console.log('UpgradeCap ID:  ', upgradeCapId);
  console.log('Explorer:       ', `https://testnet.suiscan.xyz/tx/${digest}`);
  console.log('Package:        ', `https://testnet.suiscan.xyz/package/${packageId}`);
  console.log('');

  if (status !== 'success') {
    console.error('ERROR: Transaction did not succeed.');
    console.error('Effects:', JSON.stringify(result.effects, null, 2));
    process.exit(1);
  }

  // --- Write deployment_result.json -------------------------------------------
  const resultPayload = {
    network:        NETWORK,
    deployer:       signerAddress,
    packageId,
    upgradeCapId,
    digest,
    explorerUrl:    `https://testnet.suiscan.xyz/tx/${digest}`,
    packageUrl:     `https://testnet.suiscan.xyz/package/${packageId}`,
    timestamp:      new Date().toISOString(),
    status,
  };

  writeFileSync(RESULT_FILE, JSON.stringify(resultPayload, null, 2));
  console.log(`Deployment record saved to: ${RESULT_FILE}`);

  // --- Next steps --------------------------------------------------------------
  console.log('\n========================================');
  console.log('  NEXT STEPS (G07 → G08)');
  console.log('========================================');
  console.log('1. Record Package ID and digest in:');
  console.log('     documents/chains/AXIOM_SUI_PHASE6_IMPLEMENTATION_REPORT.md');
  console.log('');
  console.log('2. Verify on Sui Explorer:');
  console.log(`     ${resultPayload.explorerUrl}`);
  console.log('');
  console.log('3. Run a smoke test (create a test campaign):');
  console.log('     npm run sui:smoke   (script coming in Sprint 2)');
  console.log('');
  console.log('4. Update G07 (security review) and G08 (post-testnet report)');
  console.log('     documents/chains/AXIOM_SUI_PHASE6_GATE_TRACKER.md');
  console.log('');
}

deploy().catch(err => {
  console.error('\nDeployment error:', err?.message ?? String(err));
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
