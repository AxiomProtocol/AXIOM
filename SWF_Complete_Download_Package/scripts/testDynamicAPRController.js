const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing DynamicAPRController...");
    
    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log(`Deployer address: ${deployer.address}`);
    console.log(`Test user 1 address: ${user1.address}`);
    console.log(`Test user 2 address: ${user2.address}`);
    
    // Deploy a test SWF token
    console.log("\nDeploying test SWF token...");
    const SWFMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    const swfToken = await SWFMinimal.deploy();
    await swfToken.deployed();
    console.log(`Test SWF token deployed to: ${swfToken.address}`);
    
    // Mint some tokens to test users
    const mintAmount = ethers.utils.parseEther("1000000"); // 1,000,000 tokens
    await swfToken.mint(user1.address, mintAmount);
    await swfToken.mint(user2.address, mintAmount);
    console.log(`Minted ${ethers.utils.formatEther(mintAmount)} tokens to each test user`);
    
    // Deploy SWFBasketVault
    console.log("\nDeploying SWFBasketVault...");
    const SWFBasketVault = await ethers.getContractFactory("SWFBasketVault");
    const basketVault = await SWFBasketVault.deploy(swfToken.address);
    await basketVault.deployed();
    console.log(`SWFBasketVault deployed to: ${basketVault.address}`);
    
    // Deploy SoloMethodEngine (Staking Contract)
    console.log("\nDeploying SoloMethodEngine...");
    const SoloMethodEngine = await ethers.getContractFactory("contracts/SoloMethodEngine.sol:SoloMethodEngine");
    const stakingEngine = await SoloMethodEngine.deploy(swfToken.address, deployer.address);
    await stakingEngine.deployed();
    console.log(`SoloMethodEngine deployed to: ${stakingEngine.address}`);
    
    // Deploy DynamicAPRController
    console.log("\nDeploying DynamicAPRController...");
    const initialAPR = 2000; // 20%
    const DynamicAPRController = await ethers.getContractFactory("DynamicAPRController");
    const aprController = await DynamicAPRController.deploy(
      basketVault.address,
      stakingEngine.address,
      initialAPR,
      deployer.address
    );
    await aprController.deployed();
    console.log(`DynamicAPRController deployed to: ${aprController.address}`);
    
    // Transfer ownership of the staking engine to the APR controller so it can adjust the APR
    console.log("\nTransferring ownership of SoloMethodEngine to DynamicAPRController...");
    await stakingEngine.transferOwnership(aprController.address);
    console.log("Ownership transferred successfully");
    
    // Check initial APR settings
    console.log("\nChecking initial APR settings...");
    const aprInfo = await aprController.getAPRInfo();
    console.log(`Current APR: ${aprInfo._currentAPR / 100}%`);
    console.log(`Next adjustment time: ${new Date(aprInfo._nextAdjustmentTime.toNumber() * 1000)}`);
    console.log(`Total deposited in vault: ${ethers.utils.formatEther(aprInfo._totalDeposited)} SWF`);
    
    // Simulate different deposit levels
    console.log("\nSimulating APR at different deposit levels...");
    
    // Low deposits (less than low threshold) - should be maximum APR
    const lowDeposits = ethers.utils.parseEther("5000"); // 5,000 tokens
    const aprAtLowDeposits = await aprController.simulateAPRForDeposit(lowDeposits);
    console.log(`APR with ${ethers.utils.formatEther(lowDeposits)} deposits: ${aprAtLowDeposits / 100}%`);
    
    // Medium deposits (between thresholds) - should be interpolated
    const mediumDeposits = ethers.utils.parseEther("50000"); // 50,000 tokens
    const aprAtMediumDeposits = await aprController.simulateAPRForDeposit(mediumDeposits);
    console.log(`APR with ${ethers.utils.formatEther(mediumDeposits)} deposits: ${aprAtMediumDeposits / 100}%`);
    
    // High deposits (above high threshold) - should be minimum APR
    const highDeposits = ethers.utils.parseEther("150000"); // 150,000 tokens
    const aprAtHighDeposits = await aprController.simulateAPRForDeposit(highDeposits);
    console.log(`APR with ${ethers.utils.formatEther(highDeposits)} deposits: ${aprAtHighDeposits / 100}%`);
    
    // Make some actual deposits to the vault
    console.log("\nMaking actual deposits to the vault...");
    const depositAmount1 = ethers.utils.parseEther("40000"); // 40,000 tokens
    
    // Approve and deposit tokens
    await swfToken.connect(user1).approve(basketVault.address, depositAmount1);
    await basketVault.connect(user1).deposit(depositAmount1);
    console.log(`User1 deposited ${ethers.utils.formatEther(depositAmount1)} tokens to the vault`);
    
    // Check vault deposit
    const totalDeposited = await basketVault.totalDeposited();
    console.log(`Total deposited in vault: ${ethers.utils.formatEther(totalDeposited)} SWF`);
    
    // Update the adjustment interval for testing (to 1 hour, the minimum allowed)
    console.log("\nSetting adjustment interval to 1 hour for testing...");
    await aprController.updateAdjustmentInterval(3600); // 3600 seconds = 1 hour
    
    // Advance time by 1 hour (for testing purposes)
    console.log("\nAdvancing time by 1 hour...");
    await network.provider.send("evm_increaseTime", [3600]);
    await network.provider.send("evm_mine");
    
    // Adjust the APR based on current deposits
    console.log("\nAdjusting APR based on current deposits...");
    
    // Check staking engine's APR before adjustment
    const stakingAPRBefore = await stakingEngine.aprBasisPoints();
    console.log(`Staking engine's APR before adjustment: ${stakingAPRBefore / 100}%`);
    
    // Perform APR adjustment
    const adjustTx = await aprController.adjustAPR();
    await adjustTx.wait();
    
    // Check staking engine's APR after adjustment
    const stakingAPRAfter = await stakingEngine.aprBasisPoints();
    console.log(`Staking engine's APR after adjustment: ${stakingAPRAfter / 100}%`);
    
    // Make more deposits to change the APR further
    console.log("\nMaking additional deposits to change APR further...");
    const depositAmount2 = ethers.utils.parseEther("60000"); // 60,000 more tokens
    
    // Approve and deposit more tokens
    await swfToken.connect(user2).approve(basketVault.address, depositAmount2);
    await basketVault.connect(user2).deposit(depositAmount2);
    console.log(`User2 deposited ${ethers.utils.formatEther(depositAmount2)} tokens to the vault`);
    
    // Check updated vault deposit
    const totalDepositedAfter = await basketVault.totalDeposited();
    console.log(`Total deposited in vault now: ${ethers.utils.formatEther(totalDepositedAfter)} SWF`);
    
    // Advance time by 1 hour
    console.log("\nAdvancing time by 1 more hour...");
    await network.provider.send("evm_increaseTime", [3600]);
    await network.provider.send("evm_mine");
    
    // Adjust the APR again
    console.log("\nAdjusting APR again with higher deposits...");
    const adjustTx2 = await aprController.adjustAPR();
    await adjustTx2.wait();
    
    // Check staking engine's APR after second adjustment
    const stakingAPRAfter2 = await stakingEngine.aprBasisPoints();
    console.log(`Staking engine's APR after second adjustment: ${stakingAPRAfter2 / 100}%`);
    
    // Test updating thresholds
    console.log("\nUpdating deposit thresholds...");
    await aprController.updateThresholds(
      ethers.utils.parseEther("50000"),  // New low threshold: 50,000 tokens
      ethers.utils.parseEther("200000")  // New high threshold: 200,000 tokens
    );
    console.log("Thresholds updated");
    
    // Simulate with the new thresholds
    console.log("\nSimulating APR with the new thresholds...");
    const aprWithNewThresholds = await aprController.simulateAPRForDeposit(totalDepositedAfter);
    console.log(`APR with current deposits (${ethers.utils.formatEther(totalDepositedAfter)} SWF) and new thresholds: ${aprWithNewThresholds / 100}%`);
    
    console.log("\n✅ DynamicAPRController tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Tests failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main execution:", error);
    process.exit(1);
  });