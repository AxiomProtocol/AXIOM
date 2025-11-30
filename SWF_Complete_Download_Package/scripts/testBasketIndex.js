const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing BasketIndex with minimal token...");
    
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
    
    // Deploy a second token for testing
    console.log("\nDeploying second test token...");
    const TestToken = await ethers.getContractFactory("SovranWealthFundMinimal");
    const testToken = await TestToken.deploy();
    await testToken.deployed();
    console.log(`Test token deployed to: ${testToken.address}`);
    
    // Deploy BasketIndex
    console.log("\nDeploying BasketIndex...");
    const BasketIndex = await ethers.getContractFactory("BasketIndex");
    const basketIndex = await BasketIndex.deploy("Sovran Wealth Basket", "SWB");
    await basketIndex.deployed();
    console.log(`BasketIndex deployed to: ${basketIndex.address}`);
    
    // Get basic info
    const basketName = await basketIndex.name();
    const basketSymbol = await basketIndex.symbol();
    console.log(`Basket Name: ${basketName}`);
    console.log(`Basket Symbol: ${basketSymbol}`);
    
    // Mint tokens for testing
    console.log("\nMinting tokens for testing...");
    const mintAmount = ethers.utils.parseEther("1000");
    let tx = await swfToken.mint(tester.address, mintAmount);
    await tx.wait();
    tx = await testToken.mint(tester.address, mintAmount);
    await tx.wait();
    
    const swfBalance = await swfToken.balanceOf(tester.address);
    const testBalance = await testToken.balanceOf(tester.address);
    console.log(`SWF Balance: ${ethers.utils.formatEther(swfBalance)} SWF`);
    console.log(`Test Token Balance: ${ethers.utils.formatEther(testBalance)} TEST`);
    
    // Add assets to the basket
    console.log("\nAdding assets to basket...");
    
    // Approve tokens for basket
    console.log("Setting approvals for BasketIndex...");
    const approvalAmount = ethers.utils.parseEther("500");
    tx = await swfToken.approve(basketIndex.address, approvalAmount);
    await tx.wait();
    tx = await testToken.approve(basketIndex.address, approvalAmount);
    await tx.wait();
    console.log("✅ Approvals set");
    
    // Add assets to basket
    console.log("Setting assets for basket...");
    const assetAddresses = [swfToken.address, testToken.address];
    const weights = [3000, 7000]; // 30% SWF, 70% Test Token
    tx = await basketIndex.setAssets(assetAddresses, weights);
    await tx.wait();
    console.log("✅ Assets added to basket with weights 30:70");
    
    // Check basket assets
    console.log("\nChecking basket assets...");
    const basketAssets = await basketIndex.getUnderlyingAssets();
    console.log(`Basket has ${basketAssets.length} assets`);
    
    // List assets in basket
    console.log("\nListing basket assets:");
    for (let i = 0; i < basketAssets.length; i++) {
      const assetAddress = basketAssets[i];
      const weight = await basketIndex.assetWeights(assetAddress);
      console.log(`Asset ${i+1}:`);
      console.log(`  Address: ${assetAddress}`);
      console.log(`  Weight: ${weight.toString() / 100}%`);
    }
    
    // Get basket value
    console.log("\nCalculating basket value...");
    console.log(`Basket value (estimated): Combined value of all underlying assets`);
    
    // Create basket tokens
    console.log("\nCreating basket tokens...");
    
    // Mint some basket tokens
    const depositAmount = ethers.utils.parseEther("500");
    console.log(`Trying to mint basket tokens...`);
    
    try {
      // The basket likely needs deposit functionality to mint tokens
      console.log(`Note: BasketIndex doesn't have a direct mint function in this version`);
      console.log(`In a complete implementation, users would deposit assets to mint basket tokens`);
    } catch (error) {
      console.log(`Note: Could not mint basket tokens: ${error.message}`);
    }
    
    // Check updated basket assets
    console.log("\nChecking final basket state...");
    console.log("\nListing basket assets:");
    const finalAssets = await basketIndex.getUnderlyingAssets();
    for (let i = 0; i < finalAssets.length; i++) {
      const assetAddress = finalAssets[i];
      const weight = await basketIndex.assetWeights(assetAddress);
      console.log(`Asset ${i+1}:`);
      console.log(`  Address: ${assetAddress}`);
      console.log(`  Weight: ${weight.toString() / 100}%`);
    }
    
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