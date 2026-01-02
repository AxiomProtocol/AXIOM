/**
 * Mint AXM Tokens for DxSale Presale
 * 
 * This script mints 50,000,000 AXM tokens for the presale allocation
 * 
 * Run with: npx hardhat run scripts/mint-presale-allocation.js --network arbitrum
 * 
 * Requirements:
 * - DEPLOYER_PK environment variable set (admin wallet)
 * - Some ETH for gas on Arbitrum (~0.001-0.002 ETH)
 * 
 * After running this script:
 * 1. Go to https://dx.app and connect your wallet
 * 2. Switch to Arbitrum One network
 * 3. Create presale with the AXM token address
 * 4. Approve DxSale to spend your AXM tokens
 */

const { ethers } = require("hardhat");

const AXM_TOKEN_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";

const AXM_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function feeConfig() view returns (uint16 transferFeeBps, uint16 burnFeeBps, uint16 stakingFeeBps, uint16 liquidityFeeBps, uint16 dividendFeeBps, uint16 treasuryFeeBps)",
  "function maxTxEnabled() view returns (bool)",
  "function setFeeExempt(address account, bool exempt) external",
  "function setTxLimitExempt(address account, bool exempt) external"
];

// Total needed: 50M presale + 24M liquidity (60% of 50 ETH * 800K listing rate) = 74M
// Adding buffer for safety: 80M AXM
const PRESALE_AMOUNT = "80000000"; // 80 million AXM (presale + liquidity + buffer)

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("          AXM PRESALE ALLOCATION MINTING SCRIPT            ");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Wallet:", signer.address);
  
  const axmToken = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, signer);
  
  // Get token info
  const symbol = await axmToken.symbol();
  const decimals = await axmToken.decimals();
  const maxSupply = await axmToken.MAX_SUPPLY();
  const currentSupply = await axmToken.totalSupply();
  const currentBalance = await axmToken.balanceOf(signer.address);
  
  console.log("\n📊 TOKEN STATUS:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Max Supply: ${ethers.formatUnits(maxSupply, decimals)} ${symbol}`);
  console.log(`Current Supply: ${ethers.formatUnits(currentSupply, decimals)} ${symbol}`);
  console.log(`Your Balance: ${ethers.formatUnits(currentBalance, decimals)} ${symbol}`);
  
  // Check fee config
  const feeConfig = await axmToken.feeConfig();
  const maxTxEnabled = await axmToken.maxTxEnabled();
  
  console.log("\n⚙️  PRESALE COMPATIBILITY CHECK:");
  console.log("─────────────────────────────────────────────────────────────");
  const transferFeePct = Number(feeConfig.transferFeeBps) / 100;
  console.log(`Transfer Fee: ${transferFeePct}% ${feeConfig.transferFeeBps === 0n ? '✅' : '⚠️ Consider disabling for presale'}`);
  console.log(`Max TX Enabled: ${maxTxEnabled} ${!maxTxEnabled ? '✅' : '⚠️ Consider disabling for presale'}`);
  
  // Check roles
  const MINTER_ROLE = await axmToken.MINTER_ROLE();
  const DEFAULT_ADMIN_ROLE = await axmToken.DEFAULT_ADMIN_ROLE();
  const hasAdmin = await axmToken.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  let hasMinter = await axmToken.hasRole(MINTER_ROLE, signer.address);
  
  console.log("\n🔐 ROLE CHECK:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Has DEFAULT_ADMIN_ROLE: ${hasAdmin} ${hasAdmin ? '✅' : '❌'}`);
  console.log(`Has MINTER_ROLE: ${hasMinter} ${hasMinter ? '✅' : '⚠️ Will grant'}`);
  
  if (!hasAdmin) {
    console.error("\n❌ ERROR: You don't have admin role. Cannot proceed.");
    console.log("Make sure you're using the deployer wallet (0xDFf9e47eb007bF02e47477d577De9ffA99791528)");
    return;
  }
  
  // Grant minter role if needed
  if (!hasMinter) {
    console.log("\n🔑 Granting MINTER_ROLE to your wallet...");
    const grantTx = await axmToken.grantRole(MINTER_ROLE, signer.address);
    console.log("TX:", grantTx.hash);
    await grantTx.wait();
    console.log("✅ MINTER_ROLE granted!");
    hasMinter = true;
  }
  
  // Calculate mint amount
  const amountToMint = ethers.parseUnits(PRESALE_AMOUNT, decimals);
  const newSupply = currentSupply + amountToMint;
  
  console.log("\n💰 MINTING PRESALE ALLOCATION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Amount to Mint: ${PRESALE_AMOUNT} ${symbol}`);
  console.log(`New Total Supply: ${ethers.formatUnits(newSupply, decimals)} ${symbol}`);
  console.log(`Supply Usage: ${((Number(newSupply) / Number(maxSupply)) * 100).toFixed(4)}%`);
  
  // Check if mint would exceed max supply
  if (newSupply > maxSupply) {
    console.error("\n❌ ERROR: Minting would exceed max supply!");
    console.log(`Remaining mintable: ${ethers.formatUnits(maxSupply - currentSupply, decimals)} ${symbol}`);
    return;
  }
  
  console.log("\n🚀 Minting tokens...");
  const mintTx = await axmToken.mint(signer.address, amountToMint);
  console.log("TX:", mintTx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await mintTx.wait();
  console.log(`✅ Minted successfully in block ${receipt.blockNumber}!`);
  
  // Verify new balance
  const newBalance = await axmToken.balanceOf(signer.address);
  const newTotalSupply = await axmToken.totalSupply();
  
  console.log("\n📈 POST-MINT STATUS:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Your New Balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
  console.log(`New Total Supply: ${ethers.formatUnits(newTotalSupply, decimals)} ${symbol}`);
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    NEXT STEPS                              ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("1. Go to https://dx.app");
  console.log("2. Connect your wallet (Arbitrum One network)");
  console.log("3. Click 'Create' → 'Create Your IDO' → 'Standard Presale'");
  console.log("4. Enter AXM token address:", AXM_TOKEN_ADDRESS);
  console.log("5. Configure presale parameters:");
  console.log("   - Presale Rate: 1,000,000 AXM per ETH");
  console.log("   - Listing Rate: 800,000 AXM per ETH");
  console.log("   - Soft Cap: 25 ETH");
  console.log("   - Hard Cap: 50 ETH");
  console.log("   - Liquidity: 60%");
  console.log("   - Lock: 12 months");
  console.log("6. Approve DxSale to spend your AXM tokens (80M)");
  console.log("7. Start the presale!");
  console.log("");
  console.log("TOKEN ALLOCATION BREAKDOWN:");
  console.log("   - Presale (50 ETH × 1M): 50,000,000 AXM");
  console.log("   - Liquidity (60% × 50 ETH × 800K): ~24,000,000 AXM");
  console.log("   - Buffer: ~6,000,000 AXM");
  console.log("   - Total minted: 80,000,000 AXM");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
