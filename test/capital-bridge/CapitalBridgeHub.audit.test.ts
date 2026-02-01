import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CapitalBridgeHub Audit Harness", function () {
  let hub: any;
  let readinessGate: any;
  let admin: SignerWithAddress;
  let riskCommittee: SignerWithAddress;
  let settlementAuth: SignerWithAddress;
  let attestorA: SignerWithAddress;
  let attestorB: SignerWithAddress;
  let reportingOracle: SignerWithAddress;
  let submitter: SignerWithAddress;

  const RISK_COMMITTEE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE"));
  const SETTLEMENT_AUTHORITY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE"));
  const RESEARCH_ATTESTOR_A_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_A_ROLE"));
  const RESEARCH_ATTESTOR_B_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_B_ROLE"));
  const REPORTING_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPORTING_ORACLE_ROLE"));

  const testHash = ethers.keccak256(ethers.toUtf8Bytes("test-property-data"));
  const testDueDiligenceHash = ethers.keccak256(ethers.toUtf8Bytes("test-due-diligence"));
  const testUnderwritingHash = ethers.keccak256(ethers.toUtf8Bytes("test-underwriting"));
  const testRiskHash = ethers.keccak256(ethers.toUtf8Bytes("test-risk-summary"));
  const testDenetCid = ethers.keccak256(ethers.toUtf8Bytes("test-denet-cid"));
  const testLegalEntityHash = ethers.keccak256(ethers.toUtf8Bytes("test-legal-entity"));
  const testOperatingAgreementHash = ethers.keccak256(ethers.toUtf8Bytes("test-operating-agreement"));

  beforeEach(async function () {
    [admin, riskCommittee, settlementAuth, attestorA, attestorB, reportingOracle, submitter] = await ethers.getSigners();

    const ReadinessGate = await ethers.getContractFactory("CapitalReadinessGate");
    readinessGate = await ReadinessGate.deploy(admin.address);
    await readinessGate.waitForDeployment();

    const Hub = await ethers.getContractFactory("CapitalBridgeHub");
    hub = await Hub.deploy(admin.address);
    await hub.waitForDeployment();

    await hub.connect(admin).setReadinessGate(await readinessGate.getAddress());
    await hub.connect(admin).grantRole(RISK_COMMITTEE_ROLE, riskCommittee.address);
    await hub.connect(admin).grantRole(SETTLEMENT_AUTHORITY_ROLE, settlementAuth.address);
    await hub.connect(admin).grantRole(RESEARCH_ATTESTOR_A_ROLE, attestorA.address);
    await hub.connect(admin).grantRole(RESEARCH_ATTESTOR_B_ROLE, attestorB.address);
    await hub.connect(admin).grantRole(REPORTING_ORACLE_ROLE, reportingOracle.address);
    await readinessGate.connect(admin).grantRole(REPORTING_ORACLE_ROLE, reportingOracle.address);
  });

  describe("Property Packet Lifecycle", function () {
    it("should submit a property packet", async function () {
      const tx = await hub.connect(submitter).submitPropertyPacket(
        testHash,
        testDueDiligenceHash,
        testUnderwritingHash,
        testRiskHash,
        ethers.parseEther("100")
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      
      const packet = await hub.packets(1);
      expect(packet.packetId).to.equal(1);
      expect(packet.submitter).to.equal(submitter.address);
      expect(packet.maxApprovedCapital).to.equal(ethers.parseEther("100"));
    });

    it("should require dual attestation before approval", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await expect(
        hub.connect(riskCommittee).approvePropertyPacket(1)
      ).to.be.reverted;

      await hub.connect(attestorA).attestResearchPacketA(1, testUnderwritingHash, testRiskHash, testDenetCid);

      await expect(
        hub.connect(riskCommittee).approvePropertyPacket(1)
      ).to.be.reverted;

      await hub.connect(attestorB).attestResearchPacketB(1, testUnderwritingHash, testRiskHash, testDenetCid);

      await expect(
        hub.connect(riskCommittee).approvePropertyPacket(1)
      ).to.not.be.reverted;
    });

    it("should prevent same attestor from attesting both A and B", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await hub.connect(admin).grantRole(RESEARCH_ATTESTOR_A_ROLE, attestorA.address);
      await hub.connect(admin).grantRole(RESEARCH_ATTESTOR_B_ROLE, attestorA.address);

      await hub.connect(attestorA).attestResearchPacketA(1, testUnderwritingHash, testRiskHash, testDenetCid);

      await expect(
        hub.connect(attestorA).attestResearchPacketB(1, testUnderwritingHash, testRiskHash, testDenetCid)
      ).to.be.revertedWithCustomError(hub, "DuplicateAttestor");
    });

    it("should reject packet and record reason", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await hub.connect(riskCommittee).rejectPropertyPacket(1, 1);

      const packet = await hub.packets(1);
      expect(packet.state).to.equal(4);
    });

    it("should expire packet after duration", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await time.increase(91 * 24 * 60 * 60);

      await hub.expirePropertyPacket(1);

      const packet = await hub.packets(1);
      expect(packet.state).to.equal(6);
    });
  });

  describe("SPV Management", function () {
    it("should register SPV with payment address", async function () {
      const tx = await hub.connect(settlementAuth).registerSPV(
        testLegalEntityHash,
        testOperatingAgreementHash,
        submitter.address
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const spv = await hub.spvEntities(1);
      expect(spv.spvId).to.equal(1);
      expect(spv.paymentAddress).to.equal(submitter.address);
      expect(spv.active).to.equal(true);
    });

    it("should deactivate SPV", async function () {
      await hub.connect(settlementAuth).registerSPV(
        testLegalEntityHash, testOperatingAgreementHash, submitter.address
      );

      await hub.connect(settlementAuth).deactivateSPV(1);

      const spv = await hub.spvEntities(1);
      expect(spv.active).to.equal(false);
    });
  });

  describe("Authorization & Settlement", function () {
    beforeEach(async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );
      await hub.connect(attestorA).attestResearchPacketA(1, testUnderwritingHash, testRiskHash, testDenetCid);
      await hub.connect(attestorB).attestResearchPacketB(1, testUnderwritingHash, testRiskHash, testDenetCid);
      await hub.connect(riskCommittee).approvePropertyPacket(1);
      await hub.connect(settlementAuth).registerSPV(testLegalEntityHash, testOperatingAgreementHash, submitter.address);
      
      await readinessGate.connect(admin).startObservation();
      await time.increase(180 * 24 * 60 * 60);
      await readinessGate.connect(reportingOracle).postAttestation(9999, 0, ethers.parseEther("1000000"), ethers.keccak256(ethers.toUtf8Bytes("audit-pass")));
    });

    it("should propose authorization with 24h timelock", async function () {
      const tx = await hub.connect(riskCommittee).proposeAuthorization(1, 1, ethers.parseEther("50"));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const auth = await hub.authorizations(1);
      expect(auth.authId).to.equal(1);
      expect(auth.packetId).to.equal(1);
      expect(auth.spvId).to.equal(1);
      expect(auth.approvedAmount).to.equal(ethers.parseEther("50"));
    });

    it("should prevent activation before timelock elapsed", async function () {
      await hub.connect(riskCommittee).proposeAuthorization(1, 1, ethers.parseEther("50"));

      await expect(
        hub.connect(settlementAuth).activateAuthorization(1)
      ).to.be.revertedWithCustomError(hub, "TimelockNotElapsed");
    });

    it("should activate authorization after timelock", async function () {
      await hub.connect(riskCommittee).proposeAuthorization(1, 1, ethers.parseEther("50"));

      await time.increase(25 * 60 * 60);

      await expect(
        hub.connect(settlementAuth).activateAuthorization(1)
      ).to.not.be.reverted;

      const auth = await hub.authorizations(1);
      expect(auth.state).to.equal(1);
    });

    it("should record settlement with proof hash", async function () {
      await hub.connect(riskCommittee).proposeAuthorization(1, 1, ethers.parseEther("50"));
      await time.increase(25 * 60 * 60);
      await hub.connect(settlementAuth).activateAuthorization(1);

      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("settlement-proof"));
      const tx = await hub.connect(settlementAuth).recordSettlement(1, ethers.parseEther("50"), proofHash);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const settlement = await hub.settlements(1);
      expect(settlement.settlementId).to.equal(1);
      expect(settlement.authId).to.equal(1);
      expect(settlement.settledAmount).to.equal(ethers.parseEther("50"));
    });

    it("should prevent settlement exceeding authorized amount", async function () {
      await hub.connect(riskCommittee).proposeAuthorization(1, 1, ethers.parseEther("50"));
      await time.increase(25 * 60 * 60);
      await hub.connect(settlementAuth).activateAuthorization(1);

      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("settlement-proof"));
      await expect(
        hub.connect(settlementAuth).recordSettlement(1, ethers.parseEther("100"), proofHash)
      ).to.be.revertedWithCustomError(hub, "AmountExceedsMaximum");
    });
  });

  describe("Access Control", function () {
    it("should prevent unauthorized packet approval", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await expect(
        hub.connect(submitter).approvePropertyPacket(1)
      ).to.be.reverted;
    });

    it("should prevent unauthorized SPV registration", async function () {
      await expect(
        hub.connect(submitter).registerSPV(testLegalEntityHash, testOperatingAgreementHash, submitter.address)
      ).to.be.reverted;
    });

    it("should prevent unauthorized attestation", async function () {
      await hub.connect(submitter).submitPropertyPacket(
        testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
      );

      await expect(
        hub.connect(submitter).attestResearchPacketA(1, testUnderwritingHash, testRiskHash, testDenetCid)
      ).to.be.reverted;
    });
  });

  describe("Guardian Controls", function () {
    it("should pause and unpause contract", async function () {
      await hub.connect(admin).pause();
      
      await expect(
        hub.connect(submitter).submitPropertyPacket(
          testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
        )
      ).to.be.reverted;

      await hub.connect(admin).unpause();

      await expect(
        hub.connect(submitter).submitPropertyPacket(
          testHash, testDueDiligenceHash, testUnderwritingHash, testRiskHash, ethers.parseEther("100")
        )
      ).to.not.be.reverted;
    });
  });
});
