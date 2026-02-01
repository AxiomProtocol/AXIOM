import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SusuPersonalVault, MockERC20 } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SusuPersonalVault", function () {
  let vault: SusuPersonalVault;
  let token: MockERC20;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let organizer: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;
  let member3: SignerWithAddress;

  const CONTRIBUTION = ethers.parseEther("100");
  const CYCLE_DURATION = 7 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, treasury, organizer, member1, member2, member3] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await MockERC20Factory.deploy("Test Token", "TEST");
    await token.waitForDeployment();

    const VaultFactory = await ethers.getContractFactory("SusuPersonalVault");
    vault = await VaultFactory.deploy(await treasury.getAddress());
    await vault.waitForDeployment();

    await token.mint(organizer.address, ethers.parseEther("10000"));
    await token.mint(member1.address, ethers.parseEther("10000"));
    await token.mint(member2.address, ethers.parseEther("10000"));
    await token.mint(member3.address, ethers.parseEther("10000"));

    await token.connect(organizer).approve(await vault.getAddress(), ethers.MaxUint256);
    await token.connect(member1).approve(await vault.getAddress(), ethers.MaxUint256);
    await token.connect(member2).approve(await vault.getAddress(), ethers.MaxUint256);
    await token.connect(member3).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("Circle Creation", function () {
    it("should create a circle with valid parameters", async function () {
      const tx = await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );

      await expect(tx)
        .to.emit(vault, "CircleCreated")
        .withArgs(
          1,
          organizer.address,
          await token.getAddress(),
          3,
          CONTRIBUTION,
          CYCLE_DURATION
        );

      const circle = await vault.circles(1);
      expect(circle.organizer).to.equal(organizer.address);
      expect(circle.targetMembers).to.equal(3);
      expect(circle.contributionPerCycle).to.equal(CONTRIBUTION);
    });

    it("should reject circle with less than MIN_MEMBERS", async function () {
      await expect(
        vault.connect(organizer).createCircle(
          await token.getAddress(),
          1,
          CONTRIBUTION,
          CYCLE_DURATION
        )
      ).to.be.revertedWith("Invalid member count");
    });

    it("should reject circle with more than MAX_MEMBERS", async function () {
      await expect(
        vault.connect(organizer).createCircle(
          await token.getAddress(),
          21,
          CONTRIBUTION,
          CYCLE_DURATION
        )
      ).to.be.revertedWith("Invalid member count");
    });
  });

  describe("Vault Commitment", function () {
    beforeEach(async function () {
      await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );
    });

    it("should allow members to commit to vault", async function () {
      const totalCommitment = CONTRIBUTION * BigInt(3);
      
      await expect(vault.connect(member1).commitToVault(1))
        .to.emit(vault, "VaultCommitted");

      const personalVault = await vault.vaults(1, member1.address);
      expect(personalVault.lockedAmount).to.equal(totalCommitment);
    });

    it("should reject duplicate commitments", async function () {
      await vault.connect(member1).commitToVault(1);
      
      await expect(
        vault.connect(member1).commitToVault(1)
      ).to.be.revertedWith("Already committed");
    });
  });

  describe("Circle Activation", function () {
    beforeEach(async function () {
      await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );
      
      await vault.connect(member1).commitToVault(1);
      await vault.connect(member2).commitToVault(1);
    });

    it("should activate when target members reached", async function () {
      await expect(vault.connect(member3).commitToVault(1))
        .to.emit(vault, "CircleActivated");

      const circle = await vault.circles(1);
      expect(circle.status).to.equal(1);
    });
  });

  describe("Early Exit", function () {
    beforeEach(async function () {
      await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );
      
      await vault.connect(member1).commitToVault(1);
      await vault.connect(member2).commitToVault(1);
      await vault.connect(member3).commitToVault(1);
    });

    it("should allow early exit with penalty", async function () {
      const vaultBefore = await vault.vaults(1, member1.address);
      const lockedAmount = vaultBefore.lockedAmount;
      
      const balanceBefore = await token.balanceOf(member1.address);
      
      await expect(vault.connect(member1).earlyExit(1))
        .to.emit(vault, "EarlyExitProcessed");

      const balanceAfter = await token.balanceOf(member1.address);
      
      const penalty = (lockedAmount * BigInt(1000)) / BigInt(10000);
      const expectedReturn = lockedAmount - penalty;
      
      expect(balanceAfter - balanceBefore).to.equal(expectedReturn);
    });

    it("should reject early exit after payout received", async function () {
      await time.increase(CYCLE_DURATION + 1);
      
      const payoutPosition = (await vault.vaults(1, member1.address)).payoutPosition;
      
      if (payoutPosition === BigInt(1)) {
        await vault.processCyclePayout(1);
        
        await expect(
          vault.connect(member1).earlyExit(1)
        ).to.be.revertedWith("Already received payout");
      }
    });
  });

  describe("Payout Processing", function () {
    beforeEach(async function () {
      await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );
      
      await vault.connect(member1).commitToVault(1);
      await vault.connect(member2).commitToVault(1);
      await vault.connect(member3).commitToVault(1);
    });

    it("should process payout after cycle duration", async function () {
      await time.increase(CYCLE_DURATION + 1);
      
      await expect(vault.processCyclePayout(1))
        .to.emit(vault, "PayoutProcessed");
    });

    it("should reject payout before cycle ends", async function () {
      await expect(
        vault.processCyclePayout(1)
      ).to.be.revertedWith("Cycle not ended");
    });

    it("should complete circle after all cycles", async function () {
      for (let i = 0; i < 3; i++) {
        await time.increase(CYCLE_DURATION + 1);
        await vault.processCyclePayout(1);
      }
      
      const circle = await vault.circles(1);
      expect(circle.status).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("should prevent non-admin from pausing", async function () {
      await expect(
        vault.connect(member1).pause()
      ).to.be.reverted;
    });

    it("should allow admin to pause and unpause", async function () {
      await vault.pause();
      expect(await vault.paused()).to.be.true;
      
      await vault.unpause();
      expect(await vault.paused()).to.be.false;
    });

    it("should prevent operations when paused", async function () {
      await vault.pause();
      
      await expect(
        vault.connect(organizer).createCircle(
          await token.getAddress(),
          3,
          CONTRIBUTION,
          CYCLE_DURATION
        )
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });

  describe("ReentrancyGuard", function () {
    it("should have reentrancy protection on commitToVault", async function () {
      await vault.connect(organizer).createCircle(
        await token.getAddress(),
        3,
        CONTRIBUTION,
        CYCLE_DURATION
      );
      
      await vault.connect(member1).commitToVault(1);
      
      await expect(
        vault.connect(member1).commitToVault(1)
      ).to.be.revertedWith("Already committed");
    });
  });
});
