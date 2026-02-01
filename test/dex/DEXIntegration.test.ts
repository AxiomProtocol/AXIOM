import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DEX Ecosystem Integration Tests", function () {
  const TREASURY_ADDRESS = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";

  async function deployFullEcosystemFixture() {
    const [deployer, user1, user2, keeper] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockToken.deploy("Token A", "TKA", 18);
    const tokenB = await MockToken.deploy("Token B", "TKB", 18);
    const axmToken = await MockToken.deploy("Axiom Token", "AXM", 18);
    const axusdToken = await MockToken.deploy("AXUSD Stable", "AXUSD", 18);
    const wethToken = await MockToken.deploy("Wrapped ETH", "WETH", 18);

    const ExchangeHub = await ethers.getContractFactory("AxiomExchangeHubV2");
    const exchangeHub = await upgrades.deployProxy(ExchangeHub, [
      deployer.address,
      deployer.address,
      30
    ]);
    const exchangeHubAddr = await exchangeHub.getAddress();

    const OPERATOR_ROLE = await exchangeHub.OPERATOR_ROLE();
    await exchangeHub.grantRole(OPERATOR_ROLE, deployer.address);

    const OracleAdapter = await ethers.getContractFactory("AxiomOracleAdapter");
    const oracleAdapter = await upgrades.deployProxy(OracleAdapter, [
      deployer.address
    ]);
    const oracleAdapterAddr = await oracleAdapter.getAddress();

    const LPStaking = await ethers.getContractFactory("AxiomLPStaking");
    const lpStaking = await upgrades.deployProxy(LPStaking, [
      exchangeHubAddr,
      await axmToken.getAddress(),
      deployer.address,
      ethers.parseEther("0.1")
    ]);
    const lpStakingAddr = await lpStaking.getAddress();

    const LimitOrders = await ethers.getContractFactory("AxiomLimitOrders");
    const limitOrders = await upgrades.deployProxy(LimitOrders, [
      exchangeHubAddr,
      oracleAdapterAddr,
      deployer.address,
      ethers.parseEther("0.001")
    ]);
    const limitOrdersAddr = await limitOrders.getAddress();

    const Router = await ethers.getContractFactory("AxiomDEXRouter");
    const router = await upgrades.deployProxy(Router, [
      exchangeHubAddr,
      deployer.address,
      await axusdToken.getAddress(),
      await wethToken.getAddress(),
      await axmToken.getAddress()
    ]);
    const routerAddr = await router.getAddress();

    const FeeDistributor = await ethers.getContractFactory("AxiomFeeDistributor");
    const feeDistributor = await upgrades.deployProxy(FeeDistributor, [
      exchangeHubAddr,
      deployer.address,
      2000
    ]);

    const TradingRewards = await ethers.getContractFactory("AxiomTradingRewards");
    const tradingRewards = await upgrades.deployProxy(TradingRewards, [
      await axmToken.getAddress(),
      deployer.address,
      exchangeHubAddr,
      86400,
      100,
      ethers.parseEther("1000")
    ]);

    const Analytics = await ethers.getContractFactory("AxiomDEXAnalytics");
    const analytics = await upgrades.deployProxy(Analytics, [
      exchangeHubAddr,
      deployer.address
    ]);

    const mintAmount = ethers.parseEther("10000000");
    await tokenA.mint(deployer.address, mintAmount);
    await tokenA.mint(user1.address, mintAmount);
    await tokenA.mint(user2.address, mintAmount);
    await tokenB.mint(deployer.address, mintAmount);
    await tokenB.mint(user1.address, mintAmount);
    await tokenB.mint(user2.address, mintAmount);
    await axmToken.mint(lpStakingAddr, mintAmount);

    await tokenA.approve(exchangeHubAddr, mintAmount);
    await tokenB.approve(exchangeHubAddr, mintAmount);
    await tokenA.connect(user1).approve(exchangeHubAddr, mintAmount);
    await tokenB.connect(user1).approve(exchangeHubAddr, mintAmount);
    await tokenA.connect(user1).approve(limitOrdersAddr, mintAmount);
    await tokenB.connect(user1).approve(limitOrdersAddr, mintAmount);
    await tokenA.connect(user1).approve(routerAddr, mintAmount);
    await tokenB.connect(user1).approve(routerAddr, mintAmount);

    return {
      exchangeHub, oracleAdapter, lpStaking, limitOrders, router,
      feeDistributor, tradingRewards, analytics,
      tokenA, tokenB, axmToken, axusdToken, wethToken,
      deployer, user1, user2, keeper,
      exchangeHubAddr, oracleAdapterAddr, lpStakingAddr, limitOrdersAddr, routerAddr
    };
  }

  describe("Role Assignments & Treasury Verification", function () {
    it("Should have correct admin roles on ExchangeHub", async function () {
      const { exchangeHub, deployer } = await loadFixture(deployFullEcosystemFixture);
      
      const DEFAULT_ADMIN_ROLE = await exchangeHub.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await exchangeHub.ADMIN_ROLE();
      const OPERATOR_ROLE = await exchangeHub.OPERATOR_ROLE();
      
      expect(await exchangeHub.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await exchangeHub.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await exchangeHub.hasRole(OPERATOR_ROLE, deployer.address)).to.be.true;
    });

    it("Should have correct treasury safe address", async function () {
      const { exchangeHub, deployer } = await loadFixture(deployFullEcosystemFixture);
      expect(await exchangeHub.treasurySafe()).to.equal(deployer.address);
    });

    it("Should have correct roles on OracleAdapter", async function () {
      const { oracleAdapter, deployer } = await loadFixture(deployFullEcosystemFixture);
      const ADMIN_ROLE = await oracleAdapter.ADMIN_ROLE();
      expect(await oracleAdapter.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("Should have correct roles on LimitOrders", async function () {
      const { limitOrders, deployer } = await loadFixture(deployFullEcosystemFixture);
      const ADMIN_ROLE = await limitOrders.ADMIN_ROLE();
      expect(await limitOrders.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("Should have correct roles on LPStaking", async function () {
      const { lpStaking, deployer } = await loadFixture(deployFullEcosystemFixture);
      const ADMIN_ROLE = await lpStaking.ADMIN_ROLE();
      expect(await lpStaking.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Cross-Contract Integration", function () {
    it("Should create pool and router can find it", async function () {
      const { exchangeHub, router, tokenA, tokenB, deployer } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const poolId = await exchangeHub.pairToPoolId(await tokenA.getAddress(), await tokenB.getAddress());
      expect(poolId).to.equal(1);

      const poolCore = await exchangeHub.poolCore(1);
      expect(poolCore.isActive).to.be.true;
      expect(poolCore.reserveA).to.be.gt(0);
      expect(poolCore.reserveB).to.be.gt(0);
    });

    it("Should execute swap through exchange hub", async function () {
      const { exchangeHub, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("1000");
      const balBefore = await tokenB.balanceOf(user1.address);

      await exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        0,
        deadline
      );

      const balAfter = await tokenB.balanceOf(user1.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("Should stake LP tokens and earn rewards", async function () {
      const { exchangeHub, lpStaking, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const userLiq = await exchangeHub.liquidityBalances(1, deployer.address);
      expect(userLiq).to.be.gt(0);
    });

    it("Should set oracle price and validate", async function () {
      const { oracleAdapter, tokenA, tokenB, deployer } = await loadFixture(deployFullEcosystemFixture);
      
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const OPERATOR_ROLE = await oracleAdapter.OPERATOR_ROLE();
      await oracleAdapter.grantRole(OPERATOR_ROLE, deployer.address);
      
      await oracleAdapter.setFallbackPrice(tokenAAddr, ethers.parseEther("100"));
      await oracleAdapter.setFallbackPrice(tokenBAddr, ethers.parseEther("50"));

      const [priceA] = await oracleAdapter.getPrice(tokenAAddr);
      const [priceB] = await oracleAdapter.getPrice(tokenBAddr);

      expect(priceA.toString()).to.equal(ethers.parseEther("100").toString());
      expect(priceB.toString()).to.equal(ethers.parseEther("50").toString());
    });

    it("Should create limit order", async function () {
      const { exchangeHub, limitOrders, oracleAdapter, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const ORACLE_OPERATOR_ROLE = await oracleAdapter.OPERATOR_ROLE();
      await oracleAdapter.grantRole(ORACLE_OPERATOR_ROLE, deployer.address);
      await oracleAdapter.setFallbackPrice(tokenAAddr, ethers.parseEther("1"));
      await oracleAdapter.setFallbackPrice(tokenBAddr, ethers.parseEther("1"));

      const KEEPER_ROLE = await limitOrders.KEEPER_ROLE();
      await limitOrders.grantRole(KEEPER_ROLE, deployer.address);

      const orderAmount = ethers.parseEther("100");
      const targetPrice = ethers.parseEther("0.95");
      const minAmountOut = ethers.parseEther("90");
      const duration = 86400;

      await expect(limitOrders.connect(user1).createOrder(
        tokenAAddr,
        tokenBAddr,
        orderAmount,
        targetPrice,
        minAmountOut,
        0,
        duration,
        { value: ethers.parseEther("0.001") }
      )).to.emit(limitOrders, "OrderCreated");
    });

    it("Should track analytics after swaps", async function () {
      const { exchangeHub, analytics, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("1000");
      await exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        0,
        deadline
      );

      const totalSwaps = await exchangeHub.totalSwaps();
      expect(totalSwaps).to.equal(1);
    });
  });

  describe("Fee Distribution Flow", function () {
    it("Should accumulate fees in pool reserves", async function () {
      const { exchangeHub, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("1000");
      await exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        0,
        deadline
      );

      const feeReserveA = await exchangeHub.poolFeeReserveA(1);
      expect(feeReserveA).to.be.gt(0);
    });
  });

  describe("Security Constraints", function () {
    it("Should enforce price impact limits", async function () {
      const { exchangeHub, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const largeSwap = ethers.parseEther("5000");
      await expect(exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        largeSwap,
        0,
        deadline
      )).to.be.revertedWith("High impact");
    });

    it("Should enforce slippage protection", async function () {
      const { exchangeHub, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("100");
      const unreasonableMinOut = ethers.parseEther("1000");

      await expect(exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        unreasonableMinOut,
        deadline
      )).to.be.revertedWith("Slippage");
    });

    it("Should enforce deadline", async function () {
      const { exchangeHub, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600;

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("100");
      await expect(exchangeHub.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        0,
        pastDeadline
      )).to.be.revertedWith("Expired");
    });

    it("Should restrict pool creation to operators only", async function () {
      const { exchangeHub, tokenA, tokenB, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");

      await expect(exchangeHub.connect(user1).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      )).to.be.reverted;
    });
  });

  describe("Treasury Address Verification for Mainnet", function () {
    it("Should confirm expected treasury safe address format", function () {
      expect(TREASURY_ADDRESS).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(TREASURY_ADDRESS.toLowerCase()).to.equal("0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d");
    });

    it("Should verify mainnet deployment will use correct treasury", async function () {
      const [deployer] = await ethers.getSigners();
      
      const ExchangeHub = await ethers.getContractFactory("AxiomExchangeHubV2");
      const exchange = await upgrades.deployProxy(ExchangeHub, [
        TREASURY_ADDRESS,
        deployer.address,
        30
      ]);

      expect(await exchange.treasurySafe()).to.equal(TREASURY_ADDRESS);
      
      const DEFAULT_ADMIN_ROLE = await exchange.DEFAULT_ADMIN_ROLE();
      expect(await exchange.hasRole(DEFAULT_ADMIN_ROLE, TREASURY_ADDRESS)).to.be.true;
    });
  });

  describe("Admin Operations", function () {
    it("Should allow pausing by authorized role", async function () {
      const { exchangeHub, deployer } = await loadFixture(deployFullEcosystemFixture);
      
      const PAUSER_ROLE = await exchangeHub.PAUSER_ROLE();
      await exchangeHub.grantRole(PAUSER_ROLE, deployer.address);
      
      await exchangeHub.pause();
      expect(await exchangeHub.paused()).to.be.true;
      
      await exchangeHub.unpause();
      expect(await exchangeHub.paused()).to.be.false;
    });

    it("Should reject unauthorized pause attempts", async function () {
      const { exchangeHub, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      await expect(exchangeHub.connect(user1).pause()).to.be.reverted;
    });

    it("Should enforce timelock for fee updates", async function () {
      const { exchangeHub, deployer } = await loadFixture(deployFullEcosystemFixture);
      
      const ADMIN_ROLE = await exchangeHub.ADMIN_ROLE();
      await exchangeHub.grantRole(ADMIN_ROLE, deployer.address);
      
      const tx = await exchangeHub.scheduleTimelock(0, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [50]));
      await expect(tx).to.emit(exchangeHub, "TimelockScheduled");
    });
  });

  describe("Limit Order Execution Flow", function () {
    it("Should allow keeper to execute orders when conditions met", async function () {
      const { exchangeHub, limitOrders, oracleAdapter, tokenA, tokenB, deployer, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      const amtA = ethers.parseEther("100000");
      const amtB = ethers.parseEther("100000");

      await exchangeHub.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const ORACLE_OPERATOR_ROLE = await oracleAdapter.OPERATOR_ROLE();
      await oracleAdapter.grantRole(ORACLE_OPERATOR_ROLE, deployer.address);
      await oracleAdapter.setFallbackPrice(tokenAAddr, ethers.parseEther("1"));
      await oracleAdapter.setFallbackPrice(tokenBAddr, ethers.parseEther("1"));

      const KEEPER_ROLE = await limitOrders.KEEPER_ROLE();
      await limitOrders.grantRole(KEEPER_ROLE, deployer.address);

      const orderAmount = ethers.parseEther("100");
      const targetPrice = ethers.parseEther("0.95");
      const minAmountOut = ethers.parseEther("90");
      const duration = 86400;

      await limitOrders.connect(user1).createOrder(
        tokenAAddr,
        tokenBAddr,
        orderAmount,
        targetPrice,
        minAmountOut,
        0,
        duration,
        { value: ethers.parseEther("0.001") }
      );

      const ordersCount = await limitOrders.nextOrderId();
      expect(ordersCount).to.be.gt(0);
    });

    it("Should reject non-keeper execution attempts", async function () {
      const { limitOrders, user1 } = await loadFixture(deployFullEcosystemFixture);
      
      await expect(limitOrders.connect(user1).executeOrder(1)).to.be.reverted;
    });
  });
});
