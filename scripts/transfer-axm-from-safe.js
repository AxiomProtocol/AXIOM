/**
 * Transfer AXM Tokens from Safe Wallet
 * 
 * Usage: RECIPIENT_ADDRESS=0x... npx hardhat run scripts/transfer-axm-from-safe.js --network arbitrum
 */

const { ethers, network } = require("hardhat");
const Safe = require("@safe-global/protocol-kit").default;

const SAFE_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
const AXM_TOKEN = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const RECIPIENT = process.env.RECIPIENT_ADDRESS || "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";
const TRANSFER_AMOUNT = process.env.TRANSFER_AMOUNT || "80000000";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("      TRANSFER AXM FROM SAFE WALLET                        ");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Your wallet:", signer.address);
  console.log("Safe wallet:", SAFE_ADDRESS);
  console.log("Recipient:", RECIPIENT);
  console.log("Amount:", TRANSFER_AMOUNT, "AXM");

  // Initialize Safe Protocol Kit
  const protocolKit = await Safe.init({
    provider: network.config.url,
    signer: process.env.DEPLOYER_PK,
    safeAddress: SAFE_ADDRESS
  });

  // Get Safe info
  const owners = await protocolKit.getOwners();
  const threshold = await protocolKit.getThreshold();
  
  console.log("\n📋 SAFE CONFIGURATION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Owners:", owners.length);
  owners.forEach((o, i) => console.log(`  ${i+1}. ${o}`));
  console.log("Threshold:", threshold, "of", owners.length);
  
  const isOwner = owners.map(o => o.toLowerCase()).includes(signer.address.toLowerCase());
  console.log("You are owner:", isOwner ? "✅ Yes" : "❌ No");
  
  if (!isOwner) {
    console.error("\n❌ ERROR: Your wallet is not an owner of this Safe.");
    return;
  }

  // Check current AXM balance
  const axmToken = new ethers.Contract(AXM_TOKEN, ERC20_ABI, signer);
  const decimals = await axmToken.decimals();
  const currentBalance = await axmToken.balanceOf(SAFE_ADDRESS);
  const amountWei = ethers.parseUnits(TRANSFER_AMOUNT, decimals);
  
  console.log("Current Safe AXM balance:", ethers.formatUnits(currentBalance, decimals), "AXM");
  
  if (currentBalance < amountWei) {
    console.error("\n❌ ERROR: Insufficient AXM balance in Safe");
    console.log("Requested:", TRANSFER_AMOUNT, "AXM");
    console.log("Available:", ethers.formatUnits(currentBalance, decimals), "AXM");
    return;
  }

  // Create transfer transaction data
  const transferData = axmToken.interface.encodeFunctionData("transfer", [
    RECIPIENT,
    amountWei
  ]);

  console.log("\n💸 TRANSFER TRANSACTION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("From: Safe (", SAFE_ADDRESS, ")");
  console.log("To:", RECIPIENT);
  console.log("Amount:", TRANSFER_AMOUNT, "AXM");

  // Create Safe transaction
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{
      to: AXM_TOKEN,
      value: "0",
      data: transferData
    }]
  });

  if (threshold === 1) {
    console.log("\n🚀 Executing transfer (threshold is 1)...");
    const txResponse = await protocolKit.executeTransaction(safeTransaction);
    const receipt = await txResponse.transactionResponse?.wait();
    console.log("✅ Transfer executed!");
    console.log("TX Hash:", receipt?.hash);
  } else {
    console.log("\n❌ Multi-sig required. Please use Safe app to execute.");
    return;
  }

  // Verify final balances
  const newSafeBalance = await axmToken.balanceOf(SAFE_ADDRESS);
  const recipientBalance = await axmToken.balanceOf(RECIPIENT);
  
  console.log("\n📊 FINAL BALANCES:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Safe AXM balance:", ethers.formatUnits(newSafeBalance, decimals), "AXM");
  console.log("Recipient AXM balance:", ethers.formatUnits(recipientBalance, decimals), "AXM");
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ Transfer complete! You can now create the DxSale presale.");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
