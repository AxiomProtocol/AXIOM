/**
 * Mint AXM Tokens via Safe Multisig Wallet
 * 
 * This script proposes a mint transaction through the Safe wallet.
 * 
 * Usage: npx hardhat run scripts/mint-via-safe.js --network arbitrum
 */

const { ethers, network } = require("hardhat");
const Safe = require("@safe-global/protocol-kit").default;
const SafeApiKit = require("@safe-global/api-kit").default;

const SAFE_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
const AXM_TOKEN = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const MINT_AMOUNT = "80000000"; // 80 million AXM

const AXM_ABI = [
  "function mint(address to, uint256 amount) external",
  "function decimals() view returns (uint8)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("      AXM PRESALE MINTING VIA SAFE MULTISIG                ");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Your wallet:", signer.address);
  console.log("Safe wallet:", SAFE_ADDRESS);
  
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
    console.log("Add your wallet as an owner first, or use an owner wallet.");
    return;
  }

  // Create mint transaction data
  const axmToken = new ethers.Contract(AXM_TOKEN, AXM_ABI, signer);
  const decimals = await axmToken.decimals();
  const amountWei = ethers.parseUnits(MINT_AMOUNT, decimals);
  
  const mintData = axmToken.interface.encodeFunctionData("mint", [
    SAFE_ADDRESS, // Mint to Safe wallet
    amountWei
  ]);

  console.log("\n💰 MINT TRANSACTION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Amount:", MINT_AMOUNT, "AXM");
  console.log("Recipient: Safe wallet (", SAFE_ADDRESS, ")");

  // Create Safe transaction
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [{
      to: AXM_TOKEN,
      value: "0",
      data: mintData
    }]
  });

  if (threshold === 1) {
    // Single signer - can execute directly
    console.log("\n🚀 Executing transaction (threshold is 1)...");
    const txResponse = await protocolKit.executeTransaction(safeTransaction);
    const receipt = await txResponse.transactionResponse?.wait();
    console.log("✅ Transaction executed!");
    console.log("TX Hash:", receipt.hash);
  } else {
    // Multi-sig - need to propose
    console.log("\n📝 Proposing transaction (requires", threshold, "signatures)...");
    
    const apiKit = new SafeApiKit({
      chainId: 42161n // Arbitrum One
    });
    
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const signature = await protocolKit.signHash(safeTxHash);
    
    await apiKit.proposeTransaction({
      safeAddress: SAFE_ADDRESS,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: signer.address,
      senderSignature: signature.data
    });
    
    console.log("✅ Transaction proposed!");
    console.log("Safe TX Hash:", safeTxHash);
    console.log("\n📱 NEXT STEPS:");
    console.log("1. Go to https://app.safe.global");
    console.log("2. Connect your Safe wallet");
    console.log("3. Approve and execute the pending transaction");
  }
  
  console.log("\n═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
