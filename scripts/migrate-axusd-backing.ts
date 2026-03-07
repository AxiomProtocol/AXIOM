import { ethers } from "hardhat";

const GENIUS_AXUSD = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
const LEGACY_AXUSD = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
const GENIUS_PSM = "0x5db58d9c21369d1532a48Bdd658E4Fe415404922";
const LEGACY_PSM = "0x4584888cB411E9cc88e3800BAB73A430D90d3793";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];
const PSM_ABI = [
  "function swapAXUSDForCollateral(uint256) returns (uint256)",
  "function swapAXUSDForCollateralWithMin(uint256,uint256) returns (uint256)",
  "function swapCollateralForAXUSD(uint256) returns (uint256)",
  "function getSwapQuote(uint256,bool) view returns (uint256)",
  "function getCollateralBalance() view returns (uint256)",
  "function redeemFee() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function debtOutstanding() view returns (uint256)",
  "function debtCeiling() view returns (uint256)",
  "function blockRedeemLimit() view returns (uint256)",
  "function axusd() view returns (address)",
  "function collateral() view returns (address)",
  "function paused() view returns (bool)",
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNonce(provider: any, address: string): Promise<number> {
  return await provider.getTransactionCount(address, "latest");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const dryRun = !process.argv.includes("--execute") && !process.env.EXECUTE_FLAG;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD BACKING MIGRATION: Old PSMs → New ERC-3643 System");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nMode: ${dryRun ? "DRY RUN (set EXECUTE_FLAG=true for mainnet)" : "LIVE EXECUTION"}`);
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH Balance:", ethers.formatEther(balance), "ETH");

  const usdc = new ethers.Contract(USDC_ARBITRUM, ERC20_ABI, deployer);
  const geniusAxusd = new ethers.Contract(GENIUS_AXUSD, ERC20_ABI, deployer);
  const legacyAxusd = new ethers.Contract(LEGACY_AXUSD, ERC20_ABI, deployer);
  const geniusPsm = new ethers.Contract(GENIUS_PSM, PSM_ABI, deployer);
  const legacyPsm = new ethers.Contract(LEGACY_PSM, PSM_ABI, deployer);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 1: CURRENT STATE ASSESSMENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [geniusBalance, legacyBalance, usdcBefore, geniusPsmUsdc, legacyPsmUsdc] = await Promise.all([
    geniusAxusd.balanceOf(deployer.address),
    legacyAxusd.balanceOf(deployer.address),
    usdc.balanceOf(deployer.address),
    usdc.balanceOf(GENIUS_PSM),
    usdc.balanceOf(LEGACY_PSM),
  ]);

  let geniusPaused = false;
  let legacyPaused = false;
  let geniusRedeemFee = 0n;
  let legacyRedeemFee = 0n;
  let geniusBlockLimit = 0n;
  let legacyBlockLimit = 0n;
  try { geniusPaused = await geniusPsm.paused(); } catch {}
  try { legacyPaused = await legacyPsm.paused(); } catch {}
  try { geniusRedeemFee = await geniusPsm.redeemFee(); } catch {}
  try { legacyRedeemFee = await legacyPsm.redeemFee(); } catch {}
  try { geniusBlockLimit = await geniusPsm.blockRedeemLimit(); } catch {}
  try { legacyBlockLimit = await legacyPsm.blockRedeemLimit(); } catch {}

  console.log("--- Deployer Holdings ---");
  console.log("  GENIUS AXUSD:", ethers.formatEther(geniusBalance));
  console.log("  Legacy AXUSD:", ethers.formatEther(legacyBalance));
  console.log("  USDC:", ethers.formatUnits(usdcBefore, 6));
  console.log("");
  console.log("--- PSM Status ---");
  console.log("  GENIUS PSM paused:", geniusPaused);
  console.log("  GENIUS PSM USDC:", ethers.formatUnits(geniusPsmUsdc, 6));
  console.log("  GENIUS redeem fee:", geniusRedeemFee.toString(), "bps");
  console.log("  GENIUS block limit:", geniusBlockLimit > 0n ? ethers.formatEther(geniusBlockLimit) : "none");
  console.log("");
  console.log("  Legacy PSM paused:", legacyPaused);
  console.log("  Legacy PSM USDC:", ethers.formatUnits(legacyPsmUsdc, 6));
  console.log("  Legacy redeem fee:", legacyRedeemFee.toString(), "bps");
  console.log("  Legacy block limit:", legacyBlockLimit > 0n ? ethers.formatEther(legacyBlockLimit) : "none");
  console.log("");
  console.log("  Total USDC in old PSMs:", ethers.formatUnits(geniusPsmUsdc + legacyPsmUsdc, 6));

  if (geniusPsmUsdc === 0n && legacyPsmUsdc === 0n) {
    console.log("\nNo USDC in either PSM. Nothing to recover.");
    return;
  }

  if (dryRun) {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  DRY RUN — PLANNED ACTIONS");
    console.log("═══════════════════════════════════════════════════════════════\n");

    if (geniusPsmUsdc > 0n && geniusBalance > 0n && !geniusPaused) {
      const swapAmount = geniusBalance < geniusPsmUsdc * BigInt(1e12) ? geniusBalance : geniusPsmUsdc * BigInt(1e12);
      console.log("1. swapAXUSDForCollateral:", ethers.formatEther(swapAmount), "GENIUS AXUSD → USDC");
      try {
        const quote = await geniusPsm.getSwapQuote(swapAmount, false);
        console.log("   Quote:", ethers.formatUnits(quote, 6), "USDC");
      } catch { console.log("   (quote not available)"); }
    } else if (geniusPaused) {
      console.log("1. GENIUS PSM is PAUSED — cannot redeem");
    }

    if (legacyPsmUsdc > 0n && legacyBalance > 0n && !legacyPaused) {
      const swapAmount = legacyBalance < legacyPsmUsdc * BigInt(1e12) ? legacyBalance : legacyPsmUsdc * BigInt(1e12);
      console.log("2. swapAXUSDForCollateral:", ethers.formatEther(swapAmount), "Legacy AXUSD → USDC");
      try {
        const quote = await legacyPsm.getSwapQuote(swapAmount, false);
        console.log("   Quote:", ethers.formatUnits(quote, 6), "USDC");
      } catch { console.log("   (quote not available)"); }
    } else if (legacyPaused) {
      console.log("2. Legacy PSM is PAUSED — cannot redeem");
    }

    console.log("\nSet EXECUTE_FLAG=true to execute on mainnet.");
    return;
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 2: SWAP AXUSD FOR COLLATERAL (USDC)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let totalUsdcRedeemed = 0n;

  if (geniusPsmUsdc > 0n && geniusBalance > 0n && !geniusPaused) {
    console.log("--- GENIUS PSM: swapAXUSDForCollateral ---\n");
    const swapAmount = geniusBalance;

    let nonce = await getNonce(deployer.provider, deployer.address);
    console.log(`  [nonce ${nonce}] Approving GENIUS PSM to spend AXUSD...`);
    const approveTx = await geniusAxusd.approve(GENIUS_PSM, swapAmount, { nonce });
    await approveTx.wait();
    console.log("  ✓ Approved. TX:", approveTx.hash);
    await sleep(2000);

    nonce = await getNonce(deployer.provider, deployer.address);
    console.log(`  [nonce ${nonce}] Swapping ${ethers.formatEther(swapAmount)} AXUSD for USDC...`);
    try {
      const swapTx = await geniusPsm.swapAXUSDForCollateral(swapAmount, { nonce, gasLimit: 500000 });
      await swapTx.wait();
      console.log("  ✓ Swap complete. TX:", swapTx.hash);
    } catch (err: any) {
      console.log("  ✗ Full swap failed:", err.reason || err.message?.slice(0, 120));
      console.log("  Trying smaller amount matching PSM reserves...");
      const smallerAmount = geniusPsmUsdc * BigInt(1e12) * 9900n / 10000n;
      nonce = await getNonce(deployer.provider, deployer.address);
      try {
        const swapTx2 = await geniusPsm.swapAXUSDForCollateral(smallerAmount, { nonce, gasLimit: 500000 });
        await swapTx2.wait();
        console.log("  ✓ Partial swap complete. TX:", swapTx2.hash);
      } catch (err2: any) {
        console.log("  ✗ Partial swap also failed:", err2.reason || err2.message?.slice(0, 120));
      }
    }
    await sleep(2000);

    const usdcAfter = await usdc.balanceOf(deployer.address);
    const received = usdcAfter - usdcBefore;
    totalUsdcRedeemed += received;
    console.log("  USDC received:", ethers.formatUnits(received, 6), "\n");
  } else if (geniusPaused) {
    console.log("GENIUS PSM is PAUSED — skipping\n");
  }

  if (legacyPsmUsdc > 0n && legacyBalance > 0n && !legacyPaused) {
    console.log("--- Legacy PSM: swapAXUSDForCollateral ---\n");
    const usdcBeforeLegacy = await usdc.balanceOf(deployer.address);
    const swapAmount = legacyBalance;

    let nonce = await getNonce(deployer.provider, deployer.address);
    console.log(`  [nonce ${nonce}] Approving Legacy PSM to spend AXUSD...`);
    const approveTx = await legacyAxusd.approve(LEGACY_PSM, swapAmount, { nonce });
    await approveTx.wait();
    console.log("  ✓ Approved. TX:", approveTx.hash);
    await sleep(2000);

    nonce = await getNonce(deployer.provider, deployer.address);
    console.log(`  [nonce ${nonce}] Swapping ${ethers.formatEther(swapAmount)} AXUSD for USDC...`);
    try {
      const swapTx = await legacyPsm.swapAXUSDForCollateral(swapAmount, { nonce, gasLimit: 500000 });
      await swapTx.wait();
      console.log("  ✓ Swap complete. TX:", swapTx.hash);
    } catch (err: any) {
      console.log("  ✗ Full swap failed:", err.reason || err.message?.slice(0, 120));
      console.log("  Trying smaller amount matching PSM reserves...");
      const smallerAmount = legacyPsmUsdc * BigInt(1e12) * 9900n / 10000n;
      nonce = await getNonce(deployer.provider, deployer.address);
      try {
        const swapTx2 = await legacyPsm.swapAXUSDForCollateral(smallerAmount, { nonce, gasLimit: 500000 });
        await swapTx2.wait();
        console.log("  ✓ Partial swap complete. TX:", swapTx2.hash);
      } catch (err2: any) {
        console.log("  ✗ Partial swap also failed:", err2.reason || err2.message?.slice(0, 120));
      }
    }
    await sleep(2000);

    const usdcAfterLegacy = await usdc.balanceOf(deployer.address);
    const received = usdcAfterLegacy - usdcBeforeLegacy;
    totalUsdcRedeemed += received;
    console.log("  USDC received:", ethers.formatUnits(received, 6), "\n");
  } else if (legacyPaused) {
    console.log("Legacy PSM is PAUSED — skipping\n");
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  STEP 3: FINAL STATE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const [finalGenius, finalLegacy, finalUsdc, finalGeniusPsm, finalLegacyPsm] = await Promise.all([
    geniusAxusd.balanceOf(deployer.address),
    legacyAxusd.balanceOf(deployer.address),
    usdc.balanceOf(deployer.address),
    usdc.balanceOf(GENIUS_PSM),
    usdc.balanceOf(LEGACY_PSM),
  ]);

  console.log("--- Deployer Holdings (After) ---");
  console.log("  GENIUS AXUSD:", ethers.formatEther(finalGenius));
  console.log("  Legacy AXUSD:", ethers.formatEther(finalLegacy));
  console.log("  USDC:", ethers.formatUnits(finalUsdc, 6));
  console.log("");
  console.log("--- PSM Reserves (After) ---");
  console.log("  GENIUS PSM:", ethers.formatUnits(finalGeniusPsm, 6), "USDC");
  console.log("  Legacy PSM:", ethers.formatUnits(finalLegacyPsm, 6), "USDC");
  console.log("");
  console.log("--- Migration Summary ---");
  console.log("  Total USDC recovered:", ethers.formatUnits(totalUsdcRedeemed, 6));

  const endBalance = await ethers.provider.getBalance(deployer.address);
  console.log("  ETH remaining:", ethers.formatEther(endBalance));

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  MIGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nNew AXUSD (ERC-3643): 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
