const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing the SWFIntegratedEngine contract...");
    
    // Get the signers
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log("Testing with accounts:");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`User1: ${user1.address}`);
    console.log(`User2: ${user2.address}`);
    console.log("");
    
    // Get the deployed contract addresses
    let swfAddress;
    let engineAddress;
    
    if (process.env.SWF_CONTRACT_ADDRESS && process.env.INTEGRATED_ENGINE_ADDRESS) {
      // Use addresses from environment variables if available
      swfAddress = process.env.SWF_CONTRACT_ADDRESS;
      engineAddress = process.env.INTEGRATED_ENGINE_ADDRESS;
      console.log(`Using existing contracts:`);
      console.log(`SWF token: ${swfAddress}`);
      console.log(`Integrated Engine: ${engineAddress}`);
    } else {
      // Deploy new contracts for testing
      console.log("Deploying new contracts for testing...");
      
      // Deploy SWF token
      console.log("Deploying SovranWealthFund token...");
      const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
      const swf = await SovranWealthFund.deploy();
      await swf.deployed();
      swfAddress = swf.address;
      console.log(`SWF token deployed to: ${swfAddress}`);
      
      // Deploy Integrated Engine
      console.log("\nDeploying SWFIntegratedEngine...");
      const SWFIntegratedEngine = await ethers.getContractFactory("SWFIntegratedEngine");
      const engine = await SWFIntegratedEngine.deploy(swfAddress);
      await engine.deployed();
      engineAddress = engine.address;
      console.log(`SWFIntegratedEngine deployed to: ${engineAddress}`);
      
      // Grant minter role to the engine
      console.log("\nGranting MINTER_ROLE to the engine...");
      const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      await swf.grantRole(MINTER_ROLE, engineAddress);
      console.log("✅ MINTER_ROLE granted");
      
      // Mint initial tokens to users for testing
      console.log("\nMinting initial tokens to users...");
      const mintAmount = ethers.utils.parseEther("1000");
      await swf.mint(deployer.address, mintAmount);
      await swf.mint(user1.address, mintAmount);
      await swf.mint(user2.address, mintAmount);
      console.log(`✅ Minted ${ethers.utils.formatEther(mintAmount)} SWF to each test user`);
    }
    
    // Attach to the contracts
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const swf = await SovranWealthFund.attach(swfAddress);
    
    const SWFIntegratedEngine = await ethers.getContractFactory("SWFIntegratedEngine");
    const engine = await SWFIntegratedEngine.attach(engineAddress);
    
    // Check current APR
    const currentAPR = await engine.getCurrentAPR();
    console.log(`\nCurrent APR: ${currentAPR.toNumber() / 100}% (${currentAPR} basis points)`);
    
    // ----------------------------------
    // Test SoloMethodEngine functionality
    // ----------------------------------
    console.log("\n=== Testing SoloMethodEngine functionality ===");
    
    // Check balances
    const user1Balance = await swf.balanceOf(user1.address);
    console.log(`User1 balance: ${ethers.utils.formatEther(user1Balance)} SWF`);
    
    // Approve tokens for staking
    console.log("\nApproving tokens for staking...");
    const stakeAmount = ethers.utils.parseEther("100");
    await swf.connect(user1).approve(engineAddress, stakeAmount);
    console.log("✅ Approval completed");
    
    // Stake tokens
    console.log("\nStaking 100 SWF tokens...");
    await engine.connect(user1).deposit(stakeAmount);
    console.log("✅ Tokens staked successfully");
    
    // Check staked amount
    const stakedAmount = await engine.getTotalStaked(user1.address);
    console.log(`User1 staked amount: ${ethers.utils.formatEther(stakedAmount)} SWF`);
    
    // Check wallet breakdown
    console.log("\nChecking wallet breakdown...");
    const wallets = await engine.getWalletBreakdown(user1.address);
    
    console.log("ID  | Role      | Balance");
    console.log("----|-----------|-------------");
    
    const WALLET_ROLES = ["BUYER", "HOLDER", "STAKER", "LIQUIDITY", "TRACKER"];
    
    wallets.forEach((wallet, index) => {
      const roleName = WALLET_ROLES[wallet.role];
      console.log(
        `${index.toString().padEnd(4)} | ${roleName.padEnd(10)} | ${ethers.utils.formatEther(wallet.balance)} SWF`
      );
    });
    
    // Simulate time passing (for rewards)
    console.log("\nSimulating 30 days passing...");
    // Increase time by 30 days (in seconds)
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    console.log("⏱️ Time advanced by 30 days");
    
    // Check pending rewards
    const pendingRewards = await engine.getPendingRewards(user1.address);
    console.log(`Pending rewards: ${ethers.utils.formatEther(pendingRewards)} SWF`);
    
    // Claim rewards
    if (pendingRewards.gt(0)) {
      console.log("\nClaiming rewards...");
      await engine.connect(user1).claimRewards();
      console.log(`✅ Claimed ${ethers.utils.formatEther(pendingRewards)} SWF rewards`);
      
      // Check user balance after claiming
      const newBalance = await swf.balanceOf(user1.address);
      console.log(`User1 new balance: ${ethers.utils.formatEther(newBalance)} SWF`);
    }
    
    // Test changing the APR
    console.log("\nChanging APR from 25% to 20%...");
    await engine.setAPR(2000); // 20%
    const newAPR = await engine.getCurrentAPR();
    console.log(`✅ New APR: ${newAPR.toNumber() / 100}% (${newAPR} basis points)`);
    
    // ----------------------------------
    // Test SovereignEngine functionality
    // ----------------------------------
    console.log("\n=== Testing SovereignEngine functionality ===");
    
    // Get recipient list
    const recipients = await engine.getRecipientList();
    console.log(`\nNumber of recipients: ${recipients.length}`);
    
    // Print a few recipients with their roles
    console.log("\nRecipient sample:");
    console.log("Address | Role | Allocation");
    console.log("--------|------|----------");
    
    for (let i = 0; i < Math.min(5, recipients.length); i++) {
      const address = recipients[i];
      const role = await engine.getRole(address);
      const allocation = await engine.getAllocationByRole(role);
      console.log(`${address.substring(0, 10)}... | ${role} | ${allocation}%`);
    }
    
    // Test distribution (if we're using a fresh deployment)
    if (!process.env.INTEGRATED_ENGINE_ADDRESS) {
      console.log("\nTesting token distribution...");
      
      // Approve tokens for distribution
      const distributionAmount = ethers.utils.parseEther("100");
      await swf.connect(deployer).approve(engineAddress, distributionAmount);
      console.log("✅ Approval for distribution completed");
      
      // Distribute tokens
      console.log(`Distributing ${ethers.utils.formatEther(distributionAmount)} SWF tokens...`);
      await engine.connect(deployer).distributeTokens(distributionAmount);
      console.log("✅ Tokens distributed successfully");
      
      // Check the balance of one recipient
      const treasuryAddress = await engine.getAddressByRole("Treasury");
      if (treasuryAddress !== ethers.constants.AddressZero) {
        const treasuryBalance = await swf.balanceOf(treasuryAddress);
        console.log(`Treasury balance: ${ethers.utils.formatEther(treasuryBalance)} SWF`);
      }
    }
    
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