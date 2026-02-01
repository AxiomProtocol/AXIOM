const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AxiomSusuHub", function () {
  let susuHub;
  let mockToken;
  let owner;
  let treasury;
  let alice;
  let bob;
  let carol;
  let dave;
  let eve;
  let members;

  const CONTRIBUTION_AMOUNT = ethers.parseEther("100");
  const CYCLE_DURATION = 7 * 24 * 60 * 60; // 1 week
  const GRACE_PERIOD = 24 * 60 * 60; // 1 day
  const PROTOCOL_FEE_BPS = 100; // 1%

  beforeEach(async function () {
    [owner, treasury, alice, bob, carol, dave, eve] = await ethers.getSigners();
    members = [alice, bob, carol, dave, eve];

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Axiom Token", "AXM", 18);
    await mockToken.waitForDeployment();

    // Mint tokens to all members
    for (const member of members) {
      await mockToken.mint(member.address, ethers.parseEther("10000"));
    }

    // Deploy SUSU Hub
    const SusuHub = await ethers.getContractFactory("AxiomSusuHub");
    susuHub = await SusuHub.deploy(treasury.address, owner.address);
    await susuHub.waitForDeployment();

    // Approve SUSU Hub for all members
    for (const member of members) {
      await mockToken.connect(member).approve(await susuHub.getAddress(), ethers.MaxUint256);
    }
  });

  describe("Pool Creation", function () {
    it("should create a pool with valid parameters", async function () {
      const startTime = (await time.latest()) + 3600; // 1 hour from now
      
      const tx = await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5, // memberCount
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false, // sequential order
        true,  // open join
        PROTOCOL_FEE_BPS
      );

      await expect(tx).to.emit(susuHub, "PoolCreated");

      const pool = await susuHub.getPool(1);
      expect(pool.memberCount).to.equal(5);
      expect(pool.contributionAmount).to.equal(CONTRIBUTION_AMOUNT);
      expect(pool.status).to.equal(0); // Pending
    });

    it("should reject pool with invalid member count", async function () {
      const startTime = (await time.latest()) + 3600;
      
      await expect(
        susuHub.connect(alice).createPool(
          await mockToken.getAddress(),
          1, // Invalid: below minimum
          CONTRIBUTION_AMOUNT,
          CYCLE_DURATION,
          startTime,
          false,
          true,
          PROTOCOL_FEE_BPS
        )
      ).to.be.revertedWith("Invalid member count");

      await expect(
        susuHub.connect(alice).createPool(
          await mockToken.getAddress(),
          100, // Invalid: above maximum
          CONTRIBUTION_AMOUNT,
          CYCLE_DURATION,
          startTime,
          false,
          true,
          PROTOCOL_FEE_BPS
        )
      ).to.be.revertedWith("Invalid member count");
    });

    it("should reject pool with past start time", async function () {
      const startTime = (await time.latest()) - 3600;
      
      await expect(
        susuHub.connect(alice).createPool(
          await mockToken.getAddress(),
          5,
          CONTRIBUTION_AMOUNT,
          CYCLE_DURATION,
          startTime,
          false,
          true,
          PROTOCOL_FEE_BPS
        )
      ).to.be.revertedWith("Start time must be future");
    });
  });

  describe("Member Join", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true, // open join
        PROTOCOL_FEE_BPS
      );
      poolId = 1;
    });

    it("should allow members to join open pool", async function () {
      for (const member of members) {
        await expect(susuHub.connect(member).joinPool(poolId))
          .to.emit(susuHub, "MemberJoined")
          .withArgs(poolId, member.address, members.indexOf(member) + 1, await time.latest() + 1);
      }

      const poolMembers = await susuHub.getPoolMembers(poolId);
      expect(poolMembers.length).to.equal(5);
    });

    it("should prevent joining full pool", async function () {
      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }

      await expect(
        susuHub.connect(owner).joinPool(poolId)
      ).to.be.revertedWith("Pool is full");
    });

    it("should prevent double joining", async function () {
      await susuHub.connect(alice).joinPool(poolId);

      await expect(
        susuHub.connect(alice).joinPool(poolId)
      ).to.be.revertedWith("Already a member");
    });
  });

  describe("Pool Start", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }
    });

    it("should start pool when full and time reached", async function () {
      await time.increaseTo(startTime);

      await expect(susuHub.connect(alice).startPool(poolId))
        .to.emit(susuHub, "PoolStarted");

      const pool = await susuHub.getPool(poolId);
      expect(pool.status).to.equal(1); // Active
      expect(pool.currentCycle).to.equal(1);
    });

    it("should not start before start time", async function () {
      await expect(
        susuHub.connect(alice).startPool(poolId)
      ).to.be.revertedWith("Start time not reached");
    });
  });

  describe("Contributions", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false, // sequential order
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }

      await time.increaseTo(startTime);
      await susuHub.connect(alice).startPool(poolId);
    });

    it("should accept contributions from members", async function () {
      for (const member of members) {
        await expect(susuHub.connect(member).contribute(poolId))
          .to.emit(susuHub, "ContributionMade")
          .withArgs(poolId, member.address, 1, CONTRIBUTION_AMOUNT, false);
      }

      const pool = await susuHub.getPool(poolId);
      expect(pool.totalContributed).to.equal(CONTRIBUTION_AMOUNT * BigInt(5));
    });

    it("should prevent double contribution in same cycle", async function () {
      await susuHub.connect(alice).contribute(poolId);

      await expect(
        susuHub.connect(alice).contribute(poolId)
      ).to.be.revertedWith("Already contributed this cycle");
    });

    it("should reject contribution after grace period", async function () {
      await time.increase(CYCLE_DURATION + GRACE_PERIOD + 1);

      await expect(
        susuHub.connect(alice).contribute(poolId)
      ).to.be.revertedWith("Contribution window closed");
    });
  });

  describe("Payouts", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false, // sequential order
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }

      await time.increaseTo(startTime);
      await susuHub.connect(alice).startPool(poolId);
    });

    it("should auto-trigger payout when all contribute", async function () {
      const grossPayout = CONTRIBUTION_AMOUNT * BigInt(5);
      const protocolFee = grossPayout * BigInt(PROTOCOL_FEE_BPS) / BigInt(10000);
      const netPayout = grossPayout - protocolFee;

      const aliceBalanceBefore = await mockToken.balanceOf(alice.address);

      // All members contribute - last one triggers auto-payout
      for (let i = 0; i < members.length - 1; i++) {
        await susuHub.connect(members[i]).contribute(poolId);
      }

      // Last contribution triggers payout
      await expect(susuHub.connect(eve).contribute(poolId))
        .to.emit(susuHub, "PayoutProcessed")
        .withArgs(poolId, alice.address, 1, grossPayout, netPayout, protocolFee);

      const aliceBalanceAfter = await mockToken.balanceOf(alice.address);
      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(netPayout - CONTRIBUTION_AMOUNT);

      // Treasury should receive fee
      const treasuryBalance = await mockToken.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(protocolFee);

      // Pool should advance to cycle 2
      const pool = await susuHub.getPool(poolId);
      expect(pool.currentCycle).to.equal(2);
    });

    it("should complete pool after all cycles", async function () {
      // Run through all 5 cycles
      for (let cycle = 1; cycle <= 5; cycle++) {
        for (const member of members) {
          await susuHub.connect(member).contribute(poolId);
        }
        
        if (cycle < 5) {
          // Advance time to next cycle
          await time.increase(CYCLE_DURATION);
        }
      }

      const pool = await susuHub.getPool(poolId);
      expect(pool.status).to.equal(2); // Completed
      expect(pool.currentCycle).to.equal(5);
    });
  });

  describe("Late Payments", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }

      await time.increaseTo(startTime);
      await susuHub.connect(alice).startPool(poolId);
    });

    it("should charge late fee for late contributions", async function () {
      // Contribute before cycle ends
      await susuHub.connect(alice).contribute(poolId);
      await susuHub.connect(bob).contribute(poolId);
      await susuHub.connect(carol).contribute(poolId);
      await susuHub.connect(dave).contribute(poolId);

      // Move past cycle end but within grace period
      await time.increase(CYCLE_DURATION + 1);

      // Late contribution
      const lateFee = CONTRIBUTION_AMOUNT * BigInt(200) / BigInt(10000); // 2% late fee
      const expectedAmount = CONTRIBUTION_AMOUNT + lateFee;

      await expect(susuHub.connect(eve).contribute(poolId))
        .to.emit(susuHub, "ContributionMade")
        .withArgs(poolId, eve.address, 1, expectedAmount, true);
    });
  });

  describe("Member Exit", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }
    });

    it("should allow exit before pool starts", async function () {
      await expect(susuHub.connect(alice).exitPool(poolId))
        .to.emit(susuHub, "MemberExited")
        .withArgs(poolId, alice.address, false, 0);

      const member = await susuHub.getMember(poolId, alice.address);
      expect(member.status).to.equal(2); // Exited
    });

    it("should forfeit contributions when exiting active pool", async function () {
      await time.increaseTo(startTime);
      await susuHub.connect(alice).startPool(poolId);
      
      // Bob contributes then exits
      await susuHub.connect(bob).contribute(poolId);
      const bobBalanceBefore = await mockToken.balanceOf(bob.address);
      
      await susuHub.connect(bob).exitPool(poolId);
      
      const bobBalanceAfter = await mockToken.balanceOf(bob.address);
      // Should NOT receive refund (forfeited)
      expect(bobBalanceAfter).to.equal(bobBalanceBefore);
    });
  });

  describe("Pool Cancellation", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;
    });

    it("should cancel pending pool and refund", async function () {
      await susuHub.connect(bob).joinPool(poolId);
      await susuHub.connect(carol).joinPool(poolId);

      await expect(susuHub.connect(alice).cancelPool(poolId, "Testing cancellation"))
        .to.emit(susuHub, "PoolCancelled")
        .withArgs(poolId, "Testing cancellation");

      const pool = await susuHub.getPool(poolId);
      expect(pool.status).to.equal(3); // Cancelled
    });
  });

  describe("View Functions", function () {
    let poolId;
    let startTime;

    beforeEach(async function () {
      startTime = (await time.latest()) + 3600;
      await susuHub.connect(alice).createPool(
        await mockToken.getAddress(),
        5,
        CONTRIBUTION_AMOUNT,
        CYCLE_DURATION,
        startTime,
        false,
        true,
        PROTOCOL_FEE_BPS
      );
      poolId = 1;

      for (const member of members) {
        await susuHub.connect(member).joinPool(poolId);
      }

      await time.increaseTo(startTime);
      await susuHub.connect(alice).startPool(poolId);
    });

    it("should return correct payout order", async function () {
      const order = await susuHub.getPayoutOrder(poolId);
      expect(order[0]).to.equal(alice.address);
      expect(order[1]).to.equal(bob.address);
      expect(order.length).to.equal(5);
    });

    it("should return expected payout amounts", async function () {
      const [gross, net, fee] = await susuHub.getExpectedPayout(poolId);
      
      const expectedGross = CONTRIBUTION_AMOUNT * BigInt(5);
      const expectedFee = expectedGross * BigInt(PROTOCOL_FEE_BPS) / BigInt(10000);
      const expectedNet = expectedGross - expectedFee;

      expect(gross).to.equal(expectedGross);
      expect(net).to.equal(expectedNet);
      expect(fee).to.equal(expectedFee);
    });

    it("should return current recipient", async function () {
      const recipient = await susuHub.getCurrentRecipient(poolId);
      expect(recipient).to.equal(alice.address);
    });

    it("should track contribution status", async function () {
      expect(await susuHub.hasContributed(poolId, alice.address)).to.be.false;
      
      await susuHub.connect(alice).contribute(poolId);
      
      expect(await susuHub.hasContributed(poolId, alice.address)).to.be.true;
    });
  });
});

// MockERC20 contract for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
`;
