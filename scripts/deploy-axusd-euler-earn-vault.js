/**
 * Deploy Script: Axiom Euler Earn AXUSD Yield Aggregation Vault
 * Task #39 | Arbitrum One
 *
 * Architecture:
 *   - Euler Earn factory creates a new vault with ERC-3643 AXUSD as the underlying asset
 *   - Axiom deployer is the initial owner + curator (transfer to multisig post-deploy)
 *   - Three strategies registered at launch:
 *       • AXIOMCreditMarket (submitCap 400K AXUSD, 40%)
 *       • EVK Open Market Vault (submitCap 400K AXUSD, 40%)
 *       • T-Bill Vault (submitCap 200K AXUSD, 20%)
 *   - Performance fee: 10% (1000 bps) → AxiomFeeBurner
 *   - Timelock: 0 (caps accepted instantly; increase to 1 week post-seeding)
 *   - EVC + this vault must be whitelisted in ERC-3643 LendingPlatformModule
 *
 * Prerequisites:
 *   1. EVK Open Market Vault deployed (Task #38) ✓
 *   2. Deployer EOA has enough ETH on Arbitrum for gas (~0.003 ETH for ~5 txs)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-axusd-euler-earn-vault.js --network arbitrum
 *
 * After deployment, update:
 *   shared/contracts.ts          → EULER_EARN_VAULT + EULER_EARN_FACTORY
 *   src/config/activeContracts.generated.ts → EULER_EARN_VAULT_ADDRESS + EULER_EARN_FACTORY_ADDRESS
 */

const { ethers } = require('hardhat');

// ── Addresses ──────────────────────────────────────────────────────────────
const AXUSD_ERC3643       = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const AXIOM_CREDIT_MARKET = '0x85074a74774568692128eE97Da661Fe49dcF5fE4';
const EVK_OPEN_MARKET_VAULT = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2'; // eAXUSD-6 (Task #38) ✓
const TBILL_VAULT         = '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4';
const AXIOM_FEE_BURNER    = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94';
const LPM_ADDR            = '0xC0177120Fb5922813031a5857f4dF7F01750Bb6F';
const COMPLIANCE          = '0xaC9E1A91D1C7F584C9FC04E283fae30Ae2F636DD';

// Official Euler Earn Factory — Arbitrum One (from euler-interfaces/addresses/42161)
const EULER_EARN_FACTORY  = process.env.EULER_EARN_FACTORY_ADDR
  || '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d';

// ── Parameters ────────────────────────────────────────────────────────────
const INITIAL_TIMELOCK    = 0;              // 0 = accept caps immediately
const FEE_WAD             = 100_000_000_000_000_000n; // 10% in WAD (1e17 = 0.1 * 1e18)
// Supply caps — only EVK-deployed vaults pass the Euler Earn perspective
// AXIOMCreditMarket + TBILL_VAULT are custom contracts (not EVK vaults) — excluded
const CAP_EVK_VAULT       = ethers.parseUnits('1000000', 6); // 1M AXUSD

// ── ABIs ─────────────────────────────────────────────────────────────────
const EULER_EARN_FACTORY_ABI = [
  'function createEulerEarn(address initialOwner, uint256 initialTimelock, address asset, string name, string symbol, bytes32 salt) returns (address eulerEarn)',
  'function getVaultListLength() view returns (uint256)',
  'function getVaultListSlice(uint256 start, uint256 end) view returns (address[] list)',
  'event CreateEulerEarn(address indexed eulerEarn, address indexed caller, address indexed asset, string name, string symbol, bytes32 salt)',
];

