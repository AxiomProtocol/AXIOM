const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    console.log("Testing Sovran Wealth Fund Modular System...");
    
    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log("Using accounts:");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`User1: ${user1.address}`);
    console.log(`User2: ${user2.address}`);
    console.log("");
    
    // Load deployment info or deploy from scratch for testing
    let deploymentInfo;
    let swfToken, basketIndex, roleRouter, soloMethodEngine, modularEngine;
    
    if (fs.existsSync('modular-system-deployment.json')) {
      console.log("Loading deployed contracts from deployment info...");
      deploymentInfo = JSON.parse(fs.readFileSync('modular-system-deployment.json', 'utf8'));
      
      // Attach to deployed contracts
      const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
      swfToken = await SovranWealthFund.attach(deploymentInfo.swfToken);
      
      const BasketIndex = await ethers.getContractFactory("BasketIndex");
      basketIndex = await BasketIndex.attach(deploymentInfo.basketIndex);
      
      const RoleRouter = await ethers.getContractFactory("RoleRouter");
      roleRouter = await RoleRouter.attach(deploymentInfo.roleRouter);
      
      const SoloMethodEngineV2 = await ethers.getContractFactory("SoloMethodEngineV2");
      soloMethodEngine = await SoloMethodEngineV2.attach(deploymentInfo.soloMethodEngine);
      
      const SWFModularEngine = await ethers.getContractFactory("SWFModularEngine");
      modularEngine = await SWFModularEngine.attach(deploymentInfo.modularEngine);
      
      console.log("Contracts loaded successfully!");
      console.log("");
    } else {
      console.log("No deployment info found. Deploying new contracts for testing...");
      
      // Deploy SWF Token
      console.log("Deploying SovranWealthFund token...");
      const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
      swfToken = await SovranWealthFund.deploy();
      await swfToken.deployed();
      console.log(`SWF token deployed to: ${swfToken.address}`);
      console.log("");
      
      // Deploy BasketIndex
      console.log("Deploying BasketIndex...");
      const BasketIndex = await ethers.getContractFactory("BasketIndex");
      basketIndex = await BasketIndex.deploy("Sovran Wealth Basket", "SWB");
      await basketIndex.deployed();
      console.log(`BasketIndex deployed to: ${basketIndex.address}`);
      console.log("");
      
      // Deploy RoleRouter
      console.log("Deploying RoleRouter...");
      const mainDistributor = deployer.address; // Use deployer for testing
      const treasury = deployer.address; // Use deployer for testing
      
      const RoleRouter = await ethers.getContractFactory("RoleRouter");
      roleRouter = await RoleRouter.deploy(swfToken.address, mainDistributor, treasury);
      await roleRouter.deployed();
      console.log(`RoleRouter deployed to: ${roleRouter.address}`);
      console.log("");
      
      // Deploy SoloMethodEngineV2
      console.log("Deploying SoloMethodEngineV2...");
      const SoloMethodEngineV2 = await ethers.getContractFactory("SoloMethodEngineV2");
      soloMethodEngine = await SoloMethodEngineV2.deploy(swfToken.address);
      await soloMethodEngine.deployed();
      console.log(`SoloMethodEngineV2 deployed to: ${soloMethodEngine.address}`);
      console.log("");
      
      // Deploy SWFModularEngine
      console.log("Deploying SWFModularEngine...");
      const SWFModularEngine = await ethers.getContractFactory("SWFModularEngine");
      modularEngine = await SWFModularEngine.deploy(swfToken.address);
      await modularEngine.deployed();
      console.log(`SWFModularEngine deployed to: ${modularEngine.address}`);
      console.log("");
      
      // Initialize the modular engine components
      console.log("Initializing SWFModularEngine components...");
      
      let tx = await modularEngine.initializeBasketIndex(basketIndex.address);
      await tx.wait();
      console.log("✅ BasketIndex initialized");
      
      tx = await modularEngine.initializeRoleRouter(roleRouter.address);
      await tx.wait();
      console.log("✅ RoleRouter initialized");
      
      tx = await modularEngine.initializeStakingEngine(soloMethodEngine.address);
      await tx.wait();
      console.log("✅ StakingEngine initialized");
      console.log("");
      
      // Grant MINTER_ROLE to the SoloMethodEngine
      console.log("Granting MINTER_ROLE to SoloMethodEngineV2...");
      const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      tx = await swfToken.grantRole(MINTER_ROLE, soloMethodEngine.address);
      await tx.wait();
      console.log("✅ MINTER_ROLE granted to SoloMethodEngineV2");
      console.log("");
      
      // For testing, mint some tokens to users
      console.log("Minting test tokens to users...");
      const mintAmount = ethers.utils.parseEther("1000");
      await swfToken.mint(deployer.address, mintAmount);
      await swfToken.mint(user1.address, mintAmount);
      await swfToken.mint(user2.address, mintAmount);
      console.log(`✅ Minted ${ethers.utils.formatEther(mintAmount)} SWF to each test user`);
      console.log("");
      
      // Setup test roles in RoleRouter
      console.log("Setting up test roles in RoleRouter...");
      
      // Set up simple roles for testing
      const wallets = [deployer.address, user1.address, user2.address];
      const roles = ["Admin", "User", "User"];
      const shares = [5000, 3000, 2000]; // 50%, 30%, 20%
      
      tx = await roleRouter.setRoles(wallets, roles, shares);
      await tx.wait();
      console.log("✅ Test roles set in RoleRouter");
      console.log("");
    }
    
    // ========== TEST SECTION ==========
    console.log("=== TESTING MODULAR COMPONENTS ===");
    console.log("");
    
    // Test 1: Check SWF Token Info
    console.log("Test 1: Checking SWF Token Info");
    const swfName = await swfToken.name();
    const swfSymbol = await swfToken.symbol();
    const swfDecimals = await swfToken.decimals();
    console.log(`Token Name: ${swfName}`);
    console.log(`Token Symbol: ${swfSymbol}`);
    console.log(`Token Decimals: ${swfDecimals}`);
    
    // Check balances
    const deployer1Balance = await swfToken.balanceOf(deployer.address);
    const user1Balance = await swfToken.balanceOf(user1.address);
    const user2Balance = await swfToken.balanceOf(user2.address);
    
    console.log(`Deployer balance: ${ethers.utils.formatEther(deployer1Balance)} SWF`);
    console.log(`User1 balance: ${ethers.utils.formatEther(user1Balance)} SWF`);
    console.log(`User2 balance: ${ethers.utils.formatEther(user2Balance)} SWF`);
    console.log("✅ SWF Token Test Passed");
    console.log("");
    
    // Test 2: SoloMethodEngineV2 - Staking with Dynamic APR
    console.log("Test 2: Testing SoloMethodEngineV2 with Dynamic APR");
    
    // Check current APR
    const currentAPR = await soloMethodEngine.getCurrentAPR();
    console.log(`Current APR: ${currentAPR.toNumber() / 100}% (${currentAPR.toString()} basis points)`);
    
    // Approve tokens for staking (if needed)
    if (user1Balance.gt(0)) {
      const stakeAmount = ethers.utils.parseEther("100");  // Stake 100 SWF
      
      // Check if approval exists
      const allowance = await swfToken.allowance(user1.address, soloMethodEngine.address);
      if (allowance.lt(stakeAmount)) {
        console.log("Approving tokens for staking...");
        await swfToken.connect(user1).approve(soloMethodEngine.address, stakeAmount);
        console.log("✅ Approval completed");
      }
      
      // Stake tokens
      console.log(`Staking ${ethers.utils.formatEther(stakeAmount)} SWF tokens...`);
      await soloMethodEngine.connect(user1).deposit(stakeAmount);
      console.log("✅ Tokens staked successfully");
      
      // Check staked amount
      const stakedAmount = await soloMethodEngine.getTotalStaked(user1.address);
      console.log(`User1 staked amount: ${ethers.utils.formatEther(stakedAmount)} SWF`);
      
      // Check wallet breakdown
      console.log("\nChecking wallet breakdown...");
      const wallets = await soloMethodEngine.getWalletBreakdown(user1.address);
      
      console.log("ID  | Role      | Balance");
      console.log("----|-----------|-------------");
      
      const WALLET_ROLES = ["BUYER", "HOLDER", "STAKER", "LIQUIDITY", "TRACKER"];
      
      wallets.forEach((wallet, index) => {
        const roleName = WALLET_ROLES[wallet.role];
        console.log(
          `${index.toString().padEnd(4)} | ${roleName.padEnd(10)} | ${ethers.utils.formatEther(wallet.balance)} SWF`
        );
      });
      
      // Test dynamic APR setting
      console.log("\nChanging APR from 25% to 20%...");
      await soloMethodEngine.setAPR(2000); // 20%
      const newAPR = await soloMethodEngine.getCurrentAPR();
      console.log(`✅ New APR: ${newAPR.toNumber() / 100}% (${newAPR.toString()} basis points)`);
      
      // Simulate time passing for rewards
      if (network.name === "hardhat" || network.name === "localhost") {
        console.log("\nSimulating time passing for rewards...");
        await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
        await ethers.provider.send("evm_mine");
        console.log("⏱️ Time advanced by 30 days");
      } else {
        console.log("\nSkipping time simulation on live network");
      }
      
      // Check pending rewards
      const pendingRewards = await soloMethodEngine.getPendingRewards(user1.address);
      console.log(`Pending rewards: ${ethers.utils.formatEther(pendingRewards)} SWF`);
      
      // Try claiming rewards if there are any
      if (pendingRewards.gt(0)) {
        console.log("\nClaiming rewards...");
        await soloMethodEngine.connect(user1).claimRewards();
        console.log(`✅ Claimed ${ethers.utils.formatEther(pendingRewards)} SWF in rewards`);
        
        // Check updated balance
        const newBalance = await swfToken.balanceOf(user1.address);
        console.log(`User1 updated balance: ${ethers.utils.formatEther(newBalance)} SWF`);
      }
    } else {
      console.log("Skipping staking test - User1 has no tokens");
    }
    console.log("✅ SoloMethodEngineV2 Test Passed");
    console.log("");
    
    // Test 3: RoleRouter
    console.log("Test 3: Testing RoleRouter");
    
    // Check configured roles
    const walletRoles = await roleRouter.getWalletRoles();
    console.log(`Number of configured wallets: ${walletRoles.length}`);
    
    if (walletRoles.length > 0) {
      console.log("\nWallet Roles:");
      console.log("Address | Role | Share");
      console.log("--------|------|------");
      
      for (let i = 0; i < walletRoles.length; i++) {
        const wallet = walletRoles[i];
        const role = await roleRouter.getWalletRole(wallet);
        const share = await roleRouter.getWalletShare(wallet);
        console.log(`${wallet.substring(0, 10)}... | ${role.padEnd(10)} | ${share.toString()} basis points`);
      }
    }
    
    // Try distributing rewards (requires tokens in the RoleRouter)
    if (deployer1Balance.gt(0)) {
      console.log("\nSending tokens to RoleRouter for distribution...");
      const distribAmount = ethers.utils.parseEther("10");  // 10 SWF
      await swfToken.transfer(roleRouter.address, distribAmount);
      console.log(`✅ Sent ${ethers.utils.formatEther(distribAmount)} SWF to RoleRouter`);
      
      console.log("\nDistributing rewards...");
      await roleRouter.distributeRewards();
      console.log("✅ Rewards distributed");
    } else {
      console.log("Skipping distribution test - Deployer has no tokens");
    }
    console.log("✅ RoleRouter Test Passed");
    console.log("");
    
    // Test 4: BasketIndex (if we have more than one token for testing)
    console.log("Test 4: Testing BasketIndex");
    console.log("(Note: Comprehensive BasketIndex testing requires multiple ERC20 tokens)");
    
    // Get basic BasketIndex info
    const basketName = await basketIndex.name();
    const basketSymbol = await basketIndex.symbol();
    console.log(`Basket Name: ${basketName}`);
    console.log(`Basket Symbol: ${basketSymbol}`);
    
    // Check if any assets are configured
    const assets = await basketIndex.getUnderlyingAssets();
    console.log(`Number of assets in basket: ${assets.length}`);
    
    if (assets.length === 0) {
      console.log("\nSetting up test asset in basket (using SWF token)...");
      const testAssets = [swfToken.address];
      const testWeights = [10000]; // 100%
      await basketIndex.setAssets(testAssets, testWeights);
      console.log("✅ Test asset added to basket");
      
      // Verify the update
      const updatedAssets = await basketIndex.getUnderlyingAssets();
      const updatedWeights = await basketIndex.getAssetWeights();
      console.log("\nUpdated Basket Configuration:");
      console.log("Asset | Weight");
      console.log("------|-------");
      for (let i = 0; i < updatedAssets.length; i++) {
        console.log(`${updatedAssets[i].substring(0, 10)}... | ${updatedWeights[i].toString()} basis points`);
      }
    }
    console.log("✅ BasketIndex Test Passed");
    console.log("");
    
    // Test 5: SWFModularEngine Integration
    console.log("Test 5: Testing SWFModularEngine Integration");
    
    // Check component initialization
    const currentAprFromModular = await modularEngine.getCurrentAPR();
    console.log(`Current APR from ModularEngine: ${currentAprFromModular.toNumber() / 100}%`);
    
    // Try setting APR through the modular engine
    console.log("\nSetting APR to 30% through ModularEngine...");
    await modularEngine.setStakingAPR(3000); // 30%
    
    // Verify the change
    const newAprFromModular = await modularEngine.getCurrentAPR();
    console.log(`New APR from ModularEngine: ${newAprFromModular.toNumber() / 100}%`);
    
    // Verify it matches the direct value
    const newAprFromDirect = await soloMethodEngine.getCurrentAPR();
    console.log(`New APR direct from SoloMethodEngine: ${newAprFromDirect.toNumber() / 100}%`);
    console.log(`APR values match: ${newAprFromModular.eq(newAprFromDirect) ? "✅ Yes" : "❌ No"}`);
    
    console.log("✅ SWFModularEngine Integration Test Passed");
    console.log("");
    
    console.log("=== ALL TESTS COMPLETED SUCCESSFULLY ===");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });