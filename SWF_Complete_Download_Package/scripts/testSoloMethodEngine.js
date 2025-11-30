const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing SoloMethodEngineV2 with minimal token...");
    
    // Get the tester's address
    const [tester] = await ethers.getSigners();
    console.log(`Testing as address: ${tester.address}`);
    console.log("Account balance:", ethers.utils.formatEther(await tester.getBalance()), "ETH");
    console.log("");
    
    // Deploy SovranWealthFundMinimal token for testing
    console.log("Deploying SovranWealthFundMinimal token...");
    const SWFMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    const swfToken = await SWFMinimal.deploy();
    await swfToken.deployed();
    console.log(`SWF token deployed to: ${swfToken.address}`);
    
    // Deploy SoloMethodEngineV2
    console.log("\nDeploying SoloMethodEngineV2...");
    const SoloMethodEngineV2 = await ethers.getContractFactory("SoloMethodEngineV2");
    const soloMethodEngine = await SoloMethodEngineV2.deploy(swfToken.address);
    await soloMethodEngine.deployed();
    console.log(`SoloMethodEngineV2 deployed to: ${soloMethodEngine.address}`);
    
    // Mint tokens for testing
    console.log("\nMinting tokens for testing...");
    const mintAmount = ethers.utils.parseEther("1000");
    let tx = await swfToken.mint(tester.address, mintAmount);
    await tx.wait();
    
    const balance = await swfToken.balanceOf(tester.address);
    console.log(`Minted ${ethers.utils.formatEther(balance)} SWF to ${tester.address}`);
    
    // Grant minting permissions to soloMethodEngine
    console.log("\nGranting minting permissions to SoloMethodEngineV2...");
    tx = await swfToken.grantMinterRole(soloMethodEngine.address);
    await tx.wait();
    console.log("✅ Minting permissions granted");
    
    // Set approval for staking
    console.log("\nSetting approval for SoloMethodEngineV2...");
    const approvalAmount = ethers.utils.parseEther("500");
    tx = await swfToken.approve(soloMethodEngine.address, approvalAmount);
    await tx.wait();
    console.log("✅ Approval set");
    
    // Stake tokens
    console.log("\nStaking 100 tokens...");
    const stakeAmount = ethers.utils.parseEther("100");
    tx = await soloMethodEngine.deposit(stakeAmount);
    await tx.wait();
    
    const stakedAmount = await soloMethodEngine.getTotalStaked(tester.address);
    console.log(`✅ Staked ${ethers.utils.formatEther(stakedAmount)} SWF`);
    
    // Check staking details
    console.log("\nChecking staking details...");
    const apr = await soloMethodEngine.getCurrentAPR();
    const minStakeAmount = await soloMethodEngine.MIN_STAKE_AMOUNT();
    const pendingRewards = await soloMethodEngine.getPendingRewards(tester.address);
    
    console.log(`APR: ${apr.toString() / 100}%`);
    console.log(`Minimum Stake: ${ethers.utils.formatEther(minStakeAmount)} SWF`);
    console.log(`Pending Rewards: ${ethers.utils.formatEther(pendingRewards)} SWF`);
    
    // Wait a bit for rewards to accumulate
    console.log("\nWaiting for rewards to accumulate...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check rewards again
    const pendingRewardsAfterWait = await soloMethodEngine.getPendingRewards(tester.address);
    console.log(`Pending Rewards after waiting: ${ethers.utils.formatEther(pendingRewardsAfterWait)} SWF`);
    
    // Claim rewards
    console.log("\nClaiming rewards...");
    tx = await soloMethodEngine.claimRewards();
    await tx.wait();
    console.log("✅ Rewards claimed");
    
    // Check wallet breakdown
    console.log("\nChecking wallet breakdown...");
    const walletBreakdown = await soloMethodEngine.getWalletBreakdown(tester.address);
    
    console.log("16-Wallet Structure:");
    for (let i = 0; i < walletBreakdown.length; i++) {
      const roleType = walletBreakdown[i].role;
      const roleNames = ["BUYER", "HOLDER", "STAKER", "LIQUIDITY", "TRACKER"];
      const roleName = roleNames[roleType];
      
      console.log(`Wallet ${i+1}: Role=${roleName}, Balance=${ethers.utils.formatEther(walletBreakdown[i].balance)} SWF`);
    }
    
    // Try to withdraw some tokens
    console.log("\nWithdrawing 50 tokens...");
    const withdrawAmount = ethers.utils.parseEther("50");
    tx = await soloMethodEngine.withdraw(withdrawAmount);
    await tx.wait();
    
    const remainingStaked = await soloMethodEngine.getTotalStaked(tester.address);
    console.log(`✅ Withdrawn. Remaining staked: ${ethers.utils.formatEther(remainingStaked)} SWF`);
    
    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });