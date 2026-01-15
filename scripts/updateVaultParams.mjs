import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const DSCR_POOL_VAULT = "0x5a09cb67518e6E28d8307D75174430939C044A7d";

const VAULT_ABI = [
  "function minDeposit() view returns (uint256)",
  "function maxDeposit() view returns (uint256)",
  "function withdrawalCooldown() view returns (uint256)",
  "function setParameters(uint256 _minDeposit, uint256 _maxDeposit, uint256 _cooldown) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  
  console.log("Updating DSCRPoolVault parameters with:", wallet.address);

  const contract = new ethers.Contract(DSCR_POOL_VAULT, VAULT_ABI, wallet);

  const currentMin = await contract.minDeposit();
  const currentMax = await contract.maxDeposit();
  const currentCooldown = await contract.withdrawalCooldown();

  console.log("\nCurrent parameters:");
  console.log("  minDeposit:", ethers.formatUnits(currentMin, 18), "USD");
  console.log("  maxDeposit:", ethers.formatUnits(currentMax, 18), "USD");
  console.log("  withdrawalCooldown:", currentCooldown.toString(), "seconds (" + (Number(currentCooldown) / 86400) + " days)");

  const ADMIN_ROLE = await contract.ADMIN_ROLE();
  const hasAdmin = await contract.hasRole(ADMIN_ROLE, wallet.address);
  console.log("\nHas ADMIN_ROLE:", hasAdmin);

  if (!hasAdmin) {
    console.log("ERROR: No admin role");
    return;
  }

  const newMinDeposit = ethers.parseUnits("100", 18);
  
  console.log("\nUpdating parameters:");
  console.log("  New minDeposit: $100");
  console.log("  maxDeposit (unchanged):", ethers.formatUnits(currentMax, 18));
  console.log("  cooldown (unchanged):", currentCooldown.toString());

  const tx = await contract.setParameters(newMinDeposit, currentMax, currentCooldown);
  console.log("\nTransaction hash:", tx.hash);
  console.log("View on Blockscout: https://arbitrum.blockscout.com/tx/" + tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  const updatedMin = await contract.minDeposit();
  console.log("\n✅ Updated minDeposit:", ethers.formatUnits(updatedMin, 18), "USD");
}

main().catch(console.error);
