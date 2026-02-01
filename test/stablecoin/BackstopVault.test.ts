import { expect } from "chai";
import { ethers } from "hardhat";
import { BackstopVault } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BackstopVault", function () {
  let backstopVault: BackstopVault;
  let owner: SignerWithAddress;
  let guardian: SignerWithAddress;
  let recipient: SignerWithAddress;

  const MARKET_OPS_LIMIT = ethers.parseEther("100");
  const EMERGENCY_DAILY_LIMIT = ethers.parseEther("50");
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

  beforeEach(async function () {
    [owner, guardian, recipient] = await ethers.getSigners();

    const BackstopVault = await ethers.getContractFactory("BackstopVault");
    backstopVault = await BackstopVault.deploy(MARKET_OPS_LIMIT, EMERGENCY_DAILY_LIMIT);
    await backstopVault.waitForDeployment();

    await backstopVault.grantRole(GUARDIAN_ROLE, guardian.address);

    await owner.sendTransaction({
      to: await backstopVault.getAddress(),
      value: ethers.parseEther("1000")
    });
  });

  describe("Deployment", function () {
    it("Should set correct market ops limit", async function () {
      expect(await backstopVault.marketOpsLimit()).to.equal(MARKET_OPS_LIMIT);
    });

    it("Should set correct emergency daily limit", async function () {
      expect(await backstopVault.emergencyDailyLimit()).to.equal(EMERGENCY_DAILY_LIMIT);
    });

    it("Should not be in emergency mode by default", async function () {
      expect(await backstopVault.isEmergencyMode()).to.be.false;
    });
  });

  describe("Emergency Mode Activation", function () {
    it("Should allow guardian to activate emergency mode", async function () {
      await backstopVault.connect(guardian).activateEmergencyMode();
      expect(await backstopVault.isEmergencyMode()).to.be.true;
    });

    it("Should revert if non-guardian tries to activate", async function () {
      await expect(backstopVault.connect(recipient).activateEmergencyMode()).to.be.reverted;
    });

    it("Should revert if already in emergency mode", async function () {
      await backstopVault.connect(guardian).activateEmergencyMode();
      await expect(backstopVault.connect(guardian).activateEmergencyMode())
        .to.be.revertedWith("BackstopVault: already emergency");
    });
  });

  describe("Emergency Withdrawal - Timelock Enforcement", function () {
    beforeEach(async function () {
      await backstopVault.connect(guardian).activateEmergencyMode();
    });

    it("Should revert direct emergencyWithdraw - must use timelock", async function () {
      await expect(
        backstopVault.emergencyWithdraw(recipient.address, ethers.parseEther("10"), "test")
      ).to.be.revertedWith("BackstopVault: use executeEmergencyWithdraw with timelock");
    });

    it("Should allow queueing emergency withdrawal", async function () {
      const amount = ethers.parseEther("10");
      const reason = "emergency fund recovery";

      const tx = await backstopVault.connect(guardian).queueEmergencyWithdraw(
        recipient.address,
        amount,
        reason
      );

      await expect(tx).to.emit(backstopVault, "EmergencyWithdrawalQueued");
    });

    it("Should prevent execution before timelock expires", async function () {
      const amount = ethers.parseEther("10");
      const reason = "emergency fund recovery";

      const tx = await backstopVault.connect(guardian).queueEmergencyWithdraw(
        recipient.address,
        amount,
        reason
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const queueTimestamp = block!.timestamp;

      const withdrawalId = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "uint256"],
        [recipient.address, amount, reason, queueTimestamp]
      );

      await expect(
        backstopVault.executeEmergencyWithdraw(
          withdrawalId,
          recipient.address,
          amount,
          reason,
          queueTimestamp
        )
      ).to.be.revertedWith("BackstopVault: timelock active");
    });

    it("Should allow execution after 24 hour timelock", async function () {
      const amount = ethers.parseEther("10");
      const reason = "emergency fund recovery";

      const tx = await backstopVault.connect(guardian).queueEmergencyWithdraw(
        recipient.address,
        amount,
        reason
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const queueTimestamp = block!.timestamp;

      const withdrawalId = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "uint256"],
        [recipient.address, amount, reason, queueTimestamp]
      );

      await time.increase(24 * 60 * 60 + 1);

      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      await backstopVault.executeEmergencyWithdraw(
        withdrawalId,
        recipient.address,
        amount,
        reason,
        queueTimestamp
      );

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should prevent double execution", async function () {
      const amount = ethers.parseEther("10");
      const reason = "emergency fund recovery";

      const tx = await backstopVault.connect(guardian).queueEmergencyWithdraw(
        recipient.address,
        amount,
        reason
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const queueTimestamp = block!.timestamp;

      const withdrawalId = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "uint256"],
        [recipient.address, amount, reason, queueTimestamp]
      );

      await time.increase(24 * 60 * 60 + 1);

      await backstopVault.executeEmergencyWithdraw(
        withdrawalId,
        recipient.address,
        amount,
        reason,
        queueTimestamp
      );

      await expect(
        backstopVault.executeEmergencyWithdraw(
          withdrawalId,
          recipient.address,
          amount,
          reason,
          queueTimestamp
        )
      ).to.be.revertedWith("BackstopVault: not queued");
    });

    it("Should reject execution with wrong parameters", async function () {
      const amount = ethers.parseEther("10");
      const reason = "emergency fund recovery";

      const tx = await backstopVault.connect(guardian).queueEmergencyWithdraw(
        recipient.address,
        amount,
        reason
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const queueTimestamp = block!.timestamp;

      const withdrawalId = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "uint256"],
        [recipient.address, amount, reason, queueTimestamp]
      );

      await time.increase(24 * 60 * 60 + 1);

      await expect(
        backstopVault.executeEmergencyWithdraw(
          withdrawalId,
          recipient.address,
          ethers.parseEther("20"),
          reason,
          queueTimestamp
        )
      ).to.be.revertedWith("BackstopVault: invalid withdrawal params");
    });
  });

  describe("Market Operations", function () {
    it("Should reject market ops when in emergency mode", async function () {
      await backstopVault.connect(guardian).activateEmergencyMode();
      
      const MARKET_OPS_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKET_OPS_ROLE"));
      await backstopVault.grantRole(MARKET_OPS_ROLE, owner.address);

      await expect(
        backstopVault.withdrawForMarketOps(ethers.parseEther("10"))
      ).to.be.revertedWith("BackstopVault: emergency mode active");
    });
  });
});