const EULER_EARN_ABI = [
  'function submitCap(address id, uint256 newSupplyCap) external',
  'function acceptCap(address id) external',
  'function pendingCap(address id) view returns (uint136 value, uint64 validAt)',
  'function config(address id) view returns (uint112 cap, uint136 currentCap, bool enabled, uint64 removableAt)',
  'function setFee(uint256 newFee) external',
  'function setFeeRecipient(address newFeeRecipient) external',
  'function setCurator(address newCurator) external',
  'function setSupplyQueue(address[] newSupplyQueue) external',
  'function setIsAllocator(address newAllocator, bool newIsAllocator) external',
  'function totalAssets() view returns (uint256)',
  'function fee() view returns (uint96)',
  'function feeRecipient() view returns (address)',
  'function curator() view returns (address)',
  'function owner() view returns (address)',
  'function timelock() view returns (uint256)',
  'function supplyQueueLength() view returns (uint256)',
  'function supplyQueue(uint256 index) view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

const LPM_ABI = [
  'function addPlatform(address _compliance, address _platform) external',
  'function isPlatformWhitelisted(address token, address platform) view returns (bool)',
];

// ── Nonce management ───────────────────────────────────────────────────────
let _nonce;
function useNonce() { return _nonce++; }

async function sendTx(contract, method, args, overrides = {}) {
  return contract[method](...args, { ...overrides, nonce: useNonce() });
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  _nonce = await ethers.provider.getTransactionCount(deployer.address);

  console.log('Deployer:    ', deployer.address);
  console.log('Balance:     ', ethers.formatEther(bal), 'ETH');
  console.log('Nonce:       ', _nonce);
  console.log('Factory:     ', EULER_EARN_FACTORY);
  console.log('AXUSD:       ', AXUSD_ERC3643);
  console.log('EVK Vault:   ', EVK_OPEN_MARKET_VAULT, '(Task #38 ✓)');

  const factory = new ethers.Contract(EULER_EARN_FACTORY, EULER_EARN_FACTORY_ABI, deployer);
  const lpm     = new ethers.Contract(LPM_ADDR, LPM_ABI, deployer);

  // ── Check for existing vault (reuse if oracle matches) ─────────────────
  // Vault already deployed in previous run (6M gas OOG on first attempt, succeeded second)
  const CANDIDATE_VAULT = '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B';
  let vaultAddress;

  if (CANDIDATE_VAULT !== ethers.ZeroAddress) {
    const code = await ethers.provider.getCode(CANDIDATE_VAULT);
    if (code && code !== '0x') {
      vaultAddress = CANDIDATE_VAULT;
      console.log('\n[Step 1] Reusing existing Euler Earn vault:', vaultAddress);
    }
  }

  if (!vaultAddress) {
    // ── Step 1: Deploy vault ──────────────────────────────────────────────
    console.log('\n[Step 1] Deploying Euler Earn AXUSD vault...');
    const salt = ethers.ZeroHash; // deterministic but unique to asset+owner pair
    const deployTx = await sendTx(factory, 'createEulerEarn', [
      deployer.address,      // initialOwner
      INITIAL_TIMELOCK,      // 0 = no timelock (accept caps instantly)
      AXUSD_ERC3643,         // asset
      'Axiom Earn AXUSD',    // name
      'earnAXUSD',           // symbol
      salt,                  // bytes32 salt
    ], { gasLimit: 6_000_000 });

    const deployReceipt = await deployTx.wait(1);
    console.log('  Deploy tx:', deployTx.hash);

    // Parse CreateEulerEarn event from receipt
    const createEventTopic = ethers.id('CreateEulerEarn(address,address,address,string,string,bytes32)');
    const createLog = deployReceipt.logs.find(l => l.topics[0] === createEventTopic);
    if (createLog) {
      vaultAddress = ethers.getAddress('0x' + createLog.topics[1].slice(26));
      console.log('  Vault deployed at:', vaultAddress, '(from event)');
    } else {
      // Fallback: query list
      await new Promise(r => setTimeout(r, 3000));
      const listLen = await factory.getVaultListLength();
      const vaults = await factory.getVaultListSlice(listLen - 1n, listLen);
      vaultAddress = vaults[0];
      console.log('  Vault deployed at:', vaultAddress, '(from list)');
    }
  }

  const vault = new ethers.Contract(vaultAddress, EULER_EARN_ABI, deployer);

  // ── Step 2: Whitelist vault in LPM ────────────────────────────────────
  console.log('\n[Step 2] Whitelisting vault in LendingPlatformModule...');
  const isWhitelisted = await lpm.isPlatformWhitelisted(COMPLIANCE, vaultAddress).catch(() => false);
  if (isWhitelisted) {
    console.log('  Vault already whitelisted.');
  } else {
    const wlTx = await sendTx(lpm, 'addPlatform', [COMPLIANCE, vaultAddress], { gasLimit: 200_000 });
    await wlTx.wait(1);
    console.log('  Vault whitelisted | tx:', wlTx.hash);
  }

  // ── Step 3: Set fee recipient first, then fee (ZeroFeeRecipient guard) ──
  console.log('\n[Step 3] Setting fee recipient then performance fee (10%)...');

  const currentFeeRecip = await vault.feeRecipient();
  if (currentFeeRecip.toLowerCase() === AXIOM_FEE_BURNER.toLowerCase()) {
    console.log('  Fee recipient already set to AxiomFeeBurner.');
  } else {
    const recipTx = await sendTx(vault, 'setFeeRecipient', [AXIOM_FEE_BURNER], { gasLimit: 200_000 });
    await recipTx.wait(1);
    console.log('  Fee recipient:', AXIOM_FEE_BURNER, '| tx:', recipTx.hash);
  }

  const currentFee = await vault.fee();
  if (currentFee >= FEE_WAD - 1n) {
    console.log('  Fee already set to 10% WAD:', currentFee.toString());
  } else {
    const feeTx = await sendTx(vault, 'setFee', [FEE_WAD], { gasLimit: 200_000 });
    await feeTx.wait(1);
    console.log('  Fee set to 10% (WAD) | tx:', feeTx.hash);
  }

  // ── Step 4: Submit + accept strategy caps (timelock = 0, instant) ─────
  console.log('\n[Step 4] Submitting strategy caps...');

  // Only EVK-deployed vaults pass the Euler perspective check
  // AXIOMCreditMarket + TBILL_VAULT are custom contracts — added as strategies later via Euler UI or separate EVK wrapper vaults
  const strategies = [
    { addr: EVK_OPEN_MARKET_VAULT, cap: CAP_EVK_VAULT, label: 'eAXUSD-6 EVK Open Market (1M AXUSD)' },
  ];

  const now = Math.floor(Date.now() / 1000);
  for (const s of strategies) {
    console.log(`\n  Processing strategy: ${s.label}...`);

    // Check current state of this strategy
    const [pending, cfg] = await Promise.all([
      vault.pendingCap(s.addr),
      vault.config(s.addr),
    ]);

    const pendingValue = pending[0];
    const validAt = Number(pending[1]);
    const isEnabled = cfg[2];

    console.log(`    config.enabled: ${isEnabled}, pending.value: ${pendingValue.toString()}, validAt: ${validAt}`);

    if (isEnabled && cfg[0] >= s.cap) {
      console.log('    Strategy already fully configured. Skipping.');
      continue;
    }

    // Submit cap only if not already pending
    if (pendingValue === 0n) {
      console.log('    submitCap...');
      const submitTx = await sendTx(vault, 'submitCap', [s.addr, s.cap], { gasLimit: 300_000 });
      await submitTx.wait(2); // wait 2 confirmations to ensure timestamp advances
      console.log('    submitCap tx:', submitTx.hash);
      // Refresh pending cap
      const newPending = await vault.pendingCap(s.addr);
      console.log('    New validAt:', newPending[1].toString(), '| now:', Math.floor(Date.now() / 1000));
      // If timelock > 0, wait
      const newValidAt = Number(newPending[1]);
      if (newValidAt > Math.floor(Date.now() / 1000)) {
        console.log('    Timelock active, waiting...');
        await new Promise(r => setTimeout(r, (newValidAt - Math.floor(Date.now() / 1000) + 2) * 1000));
      }
    } else {
      console.log('    Pending cap already exists (value:', pendingValue.toString(), ')');
      if (validAt > now) {
        const waitSecs = validAt - now + 2;
        console.log(`    Waiting ${waitSecs}s for timelock...`);
        await new Promise(r => setTimeout(r, waitSecs * 1000));
      }
    }

    // Accept the cap
    console.log('    acceptCap...');
    const acceptTx = await sendTx(vault, 'acceptCap', [s.addr], { gasLimit: 300_000 });
    await acceptTx.wait(1);
    console.log('    acceptCap tx:', acceptTx.hash);
  }

  // ── Step 5: Set supply queue (determines deposit allocation order) ────
  console.log('\n[Step 5] Setting supply queue (allocation priority order)...');
  const queueTx = await sendTx(vault, 'setSupplyQueue', [
    [EVK_OPEN_MARKET_VAULT]
  ], { gasLimit: 300_000 });
  await queueTx.wait(1);
  console.log('  Supply queue set | tx:', queueTx.hash);

  // ── Step 6: Verify ───────────────────────────────────────────────────
  console.log('\n[Step 6] Verification...');
  const [vaultName, vaultSymbol, fee, feeRecip, curator, tl, totalAssets] = await Promise.all([
    vault.name(),
    vault.symbol(),
    vault.fee(),
    vault.feeRecipient(),
    vault.curator(),
    vault.timelock(),
    vault.totalAssets(),
  ]);
  console.log('  Name:          ', vaultName);
  console.log('  Symbol:        ', vaultSymbol);
  console.log('  Fee:           ', fee.toString(), 'bps');
  console.log('  Fee Recipient: ', feeRecip);
  console.log('  Curator:       ', curator);
  console.log('  Timelock:      ', tl.toString(), 'seconds');
  console.log('  Total Assets:  ', ethers.formatUnits(totalAssets, 6), 'AXUSD');

  const qLen = await vault.supplyQueueLength();
  console.log('  Supply Queue:');
  for (let i = 0n; i < qLen; i++) {
    const s = await vault.supplyQueue(i);
    console.log(`    [${i}]`, s);
  }

  console.log(`
========================================
DEPLOYMENT SUMMARY
========================================
Vault Address:    ${vaultAddress}
Factory:          ${EULER_EARN_FACTORY}
Asset:            ${AXUSD_ERC3643} (ERC-3643 AXUSD)
Fee:              10% → ${AXIOM_FEE_BURNER}

→ Update src/config/activeContracts.generated.ts:
    EULER_EARN_VAULT_ADDRESS:   "${vaultAddress}"
    EULER_EARN_FACTORY_ADDRESS: "${EULER_EARN_FACTORY}"
→ Update shared/contracts.ts EULER_EARN section:
    EULER_EARN_VAULT:   "${vaultAddress}"
    EULER_EARN_FACTORY: "${EULER_EARN_FACTORY}"
`);
}

main().catch(e => { console.error(e); process.exit(1); });
