import { expect } from "chai";
import { ethers } from "hardhat";
import { AxiomStable } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AxiomStable", function () {
  let axusd: AxiomStable;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  beforeEach(async function () {
    [owner, minter, user] = await ethers.getSigners();

    const AxiomStable = await ethers.getContractFactory("AxiomStable");
    axusd = await AxiomStable.deploy();
    await axusd.waitForDeployment();

    await axusd.grantRole(MINTER_ROLE, minter.address);
    await axusd.grantRole(BURNER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      expect(await axusd.name()).to.equal("Axiom Stable Dollar");
      expect(await axusd.symbol()).to.equal("AXUSD");
    });

    it("Should set 18 decimals", async function () {
      expect(await axusd.decimals()).to.equal(18);
    });

    it("Should grant admin roles to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await axusd.DEFAULT_ADMIN_ROLE();
      expect(await axusd.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await axusd.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await axusd.connect(minter).mint(user.address, amount);
      expect(await axusd.balanceOf(user.address)).to.equal(amount);
    });

    it("Should revert if non-minter tries to mint", async function () {
      const amount = ethers.parseEther("1000");
      await expect(axusd.connect(user).mint(user.address, amount)).to.be.reverted;
    });

    it("Should revert minting to zero address", async function () {
      const amount = ethers.parseEther("1000");
      await expect(axusd.connect(minter).mint(ethers.ZeroAddress, amount))
        .to.be.revertedWith("AxiomStable: mint to zero address");
    });

    it("Should revert minting zero amount", async function () {
      await expect(axusd.connect(minter).mint(user.address, 0))
        .to.be.revertedWith("AxiomStable: mint zero amount");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await axusd.connect(minter).mint(user.address, ethers.parseEther("1000"));
    });

    it("Should allow burner to burn tokens with allowance", async function () {
      const burnAmount = ethers.parseEther("500");
      await axusd.connect(user).approve(minter.address, burnAmount);
      await axusd.connect(minter).burn(user.address, burnAmount);
      expect(await axusd.balanceOf(user.address)).to.equal(ethers.parseEther("500"));
    });

    it("Should revert burn without allowance", async function () {
      const burnAmount = ethers.parseEther("500");
      await expect(axusd.connect(minter).burn(user.address, burnAmount))
        .to.be.revertedWith("AxiomStable: burn exceeds allowance");
    });

    it("Should allow user to burn own tokens via burnSelf", async function () {
      const burnAmount = ethers.parseEther("500");
      await axusd.connect(user).burnSelf(burnAmount);
      expect(await axusd.balanceOf(user.address)).to.equal(ethers.parseEther("500"));
    });

    it("Should revert if non-burner tries to burn", async function () {
      await expect(axusd.connect(user).burn(user.address, ethers.parseEther("100"))).to.be.reverted;
    });
  });

  describe("Max Supply", function () {
    it("Should have correct max supply", async function () {
      const maxSupply = await axusd.MAX_SUPPLY();
      expect(maxSupply).to.equal(ethers.parseEther("1000000000"));
    });

    it("Should revert if minting would exceed max supply", async function () {
      const maxSupply = await axusd.MAX_SUPPLY();
      await expect(axusd.connect(minter).mint(user.address, maxSupply + 1n))
        .to.be.revertedWith("AxiomStable: max supply exceeded");
    });
  });

  describe("Pausing", function () {
    it("Should allow pauser to pause", async function () {
      await axusd.connect(owner).pause();
      expect(await axusd.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      await axusd.connect(minter).mint(user.address, ethers.parseEther("1000"));
      await axusd.connect(owner).pause();
      await expect(axusd.connect(user).transfer(owner.address, ethers.parseEther("100")))
        .to.be.reverted;
    });

    it("Should prevent minting when paused", async function () {
      await axusd.connect(owner).pause();
      await expect(axusd.connect(minter).mint(user.address, ethers.parseEther("100")))
        .to.be.reverted;
    });

    it("Should allow operations after unpause", async function () {
      await axusd.connect(owner).pause();
      await axusd.connect(owner).unpause();
      await axusd.connect(minter).mint(user.address, ethers.parseEther("100"));
      expect(await axusd.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    });
  });
});
