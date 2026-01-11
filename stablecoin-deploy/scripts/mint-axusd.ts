import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD MINTING VIA PSM");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nWallet:", signer.address);

  // Contract addresses
  const PSM_ADDRESS = "0x101866a92EF9DB903e4C068f63708Acd9C40f7Fc";
  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  // Amount to mint (change this as needed)
  const MINT_AMOUNT_USDC = "100"; // 100 USDC = 100 AXUSD
  const amountIn = ethers.parseUnits(MINT_AMOUNT_USDC, 6); // USDC has 6 decimals

  // Connect to contracts
  const usdcAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);

  const psmAbi = [
    "function mint(uint256 collateralAmount) external",
    "function mintFee() view returns (uint256)",
    "function debtCeiling() view returns (uint256)",
    "function totalMinted() view returns (uint256)"
  ];
  const psm = new ethers.Contract(PSM_ADDRESS, psmAbi, signer);

  const axusdAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
  ];
  const axusd = new ethers.Contract(AXUSD_ADDRESS, axusdAbi, signer);

  // Check balances
  console.log("\n─── BEFORE MINTING ───");
  const usdcBalance = await usdc.balanceOf(signer.address);
  const axusdBalanceBefore = await axusd.balanceOf(signer.address);
  console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
  console.log("AXUSD Balance:", ethers.formatEther(axusdBalanceBefore));

  if (usdcBalance < amountIn) {
    console.log("\n❌ Insufficient USDC balance!");
    console.log("   Need:", MINT_AMOUNT_USDC, "USDC");
    console.log("   Have:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("\nPlease fund your wallet with USDC first.");
    return;
  }

  // Check PSM info
  const mintFee = await psm.mintFee();
  const debtCeiling = await psm.debtCeiling();
  const totalMinted = await psm.totalMinted();
  console.log("\n─── PSM INFO ───");
  console.log("Mint Fee:", mintFee.toString(), "basis points (", Number(mintFee) / 100, "%)");
  console.log("Debt Ceiling:", ethers.formatEther(debtCeiling), "AXUSD");
  console.log("Total Minted:", ethers.formatEther(totalMinted), "AXUSD");

  // Step 1: Approve USDC
  console.log("\n─── STEP 1: APPROVING USDC ───");
  const currentAllowance = await usdc.allowance(signer.address, PSM_ADDRESS);
  if (currentAllowance < amountIn) {
    console.log("Approving", MINT_AMOUNT_USDC, "USDC to PSM...");
    const approveTx = await usdc.approve(PSM_ADDRESS, amountIn);
    await approveTx.wait();
    console.log("   ✓ USDC approved");
    console.log("   Tx:", approveTx.hash);
  } else {
    console.log("   ✓ USDC already approved");
  }

  // Step 2: Mint AXUSD
  console.log("\n─── STEP 2: MINTING AXUSD ───");
  console.log("Minting", MINT_AMOUNT_USDC, "AXUSD...");
  const mintTx = await psm.mint(amountIn);
  await mintTx.wait();
  console.log("   ✓ AXUSD minted!");
  console.log("   Tx:", mintTx.hash);

  // Step 3: Show final balances
  console.log("\n─── AFTER MINTING ───");
  const usdcBalanceAfter = await usdc.balanceOf(signer.address);
  const axusdBalanceAfter = await axusd.balanceOf(signer.address);
  const totalSupply = await axusd.totalSupply();

  console.log("USDC Balance:", ethers.formatUnits(usdcBalanceAfter, 6));
  console.log("AXUSD Balance:", ethers.formatEther(axusdBalanceAfter));
  console.log("AXUSD Received:", ethers.formatEther(axusdBalanceAfter - axusdBalanceBefore));
  console.log("\nTotal AXUSD Supply:", ethers.formatEther(totalSupply));

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  MINTING COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nNext steps:");
  console.log("1. Go to https://app.camelot.exchange/liquidity");
  console.log("2. Add AXUSD/USDC liquidity");
  console.log("3. Copy the LP pair address");
  console.log("4. Deploy MarketOperations");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Minting failed:", error);
    process.exit(1);
  });
