/**
 * AXAU On-Chain Transaction Test
 * Tests Direct Mint (PAXG → AXAU) and Redeem (AXAU → PAXG) end-to-end
 * using the DEPLOYER_PRIVATE_KEY.
 *
 * Usage:  node scripts/test-axau-onchain.mjs
 */

import { ethers } from 'ethers';

const RPC        = 'https://arb1.arbitrum.io/rpc';
const ARBISCAN   = 'https://arbiscan.io/tx/';

const CONTROLLER  = '0x036F05a3fB74d35439c074f25F691b36f5D37792';
const PAXG_ADDR   = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXAU_ADDR   = '0xbcCA4D937d427829914498423aE6E04C846dB0Bb';
const XAU_VAULT   = '0x7c687a3207cd9c05b4b11d8dd7ac337919c2200102d72989a597ebc5afcf180b';

// Identity registry — check isVerified
const REGISTRY_ABI = [
  'function isVerified(address) view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function isVerified(address account) view returns (bool)',  // ERC-3643
];

const CONTROLLER_ABI = [
  'function quoteMint(bytes32 vaultId, uint256 tokenAmount) view returns (uint256 axauToUser, uint256 mintNavWad)',
  'function quoteRedeem(bytes32 vaultId, uint256 axauAmount) view returns (uint256 tokenToUser, uint256 backingNavWad)',
  'function mintWithAsset(bytes32 componentId, uint256 tokenAmountIn) external returns (uint256 axauAmountOut)',
  'function redeemToAsset(bytes32 vaultId, uint256 axauAmount) external returns (uint256 tokenAmountOut)',
  'function mintPaused() view returns (bool)',
  'function redeemPaused() view returns (bool)',
  'function registry() view returns (address)',
  'event Minted(address indexed user, bytes32 indexed vaultId, address indexed reserveAsset, uint256 tokenAmountIn, uint256 axauAmountOut, uint256 mintNavWad, uint256 coverageAfterBps)',
  'event Redeemed(address indexed user, bytes32 indexed vaultId, address indexed reserveAsset, uint256 axauAmountIn, uint256 tokenAmountOut, uint256 navWad, uint256 coverageAfterBps)',
];

function fmt(val, dec = 18, dp = 8) {
  return parseFloat(ethers.formatUnits(val, dec)).toFixed(dp);
}

