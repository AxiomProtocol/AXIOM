import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("AxiomExchangeHubV2", function () {
  async function deployFixture() {
    const [owner, user1, user2, treasury] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockToken.deploy("Token A", "TKA", 18);
    const tokenB = await MockToken.deploy("Token B", "TKB", 18);

    const ExchangeHub = await ethers.getContractFactory("AxiomExchangeHubV2");
    const exchange = await upgrades.deployProxy(ExchangeHub, [
      owner.address,
      treasury.address,
      30
    ]);

    const OPERATOR_ROLE = await exchange.OPERATOR_ROLE();
    await exchange.grantRole(OPERATOR_ROLE, owner.address);

    const mintAmount = ethers.parseEther("1000000");
    await tokenA.mint(owner.address, mintAmount);
    await tokenA.mint(user1.address, mintAmount);
    await tokenB.mint(owner.address, mintAmount);
    await tokenB.mint(user1.address, mintAmount);

    await tokenA.approve(await exchange.getAddress(), mintAmount);
    await tokenB.approve(await exchange.getAddress(), mintAmount);
    await tokenA.connect(user1).approve(await exchange.getAddress(), mintAmount);
    await tokenB.connect(user1).approve(await exchange.getAddress(), mintAmount);

    return { exchange, tokenA, tokenB, owner, user1, user2, treasury };
  }

  describe("Pool Creation", function () {
    it("Should create a pool successfully", async function () {
      const { exchange, tokenA, tokenB, owner } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");

      await expect(exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      )).to.emit(exchange, "PoolCreated");

      const totalPools = await exchange.totalPools();
      expect(totalPools).to.equal(1);
    });
  });

  describe("Add Liquidity (Refactored)", function () {
    it("Should add liquidity successfully", async function () {
      const { exchange, tokenA, tokenB, owner, user1 } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const addAmtA = ethers.parseEther("1000");
      const addAmtB = ethers.parseEther("1000");

      await expect(exchange.connect(user1).addLiquidity(
        1,
        addAmtA,
        addAmtB,
        0,
        deadline
      )).to.emit(exchange, "LiquidityAdded");
    });
  });

  describe("Swap (Refactored)", function () {
    it("Should swap tokens successfully", async function () {
      const { exchange, tokenA, tokenB, owner, user1 } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("100");
      const balBefore = await tokenB.balanceOf(user1.address);

      await expect(exchange.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        0,
        deadline
      )).to.emit(exchange, "Swap");

      const balAfter = await tokenB.balanceOf(user1.address);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("Should enforce slippage protection", async function () {
      const { exchange, tokenA, tokenB, owner, user1 } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const swapAmt = ethers.parseEther("100");
      const unreasonableMinOut = ethers.parseEther("1000");

      await expect(exchange.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        swapAmt,
        unreasonableMinOut,
        deadline
      )).to.be.revertedWith("Slippage");
    });

    it("Should enforce price impact limit", async function () {
      const { exchange, tokenA, tokenB, owner, user1 } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const largeSwap = ethers.parseEther("5000");

      await expect(exchange.connect(user1).swap(
        1,
        await tokenA.getAddress(),
        largeSwap,
        0,
        deadline
      )).to.be.revertedWith("High impact");
    });
  });

  describe("Remove Liquidity", function () {
    it("Should remove liquidity successfully", async function () {
      const { exchange, tokenA, tokenB, owner } = await loadFixture(deployFixture);
      
      const amtA = ethers.parseEther("10000");
      const amtB = ethers.parseEther("10000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await exchange.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amtA,
        amtB
      );

      const liq = await exchange.liquidityBalances(1, owner.address);
      const removeLiq = liq / 10n;

      await expect(exchange.removeLiquidity(
        1,
        removeLiq,
        0,
        0,
        deadline
      )).to.emit(exchange, "LiquidityRemoved");
    });
  });
});
