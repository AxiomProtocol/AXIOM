// Script to test staking and dynamic APR
require("dotenv").config();
const { ethers, network } = require("hardhat");

async function main() {
  try {
    // Get the account that will interact with the contracts
    const [signer] = await ethers.getSigners();
    
    console.log("Testing staking and dynamic APR with account:", signer.address);
    console.log("Account balance:", ethers.utils.formatEther(await signer.getBalance()), "MATIC");
    console.log("Network:", network.name);

    // Get contract addresses from .env file
    const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
    const stakingAddress = process.env.SOLO_METHOD_ENGINE_ADDRESS;
    const vaultAddress = process.env.SWF_BASKET_VAULT_ADDRESS;
    const aprControllerAddress = process.env.DYNAMIC_APR_CONTROLLER_ADDRESS;
    
    if (!swfTokenAddress || !stakingAddress || !vaultAddress || !aprControllerAddress) {
      throw new Error("Missing contract addresses in .env file");
    }
    
    console.log("SWF Token:", swfTokenAddress);
    console.log("SoloMethodEngine:", stakingAddress);
    console.log("SWFBasketVault:", vaultAddress);
    console.log("DynamicAPRController:", aprControllerAddress);
    
    // Connect to the contracts
    const swfToken = await ethers.getContractAt("IERC20", swfTokenAddress);
    const stakingEngine = await ethers.getContractAt("SoloMethodEngine", stakingAddress);
    const aprController = await ethers.getContractAt("DynamicAPRController", aprControllerAddress);
    
    // Check SWF token balance
    const tokenBalance = await swfToken.balanceOf(signer.address);
    console.log("\nSWF token balance:", ethers.utils.formatEther(tokenBalance));
    
    // Check if there's enough balance for testing
    if (tokenBalance.eq(0)) {
      console.log("No SWF tokens available for testing. Please acquire some tokens first.");
      return;
    }
    
    // Get current staking information
    const totalStaked = await stakingEngine.totalStaked();
    const userStaked = await stakingEngine.staked(signer.address);
    const currentAPR = await stakingEngine.aprBasisPoints();
    
    console.log("\n=== CURRENT STAKING INFO ===");
    console.log("Total tokens staked:", ethers.utils.formatEther(totalStaked));
    console.log("Your staked amount:", ethers.utils.formatEther(userStaked));
    console.log("Current APR:", currentAPR.toNumber() / 100, "%");
    
    // Get APR controller info
    const aprInfo = await aprController.getAPRInfo();
    console.log("\n=== DYNAMIC APR INFO ===");
    console.log("Current APR from controller:", aprInfo[0].toNumber() / 100, "%");
    console.log("Next adjustment time:", new Date(aprInfo[1].toNumber() * 1000).toISOString());
    console.log("Total deposited in vault:", ethers.utils.formatEther(aprInfo[2]));
    
    // Determine stake amount (1% of balance or 50 tokens, whichever is greater)
    const minimumStake = ethers.utils.parseEther("50"); // minimum 50 tokens
    const stakeAmount = tokenBalance.div(100).gt(minimumStake) 
      ? tokenBalance.div(100) 
      : minimumStake.lt(tokenBalance) ? minimumStake : tokenBalance;
    
    console.log(`\nPreparing to stake ${ethers.utils.formatEther(stakeAmount)} SWF tokens...`);
    
    // Approve the staking contract to spend tokens
    console.log("Approving staking contract to spend tokens...");
    const approveTx = await swfToken.approve(stakingAddress, stakeAmount);
    console.log("Waiting for approval transaction to be mined...");
    await approveTx.wait();
    console.log("Approval successful! Transaction hash:", approveTx.hash);
    
    // Stake tokens
    console.log("\nStaking tokens...");
    const stakeTx = await stakingEngine.stake(stakeAmount);
    console.log("Waiting for stake transaction to be mined...");
    await stakeTx.wait();
    console.log("Staking successful! Transaction hash:", stakeTx.hash);
    
    // Check updated staking information
    const newTotalStaked = await stakingEngine.totalStaked();
    const newUserStaked = await stakingEngine.staked(signer.address);
    const newTokenBalance = await swfToken.balanceOf(signer.address);
    
    console.log("\n=== UPDATED STAKING INFO ===");
    console.log("Total tokens staked:", ethers.utils.formatEther(newTotalStaked));
    console.log("Your staked amount:", ethers.utils.formatEther(newUserStaked));
    console.log("Remaining token balance:", ethers.utils.formatEther(newTokenBalance));
    
    // Calculate rewards (after a short waiting period)
    console.log("\nWaiting 10 seconds to accrue some rewards...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const pendingRewards = await stakingEngine.earned(signer.address);
    console.log("Pending rewards after 10 seconds:", ethers.utils.formatEther(pendingRewards));
    
    // Simulate how APR would change with different deposit levels
    console.log("\n=== DYNAMIC APR SIMULATION ===");
    const depositScenarios = [
      ethers.utils.parseEther("5000"),    // 5,000 tokens
      ethers.utils.parseEther("20000"),   // 20,000 tokens
      ethers.utils.parseEther("50000"),   // 50,000 tokens
      ethers.utils.parseEther("100000"),  // 100,000 tokens
      ethers.utils.parseEther("200000")   // 200,000 tokens
    ];
    
    for (const depositAmount of depositScenarios) {
      const simulatedAPR = await aprController.simulateAPRForDeposit(depositAmount);
      console.log(`With ${ethers.utils.formatEther(depositAmount)} tokens deposited: APR = ${simulatedAPR.toNumber() / 100}%`);
    }
    
    console.log("\nStaking and dynamic APR test completed successfully!");
    
  } catch (error) {
    console.error("Error during staking test:", error);
    process.exitCode = 1;
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during test:", error);
    process.exit(1);
  });