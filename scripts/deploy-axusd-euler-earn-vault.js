/**
 * Deploy Script: Axiom Euler Earn AXUSD Yield Aggregation Vault
 * Task #39 | Arbitrum One
 *
 * Architecture:
 *   - Euler Earn factory creates a new vault with ERC-3643 AXUSD as the underlying asset
 *   - Axiom Sentinel (deployer EOA at launch) is the curator
 *   - Three strategies registered at launch:
 *       • AXIOMCreditMarket (40%)  — fix-and-flip loan book
 *       • EVK Open Market Vault    (40%)  — ERC-3643 AXUSD EVK lending
 *       • T-Bill Vault             (20%)  — on-chain short-duration treasury
 *   - Performance fee: 10% (1000 bps) → AxiomFeeBurner
 *   - Smearing period: 2 weeks (prevents yield front-running)
 *   - Euler Vault Connector (EVC) + this vault must be whitelisted in ERC-3643 LPM
 *
 * Prerequisites:
 *   1. Run deploy-axusd-oracle.js first (ERC-7726 oracle required for EVK vault)
 *   2. Run deploy-axusd-evk-vault.js (EVK vault must exist as a registered strategy)
 *   3. Ensure deployer EOA has enough ETH on Arbitrum for gas (~0.01 ETH)
 *   4. Confirm EULER_EARN_FACTORY address at https://euler.finance/earn (Arbitrum One)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=<key> npx hardhat run scripts/deploy-axusd-euler-earn-vault.js --network arbitrumOne
 *
 * After deployment:
 *   1. Update EULER_EARN_VAULT + EULER_EARN_FACTORY in shared/contracts.ts
 *   2. Update EULER_EARN_VAULT_ADDRESS + EULER_EARN_FACTORY_ADDRESS in src/config/activeContracts.generated.ts
 *   3. Whitelist vault address in ERC-3643 LPM via /api/erc3643/whitelist/add-platform
 *   4. Call setCurator(<axiom-sentinel-address>) if not set during factory construction
 */

const { ethers } = require('hardhat');

const AXUSD_ERC3643        = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const AXIOM_CREDIT_MARKET  = '0x85074a74774568692128eE97Da661Fe49dcF5fE4';
const TBILL_VAULT          = '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4';
const AXIOM_FEE_BURNER     = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';
const ZERO_ADDR            = '0x0000000000000000000000000000000000000000';

// IMPORTANT: Verify this address at https://euler.finance/earn (Arbitrum One mainnet)
// before running this script. Update if a newer factory version is available.
const EULER_EARN_FACTORY = process.env.EULER_EARN_FACTORY_ADDR ?? ZERO_ADDR;

// EVK Open Market vault — must be deployed first (Task #38)
// Update this after running deploy-axusd-evk-vault.js
const EVK_OPEN_MARKET_VAULT = process.env.EVK_VAULT_ADDR ?? ZERO_ADDR;

const STRATEGY_CAPS_BPS = {
  creditMarket: 4000,
  evkVault:     4000,
  tbillVault:   2000,
};

const PERF_FEE_BPS      = 1000;
const SMEARING_PERIOD   = 14 * 24 * 60 * 60;
const INITIAL_CASH_ALLOC = 1000;

const EULER_EARN_FACTORY_ABI = [
  'function deployEulerEarn(address asset, string name, string symbol, uint256 initialCashAllocationPoints, uint256 smearingPeriod) returns (address)',
];

