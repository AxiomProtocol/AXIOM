// Script to check deployment status and contract information on Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");
const axios = require("axios");

// Define our transaction hashes to check
const TX_HASHES = [
  // Polygon mainnet deployment hash
  "0x0ac75e83b1ddb5261c96d6bf73deded44fe069b96bfec13a0a34ea1c84fcbf73",
  // Other transaction hashes
  "0xdffb6f9d50969ff342c1db8e33c2a51c1a6becf951c0c6270eadbe660fd9793c",
  "0x2bf937ff30b959d3efa5b2f48e7defb594753b29b5a16612ab613b2769db6a06",
  "0x2cbc8be1eb64a1312b730182687d41b9c4cabfec8ec1e0c92728ee903de4ab02",
  "0x979b26e4ff13567a1cc367a0793e1ab5b41cb43660ddb50fca51cb8818abcf5e",
  "0x04f99ec9814ada590d91696773eb4396d9726f4d621e3323da943639b8829ab1",
  "0x639d9552fea4331f8d10e1a07d79997d4818b0525dbdc9c33248dbfcc3a8a1bf"
  // Add any new transaction hashes here
];

// Treasury wallet address
const TREASURY_ADDRESS = "0x26A8401287cE33CC4aeb5a106cd6D282a92Cf51d";

async function main() {
  try {
    console.log("Checking deployment status on Polygon mainnet...");
    console.log("Treasury address:", TREASURY_ADDRESS);
    
    // Check account balance
    const provider = ethers.provider;
    const balance = await provider.getBalance(TREASURY_ADDRESS);
    console.log("Current balance:", ethers.utils.formatEther(balance), "MATIC");
    
    console.log("\nChecking transaction status:");
    
    // Check each transaction
    for (const txHash of TX_HASHES) {
      console.log(`\n${txHash}:`);
      
      // Get transaction receipt from provider
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (receipt) {
        console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        
        if (receipt.contractAddress) {
          console.log("Contract address:", receipt.contractAddress);
          
          // If we have a contract address, try to interact with it
          try {
            // Try with the minimal contract first, then fall back to full contract
            let contract;
            let contractType = "Unknown";
            
            try {
              contract = await ethers.getContractAt("SovranWealthFundMinimal", receipt.contractAddress);
              contractType = "SovranWealthFundMinimal";
            } catch (e) {
              try {
                contract = await ethers.getContractAt("SovranWealthFund", receipt.contractAddress);
                contractType = "SovranWealthFund";
              } catch (e2) {
                throw new Error("Could not connect to either contract type");
              }
            }
            
            console.log("Contract type:", contractType);
            const name = await contract.name();
            const symbol = await contract.symbol();
            const totalSupply = await contract.totalSupply();
            const owner = await contract.owner();
            
            console.log("\nContract details:");
            console.log("Name:", name);
            console.log("Symbol:", symbol);
            console.log("Total supply:", ethers.utils.formatEther(totalSupply));
            console.log("Owner:", owner);
            console.log("Contract verification link:");
            console.log(`https://polygonscan.com/address/${receipt.contractAddress}#code`);
            
            // Write deployment info to file
            const fs = require("fs");
            const deploymentInfo = {
              network: "Polygon Mainnet",
              contractAddress: receipt.contractAddress,
              txHash: txHash,
              name: name,
              symbol: symbol,
              owner: owner,
              deployedBy: TREASURY_ADDRESS
            };
            
            fs.writeFileSync(
              "polygon-mainnet-deployment.json", 
              JSON.stringify(deploymentInfo, null, 2)
            );
            
            console.log("\nDeployment information saved to polygon-mainnet-deployment.json");
          } catch (error) {
            console.log("Could not interact with contract:", error.message);
          }
        } else {
          console.log("No contract was created in this transaction");
        }
      } else {
        console.log("Status: PENDING (not confirmed yet)");
        
        // Try to check status from explorer API
        try {
          const response = await axios.get(`https://api.polygonscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=YourApiKey`);
          if (response.data?.status === "1") {
            console.log("Polygonscan API status:", response.data?.result?.status || "Pending");
          } else {
            console.log("Could not get status from Polygonscan API");
          }
        } catch (error) {
          console.log("Error checking Polygonscan:", error.message);
        }
      }
    }
    
    console.log("\nVerification complete");
    
  } catch (error) {
    console.error("Error checking deployment:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });