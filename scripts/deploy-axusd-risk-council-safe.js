/**
 * Prepare the AXIOM Risk Council Safe deployment on Arbitrum One.
 *
 * This is the multisig that will become `owner` (and optionally `curator`)
 * of the Axiom Earn AXUSD vault `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`,
 * so that the Euler V2 UI shows a friendly "AXIOM Risk Council" label on
 * the vault's Owner / Risk Manager fields once the address is added to
 * `addresses/42161/MultisigAddresses.json` in `euler-xyz/euler-interfaces`.
 *
 * No keys are signed and no transactions are sent.  The script:
 *
 *   1. Predicts the deterministic Safe proxy address for the configured
 *      signer set / threshold / saltNonce, using the canonical Arbitrum
 *      Safe v1.4.1 SafeProxyFactory + Singleton.
 *   2. Prints the raw calldata for `SafeProxyFactory.createProxyWithNonce(...)`
 *      so the deployer EOA (or any wallet) can broadcast the deploy tx
 *      directly, OR alternatively the human can use https://app.safe.global
 *      → "Create new Safe" with the same signers / threshold and the same
 *      address will be produced (Safe uses CREATE2 with the singleton +
 *      initializer + salt as the keying material).
 *   3. Writes the predicted address into `documents/euler-interfaces-pr/
 *      MultisigAddresses.patch.json` so the PR snippet stays in sync.
 *
 * Configure with env vars (all optional — defaults are sensible):
 *   SIGNERS="0xaaa...,0xbbb...,0xccc..."  comma-separated owner EOAs
 *   THRESHOLD=2                            signatures required
 *   SALT_NONCE=1                           CREATE2 salt nonce
 *
 * Run:
 *   node scripts/deploy-axusd-risk-council-safe.js
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Canonical Safe v1.4.1 deployment on Arbitrum One.
// Source: safe-deployments package (audited canonical addresses).
const SAFE_PROXY_FACTORY = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON     = '0x41675C099F32341bf84BFc5382aF534df5C7461a';
const COMPATIBILITY_FALLBACK_HANDLER = '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99';

const RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : (process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc');

const DEPLOYER_EOA = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

const DEFAULT_SIGNERS = [DEPLOYER_EOA];
const SIGNERS = (process.env.SIGNERS
  ? process.env.SIGNERS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SIGNERS
).map((a) => ethers.getAddress(a));

const THRESHOLD  = BigInt(process.env.THRESHOLD  || '1');
const SALT_NONCE = BigInt(process.env.SALT_NONCE || '1');

if (THRESHOLD < 1n || THRESHOLD > BigInt(SIGNERS.length)) {
  console.error(`[fatal] THRESHOLD (${THRESHOLD}) must be 1..${SIGNERS.length}`);
  process.exit(1);
}

const SAFE_SETUP_ABI = [
  'function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)',
];
const FACTORY_ABI = [
  'function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address)',
  'function proxyCreationCode() view returns (bytes)',
];

const setupIface   = new ethers.Interface(SAFE_SETUP_ABI);
const factoryIface = new ethers.Interface(FACTORY_ABI);

const initializer = setupIface.encodeFunctionData('setup', [
  SIGNERS,
  THRESHOLD,
  ethers.ZeroAddress,                  // no module/delegatecall during setup
  '0x',
  COMPATIBILITY_FALLBACK_HANDLER,
  ethers.ZeroAddress,                  // payment token
  0n,                                  // payment
  ethers.ZeroAddress,                  // payment receiver
]);

const createCalldata = factoryIface.encodeFunctionData('createProxyWithNonce', [
  SAFE_SINGLETON,
  initializer,
  SALT_NONCE,
]);

async function predictAddress() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const factory  = new ethers.Contract(SAFE_PROXY_FACTORY, FACTORY_ABI, provider);

  // CREATE2 address = keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
  // where:
  //   salt     = keccak256(keccak256(initializer) ++ saltNonce)
  //   initCode = factory.proxyCreationCode() ++ abi.encode(singleton)
  const proxyCreationCode = await factory.proxyCreationCode();
  const initCode = ethers.concat([
    proxyCreationCode,
    ethers.AbiCoder.defaultAbiCoder().encode(['address'], [SAFE_SINGLETON]),
  ]);
  const salt = ethers.keccak256(ethers.concat([
    ethers.keccak256(initializer),
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [SALT_NONCE]),
  ]));
  return ethers.getCreate2Address(SAFE_PROXY_FACTORY, salt, ethers.keccak256(initCode));
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' AXIOM Risk Council Safe — Arbitrum One deployment plan');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' SafeProxyFactory:  ', SAFE_PROXY_FACTORY, '(v1.4.1 canonical)');
  console.log(' Safe singleton:    ', SAFE_SINGLETON,     '(v1.4.1 canonical)');
  console.log(' Fallback handler:  ', COMPATIBILITY_FALLBACK_HANDLER);
  console.log(' Signers:           ', SIGNERS.join(', '));
  console.log(' Threshold:         ', THRESHOLD.toString());
  console.log(' saltNonce:         ', SALT_NONCE.toString());

  let predicted;
  try {
    predicted = await predictAddress();
  } catch (e) {
    console.error('\n[warn] could not reach RPC to predict address:', e.message);
    console.error('       run again with ARBITRUM_RPC_URL=... or ALCHEMY_API_KEY=... to get the predicted Safe.');
    process.exit(2);
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log(' Predicted Safe address (CREATE2):');
  console.log('  ', predicted);

  const code = await new ethers.JsonRpcProvider(RPC).getCode(predicted);
  console.log(' On-chain status:   ', code && code !== '0x' ? 'ALREADY DEPLOYED ✓' : 'not yet deployed');

  console.log('\n[Option A] Deploy via Safe web UI (recommended for humans)');
  console.log('  1. Go to https://app.safe.global, connect any of the signers above.');
  console.log('  2. Network → Arbitrum One.');
  console.log('  3. "Create new Safe" → paste the same signers in the same order, set');
  console.log(`     threshold = ${THRESHOLD}, advanced → saltNonce = ${SALT_NONCE}.`);
  console.log('  4. The web UI will deploy to the SAME predicted address above.');

  console.log('\n[Option B] Deploy directly with the deployer EOA');
  console.log('  Send a single tx with:');
  console.log('    to:   ', SAFE_PROXY_FACTORY);
  console.log('    value: 0');
  console.log('    data: ', createCalldata);

  // Persist the predicted address into the PR snippet so it stays in sync.
  const prDir   = path.resolve(__dirname, '..', 'documents', 'euler-interfaces-pr');
  const prFile  = path.join(prDir, 'MultisigAddresses.patch.json');
  fs.mkdirSync(prDir, { recursive: true });
  const patch = {
    _comment:
      'Snippet to add to addresses/42161/MultisigAddresses.json in euler-xyz/euler-interfaces.',
    _safeNetwork: 'Arbitrum One (chainId 42161)',
    _safeVersion: '1.4.1',
    _safeFactory: SAFE_PROXY_FACTORY,
    _safeSingleton: SAFE_SINGLETON,
    _signers: SIGNERS,
    _threshold: Number(THRESHOLD),
    _saltNonce: Number(SALT_NONCE),
    add: {
      axiomRiskCouncil: predicted,
    },
  };
  fs.writeFileSync(prFile, JSON.stringify(patch, null, 2) + '\n');
  console.log('\n[PR snippet] wrote', path.relative(process.cwd(), prFile));
  console.log('  Use this when opening the PR against euler-xyz/euler-interfaces.');

  console.log('\nNext: after the Safe is deployed and verified at the predicted address,');
  console.log('      run  node scripts/transfer-axusd-earn-vault-to-safe.js  to mint the');
  console.log('      transferOwnership / setCurator calldata for the deployer EOA.');
  console.log('═══════════════════════════════════════════════════════════════');
})().catch((e) => { console.error(e); process.exit(1); });
