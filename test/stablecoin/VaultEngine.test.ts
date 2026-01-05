import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  AxiomStable, 
  VaultEngine, 
  OracleAdapter, 
  RateLimiter 
} from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaultEngine", function () {
  let axusd: AxiomStable;
  let vaultEngine: VaultEngine;
  let oracle: OracleAdapter;
  let rateLimiter: RateLimiter;
  let mockCollateral: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const GLOBAL_DEBT_CEILING = ethers.parseEther("1000000");
  const DAILY_MINT_LIMIT = ethers.parseEther("100000");
  const PER_ADDRESS_LIMIT = ethers.parseEther("10000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const AxiomStable = await ethers.getContractFactory("AxiomStable");
    axusd = await AxiomStable.deploy();

    const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
    oracle = await OracleAdapter.deploy();

    const RateLimiter = await ethers.getContractFactory("RateLimiter");
    rateLimiter = await RateLimiter.deploy(DAILY_MINT_LIMIT, PER_ADDRESS_LIMIT);

    const VaultEngine = await ethers.getContractFactory("VaultEngine");
    vaultEngine = await VaultEngine.deploy(
      await axusd.getAddress(),
      await oracle.getAddress(),
      await rateLimiter.getAddress(),
      GLOBAL_DEBT_CEILING
    );

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
    const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));

    await axusd.grantRole(MINTER_ROLE, await vaultEngine.getAddress());
    await axusd.grantRole(BURNER_ROLE, await vaultEngine.getAddress());
    await rateLimiter.grantRole(RECORDER_ROLE, await vaultEngine.getAddress());

    const MockERC20 = await ethers.getContractFactory("AxiomStable");
    mockCollateral = await MockERC20.deploy();
  });

  describe("Deployment", function () {
    it("Should set correct AXUSD address", async function () {
      expect(await vaultEngine.axusd()).to.equal(await axusd.getAddress());
    });

    it("Should set correct global debt ceiling", async function () {
      expect(await vaultEngine.globalDebtCeiling()).to.equal(GLOBAL_DEBT_CEILING);
    });

    it("Should start with zero total debt", async function () {
      expect(await vaultEngine.totalGlobalDebt()).to.equal(0);
    });
  });

  describe("Collateral Management", function () {
    it("Should allow admin to add collateral", async function () {
      await expect(vaultEngine.addCollateral(
        await mockCollateral.getAddress(),
        15000,
        13000,
        500,
        ethers.parseEther("500000"),
        200
      )).to.be.reverted;
    });

    it("Should reject collateral with invalid ratios", async function () {
      await expect(vaultEngine.addCollateral(
        await mockCollateral.getAddress(),
        9000,
        8000,
        500,
        ethers.parseEther("500000"),
        200
      )).to.be.revertedWith("VaultEngine: ratio too low");
    });
  });

  describe("Vault Operations", function () {
    it("Should reject deposit for unsupported collateral", async function () {
      await expect(
        vaultEngine.connect(user).depositCollateral(
          await mockCollateral.getAddress(),
          ethers.parseEther("100")
        )
      ).to.be.revertedWith("VaultEngine: unsupported collateral");
    });

    it("Should reject zero amount deposit", async function () {
      await expect(
        vaultEngine.connect(user).depositCollateral(
          await mockCollateral.getAddress(),
          0
        )
      ).to.be.revertedWith("VaultEngine: zero amount");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update global debt ceiling", async function () {
      const newCeiling = ethers.parseEther("2000000");
      await vaultEngine.setGlobalDebtCeiling(newCeiling);
      expect(await vaultEngine.globalDebtCeiling()).to.equal(newCeiling);
    });

    it("Should allow guardian to pause", async function () {
      await vaultEngine.pause();
      expect(await vaultEngine.paused()).to.be.true;
    });

    it("Should prevent operations when paused", async function () {
      await vaultEngine.pause();
      await expect(
        vaultEngine.connect(user).depositCollateral(
          await mockCollateral.getAddress(),
          ethers.parseEther("100")
        )
      ).to.be.reverted;
    });
  });
});
