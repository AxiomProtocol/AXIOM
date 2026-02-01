import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { GovernanceHub, RiskConfig } from "../typechain-types";

describe("GovernanceHub", function () {
  let governanceHub: GovernanceHub;
  let riskConfig: RiskConfig;
  let admin: SignerWithAddress;
  let riskCommittee: SignerWithAddress;
  let settlementAuth: SignerWithAddress;
  let guardian: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const RISK_COMMITTEE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE"));
  const SETTLEMENT_AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE"));
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));

  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;

  beforeEach(async function () {
    [admin, riskCommittee, settlementAuth, guardian, unauthorized] = await ethers.getSigners();

    const GovernanceHubFactory = await ethers.getContractFactory("GovernanceHub");
    governanceHub = await GovernanceHubFactory.deploy(admin.address);
    await governanceHub.waitForDeployment();

    const RiskConfigFactory = await ethers.getContractFactory("RiskConfig");
    riskConfig = await RiskConfigFactory.deploy();
    await riskConfig.waitForDeployment();

    await governanceHub.connect(admin).grantRole(RISK_COMMITTEE_ROLE, riskCommittee.address);
    await governanceHub.connect(admin).grantRole(SETTLEMENT_AUTHORITY_ROLE, settlementAuth.address);
    await governanceHub.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);

    await governanceHub.connect(admin).authorizeTarget(await riskConfig.getAddress());

    await riskConfig.setGovernanceHub(await governanceHub.getAddress());
    await riskConfig.setGovernanceEnforced(true);
  });

  describe("Deployment", function () {
    it("should set correct default values", async function () {
      expect(await governanceHub.minimumDelay()).to.equal(ONE_DAY);
      expect(await governanceHub.gracePeriod()).to.equal(14 * ONE_DAY);
      expect(await governanceHub.lendingPaused()).to.equal(false);
    });

    it("should grant all roles to admin on deployment", async function () {
      expect(await governanceHub.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await governanceHub.hasRole(RISK_COMMITTEE_ROLE, admin.address)).to.be.true;
      expect(await governanceHub.hasRole(SETTLEMENT_AUTHORITY_ROLE, admin.address)).to.be.true;
      expect(await governanceHub.hasRole(GUARDIAN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Action Proposal", function () {
    it("should allow risk committee to propose risk param update", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      const tx = await governanceHub.connect(riskCommittee).proposeAction(
        0, // RISK_PARAM_UPDATE
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const receipt = await tx.wait();
      expect(receipt?.logs.length).to.be.greaterThan(0);
    });

    it("should revert if eta is too soon", async function () {
      const eta = (await time.latest()) + ONE_HOUR;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      await expect(
        governanceHub.connect(riskCommittee).proposeAction(
          0,
          await riskConfig.getAddress(),
          callData,
          eta
        )
      ).to.be.revertedWith("GovernanceHub: eta too soon");
    });

    it("should revert if unauthorized caller proposes", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      await expect(
        governanceHub.connect(unauthorized).proposeAction(
          0,
          await riskConfig.getAddress(),
          callData,
          eta
        )
      ).to.be.revertedWith("GovernanceHub: not risk committee");
    });

    it("should revert if target is not authorized", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = "0x";

      await expect(
        governanceHub.connect(riskCommittee).proposeAction(
          0,
          unauthorized.address,
          callData,
          eta
        )
      ).to.be.revertedWith("GovernanceHub: unauthorized target");
    });
  });

  describe("Action Execution", function () {
    let actionId: string;
    let eta: number;

    beforeEach(async function () {
      const productRisk = {
        productId: 1,
        maxLtvBps: 7500,
        maxTermDays: 180,
        maxLoanSize: ethers.parseEther("1000000"),
        minLoanSize: ethers.parseEther("50000"),
        originationFeeBps: 200,
        interestRateBps: 1200,
        lateFeePerDayBps: 50,
        insuranceReserveBps: 500,
        protocolFeeBps: 200,
        active: true
      };
      await riskConfig.connect(admin).setProductRisk(1, productRisk);

      eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      const tx = await governanceHub.connect(riskCommittee).proposeAction(
        0,
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governanceHub.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ActionProposed";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = governanceHub.interface.parseLog({ topics: event.topics as string[], data: event.data });
        actionId = parsed?.args.actionId;
      }
    });

    it("should revert execution before eta", async function () {
      await expect(
        governanceHub.connect(riskCommittee).executeAction(actionId)
      ).to.be.revertedWith("GovernanceHub: eta not reached");
    });

    it("should allow execution after eta", async function () {
      await time.increaseTo(eta + 1);

      const tx = await governanceHub.connect(riskCommittee).executeAction(actionId);
      const receipt = await tx.wait();

      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governanceHub.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ActionExecuted";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("should prevent double execution", async function () {
      await time.increaseTo(eta + 1);

      await governanceHub.connect(riskCommittee).executeAction(actionId);

      await expect(
        governanceHub.connect(riskCommittee).executeAction(actionId)
      ).to.be.revertedWith("GovernanceHub: not executable");
    });

    it("should expire after grace period", async function () {
      await time.increaseTo(eta + 14 * ONE_DAY + 1);

      await expect(
        governanceHub.connect(riskCommittee).executeAction(actionId)
      ).to.be.revertedWith("GovernanceHub: action expired");
    });
  });

  describe("Action Cancellation", function () {
    let actionId: string;

    beforeEach(async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      const tx = await governanceHub.connect(riskCommittee).proposeAction(
        0,
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governanceHub.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ActionProposed";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = governanceHub.interface.parseLog({ topics: event.topics as string[], data: event.data });
        actionId = parsed?.args.actionId;
      }
    });

    it("should allow proposer to cancel", async function () {
      await expect(
        governanceHub.connect(riskCommittee).cancelAction(actionId)
      ).to.emit(governanceHub, "ActionCancelled");
    });

    it("should allow guardian to cancel", async function () {
      await expect(
        governanceHub.connect(guardian).cancelAction(actionId)
      ).to.emit(governanceHub, "ActionCancelled");
    });

    it("should allow admin to cancel", async function () {
      await expect(
        governanceHub.connect(admin).cancelAction(actionId)
      ).to.emit(governanceHub, "ActionCancelled");
    });

    it("should prevent unauthorized cancellation", async function () {
      await expect(
        governanceHub.connect(unauthorized).cancelAction(actionId)
      ).to.be.revertedWith("GovernanceHub: not authorized to cancel");
    });
  });

  describe("Emergency Pause", function () {
    it("should allow guardian to pause immediately", async function () {
      await expect(
        governanceHub.connect(guardian).pauseLending()
      ).to.emit(governanceHub, "LendingPaused");

      expect(await governanceHub.lendingPaused()).to.be.true;
    });

    it("should prevent non-guardian from pausing", async function () {
      await expect(
        governanceHub.connect(unauthorized).pauseLending()
      ).to.be.revertedWith("GovernanceHub: not guardian");
    });

    it("should allow admin to unpause", async function () {
      await governanceHub.connect(guardian).pauseLending();

      await expect(
        governanceHub.connect(admin).unpauseLending()
      ).to.emit(governanceHub, "LendingUnpaused");

      expect(await governanceHub.lendingPaused()).to.be.false;
    });

    it("should allow settlement authority to unpause", async function () {
      await governanceHub.connect(guardian).pauseLending();

      await expect(
        governanceHub.connect(settlementAuth).unpauseLending()
      ).to.emit(governanceHub, "LendingUnpaused");
    });

    it("should prevent guardian from unpausing alone", async function () {
      await governanceHub.connect(guardian).pauseLending();

      await governanceHub.connect(admin).revokeRole(DEFAULT_ADMIN_ROLE, guardian.address);
      await governanceHub.connect(admin).revokeRole(SETTLEMENT_AUTHORITY_ROLE, guardian.address);

      await expect(
        governanceHub.connect(guardian).unpauseLending()
      ).to.be.revertedWith("GovernanceHub: not authorized");
    });
  });

  describe("Integrated RiskConfig Governance", function () {
    it("should block risk param updates when lending is paused", async function () {
      await governanceHub.connect(guardian).pauseLending();

      const productRisk = {
        productId: 1,
        maxLtvBps: 7500,
        maxTermDays: 180,
        maxLoanSize: ethers.parseEther("1000000"),
        minLoanSize: ethers.parseEther("50000"),
        originationFeeBps: 200,
        interestRateBps: 1200,
        lateFeePerDayBps: 50,
        insuranceReserveBps: 500,
        protocolFeeBps: 200,
        active: true
      };

      await expect(
        riskConfig.connect(admin).setProductRisk(1, productRisk)
      ).to.be.revertedWith("RiskConfig: lending paused");
    });

    it("should allow governance hub to update risk params via timelock", async function () {
      const productRisk = {
        productId: 2,
        maxLtvBps: 7000,
        maxTermDays: 120,
        maxLoanSize: ethers.parseEther("500000"),
        minLoanSize: ethers.parseEther("25000"),
        originationFeeBps: 150,
        interestRateBps: 1000,
        lateFeePerDayBps: 40,
        insuranceReserveBps: 400,
        protocolFeeBps: 150,
        active: true
      };

      const callData = riskConfig.interface.encodeFunctionData("setProductRisk", [2, productRisk]);
      const eta = (await time.latest()) + ONE_DAY + 100;

      const tx = await governanceHub.connect(riskCommittee).proposeAction(
        0,
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governanceHub.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ActionProposed";
        } catch {
          return false;
        }
      });

      let actionId: string = "";
      if (event) {
        const parsed = governanceHub.interface.parseLog({ topics: event.topics as string[], data: event.data });
        actionId = parsed?.args.actionId;
      }

      await time.increaseTo(eta + 1);

      await governanceHub.connect(riskCommittee).executeAction(actionId);

      const risk = await riskConfig.getProductRisk(2);
      expect(risk.maxLtvBps).to.equal(7000);
      expect(risk.active).to.be.true;
    });
  });

  describe("View Functions", function () {
    it("should return pending actions", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      await governanceHub.connect(riskCommittee).proposeAction(
        0,
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const pendingActions = await governanceHub.getPendingActions();
      expect(pendingActions.length).to.equal(1);
    });

    it("should return authorized targets", async function () {
      const targets = await governanceHub.getAuthorizedTargets();
      expect(targets.length).to.equal(1);
      expect(targets[0]).to.equal(await riskConfig.getAddress());
    });

    it("should return correct action state", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      const tx = await governanceHub.connect(riskCommittee).proposeAction(
        0,
        await riskConfig.getAddress(),
        callData,
        eta
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governanceHub.interface.parseLog({ topics: log.topics as string[], data: log.data });
          return parsed?.name === "ActionProposed";
        } catch {
          return false;
        }
      });

      let actionId: string = "";
      if (event) {
        const parsed = governanceHub.interface.parseLog({ topics: event.topics as string[], data: event.data });
        actionId = parsed?.args.actionId;
      }

      expect(await governanceHub.getActionState(actionId)).to.equal(0);

      await time.increaseTo(eta + 1);

      expect(await governanceHub.getActionState(actionId)).to.equal(1);
    });
  });

  describe("Events", function () {
    it("should emit ActionProposed with correct parameters", async function () {
      const eta = (await time.latest()) + ONE_DAY + 100;
      const callData = riskConfig.interface.encodeFunctionData("activateProduct", [1]);

      await expect(
        governanceHub.connect(riskCommittee).proposeAction(
          0,
          await riskConfig.getAddress(),
          callData,
          eta
        )
      ).to.emit(governanceHub, "ActionProposed");
    });

    it("should emit LendingPaused when paused", async function () {
      await expect(governanceHub.connect(guardian).pauseLending())
        .to.emit(governanceHub, "LendingPaused")
        .withArgs(guardian.address);
    });

    it("should emit LendingUnpaused when unpaused", async function () {
      await governanceHub.connect(guardian).pauseLending();

      await expect(governanceHub.connect(admin).unpauseLending())
        .to.emit(governanceHub, "LendingUnpaused")
        .withArgs(admin.address);
    });
  });
});
