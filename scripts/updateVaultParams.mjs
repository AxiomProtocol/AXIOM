import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const DSCR_POOL_VAULT = "0x5a09cb67518e6E28d8307D75174430939C044A7d";
const FIXFLIP_VAULT = "0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5";

const VAULT_ABI = [
  "function minDeposit() view returns (uint256)",
  "function maxDeposit() view returns (uint256)",
  "function withdrawalCooldown() view returns (uint256)",
  "function setParameters(uint256 _minDeposit, uint256 _maxDeposit, uint256 _cooldown) external",
  "function updateParameters(uint256 _minDeposit, uint256 _maxDeposit, uint256 _cooldown) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function asset() view returns (address)"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  
  console.log("Updating vault parameters with:", wallet.address);

  const vaults = [
    { name: "FixFlipVault", address: FIXFLIP_VAULT, setFunc: "updateParameters" },
    { name: "DSCRPoolVault", address: DSCR_POOL_VAULT, setFunc: "setParameters" }
  ];

  for (const vault of vaults) {
    console.log(`\n=== ${vault.name} ===`);
    const contract = new ethers.Contract(vault.address, VAULT_ABI, wallet);

    try {
      const assetAddr = await contract.asset();
      const assetContract = new ethers.Contract(assetAddr, ERC20_ABI, provider);
      const assetDecimals = await assetContract.decimals();
      const assetSymbol = await assetContract.symbol();
      console.log("Asset:", assetSymbol, "decimals:", assetDecimals);

      const currentMin = await contract.minDeposit();
      const currentMax = await contract.maxDeposit();
      const currentCooldown = await contract.withdrawalCooldown();

      console.log("Current minDeposit (raw):", currentMin.toString());
      console.log("Current maxDeposit (raw):", currentMax.toString());

      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const hasAdmin = await contract.hasRole(ADMIN_ROLE, wallet.address);
      console.log("Has ADMIN_ROLE:", hasAdmin);

      if (!hasAdmin) {
        console.log("⚠️  No admin role, skipping...");
        continue;
      }

      const newMinDeposit = ethers.parseUnits("100", assetDecimals);
      const newMaxDeposit = ethers.parseUnits("5000000", assetDecimals);
      
      console.log("\nUpdating to:");
      console.log("  minDeposit:", newMinDeposit.toString(), `($100 ${assetSymbol})`);
      console.log("  maxDeposit:", newMaxDeposit.toString(), `($5M ${assetSymbol})`);
      console.log("  cooldown:", currentCooldown.toString());

      let tx;
      if (vault.setFunc === "updateParameters") {
        tx = await contract.updateParameters(newMinDeposit, newMaxDeposit, currentCooldown);
      } else {
        tx = await contract.setParameters(newMinDeposit, newMaxDeposit, currentCooldown);
      }
      
      console.log("\nTransaction hash:", tx.hash);
      console.log("View: https://arbitrum.blockscout.com/tx/" + tx.hash);

      const receipt = await tx.wait();
      console.log("Confirmed in block:", receipt.blockNumber);

      const updatedMin = await contract.minDeposit();
      console.log("✅ Updated minDeposit:", updatedMin.toString());
    } catch (error) {
      console.log("Error:", error.message);
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
