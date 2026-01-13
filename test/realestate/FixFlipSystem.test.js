const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fix & Flip Real Estate Lending System", function () {
  let axusd;
  let vault;
  let loanReceipt;
  let riskConfig;
  let repaymentRouter;
  let fixFlipManager;
  let productRegistry;

  let owner;
  let borrower;
  let investor1;
  let investor2;
  let treasury;
  let insuranceFund;

  const PRODUCT_ID = 1; // Fix & Flip

  beforeEach(async function () {
    [owner, borrower, investor1, investor2, treasury, insuranceFund] = await ethers.getSigners();

    // Deploy mock AXUSD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    axusd = await MockERC20.deploy("AXUSD Stablecoin", "AXUSD", 18);
    await axusd.waitForDeployment();

    // Mint tokens to investors and borrower (for repayment)
    await axusd.mint(investor1.address, ethers.parseEther("100000"));
    await axusd.mint(investor2.address, ethers.parseEther("100000"));
    await axusd.mint(borrower.address, ethers.parseEther("50000"));

    // Deploy RiskConfig
    const RiskConfig = await ethers.getContractFactory("RiskConfig");
    riskConfig = await RiskConfig.deploy();
    await riskConfig.waitForDeployment();

    // Set product risk parameters
    await riskConfig.setProductRisk(PRODUCT_ID, {
      productId: PRODUCT_ID,
      maxLtvBps: 7000, // 70%
      maxTermDays: 365,
      maxLoanSize: ethers.parseEther("500000"),
      minLoanSize: ethers.parseEther("50000"),
      originationFeeBps: 300, // 3%
      interestRateBps: 1400, // 14%
      lateFeePerDayBps: 50, // 0.5%
      insuranceReserveBps: 200, // 2%
      protocolFeeBps: 150, // 1.5%
      active: true
    });

    // Deploy LoanReceiptNFT
    const LoanReceiptNFT = await ethers.getContractFactory("LoanReceiptNFT");
    loanReceipt = await LoanReceiptNFT.deploy("Axiom Loan Receipt", "ALR");
    await loanReceipt.waitForDeployment();

    // Deploy FixFlipPoolVault
    const FixFlipPoolVault = await ethers.getContractFactory("FixFlipPoolVault");
    vault = await FixFlipPoolVault.deploy(
      await axusd.getAddress(),
      "Axiom Fix Flip Vault",
      "affVault"
    );
    await vault.waitForDeployment();

    // Deploy RepaymentRouter
    const RepaymentRouter = await ethers.getContractFactory("RepaymentRouter");
    repaymentRouter = await RepaymentRouter.deploy(
      await axusd.getAddress(),
      await vault.getAddress(),
      await riskConfig.getAddress(),
      await loanReceipt.getAddress(),
      insuranceFund.address,
      treasury.address
    );
    await repaymentRouter.waitForDeployment();

    // Deploy FixFlipManager
    const FixFlipManager = await ethers.getContractFactory("FixFlipManager");
    fixFlipManager = await FixFlipManager.deploy(
      await axusd.getAddress(),
      await vault.getAddress(),
      await loanReceipt.getAddress(),
      await riskConfig.getAddress(),
      await repaymentRouter.getAddress()
    );
    await fixFlipManager.waitForDeployment();

    // Deploy ProductRegistry
    const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await ProductRegistry.deploy();
    await productRegistry.waitForDeployment();

    // Register product
    await productRegistry.registerProduct(PRODUCT_ID, await fixFlipManager.getAddress());

    // Grant roles
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
    await vault.grantRole(MANAGER_ROLE, await fixFlipManager.getAddress());
    await vault.grantRole(MANAGER_ROLE, await repaymentRouter.getAddress());
    await loanReceipt.grantRole(MANAGER_ROLE, await fixFlipManager.getAddress());
    await loanReceipt.grantRole(MANAGER_ROLE, await repaymentRouter.getAddress());
  });

  describe("Vault Operations", function () {
    it("Should allow deposits above minimum", async function () {
      const depositAmount = ethers.parseEther("10000");

      await axusd.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, investor1.address);

      expect(await vault.balanceOf(investor1.address)).to.be.gt(0);
      expect(await vault.totalAssets()).to.equal(depositAmount);
    });

    it("Should reject deposits below minimum", async function () {
      const smallAmount = ethers.parseEther("50"); // Below 100 minimum

      await axusd.connect(investor1).approve(await vault.getAddress(), smallAmount);
      await expect(
        vault.connect(investor1).deposit(smallAmount, investor1.address)
      ).to.be.revertedWith("FixFlipPoolVault: below min deposit");
    });

    it("Should enforce withdrawal cooldown", async function () {
      const depositAmount = ethers.parseEther("10000");

      await axusd.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, investor1.address);

      // Try immediate withdrawal - should fail
      await expect(
        vault.connect(investor1).withdraw(depositAmount, investor1.address, investor1.address)
      ).to.be.revertedWith("FixFlipPoolVault: cooldown not elapsed");
    });

    it("Should allow withdrawal after cooldown", async function () {
      const depositAmount = ethers.parseEther("10000");

      await axusd.connect(investor1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(investor1).deposit(depositAmount, investor1.address);

      // Fast forward past cooldown
      await ethers.provider.send("evm_increaseTime", [86400 + 1]); // 1 day + 1 second
      await ethers.provider.send("evm_mine");

      await vault.connect(investor1).withdraw(depositAmount, investor1.address, investor1.address);
      expect(await vault.balanceOf(investor1.address)).to.equal(0);
    });
  });

  describe("Loan Origination", function () {
    beforeEach(async function () {
      // Investors deposit to pool
      const deposit1 = ethers.parseEther("50000");
      const deposit2 = ethers.parseEther("50000");

      await axusd.connect(investor1).approve(await vault.getAddress(), deposit1);
      await vault.connect(investor1).deposit(deposit1, investor1.address);

      await axusd.connect(investor2).approve(await vault.getAddress(), deposit2);
      await vault.connect(investor2).deposit(deposit2, investor2.address);

      // Approve vault to transfer to borrower
      await axusd.connect(owner).approve(await vault.getAddress(), ethers.MaxUint256);
    });

    it("Should originate a loan within parameters", async function () {
      const principal = ethers.parseEther("70000"); // 70% of 100k ARV
      const terms = {
        purchasePrice: ethers.parseEther("80000"),
        afterRepairValue: ethers.parseEther("120000"),
        rehabBudget: ethers.parseEther("20000"),
        termDays: 180,
        collateralHash: ethers.keccak256(ethers.toUtf8Bytes("123 Main St, TX"))
      };

      // Need to transfer from vault to borrower - vault needs approval
      const tx = await fixFlipManager.originate(borrower.address, principal, terms);
      const receipt = await tx.wait();

      expect(await loanReceipt.balanceOf(borrower.address)).to.equal(1);
      expect(await vault.lockedLiquidity()).to.equal(principal);
    });

    it("Should reject loan exceeding max LTV", async function () {
      const principal = ethers.parseEther("90000"); // 90% of 100k ARV - exceeds 70%
      const terms = {
        purchasePrice: ethers.parseEther("80000"),
        afterRepairValue: ethers.parseEther("100000"),
        rehabBudget: ethers.parseEther("20000"),
        termDays: 180,
        collateralHash: ethers.keccak256(ethers.toUtf8Bytes("456 Oak Ave, FL"))
      };

      await expect(
        fixFlipManager.originate(borrower.address, principal, terms)
      ).to.be.revertedWith("FixFlipManager: exceeds max LTV");
    });

    it("Should reject loan below minimum size", async function () {
      const principal = ethers.parseEther("40000"); // Below 50k minimum
      const terms = {
        purchasePrice: ethers.parseEther("50000"),
        afterRepairValue: ethers.parseEther("80000"),
        rehabBudget: ethers.parseEther("10000"),
        termDays: 180,
        collateralHash: ethers.keccak256(ethers.toUtf8Bytes("789 Pine St, TX"))
      };

      await expect(
        fixFlipManager.originate(borrower.address, principal, terms)
      ).to.be.revertedWith("FixFlipManager: below min loan size");
    });
  });

  describe("Repayment Routing", function () {
    it("Should correctly split interest payments", async function () {
      const interestAmount = ethers.parseEther("1000");

      const [toVault, toInsurance, toTreasury] = await repaymentRouter.getRoutingSplit(
        PRODUCT_ID,
        interestAmount
      );

      // 2% to insurance = 20 AXUSD
      expect(toInsurance).to.equal(ethers.parseEther("20"));

      // 1.5% to protocol = 15 AXUSD
      expect(toTreasury).to.equal(ethers.parseEther("15"));

      // Rest to vault = 965 AXUSD
      expect(toVault).to.equal(ethers.parseEther("965"));

      // Sum should equal original
      expect(toVault + toInsurance + toTreasury).to.equal(interestAmount);
    });
  });

  describe("Product Registry", function () {
    it("Should register products correctly", async function () {
      expect(await productRegistry.isRegistered(PRODUCT_ID)).to.be.true;
      expect(await productRegistry.getManager(PRODUCT_ID)).to.equal(
        await fixFlipManager.getAddress()
      );
    });

    it("Should return product count", async function () {
      expect(await productRegistry.getProductCount()).to.equal(1);
    });

    it("Should allow updating manager", async function () {
      const newManager = investor1.address; // Just for testing

      await productRegistry.updateManager(PRODUCT_ID, newManager);
      expect(await productRegistry.getManager(PRODUCT_ID)).to.equal(newManager);
    });
  });

  describe("Risk Configuration", function () {
    it("Should return correct risk parameters", async function () {
      const risk = await riskConfig.getProductRisk(PRODUCT_ID);

      expect(risk.maxLtvBps).to.equal(7000);
      expect(risk.maxTermDays).to.equal(365);
      expect(risk.interestRateBps).to.equal(1400);
      expect(risk.active).to.be.true;
    });

    it("Should allow updating risk parameters", async function () {
      await riskConfig.setProductRisk(PRODUCT_ID, {
        productId: PRODUCT_ID,
        maxLtvBps: 6500, // Reduce to 65%
        maxTermDays: 365,
        maxLoanSize: ethers.parseEther("500000"),
        minLoanSize: ethers.parseEther("50000"),
        originationFeeBps: 300,
        interestRateBps: 1500, // Increase to 15%
        lateFeePerDayBps: 50,
        insuranceReserveBps: 200,
        protocolFeeBps: 150,
        active: true
      });

      const risk = await riskConfig.getProductRisk(PRODUCT_ID);
      expect(risk.maxLtvBps).to.equal(6500);
      expect(risk.interestRateBps).to.equal(1500);
    });
  });
});

// Mock ERC20 for testing
const MockERC20Artifact = {
  abi: [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)"
  ]
};
