const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Testing SWFBasketVault...");
    
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
    const mintAmount = ethers.utils.parseEther("1000");
    await swfToken.mint(user1.address, mintAmount);
    await swfToken.mint(user2.address, mintAmount);
    console.log(`Minted ${ethers.utils.formatEther(mintAmount)} tokens to each test user`);
    
    // Deploy SWFBasketVault
    console.log("\nDeploying SWFBasketVault...");
    const SWFBasketVault = await ethers.getContractFactory("SWFBasketVault");
    const basketVault = await SWFBasketVault.deploy(swfToken.address);
    await basketVault.deployed();
    console.log(`SWFBasketVault deployed to: ${basketVault.address}`);
    
    // Test deposit from user1
    console.log("\nTesting deposit from user1...");
    const depositAmount1 = ethers.utils.parseEther("100");
    
    // Approve spending
    await swfToken.connect(user1).approve(basketVault.address, depositAmount1);
    console.log(`User1 approved ${ethers.utils.formatEther(depositAmount1)} tokens for vault`);
    
    // Deposit
    await basketVault.connect(user1).deposit(depositAmount1);
    console.log(`User1 deposited ${ethers.utils.formatEther(depositAmount1)} tokens`);
    
    // Check balances
    const user1DepositBalance = await basketVault.deposits(user1.address);
    const user1BasketBalance = await basketVault.balanceOf(user1.address);
    console.log(`User1 deposit balance: ${ethers.utils.formatEther(user1DepositBalance)} SWF`);
    console.log(`User1 basket token balance: ${ethers.utils.formatEther(user1BasketBalance)} SWF-BASKET`);
    
    // Test deposit from user2
    console.log("\nTesting deposit from user2...");
    const depositAmount2 = ethers.utils.parseEther("200");
    
    // Approve spending
    await swfToken.connect(user2).approve(basketVault.address, depositAmount2);
    console.log(`User2 approved ${ethers.utils.formatEther(depositAmount2)} tokens for vault`);
    
    // Deposit
    await basketVault.connect(user2).deposit(depositAmount2);
    console.log(`User2 deposited ${ethers.utils.formatEther(depositAmount2)} tokens`);
    
    // Check balances
    const user2DepositBalance = await basketVault.deposits(user2.address);
    const user2BasketBalance = await basketVault.balanceOf(user2.address);
    console.log(`User2 deposit balance: ${ethers.utils.formatEther(user2DepositBalance)} SWF`);
    console.log(`User2 basket token balance: ${ethers.utils.formatEther(user2BasketBalance)} SWF-BASKET`);
    
    // Check total deposited
    const totalDeposited = await basketVault.totalDeposited();
    console.log(`\nTotal deposited in vault: ${ethers.utils.formatEther(totalDeposited)} SWF`);
    
    // Test withdrawal from user1
    console.log("\nTesting withdrawal from user1...");
    const withdrawAmount = ethers.utils.parseEther("50");
    
    // Withdraw
    await basketVault.connect(user1).withdraw(withdrawAmount);
    console.log(`User1 withdrew ${ethers.utils.formatEther(withdrawAmount)} tokens`);
    
    // Check updated balances
    const user1DepositBalanceAfter = await basketVault.deposits(user1.address);
    const user1BasketBalanceAfter = await basketVault.balanceOf(user1.address);
    const user1SWFBalanceAfter = await swfToken.balanceOf(user1.address);
    console.log(`User1 deposit balance after withdrawal: ${ethers.utils.formatEther(user1DepositBalanceAfter)} SWF`);
    console.log(`User1 basket token balance after withdrawal: ${ethers.utils.formatEther(user1BasketBalanceAfter)} SWF-BASKET`);
    console.log(`User1 SWF token balance after withdrawal: ${ethers.utils.formatEther(user1SWFBalanceAfter)} SWF`);
    
    // Check updated total deposited
    const totalDepositedAfter = await basketVault.totalDeposited();
    console.log(`\nTotal deposited in vault after withdrawal: ${ethers.utils.formatEther(totalDepositedAfter)} SWF`);
    
    // Check vault balance
    const vaultBalance = await swfToken.balanceOf(basketVault.address);
    console.log(`Vault SWF balance: ${ethers.utils.formatEther(vaultBalance)} SWF`);
    
    console.log("\n✅ SWFBasketVault tests completed successfully!");
    
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