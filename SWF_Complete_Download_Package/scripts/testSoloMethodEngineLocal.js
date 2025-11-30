// scripts/testSoloMethodEngineLocal.js
// Test SoloMethodEngine contract on local Hardhat network

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  try {
    // Get signers
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing with accounts:");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`User1: ${user1.address}`);
    console.log(`User2: ${user2.address}`);
    console.log("");
    
    // Deploy the SWF token contract
    console.log("Deploying SovranWealthFund token...");
    const SovranWealthFund = await hre.ethers.getContractFactory("contracts/SovranWealthEngine.sol:SovranWealthFund");
    // Use the deployer as both mainDistributor and treasury for testing
    const swf = await SovranWealthFund.deploy(deployer.address, deployer.address);
    await swf.deployed();
    console.log(`SWF token deployed to: ${swf.address}`);
    
    // Deploy the SoloMethodEngine contract
    console.log("\nDeploying SoloMethodEngine...");
    const SoloMethodEngine = await hre.ethers.getContractFactory("contracts/SovranWealthEngine.sol:SoloMethodEngine");
    const engine = await SoloMethodEngine.deploy(swf.address);
    await engine.deployed();
    console.log(`SoloMethodEngine deployed to: ${engine.address}`);
    
    // Grant minter role to the engine contract
    console.log("\nGranting MINTER_ROLE to SoloMethodEngine...");
    const MINTER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    await swf.grantRole(MINTER_ROLE, engine.address);
    console.log("✅ Minter role granted");
    
    // Mint tokens to the test accounts
    console.log("\nMinting tokens to test accounts...");
    const mintAmount = hre.ethers.utils.parseEther("1000");
    await swf.mint(user1.address, mintAmount);
    await swf.mint(user2.address, mintAmount);
    console.log(`✅ Minted 1000 SWF to ${user1.address}`);
    console.log(`✅ Minted 1000 SWF to ${user2.address}`);
    
    // Check balances
    const user1Balance = await swf.balanceOf(user1.address);
    const user2Balance = await swf.balanceOf(user2.address);
    console.log(`User1 balance: ${hre.ethers.utils.formatEther(user1Balance)} SWF`);
    console.log(`User2 balance: ${hre.ethers.utils.formatEther(user2Balance)} SWF`);
    
    // Approve and stake tokens
    console.log("\nUser1 approving tokens for staking...");
    const stakeAmount = hre.ethers.utils.parseEther("100");
    await swf.connect(user1).approve(engine.address, stakeAmount);
    console.log("✅ Approved 100 SWF for staking");
    
    console.log("\nUser1 staking tokens...");
    await engine.connect(user1).deposit(stakeAmount);
    console.log("✅ Staked 100 SWF");
    
    // Get staking information
    const stakedAmount = await engine.getTotalStaked(user1.address);
    console.log(`Staked amount: ${hre.ethers.utils.formatEther(stakedAmount)} SWF`);
    
    // Get wallet breakdown
    console.log("\nChecking wallet breakdown...");
    const wallets = await engine.getWalletBreakdown(user1.address);
    
    const WALLET_ROLES = ["BUYER", "HOLDER", "STAKER", "LIQUIDITY", "TRACKER"];
    console.log("ID  | Role      | Balance");
    console.log("----|-----------|-------------");
    
    wallets.forEach((wallet, index) => {
      const roleName = WALLET_ROLES[wallet.role];
      console.log(
        `${index.toString().padEnd(4)} | ${roleName.padEnd(10)} | ${hre.ethers.utils.formatEther(wallet.balance)} SWF`
      );
    });
    
    // Check current APR
    const currentAPR = await engine.getCurrentAPR();
    console.log(`\nCurrent APR: ${currentAPR.toNumber() / 100}% (${currentAPR} basis points)`);
    
    // Simulate time passing (for rewards)
    console.log("\nSimulating 30 days passing...");
    // Increase time by 30 days (in seconds)
    await hre.network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    console.log("⏱️ Time advanced by 30 days");
    
    // Check pending rewards
    const pendingRewards = await engine.getPendingRewards(user1.address);
    console.log(`Pending rewards: ${hre.ethers.utils.formatEther(pendingRewards)} SWF`);
    
    // Claim rewards
    if (pendingRewards.gt(0)) {
      console.log("\nClaiming rewards...");
      await engine.connect(user1).claimRewards();
      console.log(`✅ Claimed ${hre.ethers.utils.formatEther(pendingRewards)} SWF rewards`);
      
      // Check user balance after claiming
      const newBalance = await swf.balanceOf(user1.address);
      console.log(`User1 new balance: ${hre.ethers.utils.formatEther(newBalance)} SWF`);
    }
    
    // Test changing the APR
    console.log("\nChanging APR from 25% to 20%...");
    await engine.setAPR(2000); // 20%
    const newAPR = await engine.getCurrentAPR();
    console.log(`✅ New APR: ${newAPR.toNumber() / 100}% (${newAPR} basis points)`);
    
    // Simulate additional time passing with new APR
    console.log("\nSimulating 15 more days with new APR...");
    await hre.network.provider.send("evm_increaseTime", [15 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");
    console.log("⏱️ Time advanced by 15 more days");
    
    // Check pending rewards with new rate
    const newPendingRewards = await engine.getPendingRewards(user1.address);
    console.log(`Pending rewards with 20% APR: ${hre.ethers.utils.formatEther(newPendingRewards)} SWF`);
    
    // Claim rewards again
    if (newPendingRewards.gt(0)) {
      console.log("\nClaiming rewards with new APR...");
      await engine.connect(user1).claimRewards();
      console.log(`✅ Claimed ${hre.ethers.utils.formatEther(newPendingRewards)} SWF rewards`);
      
      // Check user balance after claiming
      const finalBalance = await swf.balanceOf(user1.address);
      console.log(`User1 final balance: ${hre.ethers.utils.formatEther(finalBalance)} SWF`);
    }
    
    // Withdraw tokens
    console.log("\nWithdrawing 50 SWF...");
    const withdrawAmount = hre.ethers.utils.parseEther("50");
    await engine.connect(user1).withdraw(withdrawAmount);
    console.log("✅ Withdrawn 50 SWF");
    
    // Check updated staked amount
    const updatedStakedAmount = await engine.getTotalStaked(user1.address);
    console.log(`Updated staked amount: ${hre.ethers.utils.formatEther(updatedStakedAmount)} SWF`);
    
    // Check updated wallet breakdown
    console.log("\nChecking updated wallet breakdown...");
    const updatedWallets = await engine.getWalletBreakdown(user1.address);
    
    console.log("ID  | Role      | Balance");
    console.log("----|-----------|-------------");
    
    updatedWallets.forEach((wallet, index) => {
      const roleName = WALLET_ROLES[wallet.role];
      console.log(
        `${index.toString().padEnd(4)} | ${roleName.padEnd(10)} | ${hre.ethers.utils.formatEther(wallet.balance)} SWF`
      );
    });
    
    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });