const { ethers } = require("ethers");
require("dotenv").config();

const SAFE_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
const AXM_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const RECIPIENT = process.env.RECIPIENT_ADDRESS || SAFE_ADDRESS;
const AMOUNT = process.env.TRANSFER_AMOUNT || "80000000";

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool)"
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("      TRANSFER AXM FROM SAFE WALLET                        ");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  console.log("Your wallet:", wallet.address);
  console.log("Safe wallet:", SAFE_ADDRESS);
  console.log("Recipient:", RECIPIENT);
  console.log("Amount:", AMOUNT, "AXM\n");

  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, wallet);
  const axm = new ethers.Contract(AXM_ADDRESS, ERC20_ABI, provider);

  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  const currentBalance = await axm.balanceOf(SAFE_ADDRESS);
  
  console.log("📋 SAFE CONFIGURATION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Owners:", owners.length);
  owners.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
  console.log("Threshold:", threshold.toString(), "of", owners.length);
  console.log("Current AXM balance:", ethers.formatUnits(currentBalance, 18), "AXM");
  
  const isOwner = owners.map(o => o.toLowerCase()).includes(wallet.address.toLowerCase());
  console.log("You are owner:", isOwner ? "✅ Yes" : "❌ No");
  
  if (!isOwner) {
    console.log("\n❌ ERROR: Your wallet is not an owner of this Safe");
    return;
  }

  const amountWei = ethers.parseUnits(AMOUNT, 18);
  
  if (currentBalance < amountWei) {
    console.log("\n❌ ERROR: Insufficient AXM balance in Safe");
    console.log("Requested:", AMOUNT, "AXM");
    console.log("Available:", ethers.formatUnits(currentBalance, 18), "AXM");
    return;
  }

  console.log("\n💸 TRANSFER TRANSACTION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("From: Safe (", SAFE_ADDRESS, ")");
  console.log("To:", RECIPIENT);
  console.log("Amount:", AMOUNT, "AXM");

  const transferData = axm.interface.encodeFunctionData("transfer", [RECIPIENT, amountWei]);

  const nonce = await safe.nonce();
  
  const signature = ethers.solidityPacked(
    ["address", "bytes32", "uint8"],
    [
      wallet.address,
      ethers.zeroPadValue("0x00", 32),
      1
    ]
  );

  console.log("\n🚀 Executing transfer...");
  
  const tx = await safe.execTransaction(
    AXM_ADDRESS,
    0,
    transferData,
    0,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    signature,
    { gasLimit: 500000 }
  );
  
  console.log("TX Hash:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ Transfer confirmed! Block:", receipt.blockNumber);

  const newBalance = await axm.balanceOf(SAFE_ADDRESS);
  const recipientBalance = await axm.balanceOf(RECIPIENT);
  
  console.log("\n📊 FINAL BALANCES:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Safe AXM balance:", ethers.formatUnits(newBalance, 18), "AXM");
  console.log("Recipient AXM balance:", ethers.formatUnits(recipientBalance, 18), "AXM");
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ Transfer complete! You can now create the DxSale presale.");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