const EULER_EARN_ABI = [
  'function addStrategy(address strategy, uint256 allocationPoints) external',
  'function setPerformanceFee(uint256 feeBps) external',
  'function setFeeRecipient(address recipient) external',
  'function setCurator(address curator) external',
  'function totalAssets() view returns (uint256)',
  'function curator() view returns (address)',
  'function feeRecipient() view returns (address)',
  'function performanceFee() view returns (uint256)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Network:', (await ethers.provider.getNetwork()).name);

  if (EULER_EARN_FACTORY === ZERO_ADDR) {
    console.error('\n[ABORT] EULER_EARN_FACTORY_ADDR not set.');
    console.error('  1. Find the Euler Earn factory address at https://euler.finance/earn');
    console.error('  2. Set EULER_EARN_FACTORY_ADDR=0x... and re-run.');
    process.exit(1);
  }

  if (EVK_OPEN_MARKET_VAULT === ZERO_ADDR) {
    console.warn('\n[WARN] EVK_VAULT_ADDR not set — EVK strategy will be skipped.');
    console.warn('  Deploy the EVK vault first (Task #38), then re-run to add the EVK strategy.');
  }

  console.log('\n--- Deploying Euler Earn AXUSD Yield Vault ---');
  console.log('Asset:      ', AXUSD_ERC3643);
  console.log('Factory:    ', EULER_EARN_FACTORY);
  console.log('SmearPeriod:', SMEARING_PERIOD, 'seconds (14 days)');

  const factory = new ethers.Contract(EULER_EARN_FACTORY, EULER_EARN_FACTORY_ABI, deployer);

  const tx = await factory.deployEulerEarn(
    AXUSD_ERC3643,
    'Axiom Earn AXUSD',
    'earnAXUSD',
    INITIAL_CASH_ALLOC,
    SMEARING_PERIOD
  );
  const receipt = await tx.wait();
  console.log('\nFactory tx:', receipt.transactionHash);

  let vaultAddress = ZERO_ADDR;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === 'NewEulerEarn') {
        vaultAddress = parsed.args[0];
        break;
      }
    } catch {}
    if (log.address && log.address !== EULER_EARN_FACTORY) {
      vaultAddress = log.address;
    }
  }

  if (vaultAddress === ZERO_ADDR) {
    console.error('[ABORT] Could not parse vault address from logs. Check tx manually:', receipt.transactionHash);
    process.exit(1);
  }

  console.log('\nVault deployed at:', vaultAddress);

  const vault = new ethers.Contract(vaultAddress, EULER_EARN_ABI, deployer);

  console.log('\n--- Configuring Performance Fee ---');
  const feeTx = await vault.setPerformanceFee(PERF_FEE_BPS);
  await feeTx.wait();
  console.log('Performance fee set:', PERF_FEE_BPS, 'bps (10%)');

  const recipientTx = await vault.setFeeRecipient(AXIOM_FEE_BURNER);
  await recipientTx.wait();
  console.log('Fee recipient set:', AXIOM_FEE_BURNER, '(AxiomFeeBurner)');

  console.log('\n--- Registering Strategies ---');

  const cmTx = await vault.addStrategy(AXIOM_CREDIT_MARKET, STRATEGY_CAPS_BPS.creditMarket);
  await cmTx.wait();
  console.log('AXIOMCreditMarket added:', AXIOM_CREDIT_MARKET, '(4000 alloc pts)');

  if (EVK_OPEN_MARKET_VAULT !== ZERO_ADDR) {
    const evkTx = await vault.addStrategy(EVK_OPEN_MARKET_VAULT, STRATEGY_CAPS_BPS.evkVault);
    await evkTx.wait();
    console.log('EVK Open Market Vault added:', EVK_OPEN_MARKET_VAULT, '(4000 alloc pts)');
  } else {
    console.log('[SKIPPED] EVK vault — EVK_VAULT_ADDR not set');
  }

  const tbillTx = await vault.addStrategy(TBILL_VAULT, STRATEGY_CAPS_BPS.tbillVault);
  await tbillTx.wait();
  console.log('T-Bill Vault added:', TBILL_VAULT, '(2000 alloc pts)');

  console.log('\n--- Post-Deployment Verification ---');
  const totalAssets = await vault.totalAssets();
  const feePct      = await vault.performanceFee();
  const feeRecip    = await vault.feeRecipient();
  const curator     = await vault.curator();

  console.log('totalAssets:       ', ethers.formatUnits(totalAssets, 6), 'AXUSD');
  console.log('performanceFee:    ', feePct.toString(), 'bps');
  console.log('feeRecipient:      ', feeRecip);
  console.log('curator:           ', curator);

  console.log(`
=======================================================
  DEPLOYMENT COMPLETE — ACTION REQUIRED
=======================================================

  Vault Address:  ${vaultAddress}
  Factory:        ${EULER_EARN_FACTORY}
  Asset:          ${AXUSD_ERC3643}

  NEXT STEPS:
  1. Update shared/contracts.ts:
       EULER_EARN_VAULT: '${vaultAddress}',
       EULER_EARN_FACTORY: '${EULER_EARN_FACTORY}',

  2. Update src/config/activeContracts.generated.ts:
       EULER_EARN_VAULT_ADDRESS = '${vaultAddress}'
       EULER_EARN_FACTORY_ADDRESS = '${EULER_EARN_FACTORY}'

  3. Whitelist vault in ERC-3643 LPM:
       POST /api/erc3643/whitelist/add-platform  { "platform": "${vaultAddress}" }
     Also whitelist EVC if not already done:
       POST /api/erc3643/whitelist/add-platform  { "platform": "0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383" }

  4. If EVK vault was skipped, re-run with EVK_VAULT_ADDR set:
       EVK_VAULT_ADDR=0x... npx hardhat run scripts/deploy-axusd-euler-earn-vault.js --network arbitrumOne
       Then call: vault.addStrategy(<evk-addr>, 4000)

=======================================================
`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
