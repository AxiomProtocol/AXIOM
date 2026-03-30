/**
 * deploy-axusd-canonical-psm.js
 * Deploys the Canonical PSM (Peg Stability Module) for ERC-3643 AXUSD.
 *
 * Deployment parameters:
 *   - AXUSD Token:   0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7 (ERC-3643 Unified)
 *   - USDC:          0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (Arbitrum One)
 *   - IdentityRegistry: 0x58f64a1262d5434d6C7637a2309b0999bB6D1970
 *   - Debt Ceiling:  1,000,000 AXUSD (1M)
 *   - Mint Fee:      10 bps (0.10%)
 *   - Redeem Fee:    10 bps (0.10%)
 *   - Owner:         Governance Safe (0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d)
 *
 * Identity Check: Callers must hold a valid on-chain ONCHAINID with:
 *   - Claim Topic 1 (KYC_VERIFIED) — issued by CLAIM_ISSUER
 *   - Claim Topic 3 (SANCTIONS_CLEAR) — issued by CLAIM_ISSUER
 *
 * Usage:
 *   npx hardhat run scripts/deploy-axusd-canonical-psm.js --network arbitrumOne
 *   node scripts/deploy-axusd-canonical-psm.js  (manual ethers deployment)
 *
 * After deployment:
 *   1. Update CANONICAL_PSM in src/config/activeContracts.generated.ts
 *   2. Run: npm run db:push
 *   3. Whitelist PSM in LendingPlatformModule via AXUSD operator
 *   4. Transfer ownership to Governance Safe (deployer will be initial owner)
 */

const { ethers } = require('ethers');
require('dotenv').config();

// ─── Contract Addresses ───────────────────────────────────────────────────
const AXUSD_TOKEN      = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const USDC             = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const IDENTITY_REGISTRY = '0x58f64a1262d5434d6C7637a2309b0999bB6D1970';
const GOVERNANCE_SAFE  = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';

// ─── Deployment Parameters ────────────────────────────────────────────────
const DEBT_CEILING_AXUSD = ethers.parseUnits('1000000', 18); // 1M AXUSD
const MINT_FEE_BPS       = 10;  // 0.10%
const REDEEM_FEE_BPS     = 10;  // 0.10%

// ─── Canonical PSM Solidity ABI ───────────────────────────────────────────
// Full ABI for reading/writing after deployment
const CANONICAL_PSM_ABI = [
  'constructor(address _axusd, address _usdc, address _identityRegistry, uint256 _debtCeiling, uint256 _mintFee, uint256 _redeemFee)',
  'function mint(uint256 usdcAmount) external returns (uint256 axusdMinted)',
  'function redeem(uint256 axusdAmount) external returns (uint256 usdcReturned)',
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  'function setDebtCeiling(uint256 newCeiling) external',
  'function setMintFee(uint256 newFee) external',
  'function setRedeemFee(uint256 newFee) external',
  'function pause() external',
  'function unpause() external',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner) external',
  'function axusd() view returns (address)',
  'function collateral() view returns (address)',
  'function identityRegistry() view returns (address)',
  'event Mint(address indexed caller, uint256 usdcIn, uint256 axusdOut)',
  'event Redeem(address indexed caller, uint256 axusdIn, uint256 usdcOut)',
];

// ─── Canonical PSM Bytecode (source below) ───────────────────────────────
// Source: contracts/axusd/CanonicalPSM.sol
// To compile: npx hardhat compile
// This deployment script uses the compiled artifact if available, or inline bytecode.
//
// contract CanonicalPSM {
//   // ERC-3643 identity-gated PSM for AXUSD issuance and redemption.
//   // Callers must hold Topic 1 (KYC) and Topic 3 (SANCTIONS_CLEAR) claims
//   // in the AXUSD IdentityRegistry before mint or redeem will succeed.
//   // Fee: bps / 10000 (e.g., 10 = 0.10%)
//   // Owner controls: debtCeiling, mintFee, redeemFee, pause, transferOwnership
// }

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('='.repeat(60));
  console.log('Canonical PSM Deployment — ERC-3643 AXUSD');
  console.log('='.repeat(60));
  console.log('\nDeployer:', wallet.address);
  console.log('Network:  Arbitrum One (42161)');
  console.log('\nParameters:');
  console.log('  AXUSD Token:      ', AXUSD_TOKEN);
  console.log('  USDC:             ', USDC);
  console.log('  IdentityRegistry: ', IDENTITY_REGISTRY);
  console.log('  Debt Ceiling:     ', ethers.formatUnits(DEBT_CEILING_AXUSD, 18), 'AXUSD');
  console.log('  Mint Fee:         ', MINT_FEE_BPS / 100, '%');
  console.log('  Redeem Fee:       ', REDEEM_FEE_BPS / 100, '%');
  console.log('  Planned Owner:    ', GOVERNANCE_SAFE);

  // Load compiled artifact
  let artifact;
  try {
    artifact = require('../artifacts/contracts/axusd/CanonicalPSM.sol/CanonicalPSM.json');
    console.log('\nUsing compiled artifact from artifacts/');
  } catch {
    console.error('\nERROR: Compiled artifact not found.');
    console.error('Run: npx hardhat compile');
    console.error('Then: npx hardhat run scripts/deploy-axusd-canonical-psm.js --network arbitrumOne');
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log('\nDeploying CanonicalPSM...');
  const psm = await factory.deploy(
    AXUSD_TOKEN,
    USDC,
    IDENTITY_REGISTRY,
    DEBT_CEILING_AXUSD,
    MINT_FEE_BPS,
    REDEEM_FEE_BPS,
  );

  const deployTx = psm.deploymentTransaction();
  console.log('TX Hash:', deployTx?.hash);
  console.log('Waiting for confirmation...');

  await psm.waitForDeployment();
  const deployedAddress = await psm.getAddress();

  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYED: CanonicalPSM');
  console.log('Address:', deployedAddress);
  console.log('='.repeat(60));

  // Transfer ownership to Governance Safe
  console.log('\nTransferring ownership to Governance Safe...');
  const transferTx = await psm.transferOwnership(GOVERNANCE_SAFE);
  console.log('TX Hash:', transferTx.hash);
  await transferTx.wait();
  console.log('Ownership transferred to', GOVERNANCE_SAFE);

  console.log('\n--- POST-DEPLOYMENT CHECKLIST ---');
  console.log('1. Update CANONICAL_PSM in src/config/activeContracts.generated.ts:');
  console.log(`   export const CANONICAL_PSM = '${deployedAddress}' as const;`);
  console.log('2. Whitelist PSM in LendingPlatformModule:');
  console.log(`   addPlatform(token=AXUSD, platform=${deployedAddress})`);
  console.log('3. Grant MINTER_ROLE on AXUSD token to PSM:');
  console.log(`   axusd.addAgent(${deployedAddress})`);
  console.log('4. Approve initial USDC deposit to PSM (optional seed):');
  console.log(`   usdc.approve(${deployedAddress}, seedAmount)`);
  console.log('5. Update pages/api/axusd/psm.ts CANONICAL_PSM constant.');
  console.log('6. Verify on Blockscout:');
  console.log(`   npx hardhat verify --network arbitrumOne ${deployedAddress} ${AXUSD_TOKEN} ${USDC} ${IDENTITY_REGISTRY} ${DEBT_CEILING_AXUSD.toString()} ${MINT_FEE_BPS} ${REDEEM_FEE_BPS}`);

  return deployedAddress;
}

main().catch((err) => {
  console.error('Deployment failed:', err.message);
  process.exit(1);
});
