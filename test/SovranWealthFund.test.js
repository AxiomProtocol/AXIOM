const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SovranWealthFund", function () {
  let SovranWealthFund;
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the contract factory and Signers
    SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the token
    token = await SovranWealthFund.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await token.name()).to.equal("Sovran Wealth Fund");
      expect(await token.symbol()).to.equal("SWF");
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have 1 billion tokens with 18 decimals", async function () {
      const expectedSupply = ethers.utils.parseEther("1000000000");
      expect(await token.totalSupply()).to.equal(expectedSupply);
    });

    it("Should assign roles to the owner", async function () {
      // Get the role hashes
      const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
      const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      const PAUSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
      const PEG_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PEG_MANAGER_ROLE"));
      const RESERVE_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RESERVE_MANAGER_ROLE"));
      const TRANSFER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TRANSFER_ROLE"));
      
      // Check if the owner has all roles
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(PEG_MANAGER_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(RESERVE_MANAGER_ROLE, owner.address)).to.equal(true);
      expect(await token.hasRole(TRANSFER_ROLE, owner.address)).to.equal(true);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, ethers.utils.parseEther("50"));
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.utils.parseEther("50"));

      // Transfer 50 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("50"));
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther("50"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Role-based permissions", function () {
    it("Should allow minting by minter role", async function () {
      const initialSupply = await token.totalSupply();
      await token.mint(addr1.address, ethers.utils.parseEther("1000"));
      
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("1000"));
      expect(await token.totalSupply()).to.equal(initialSupply.add(ethers.utils.parseEther("1000")));
    });

    it("Should not allow minting by non-minter role", async function () {
      await expect(
        token.connect(addr1).mint(addr2.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith(/AccessControl: account .* is missing role .*/);
    });

    it("Should allow pausing by pauser role", async function () {
      await token.pause();
      expect(await token.paused()).to.equal(true);
      
      // Should revert when trying to transfer during paused state
      await expect(
        token.transfer(addr1.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause and try again
      await token.unpause();
      expect(await token.paused()).to.equal(false);
      
      // Should work now
      await token.transfer(addr1.address, ethers.utils.parseEther("100"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Staking features", function () {
    beforeEach(async function () {
      // Transfer some tokens to addr1 for staking tests
      await token.transfer(addr1.address, ethers.utils.parseEther("1000"));
    });

    it("Should allow staking tokens", async function () {
      // Approve and stake
      await token.connect(addr1).stake(ethers.utils.parseEther("100"));
      
      // Check the staked amount
      expect(await token.getTotalStaked(addr1.address)).to.equal(ethers.utils.parseEther("100"));
      
      // Check token balances
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("900"));
      expect(await token.balanceOf(token.address)).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should require minimum stake amount", async function () {
      // Minimum stake amount is 50 SWF
      await expect(
        token.connect(addr1).stake(ethers.utils.parseEther("49"))
      ).to.be.revertedWith("Below minimum stake amount");
    });
  });

  describe("APR management", function () {
    it("Should set the initial APR to 25%", async function () {
      expect(await token.getCurrentAPR()).to.equal(2500); // 25% in basis points
    });

    it("Should allow admin to change APR", async function () {
      await token.setAPR(3000); // 30%
      expect(await token.getCurrentAPR()).to.equal(3000);
    });

    it("Should not allow setting APR above maximum", async function () {
      await expect(token.setAPR(6000)).to.be.revertedWith("APR above maximum");
    });
  });
});