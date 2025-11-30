require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // The wallet address to receive tokens
    const recipientAddress = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
    
    // Amount to mint (in token units, not wei)
    const amountToMint = "500000"; // 500,000 tokens
    
    // SWF Token contract address from mainnet-contract-info.json
    const swfTokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
    
    // Connect to network using the private key from .env
    console.log("Connecting to Polygon network...");
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Connected with wallet: ${wallet.address}`);
    
    // Get the contract ABI - we'll use a minimal ABI for minting
    const tokenAbi = [
      "function mint(address to, uint256 amount) external",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint256)",
      "function hasRole(bytes32 role, address account) view returns (bool)",
      "function MINTER_ROLE() view returns (bytes32)"
    ];
    
    // Create contract instance
    const tokenContract = new ethers.Contract(swfTokenAddress, tokenAbi, wallet);
    
    // Get token info
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    console.log(`Token: ${name} (${symbol})`);
    console.log(`Decimals: ${decimals}`);
    
    // Check if wallet has minter role
    const minterRole = await tokenContract.MINTER_ROLE();
    const hasMinterRole = await tokenContract.hasRole(minterRole, wallet.address);
    
    if (!hasMinterRole) {
      console.error(`ERROR: The wallet ${wallet.address} does not have the MINTER_ROLE. Cannot mint tokens.`);
      console.log("Please use the wallet that deployed the contract or has been granted the minter role.");
      return;
    }
    
    // Convert token amount to wei (considering decimals)
    const amountInWei = ethers.utils.parseUnits(amountToMint, decimals);
    
    console.log(`\nMinting ${amountToMint} ${symbol} tokens to: ${recipientAddress}`);
    console.log(`Amount in wei: ${amountInWei.toString()}`);
    
    // Mint tokens
    console.log("\nSending mint transaction...");
    const tx = await tokenContract.mint(recipientAddress, amountInWei);
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction to be mined...");
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    console.log(`\nTransaction confirmed with ${receipt.confirmations} confirmations!`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new balance
    const newBalance = await tokenContract.balanceOf(recipientAddress);
    console.log(`\nNew balance of ${recipientAddress}: ${ethers.utils.formatUnits(newBalance, decimals)} ${symbol}`);
    
    console.log("\nMinting completed successfully!");
    
  } catch (error) {
    console.error("Error minting tokens:", error);
    
    // Provide more helpful error messages
    if (error.message.includes("execution reverted")) {
      console.log("\nPossible reasons for failure:");
      console.log("1. The wallet does not have the MINTER_ROLE");
      console.log("2. The contract might have a pause mechanism that is active");
      console.log("3. There might be restrictions on minting (caps, timing, etc.)");
    }
    
    if (error.message.includes("insufficient funds")) {
      console.log("\nYour wallet doesn't have enough MATIC to pay for gas.");
      console.log("Please fund your wallet with MATIC and try again.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });