import { ethers } from "hardhat";

const GENIUS_AXUSD = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
const LEGACY_AXUSD = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
const GENIUS_PSM = "0x5db58d9c21369d1532a48Bdd658E4Fe415404922";
const LEGACY_PSM = "0x4584888cB411E9cc88e3800BAB73A430D90d3793";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];
const PSM_ABI = [
  "function redeem(uint256) returns (uint256)",
  "function mint(uint256) returns (uint256)",
  "function getSwapQuote(uint256,bool) view returns (uint256)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const dryRun = !process.argv.includes("--execute");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD BACKING MIGRATION: Old PSMs → New ERC-3643 PSM");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nMode: ${dryRun ? "DRY RUN (add --execute for mainnet)" : "LIVE EXECUTION"}`);
  console.log("Deployer:", deployer.address);

  const usdc = new ethers.Contract(USDC_ARBITRUM, ERC20_ABI, deployer);
  const geniusAxusd = new ethers.Contract(GENIUS_AXUSD, ERC20_ABI, deployer);
  const legacyAxusd = new ethers.Contract(LEGACY_AXUSD, ERC20_ABI, deployer);
  const geniusPsm = new ethers.Contract(GENIUS_PSM, PSM_ABI, deployer);
  const legacyPsm = new ethers.Contract(LEGACY_PSM, PSM_ABI, deployer);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 1: CHECK CURRENT BALANCES");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const geniusBalance = await geniusAxusd.balanceOf(deployer.address);
  const legacyBalance = await legacyAxusd.balanceOf(deployer.address);
  const usdcBefore = await usdc.balanceOf(deployer.address);

  console.log("GENIUS AXUSD balance:", ethers.formatEther(geniusBalance));
  console.log("Legacy AXUSD balance:", ethers.formatEther(legacyBalance));
  console.log("USDC balance:", ethers.formatUnits(usdcBefore, 6));
  console.log("Total AXUSD to migrate:", ethers.formatEther(geniusBalance + legacyBalance));

  if (geniusBalance === 0n && legacyBalance === 0n) {
    console.log("\nNo AXUSD to migrate. Exiting.");
    return;
  }

  if (dryRun) {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  DRY RUN SIMULATION");
    console.log("═══════════════════════════════════════════════════════════════\n");

    if (geniusBalance > 0n) {
      console.log("Would redeem", ethers.formatEther(geniusBalance), "from GENIUS PSM");
      try {
        const geniusQuote = await geniusPsm.getSwapQuote(geniusBalance, false);
        console.log("Expected USDC return:", ethers.formatUnits(geniusQuote, 6));
      } catch {
        console.log("Could not get swap quote (PSM may not support getSwapQuote)");
      }
    }

    if (legacyBalance > 0n) {
      console.log("Would redeem", ethers.formatEther(legacyBalance), "from Legacy PSM");
      try {
        const legacyQuote = await legacyPsm.getSwapQuote(legacyBalance, false);
        console.log("Expected USDC return:", ethers.formatUnits(legacyQuote, 6));
      } catch {
        console.log("Could not get swap quote (PSM may not support getSwapQuote)");
      }
    }

    console.log("\nDry run complete. Add --execute to run on mainnet.");
    console.log("Command: npx hardhat run scripts/migrate-axusd-backing.ts --network arbitrum --config hardhat.erc3643.config.ts -- --execute");
    return;
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 2: REDEEM FROM OLD PSMs");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let totalUsdcRedeemed = 0n;

  if (geniusBalance > 0n) {
    console.log("Approving GENIUS PSM to spend AXUSD...");
    const approveTx1 = await geniusAxusd.approve(GENIUS_PSM, geniusBalance);
    await approveTx1.wait();
    console.log("   ✓ Approved. TX:", approveTx1.hash);

    console.log("Redeeming from GENIUS PSM...");
    const redeemTx1 = await geniusPsm.redeem(geniusBalance);
    await redeemTx1.wait();
    console.log("   ✓ Redeemed. TX:", redeemTx1.hash);

    const usdcAfterGenius = await usdc.balanceOf(deployer.address);
    const geniusUsdc = usdcAfterGenius - usdcBefore;
    totalUsdcRedeemed += geniusUsdc;
    console.log("   ✓ Received:", ethers.formatUnits(geniusUsdc, 6), "USDC");
  }

  if (legacyBalance > 0n) {
    console.log("\nApproving Legacy PSM to spend AXUSD...");
    const approveTx2 = await legacyAxusd.approve(LEGACY_PSM, legacyBalance);
    await approveTx2.wait();
    console.log("   ✓ Approved. TX:", approveTx2.hash);

    console.log("Redeeming from Legacy PSM...");
    const usdcBeforeLegacy = await usdc.balanceOf(deployer.address);
    const redeemTx2 = await legacyPsm.redeem(legacyBalance);
    await redeemTx2.wait();
    console.log("   ✓ Redeemed. TX:", redeemTx2.hash);

    const usdcAfterLegacy = await usdc.balanceOf(deployer.address);
    const legacyUsdc = usdcAfterLegacy - usdcBeforeLegacy;
    totalUsdcRedeemed += legacyUsdc;
    console.log("   ✓ Received:", ethers.formatUnits(legacyUsdc, 6), "USDC");
  }

  console.log("\nTotal USDC redeemed:", ethers.formatUnits(totalUsdcRedeemed, 6));

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 3: VERIFY FINAL STATE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const finalGenius = await geniusAxusd.balanceOf(deployer.address);
  const finalLegacy = await legacyAxusd.balanceOf(deployer.address);
  const finalUsdc = await usdc.balanceOf(deployer.address);

  console.log("Final GENIUS AXUSD:", ethers.formatEther(finalGenius));
  console.log("Final Legacy AXUSD:", ethers.formatEther(finalLegacy));
  console.log("Final USDC:", ethers.formatUnits(finalUsdc, 6));
  console.log("\nTotal USDC ready for new 3643 PSM deposit:", ethers.formatUnits(totalUsdcRedeemed, 6));

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  MIGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nNext step: Deposit USDC into new ERC-3643 PSM when deployed.");
  console.log("The new PSM address will be in deployment-erc3643-manifest.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
