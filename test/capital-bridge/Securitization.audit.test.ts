import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Layer 5G Securitization Audit Harness", function () {
  let instrumentRegistry: any;
  let poolRegistry: any;
  let servicingLog: any;
  let admin: SignerWithAddress;
  let issuer: SignerWithAddress;
  let servicer: SignerWithAddress;
  let auditor: SignerWithAddress;

  const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  const SERVICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SERVICER_ROLE"));
  const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));

  const testMetadataHash = ethers.keccak256(ethers.toUtf8Bytes("instrument-metadata"));
  const testLegalDocHash = ethers.keccak256(ethers.toUtf8Bytes("legal-docs"));

  enum InstrumentType { WholeLoan = 0, Participation = 1, Note = 2, Certificate = 3 }
  enum EventType { PaymentReceived = 0, DefaultNotice = 1, MaturityExtension = 2, PrincipalPaydown = 3 }

  beforeEach(async function () {
    [admin, issuer, servicer, auditor] = await ethers.getSigners();

    const InstrumentRegistry = await ethers.getContractFactory("InstrumentRegistry");
    instrumentRegistry = await InstrumentRegistry.deploy(admin.address);
    await instrumentRegistry.waitForDeployment();

    const PoolRegistry = await ethers.getContractFactory("PoolRegistry");
    poolRegistry = await PoolRegistry.deploy(admin.address, await instrumentRegistry.getAddress());
    await poolRegistry.waitForDeployment();

    const ServicingEventLog = await ethers.getContractFactory("ServicingEventLog");
    servicingLog = await ServicingEventLog.deploy(admin.address, await instrumentRegistry.getAddress());
    await servicingLog.waitForDeployment();

    await instrumentRegistry.connect(admin).setPoolRegistry(await poolRegistry.getAddress());
    await instrumentRegistry.connect(admin).setServicingLog(await servicingLog.getAddress());

    await instrumentRegistry.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
    await servicingLog.connect(admin).grantRole(SERVICER_ROLE, servicer.address);
    await servicingLog.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
    await poolRegistry.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
  });

  describe("Instrument Registration", function () {
    it("should register a whole loan instrument", async function () {
      const tx = await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan,
        testMetadataHash,
        testLegalDocHash,
        ethers.parseEther("100000"),
        Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const count = await instrumentRegistry.getInstrumentCount();
      expect(count).to.equal(1);
    });

    it("should register multiple instrument types", async function () {
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.Participation, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("50000"), Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60
      );
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.Note, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("25000"), Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
      );

      const count = await instrumentRegistry.getInstrumentCount();
      expect(count).to.equal(3);
    });

    it("should prevent unauthorized instrument registration", async function () {
      await expect(
        instrumentRegistry.connect(servicer).registerInstrument(
          InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
          ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
        )
      ).to.be.reverted;
    });
  });

  describe("Pool Formation", function () {
    beforeEach(async function () {
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("50000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("75000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
    });

    it("should create a pool with instruments", async function () {
      const poolMetadata = ethers.keccak256(ethers.toUtf8Bytes("pool-metadata"));
      
      const tx = await poolRegistry.connect(issuer).createPool(
        poolMetadata,
        [1, 2, 3]
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const count = await poolRegistry.getPoolCount();
      expect(count).to.equal(1);
    });

    it("should track pool aggregate value", async function () {
      const poolMetadata = ethers.keccak256(ethers.toUtf8Bytes("pool-metadata"));
      
      await poolRegistry.connect(issuer).createPool(poolMetadata, [1, 2, 3]);

      const pool = await poolRegistry.getPoolInfo(1);
      expect(pool.totalValue).to.equal(ethers.parseEther("225000"));
    });

    it("should prevent adding non-existent instruments to pool", async function () {
      const poolMetadata = ethers.keccak256(ethers.toUtf8Bytes("pool-metadata"));
      
      await expect(
        poolRegistry.connect(issuer).createPool(poolMetadata, [1, 2, 99])
      ).to.be.reverted;
    });
  });

  describe("Servicing Event Log", function () {
    beforeEach(async function () {
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
    });

    it("should log payment received event", async function () {
      const paymentProof = ethers.keccak256(ethers.toUtf8Bytes("payment-proof"));
      
      const tx = await servicingLog.connect(servicer).logEvent(
        1,
        EventType.PaymentReceived,
        ethers.parseEther("1000"),
        paymentProof,
        ""
      );
      
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const count = await servicingLog.getEventCount();
      expect(count).to.equal(1);
    });

    it("should log default notice event", async function () {
      const defaultProof = ethers.keccak256(ethers.toUtf8Bytes("default-notice"));
      
      await servicingLog.connect(servicer).logEvent(
        1,
        EventType.DefaultNotice,
        0,
        defaultProof,
        "Missed 3 consecutive payments"
      );

      const count = await servicingLog.getEventCount();
      expect(count).to.equal(1);
    });

    it("should log maturity extension event", async function () {
      const extensionProof = ethers.keccak256(ethers.toUtf8Bytes("extension-proof"));
      
      await servicingLog.connect(servicer).logEvent(
        1,
        EventType.MaturityExtension,
        90 * 24 * 60 * 60,
        extensionProof,
        "90-day extension granted"
      );

      const count = await servicingLog.getEventCount();
      expect(count).to.equal(1);
    });

    it("should create immutable audit trail", async function () {
      const paymentProof1 = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));
      const paymentProof2 = ethers.keccak256(ethers.toUtf8Bytes("payment-2"));
      const paymentProof3 = ethers.keccak256(ethers.toUtf8Bytes("payment-3"));
      
      await servicingLog.connect(servicer).logEvent(1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof1, "");
      await servicingLog.connect(servicer).logEvent(1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof2, "");
      await servicingLog.connect(servicer).logEvent(1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof3, "");

      const count = await servicingLog.getEventCount();
      expect(count).to.equal(3);

      const events = await servicingLog.getInstrumentEvents(1);
      expect(events.length).to.equal(3);
    });

    it("should prevent unauthorized event logging", async function () {
      const paymentProof = ethers.keccak256(ethers.toUtf8Bytes("payment-proof"));
      
      await expect(
        servicingLog.connect(auditor).logEvent(
          1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof, ""
        )
      ).to.be.reverted;
    });
  });

  describe("Auditor Functions", function () {
    beforeEach(async function () {
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );
      
      const paymentProof = ethers.keccak256(ethers.toUtf8Bytes("payment-proof"));
      await servicingLog.connect(servicer).logEvent(1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof, "");
    });

    it("should allow auditor to verify event", async function () {
      const auditHash = ethers.keccak256(ethers.toUtf8Bytes("audit-verification"));
      
      const tx = await servicingLog.connect(auditor).verifyEvent(1, auditHash);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("should prevent non-auditor from verifying", async function () {
      const auditHash = ethers.keccak256(ethers.toUtf8Bytes("audit-verification"));
      
      await expect(
        servicingLog.connect(servicer).verifyEvent(1, auditHash)
      ).to.be.reverted;
    });
  });

  describe("Cross-Registry Integration", function () {
    it("should maintain referential integrity", async function () {
      await instrumentRegistry.connect(issuer).registerInstrument(
        InstrumentType.WholeLoan, testMetadataHash, testLegalDocHash, 
        ethers.parseEther("100000"), Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      );

      const poolMetadata = ethers.keccak256(ethers.toUtf8Bytes("pool-metadata"));
      await poolRegistry.connect(issuer).createPool(poolMetadata, [1]);

      const paymentProof = ethers.keccak256(ethers.toUtf8Bytes("payment-proof"));
      await servicingLog.connect(servicer).logEvent(1, EventType.PaymentReceived, ethers.parseEther("1000"), paymentProof, "");

      const instrumentCount = await instrumentRegistry.getInstrumentCount();
      const poolCount = await poolRegistry.getPoolCount();
      const eventCount = await servicingLog.getEventCount();

      expect(instrumentCount).to.equal(1);
      expect(poolCount).to.equal(1);
      expect(eventCount).to.equal(1);
    });
  });
});
