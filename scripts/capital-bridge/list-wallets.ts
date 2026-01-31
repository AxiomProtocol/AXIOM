import { ethers } from "ethers";

const keys = [
  { name: "ADMIN_PRIVATE_KEY", env: process.env.ADMIN_PRIVATE_KEY },
  { name: "DEPLOYER_PK", env: process.env.DEPLOYER_PK },
  { name: "PRIVATE_KEY", env: process.env.PRIVATE_KEY },
  { name: "Private_Key", env: process.env.Private_Key },
  { name: "PEAQ_PRIVATE_KEY", env: process.env.PEAQ_PRIVATE_KEY },
  { name: "DENET_NODE_KEY", env: process.env.DENET_NODE_KEY },
];

async function main() {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  console.log("Available Wallets for Role Assignment:\n");
  console.log("=" .repeat(80));
  
  const seen = new Set<string>();
  
  for (const key of keys) {
    if (!key.env) continue;
    try {
      const wallet = new ethers.Wallet(key.env, provider);
      if (seen.has(wallet.address.toLowerCase())) continue;
      seen.add(wallet.address.toLowerCase());
      
      const balance = await provider.getBalance(wallet.address);
      console.log(`${key.name}:`);
      console.log(`  Address: ${wallet.address}`);
      console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
      console.log("");
    } catch (e) {
      // Skip invalid keys
    }
  }
}

main().catch(console.error);
