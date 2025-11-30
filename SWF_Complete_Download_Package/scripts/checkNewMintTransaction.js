require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Transaction hash to check
    const transactionHash = "0xba8907244039a417232ef0da7f5de49d3b7623948aa8b23c0cf36ecdd76f8778";
    
    // Connect to Polygon network
    console.log("Connecting to Polygon network...");
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Check transaction status
    console.log(`Checking mint transaction: ${transactionHash}`);
    const transaction = await provider.getTransaction(transactionHash);
    
    if (!transaction) {
      console.log("Transaction not found. It may be incorrect or not yet indexed.");
      return;
    }
    
    console.log(`Transaction details:`);
    console.log(`From: ${transaction.from}`);
    console.log(`To: ${transaction.to}`);
    console.log(`Value: ${transaction.value ? ethers.utils.formatEther(transaction.value) : '0'} MATIC`);
    console.log(`Gas limit: ${transaction.gasLimit.toString()}`);
    console.log(`Gas price: ${transaction.gasPrice ? ethers.utils.formatUnits(transaction.gasPrice, "gwei") : 'unknown'} gwei`);
    console.log(`Nonce: ${transaction.nonce}`);
    
    // Check if the transaction was mined
    if (transaction.blockNumber) {
      console.log(`\nTransaction Status: Mined in block ${transaction.blockNumber}`);
      
      // Get receipt for more details
      const receipt = await provider.getTransactionReceipt(transactionHash);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`Status: ${receipt.status ? "Success ✅" : "Failed ❌"}`);
      
      // Check for token transfer event
      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`\nTransaction generated ${receipt.logs.length} event logs.`);
        console.log("This suggests tokens were transferred successfully.");
      }
      
      // Check recipient balance
      const recipientAddress = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
      const tokenAddress = "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
      
      const tokenAbi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)"
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(recipientAddress);
      
      console.log(`\nRecipient (${recipientAddress}) balance: ${ethers.utils.formatUnits(balance, decimals)} SWF`);
      
      if (receipt.status && balance.gt(0)) {
        console.log("\n🎉 TOKENS MINTED SUCCESSFULLY! 🎉");
        console.log("The transaction was successful and tokens have been minted to the recipient's wallet.");
      }
    } else {
      console.log("\nTransaction Status: Pending (not yet mined)");
      console.log("The transaction is still waiting to be included in a block.");
    }
    
  } catch (error) {
    console.error("Error checking transaction:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });