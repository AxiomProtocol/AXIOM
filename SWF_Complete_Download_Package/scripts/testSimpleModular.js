const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    console.log("Testing Sovran Wealth Fund Modular System...");

    // Read deployment information
    let deploymentInfo;
    try {
      const deploymentData = fs.readFileSync('modular-system-simple-deployment.json', 'utf8');
      deploymentInfo = JSON.parse(deploymentData);
      console.log(`Using deployment information from modular-system-simple-deployment.json`);
    } catch (error) {
      console.error("Failed to read deployment info:", error.message);
      process.exit(1);
    }
    
    // Get the tester's address
    const [tester] = await ethers.getSigners();
    console.log(`Testing as address: ${tester.address}`);
    console.log("Account balance:", ethers.utils.formatEther(await tester.getBalance()), "ETH");
    console.log("");
    
    // Connect to the deployed contracts
    console.log("Connecting to deployed contracts...");
    
    const SovranWealthFundMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    const swfToken = await SovranWealthFundMinimal.attach(deploymentInfo.swfToken);
    console.log(`✅ Connected to SWF token at ${deploymentInfo.swfToken}`);
    
    const BasketIndex = await ethers.getContractFactory("BasketIndex");
    const basketIndex = await BasketIndex.attach(deploymentInfo.basketIndex);
    console.log(`✅ Connected to BasketIndex at ${deploymentInfo.basketIndex}`);
    
    const RoleRouter = await ethers.getContractFactory("RoleRouter");
    const roleRouter = await RoleRouter.attach(deploymentInfo.roleRouter);
    console.log(`✅ Connected to RoleRouter at ${deploymentInfo.roleRouter}`);
    
    const SoloMethodEngineV2 = await ethers.getContractFactory("SoloMethodEngineV2");
    const soloMethodEngine = await SoloMethodEngineV2.attach(deploymentInfo.soloMethodEngine);
    console.log(`✅ Connected to SoloMethodEngineV2 at ${deploymentInfo.soloMethodEngine}`);
    
    const SWFModularEngine = await ethers.getContractFactory("SWFModularEngine");
    const modularEngine = await SWFModularEngine.attach(deploymentInfo.modularEngine);
    console.log(`✅ Connected to SWFModularEngine at ${deploymentInfo.modularEngine}`);
    console.log("");
    
    // Test token functionality
    console.log("Testing SWF token functionality...");
    const tokenName = await swfToken.name();
    const tokenSymbol = await swfToken.symbol();
    const tokenDecimals = await swfToken.decimals();
    const totalSupply = await swfToken.totalSupply();
    
    console.log(`Token Name: ${tokenName}`);
    console.log(`Token Symbol: ${tokenSymbol}`);
    console.log(`Token Decimals: ${tokenDecimals}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, tokenDecimals)} ${tokenSymbol}`);
    console.log("");
    
    // Mint some tokens for testing
    console.log("Minting tokens for testing...");
    const mintAmount = ethers.utils.parseUnits("1000000", tokenDecimals);
    let tx = await swfToken.mint(tester.address, mintAmount);
    await tx.wait();
    
    const balance = await swfToken.balanceOf(tester.address);
    console.log(`✅ Minted ${ethers.utils.formatUnits(balance, tokenDecimals)} ${tokenSymbol} to ${tester.address}`);
    console.log("");
    
    // Test Role Router
    console.log("Testing RoleRouter functionality...");
    const walletRole = await roleRouter.getWalletRole(tester.address);
    const walletShare = await roleRouter.getWalletShare(tester.address);
    console.log(`Wallet Role: ${walletRole}`);
    console.log(`Wallet Share: ${walletShare.toString()} basis points`);
    console.log("");
    
    // Test Staking functionality
    console.log("Testing Staking functionality...");
    console.log("Setting approval for SoloMethodEngineV2...");
    const approvalAmount = ethers.utils.parseUnits("100000", tokenDecimals);
    tx = await swfToken.approve(soloMethodEngine.address, approvalAmount);
    await tx.wait();
    console.log("✅ Approval set");
    
    console.log("Staking 100 tokens...");
    const stakeAmount = ethers.utils.parseUnits("100", tokenDecimals);
    tx = await soloMethodEngine.deposit(stakeAmount);
    await tx.wait();
    
    const stakedAmount = await soloMethodEngine.getTotalStaked(tester.address);
    console.log(`✅ Staked ${ethers.utils.formatUnits(stakedAmount, tokenDecimals)} ${tokenSymbol}`);
    
    console.log("Checking staking details...");
    const apr = await soloMethodEngine.getCurrentAPR();
    const minStakeAmount = await soloMethodEngine.MIN_STAKE_AMOUNT();
    const pendingRewards = await soloMethodEngine.getPendingRewards(tester.address);
    
    console.log(`APR: ${apr.toString() / 100}%`);
    console.log(`Minimum Stake: ${ethers.utils.formatUnits(minStakeAmount, tokenDecimals)} ${tokenSymbol}`);
    console.log(`Total Staked: ${ethers.utils.formatUnits(stakedAmount, tokenDecimals)} ${tokenSymbol}`);
    console.log(`Pending Rewards: ${ethers.utils.formatUnits(pendingRewards, tokenDecimals)} ${tokenSymbol}`);
    console.log("");
    
    // Test Modular Engine
    console.log("Testing SWFModularEngine functionality...");
    const basketAddress = await modularEngine.basketIndex();
    const routerAddress = await modularEngine.roleRouter();
    const stakingAddress = await modularEngine.stakingEngine();
    
    console.log(`BasketIndex Address: ${basketAddress}`);
    console.log(`RoleRouter Address: ${routerAddress}`);
    console.log(`StakingEngine Address: ${stakingAddress}`);
    
    const engineInfo = await modularEngine.getEngineInfo();
    console.log(`Engine Token: ${engineInfo.tokenAddress}`);
    console.log(`Engine Admin: ${engineInfo.admin}`);
    console.log("");
    
    // Test Basket functionality
    console.log("Testing BasketIndex functionality...");
    const basketName = await basketIndex.name();
    const basketSymbol = await basketIndex.symbol();
    
    console.log(`Basket Name: ${basketName}`);
    console.log(`Basket Symbol: ${basketSymbol}`);
    console.log("");
    
    console.log("✅ All tests completed successfully!");
    
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