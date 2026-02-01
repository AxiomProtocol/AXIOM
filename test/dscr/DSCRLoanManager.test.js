const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DSCR Loan Manager", function () {
  let axusd, vault, loanReceipt, riskConfig, router, manager;
  let owner, underwriter, servicer, borrower, investor;

  const PRODUCT_ID_LOW = 100;
  const PRODUCT_ID_STANDARD = 101;
  const PRODUCT_ID_YIELD = 102;

  beforeEach(async function () {
    [owner, underwriter, servicer, borrower, investor] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol:ERC20PresetMinterPauser");
    axusd = await MockERC20.deploy("AXUSD", "AXUSD");
    await axusd.waitForDeployment();

    const DSCRRiskConfig = await ethers.getContractFactory("contracts/realestate/dscr/DSCRRiskConfig.sol:DSCRRiskConfig");
    riskConfig = await DSCRRiskConfig.deploy();
    await riskConfig.waitForDeployment();

    const DSCRLoanReceiptNFT = await ethers.getContractFactory("contracts/realestate/dscr/DSCRLoanReceiptNFT.sol:DSCRLoanReceiptNFT");
    loanReceipt = await DSCRLoanReceiptNFT.deploy();
    await loanReceipt.waitForDeployment();

    const DSCRPoolVault = await ethers.getContractFactory("contracts/realestate/dscr/DSCRPoolVault.sol:DSCRPoolVault");
    vault = await DSCRPoolVault.deploy(await axusd.getAddress(), "AXUSD DSCR Pool", "axDSCR");
    await vault.waitForDeployment();

    const RepaymentRouter = await ethers.getContractFactory("contracts/realestate/RepaymentRouter.sol:RepaymentRouter");
    router = await RepaymentRouter.deploy(
      await axusd.getAddress(),
      await vault.getAddress(),
      await riskConfig.getAddress(),
      await loanReceipt.getAddress(),
      owner.address,
      owner.address
    );
    await router.waitForDeployment();

    const DSCRLoanManager = await ethers.getContractFactory("contracts/realestate/dscr/DSCRLoanManager.sol:DSCRLoanManager");
    manager = await DSCRLoanManager.deploy(
      await axusd.getAddress(),
      await vault.getAddress(),
      await loanReceipt.getAddress(),
      await riskConfig.getAddress(),
      await router.getAddress()
    );
    await manager.waitForDeployment();

    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const UNDERWRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNDERWRITER_ROLE"));
    const SERVICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SERVICER_ROLE"));

    await vault.grantRole(MANAGER_ROLE, await manager.getAddress());
    await vault.grantRole(MANAGER_ROLE, await router.getAddress());
    await loanReceipt.grantRole(MINTER_ROLE, await manager.getAddress());
    await loanReceipt.grantRole(MANAGER_ROLE, await manager.getAddress());
    await router.grantRole(MANAGER_ROLE, await manager.getAddress());
    await manager.grantRole(UNDERWRITER_ROLE, underwriter.address);
    await manager.grantRole(SERVICER_ROLE, servicer.address);

    await riskConfig.setDSCRProductRisk(PRODUCT_ID_LOW, {
      productId: PRODUCT_ID_LOW,
      maxLtvBps: 6500,
      minDscrBps: 12500,
      interestRateBps: 700,
      originationFeeBps: 100,
      termMonths: 360,
      minLoanSize: ethers.parseEther("50000"),
      maxLoanSize: ethers.parseEther("1000000"),
      maxBorrowerExposure: ethers.parseEther("2000000"),
      insuranceReserveBps: 500,
      protocolFeeBps: 200,
      active: true
    });

    await riskConfig.setDSCRProductRisk(PRODUCT_ID_STANDARD, {
      productId: PRODUCT_ID_STANDARD,
      maxLtvBps: 7000,
      minDscrBps: 12000,
      interestRateBps: 800,
      originationFeeBps: 150,
      termMonths: 360,
      minLoanSize: ethers.parseEther("50000"),
      maxLoanSize: ethers.parseEther("1500000"),
      maxBorrowerExposure: ethers.parseEther("3000000"),
      insuranceReserveBps: 500,
      protocolFeeBps: 200,
      active: true
    });

    const depositAmount = ethers.parseEther("5000000");
    await axusd.mint(investor.address, depositAmount);
    await axusd.connect(investor).approve(await vault.getAddress(), depositAmount);
    await vault.connect(investor).deposit(depositAmount, investor.address);
  });

  describe("Pool Deposit and Withdraw", function () {
    it("should allow deposits and mint shares", async function () {
      const depositAmount = ethers.parseEther("100000");
      await axusd.mint(borrower.address, depositAmount);
      await axusd.connect(borrower).approve(await vault.getAddress(), depositAmount);
      
      await vault.connect(borrower).deposit(depositAmount, borrower.address);
      
      const shares = await vault.balanceOf(borrower.address);
      expect(shares).to.be.gt(0);
    });

    it("should reject deposits below minimum", async function () {
      const depositAmount = ethers.parseEther("100");
      await axusd.mint(borrower.address, depositAmount);
      await axusd.connect(borrower).approve(await vault.getAddress(), depositAmount);
      
      await expect(
        vault.connect(borrower).deposit(depositAmount, borrower.address)
      ).to.be.revertedWith("DSCRPoolVault: below min deposit");
    });

    it("should enforce withdrawal cooldown", async function () {
      const depositAmount = ethers.parseEther("100000");
      await axusd.mint(borrower.address, depositAmount);
      await axusd.connect(borrower).approve(await vault.getAddress(), depositAmount);
      await vault.connect(borrower).deposit(depositAmount, borrower.address);
      
      await expect(
        vault.connect(borrower).withdraw(ethers.parseEther("50000"), borrower.address, borrower.address)
      ).to.be.revertedWith("DSCRPoolVault: cooldown not elapsed");
    });
  });

  describe("Loan Origination", function () {
    it("should originate DSCR loan with passing DSCR and LTV", async function () {
      const principal = ethers.parseEther("200000");
      const appraisedValue = ethers.parseEther("400000");
      const monthlyRent = ethers.parseEther("3500");
      const monthlyExpenses = ethers.parseEther("800");
      const collateralHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-hash"));

      await vault.grantRole(ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE")), await manager.getAddress());

      const tx = await manager.connect(underwriter).originate({
        borrower: borrower.address,
        productId: PRODUCT_ID_LOW,
        principal: principal,
        appraisedValue: appraisedValue,
        monthlyRent: monthlyRent,
        monthlyExpenses: monthlyExpenses,
        collateralHash: collateralHash
      });

      await expect(tx).to.emit(manager, "DSCRLoanFunded");
      
      const loan = await loanReceipt.getDSCRLoan(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.originalPrincipal).to.equal(principal);
    });

    it("should reject loan when DSCR is below threshold", async function () {
      const principal = ethers.parseEther("200000");
      const appraisedValue = ethers.parseEther("400000");
      const monthlyRent = ethers.parseEther("1500");
      const monthlyExpenses = ethers.parseEther("800");
      const collateralHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-hash"));

      await expect(
        manager.connect(underwriter).originate({
          borrower: borrower.address,
          productId: PRODUCT_ID_LOW,
          principal: principal,
          appraisedValue: appraisedValue,
          monthlyRent: monthlyRent,
          monthlyExpenses: monthlyExpenses,
          collateralHash: collateralHash
        })
      ).to.be.revertedWith("DSCRLoanManager: DSCR too low");
    });

    it("should reject loan when LTV exceeds threshold", async function () {
      const principal = ethers.parseEther("300000");
      const appraisedValue = ethers.parseEther("400000");
      const monthlyRent = ethers.parseEther("5000");
      const monthlyExpenses = ethers.parseEther("500");
      const collateralHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-hash"));

      await expect(
        manager.connect(underwriter).originate({
          borrower: borrower.address,
          productId: PRODUCT_ID_LOW,
          principal: principal,
          appraisedValue: appraisedValue,
          monthlyRent: monthlyRent,
          monthlyExpenses: monthlyExpenses,
          collateralHash: collateralHash
        })
      ).to.be.revertedWith("DSCRLoanManager: exceeds max LTV");
    });
  });

  describe("Payments", function () {
    let loanId;

    beforeEach(async function () {
      const principal = ethers.parseEther("200000");
      const appraisedValue = ethers.parseEther("400000");
      const monthlyRent = ethers.parseEther("3500");
      const monthlyExpenses = ethers.parseEther("800");
      const collateralHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-hash"));

      const tx = await manager.connect(underwriter).originate({
        borrower: borrower.address,
        productId: PRODUCT_ID_LOW,
        principal: principal,
        appraisedValue: appraisedValue,
        monthlyRent: monthlyRent,
        monthlyExpenses: monthlyExpenses,
        collateralHash: collateralHash
      });

      const receipt = await tx.wait();
      loanId = 1;
    });

    it("should process on-chain payment correctly", async function () {
      const paymentAmount = ethers.parseEther("1500");
      await axusd.mint(borrower.address, paymentAmount);
      await axusd.connect(borrower).approve(await router.getAddress(), paymentAmount);

      await manager.connect(borrower).payOnChain(loanId, paymentAmount);

      const loan = await loanReceipt.getDSCRLoan(loanId);
      expect(loan.totalPrincipalPaid + loan.totalInterestPaid).to.be.gt(0);
    });

    it("should post off-chain payment with reference hash", async function () {
      const paymentAmount = ethers.parseEther("1500");
      const referenceHash = ethers.keccak256(ethers.toUtf8Bytes("wire-transfer-123"));

      const tx = await manager.connect(servicer).postOffChainPayment(
        loanId,
        paymentAmount,
        referenceHash
      );

      await expect(tx).to.emit(manager, "PaymentPosted").withArgs(
        loanId,
        paymentAmount,
        referenceHash,
        servicer.address
      );

      const loan = await loanReceipt.getDSCRLoan(loanId);
      expect(loan.totalPrincipalPaid + loan.totalInterestPaid).to.be.gt(0);
    });

    it("should reject off-chain payment from non-servicer", async function () {
      const paymentAmount = ethers.parseEther("1500");
      const referenceHash = ethers.keccak256(ethers.toUtf8Bytes("wire-transfer-123"));

      await expect(
        manager.connect(borrower).postOffChainPayment(loanId, paymentAmount, referenceHash)
      ).to.be.reverted;
    });
  });

  describe("Monthly Payment Calculation", function () {
    it("should compute correct monthly payment", async function () {
      const principal = ethers.parseEther("200000");
      const aprBps = 700;
      const termMonths = 360;

      const monthlyPayment = await manager.computeMonthlyPayment(principal, aprBps, termMonths);
      
      expect(monthlyPayment).to.be.gt(0);
      expect(monthlyPayment).to.be.lt(principal);
    });

    it("should handle zero interest rate", async function () {
      const principal = ethers.parseEther("120000");
      const aprBps = 0;
      const termMonths = 12;

      const monthlyPayment = await manager.computeMonthlyPayment(principal, aprBps, termMonths);
      
      expect(monthlyPayment).to.equal(principal / BigInt(termMonths));
    });
  });

  describe("Delinquency and Default", function () {
    let loanId;

    beforeEach(async function () {
      const principal = ethers.parseEther("200000");
      const appraisedValue = ethers.parseEther("400000");
      const monthlyRent = ethers.parseEther("3500");
      const monthlyExpenses = ethers.parseEther("800");
      const collateralHash = ethers.keccak256(ethers.toUtf8Bytes("property-docs-hash"));

      await manager.connect(underwriter).originate({
        borrower: borrower.address,
        productId: PRODUCT_ID_LOW,
        principal: principal,
        appraisedValue: appraisedValue,
        monthlyRent: monthlyRent,
        monthlyExpenses: monthlyExpenses,
        collateralHash: collateralHash
      });
      loanId = 1;
    });

    it("should allow servicer to mark loan as delinquent", async function () {
      await manager.connect(servicer).markDelinquent(loanId, 3);
      
      const loan = await loanReceipt.getDSCRLoan(loanId);
      expect(loan.status).to.equal(3);
    });

    it("should require 90 days delinquent before default", async function () {
      await manager.connect(servicer).markDelinquent(loanId, 3);

      await expect(
        manager.markDefault(loanId)
      ).to.be.revertedWith("DSCRLoanManager: must be 90+ days delinquent");
    });

    it("should mark default after 90 days delinquent", async function () {
      await manager.connect(servicer).markDelinquent(loanId, 5);

      await manager.markDefault(loanId);
      
      const loan = await loanReceipt.getDSCRLoan(loanId);
      expect(loan.status).to.equal(6);
    });
  });
});
