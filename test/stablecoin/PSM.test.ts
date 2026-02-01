import { expect } from "chai";
import { ethers } from "hardhat";
import { AxiomStable, PSM } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PSM", function () {
  let axusd: AxiomStable;
  let mockUSDC: AxiomStable;
  let psm: PSM;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const MINT_FEE = 10;
  const REDEEM_FEE = 10;
  const DEBT_CEILING = ethers.parseUnits("1000000", 6);

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const AxiomStable = await ethers.getContractFactory("AxiomStable");
    axusd = await AxiomStable.deploy();
    mockUSDC = await AxiomStable.deploy();

    const PSM = await ethers.getContractFactory("PSM");
    psm = await PSM.deploy(
      await axusd.getAddress(),
      await mockUSDC.getAddress(),
      6,
      MINT_FEE,
      REDEEM_FEE,
      DEBT_CEILING
    );

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));

    await axusd.grantRole(MINTER_ROLE, await psm.getAddress());
    await axusd.grantRole(BURNER_ROLE, await psm.getAddress());
    await mockUSDC.grantRole(MINTER_ROLE, owner.address);
  });

  describe("Deployment", function () {
    it("Should set correct fees", async function () {
      expect(await psm.mintFee()).to.equal(MINT_FEE);
      expect(await psm.redeemFee()).to.equal(REDEEM_FEE);
    });

    it("Should set correct debt ceiling", async function () {
      expect(await psm.debtCeiling()).to.equal(DEBT_CEILING);
    });

    it("Should start with zero debt outstanding", async function () {
      expect(await psm.debtOutstanding()).to.equal(0);
    });
  });

  describe("Swap Quotes", function () {
    it("Should calculate correct USDC to AXUSD quote", async function () {
      const usdcAmount = ethers.parseUnits("1000", 6);
      const [amountOut, fee] = await psm.getSwapQuote(usdcAmount, false);
      
      const expectedAxusd = ethers.parseEther("1000");
      const expectedFee = (expectedAxusd * BigInt(MINT_FEE)) / BigInt(10000);
      
      expect(amountOut).to.equal(expectedAxusd - expectedFee);
      expect(fee).to.equal(expectedFee);
    });

    it("Should calculate correct AXUSD to USDC quote", async function () {
      const axusdAmount = ethers.parseEther("1000");
      const [amountOut, fee] = await psm.getSwapQuote(axusdAmount, true);
      
      const expectedFee = (axusdAmount * BigInt(REDEEM_FEE)) / BigInt(10000);
      const axusdAfterFee = axusdAmount - expectedFee;
      const expectedUsdc = axusdAfterFee / BigInt(10 ** 12);
      
      expect(amountOut).to.equal(expectedUsdc);
      expect(fee).to.equal(expectedFee);
    });
  });

  describe("Fee Management", function () {
    it("Should allow admin to update fees", async function () {
      await psm.setFees(20, 20);
      expect(await psm.mintFee()).to.equal(20);
      expect(await psm.redeemFee()).to.equal(20);
    });

    it("Should reject fees above maximum", async function () {
      await expect(psm.setFees(200, 10))
        .to.be.revertedWith("PSM: mint fee too high");
    });

    it("Should allow admin to update debt ceiling", async function () {
      const newCeiling = ethers.parseUnits("2000000", 6);
      await psm.setDebtCeiling(newCeiling);
      expect(await psm.debtCeiling()).to.equal(newCeiling);
    });
  });

  describe("Pausing", function () {
    it("Should allow guardian to pause", async function () {
      await psm.pause();
      expect(await psm.paused()).to.be.true;
    });

    it("Should prevent swaps when paused", async function () {
      await psm.pause();
      await expect(
        psm.connect(user).swapCollateralForAXUSD(ethers.parseUnits("100", 6))
      ).to.be.reverted;
    });
  });
});