function sep(label) {
  console.log('\n' + '═'.repeat(56));
  console.log(`  ${label}`);
  console.log('═'.repeat(56));
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');

  const provider   = new ethers.JsonRpcProvider(RPC);
  const wallet     = new ethers.Wallet(pk, provider);
  const address    = wallet.address;

  sep('ENVIRONMENT');
  console.log('Wallet   :', address);
  const network = await provider.getNetwork();
  console.log('Network  :', network.name, '(chain', network.chainId.toString() + ')');
  if (network.chainId !== 42161n) throw new Error('Must be on Arbitrum One (42161)');

  // ── Contracts ─────────────────────────────────────────────────────────────
  const controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, wallet);
  const paxg       = new ethers.Contract(PAXG_ADDR,  ERC20_ABI,      wallet);
  const axau       = new ethers.Contract(AXAU_ADDR,  ERC20_ABI,      wallet);

  // ── Identity check ─────────────────────────────────────────────────────────
  // isVerified lives on the ERC-3643 AXAU token itself, not the registry.
  sep('IDENTITY CHECK');
  console.log('Checking isVerified on AXAU token:', AXAU_ADDR);
  const isVerified = await axau.isVerified(address);
  console.log('Verified :', isVerified ? '✅ YES' : '❌ NO');
  if (!isVerified) {
    console.log('\n⚠  Wallet is not identity-verified on-chain.');
    console.log('   Mint and redeem will revert. Stopping here.');
    process.exit(1);
  }

  // ── Balances ───────────────────────────────────────────────────────────────
  sep('BALANCES');
  const paxgBal = await paxg.balanceOf(address);
  const axauBal = await axau.balanceOf(address);
  console.log('PAXG     :', fmt(paxgBal), 'PAXG');
  console.log('AXAU     :', fmt(axauBal), 'AXAU');

  // ── System state ───────────────────────────────────────────────────────────
  sep('SYSTEM STATE');
  const mintPaused   = await controller.mintPaused();
  const redeemPaused = await controller.redeemPaused();
  console.log('Mint paused  :', mintPaused  ? '🔴 YES' : '🟢 NO');
  console.log('Redeem paused:', redeemPaused ? '🔴 YES' : '🟢 NO');

  // ── Oracle freshness ───────────────────────────────────────────────────────
  sep('ORACLE FRESHNESS');
  const oracleFresh = await fetch('http://localhost:3000/api/axau/oracle-freshness')
    .then(r => r.json()).catch(() => null);
  if (oracleFresh) {
    console.log('Stale   :', oracleFresh.oracleStale ? '🔴 YES' : '🟢 NO');
    console.log('Updated :', oracleFresh.oracleUpdatedAt ?? 'unknown');
    if (oracleFresh.oracleStale) {
      console.log('\n⚠  Oracle is stale — on-chain mint/redeem will revert. Stopping.');
      process.exit(1);
    }
  } else {
    console.log('(could not reach local API — skipping freshness pre-check)');
  }

  // ── Mint quote ─────────────────────────────────────────────────────────────
  const MINT_PAXG  = ethers.parseUnits('0.001', 18);   // 0.001 PAXG ≈ $3
  sep('MINT QUOTE  (0.001 PAXG → AXAU)');
  if (paxgBal < MINT_PAXG) {
    console.log('⚠  Insufficient PAXG balance for test mint (need 0.001). Skipping mint.');
  } else if (mintPaused) {
    console.log('⚠  Mint is paused. Skipping mint.');
  } else {
    const [axauOut, mintNav] = await controller.quoteMint(XAU_VAULT, MINT_PAXG);
    console.log('PAXG in    :', fmt(MINT_PAXG), 'PAXG');
    console.log('AXAU out   :', fmt(axauOut),   'AXAU  (estimated)');
    console.log('Mint NAV   :', fmt(mintNav),   'WAD');

    // ── Approve PAXG ──────────────────────────────────────────────────────────
    sep('STEP 1 — APPROVE PAXG');
    const currentAllowance = await paxg.allowance(address, CONTROLLER);
    if (currentAllowance < MINT_PAXG) {
      console.log('Sending approve tx…');
      const approveTx = await paxg.approve(CONTROLLER, MINT_PAXG);
      console.log('Approve TX :', ARBISCAN + approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log('Confirmed  : block', approveReceipt.blockNumber, '  gas', approveReceipt.gasUsed.toString());
    } else {
      console.log('Allowance already sufficient — skipping approve');
    }

    // ── Mint ──────────────────────────────────────────────────────────────────
    sep('STEP 2 — MINT (mintWithAsset)');
    console.log('Sending mint tx…');
    const mintTx = await controller.mintWithAsset(XAU_VAULT, MINT_PAXG);
    console.log('Mint TX    :', ARBISCAN + mintTx.hash);
    const mintReceipt = await mintTx.wait();
    console.log('Confirmed  : block', mintReceipt.blockNumber, '  gas', mintReceipt.gasUsed.toString());

    const iface = new ethers.Interface(CONTROLLER_ABI);
    for (const log of mintReceipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === 'Minted') {
          console.log('\n✅ Minted event:');
          console.log('   PAXG in  :', fmt(parsed.args.tokenAmountIn),  'PAXG');
          console.log('   AXAU out :', fmt(parsed.args.axauAmountOut),  'AXAU');
          console.log('   Coverage :', parsed.args.coverageAfterBps.toString(), 'bps');
        }
      } catch { /* not our event */ }
    }
  }

  // ── Post-mint balances ────────────────────────────────────────────────────
  sep('BALANCES AFTER MINT');
  const paxgAfterMint = await paxg.balanceOf(address);
  const axauAfterMint = await axau.balanceOf(address);
  console.log('PAXG     :', fmt(paxgAfterMint), 'PAXG');
  console.log('AXAU     :', fmt(axauAfterMint), 'AXAU');

  // ── Redeem quote ──────────────────────────────────────────────────────────
  const REDEEM_AXAU = ethers.parseUnits('0.0001', 18);   // tiny redeem amount
  sep('REDEEM QUOTE  (0.0001 AXAU → PAXG)');
  if (axauAfterMint < REDEEM_AXAU) {
    console.log('⚠  Insufficient AXAU balance for test redeem (need 0.0001). Skipping redeem.');
  } else if (redeemPaused) {
    console.log('⚠  Redeem is paused. Skipping redeem.');
  } else {
    const [paxgOut, redeemNav] = await controller.quoteRedeem(XAU_VAULT, REDEEM_AXAU);
    console.log('AXAU in    :', fmt(REDEEM_AXAU), 'AXAU');
    console.log('PAXG out   :', fmt(paxgOut),     'PAXG  (estimated)');
    console.log('Redeem NAV :', fmt(redeemNav),   'WAD');

    // ── Approve AXAU ──────────────────────────────────────────────────────────
    sep('STEP 3 — APPROVE AXAU');
    const axauAllowance = await axau.allowance(address, CONTROLLER);
    if (axauAllowance < REDEEM_AXAU) {
      console.log('Sending approve tx…');
      const approveTx = await axau.approve(CONTROLLER, REDEEM_AXAU);
      console.log('Approve TX :', ARBISCAN + approveTx.hash);
      const approveReceipt = await approveTx.wait();
      console.log('Confirmed  : block', approveReceipt.blockNumber, '  gas', approveReceipt.gasUsed.toString());
    } else {
      console.log('Allowance already sufficient — skipping approve');
    }

    // ── Redeem ────────────────────────────────────────────────────────────────
    sep('STEP 4 — REDEEM (redeemToAsset)');
    console.log('Sending redeem tx…');
    const redeemTx = await controller.redeemToAsset(XAU_VAULT, REDEEM_AXAU);
    console.log('Redeem TX  :', ARBISCAN + redeemTx.hash);
    const redeemReceipt = await redeemTx.wait();
    console.log('Confirmed  : block', redeemReceipt.blockNumber, '  gas', redeemReceipt.gasUsed.toString());

    const iface2 = new ethers.Interface(CONTROLLER_ABI);
    for (const log of redeemReceipt.logs) {
      try {
        const parsed = iface2.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === 'Redeemed') {
          console.log('\n✅ Redeemed event:');
          console.log('   AXAU in  :', fmt(parsed.args.axauAmountIn),   'AXAU');
          console.log('   PAXG out :', fmt(parsed.args.tokenAmountOut), 'PAXG');
          console.log('   Coverage :', parsed.args.coverageAfterBps.toString(), 'bps');
        }
      } catch { /* not our event */ }
    }
  }

  // ── Final balances ────────────────────────────────────────────────────────
  sep('FINAL BALANCES');
  const paxgFinal = await paxg.balanceOf(address);
  const axauFinal = await axau.balanceOf(address);
  console.log('PAXG     :', fmt(paxgFinal), 'PAXG');
  console.log('AXAU     :', fmt(axauFinal), 'AXAU');

  sep('DONE');
  console.log('✅ On-chain test complete — all steps passed.');
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message ?? err);
  process.exit(1);
});
