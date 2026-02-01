import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Node Economy Audit Harness", function () {
  let nodeRegistry: any;
  let nodeRewards: any;
  let slashingEngine: any;
  let admin: SignerWithAddress;
  let operator1: SignerWithAddress;
  let operator2: SignerWithAddress;
  let slasher: SignerWithAddress;
  let treasury: SignerWithAddress;

  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));
  const NODE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("NODE_MANAGER_ROLE"));
  const SLASHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SLASHER_ROLE"));
  const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));

  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("node-metadata"));

  enum NodeClass { Storage = 0, Execution = 1, Indexing = 2, Research = 3 }

  beforeEach(async function () {
    [admin, operator1, operator2, slasher, treasury] = await ethers.getSigners();

    const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    nodeRegistry = await NodeRegistry.deploy(admin.address);
    await nodeRegistry.waitForDeployment();

    const NodeRewards = await ethers.getContractFactory("NodeRewards");
    nodeRewards = await NodeRewards.deploy(admin.address, await nodeRegistry.getAddress());
    await nodeRewards.waitForDeployment();

    const SlashingEngine = await ethers.getContractFactory("SlashingEngine");
    slashingEngine = await SlashingEngine.deploy(admin.address, await nodeRegistry.getAddress(), treasury.address);
    await slashingEngine.waitForDeployment();

    await nodeRegistry.connect(admin).setContracts(
      await nodeRewards.getAddress(),
      await slashingEngine.getAddress()
    );

    await slashingEngine.connect(admin).grantRole(SLASHER_ROLE, slasher.address);
    await nodeRewards.connect(admin).grantRole(REWARDS_MANAGER_ROLE, admin.address);
  });

  describe("Node Registration & Activation", function () {
    it("should register a node", async function () {
      const tx = await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const node = await nodeRegistry.getNodeInfo(1);
      expect(node.nodeId).to.equal(1);
      expect(node.operator).to.equal(operator1.address);
      expect(node.nodeClass).to.equal(NodeClass.Storage);
    });

    it("should activate node with sufficient stake", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);

      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });

      const node = await nodeRegistry.getNodeInfo(1);
      expect(node.status).to.equal(1);
      expect(node.stakeAmount).to.equal(ethers.parseEther("0.1"));
    });

    it("should reject activation with insufficient stake", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);

      await expect(
        nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Insufficient stake");
    });

    it("should require higher stake for Execution nodes", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Execution, metadataHash);

      await expect(
        nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Insufficient stake");

      await expect(
        nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.5") })
      ).to.not.be.reverted;
    });

    it("should require highest stake for Research nodes", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Research, metadataHash);

      await expect(
        nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient stake");

      await expect(
        nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
  });

  describe("Node Deactivation & Withdrawal", function () {
    beforeEach(async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });
    });

    it("should deactivate node", async function () {
      await nodeRegistry.connect(operator1).deactivateNode(1);

      const node = await nodeRegistry.getNodeInfo(1);
      expect(node.status).to.equal(0);
    });

    it("should prevent stake withdrawal before lock period", async function () {
      await nodeRegistry.connect(operator1).deactivateNode(1);

      await expect(
        nodeRegistry.connect(operator1).withdrawStake(1)
      ).to.be.revertedWith("Lock period not expired");
    });

    it("should allow stake withdrawal after lock period", async function () {
      await nodeRegistry.connect(operator1).deactivateNode(1);

      await time.increase(31 * 24 * 60 * 60);

      const balanceBefore = await ethers.provider.getBalance(operator1.address);
      await nodeRegistry.connect(operator1).withdrawStake(1);
      const balanceAfter = await ethers.provider.getBalance(operator1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Slashing Mechanism", function () {
    beforeEach(async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });
    });

    it("should slash node and transfer funds to escrow", async function () {
      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("downtime-violation"));
      
      await slashingEngine.connect(slasher).slashNode(1, slashReason);

      const totalEscrowed = await slashingEngine.totalEscrowed();
      expect(totalEscrowed).to.be.gt(0);

      const node = await nodeRegistry.getNodeInfo(1);
      expect(node.slashCount).to.equal(1);
    });

    it("should suspend node after max slashes", async function () {
      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("violation"));
      
      await slashingEngine.connect(slasher).slashNode(1, slashReason);
      await time.increase(25 * 60 * 60);
      await slashingEngine.connect(slasher).slashNode(1, slashReason);
      await time.increase(25 * 60 * 60);
      await slashingEngine.connect(slasher).slashNode(1, slashReason);

      const node = await nodeRegistry.getNodeInfo(1);
      expect(node.status).to.equal(2);
    });

    it("should respect slashing cooldown", async function () {
      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("violation"));
      
      await slashingEngine.connect(slasher).slashNode(1, slashReason);

      await expect(
        slashingEngine.connect(slasher).slashNode(1, slashReason)
      ).to.be.revertedWith("Cooldown not elapsed");
    });

    it("should allow treasury withdrawal of non-escrowed slashed funds", async function () {
      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("violation"));
      await slashingEngine.connect(slasher).slashNode(1, slashReason);

      await time.increase(8 * 24 * 60 * 60);

      const available = await slashingEngine.getAvailableForWithdrawal();
      if (available > 0n) {
        const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
        await slashingEngine.connect(admin).withdrawToTreasury();
        const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
        expect(treasuryBalanceAfter).to.be.gt(treasuryBalanceBefore);
      }
    });
  });

  describe("Rewards Distribution", function () {
    beforeEach(async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });
      
      await nodeRegistry.connect(operator2).registerNode(NodeClass.Execution, metadataHash);
      await nodeRegistry.connect(operator2).activateNode(2, { value: ethers.parseEther("0.5") });
    });

    it("should increment epoch", async function () {
      const epochBefore = await nodeRewards.getCurrentEpoch();
      
      await time.increase(7 * 24 * 60 * 60);
      await nodeRewards.connect(admin).advanceEpoch();
      
      const epochAfter = await nodeRewards.getCurrentEpoch();
      expect(epochAfter).to.equal(epochBefore + 1n);
    });

    it("should distribute rewards to active nodes", async function () {
      await admin.sendTransaction({
        to: await nodeRewards.getAddress(),
        value: ethers.parseEther("1")
      });

      await time.increase(7 * 24 * 60 * 60);
      await nodeRewards.connect(admin).distributeEpochRewards([1, 2], [ethers.parseEther("0.3"), ethers.parseEther("0.5")]);

      const node1 = await nodeRegistry.getNodeInfo(1);
      const node2 = await nodeRegistry.getNodeInfo(2);
      
      expect(node1.totalRewardsEarned).to.be.gt(0);
      expect(node2.totalRewardsEarned).to.be.gt(0);
    });
  });

  describe("Access Control", function () {
    it("should prevent unauthorized slashing", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });

      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("violation"));
      
      await expect(
        slashingEngine.connect(operator1).slashNode(1, slashReason)
      ).to.be.reverted;
    });

    it("should prevent non-operator from deactivating node", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });

      await expect(
        nodeRegistry.connect(operator2).deactivateNode(1)
      ).to.be.revertedWith("Not operator");
    });

    it("should prevent re-configuration of contracts", async function () {
      await expect(
        nodeRegistry.connect(admin).setContracts(
          await nodeRewards.getAddress(),
          await slashingEngine.getAddress()
        )
      ).to.be.revertedWith("Contracts already configured");
    });
  });

  describe("Guardian Controls", function () {
    it("should pause node registry", async function () {
      await nodeRegistry.connect(admin).pause();
      
      await expect(
        nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash)
      ).to.be.reverted;
    });

    it("should pause slashing engine", async function () {
      await nodeRegistry.connect(operator1).registerNode(NodeClass.Storage, metadataHash);
      await nodeRegistry.connect(operator1).activateNode(1, { value: ethers.parseEther("0.1") });

      await slashingEngine.connect(admin).pause();
      
      const slashReason = ethers.keccak256(ethers.toUtf8Bytes("violation"));
      await expect(
        slashingEngine.connect(slasher).slashNode(1, slashReason)
      ).to.be.reverted;
    });
  });
});
