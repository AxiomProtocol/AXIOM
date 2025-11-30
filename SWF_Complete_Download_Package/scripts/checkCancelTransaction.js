require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Transaction hash to check
    const transactionHash = "0x3496f50bbd127173a0e5e1ef5dd3432fcd02e6b92f0b8e1a6bd696d7fd989720";
    
    // Connect to Polygon network
    console.log("Connecting to Polygon network...");
    const alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Check transaction status
    console.log(`Checking cancel transaction: ${transactionHash}`);
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
      
      // If the transaction succeeded, check if we can now mint tokens
      if (receipt.status) {
        console.log("\nCancel transaction successful. You can now try minting tokens again.");
        console.log("Run: npx hardhat run scripts/mintTokens.js --network polygon");
      }
    } else {
      console.log("\nTransaction Status: Pending (not yet mined)");
      console.log("The transaction is still waiting to be included in a block.");
      
      // Also check the original pending transaction
      const pendingTxHash = "0x97034a942471648ad9f2448a22ba14b3d8574614e4098be68829836c13938c3a";
      const pendingTx = await provider.getTransaction(pendingTxHash);
      
      if (pendingTx && !pendingTx.blockNumber) {
        console.log(`\nOriginal transaction ${pendingTxHash} is still pending.`);
        console.log("Both transactions are competing. The one with higher gas price will be processed.");
      } else if (pendingTx && pendingTx.blockNumber) {
        console.log(`\nOriginal transaction ${pendingTxHash} has been mined in block ${pendingTx.blockNumber}.`);
        console.log("This means your cancellation was too late. Check if the original transaction succeeded.");
      } else {
        console.log(`\nOriginal transaction ${pendingTxHash} not found.`);
      }
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