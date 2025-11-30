const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SovranWealthFund Token", function () {
  let SovranWealthFund;
  let swfToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the contract factory and signers
    SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the token contract
    swfToken = await SovranWealthFund.deploy();
    await swfToken.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const adminRole = await swfToken.DEFAULT_ADMIN_ROLE();
      expect(await swfToken.hasRole(adminRole, owner.address)).to.equal(true);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await swfToken.balanceOf(owner.address);
      expect(await swfToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await swfToken.name()).to.equal("Sovran Wealth Fund");
      expect(await swfToken.symbol()).to.equal("SWF");
    });

    it("Should have total supply of 1 billion tokens", async function () {
      const expectedSupply = ethers.utils.parseUnits("1000000000", 18);
      expect(await swfToken.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Roles", function () {
    it("Should assign all roles to owner on deployment", async function () {
      const adminRole = await swfToken.DEFAULT_ADMIN_ROLE();
      const minterRole = await swfToken.MINTER_ROLE();
      const pauserRole = await swfToken.PAUSER_ROLE();
      const pegManagerRole = await swfToken.PEG_MANAGER_ROLE();
      const reserveManagerRole = await swfToken.RESERVE_MANAGER_ROLE();
      const transferRole = await swfToken.TRANSFER_ROLE();

      expect(await swfToken.hasRole(adminRole, owner.address)).to.equal(true);
      expect(await swfToken.hasRole(minterRole, owner.address)).to.equal(true);
      expect(await swfToken.hasRole(pauserRole, owner.address)).to.equal(true);
      expect(await swfToken.hasRole(pegManagerRole, owner.address)).to.equal(true);
      expect(await swfToken.hasRole(reserveManagerRole, owner.address)).to.equal(true);
      expect(await swfToken.hasRole(transferRole, owner.address)).to.equal(true);
    });

    it("Should allow granting roles to others", async function () {
      const minterRole = await swfToken.MINTER_ROLE();
      await swfToken.grantRole(minterRole, addr1.address);
      expect(await swfToken.hasRole(minterRole, addr1.address)).to.equal(true);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await swfToken.transfer(addr1.address, 50);
      const addr1Balance = await swfToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      await swfToken.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await swfToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await swfToken.balanceOf(owner.address);
      
      // Try to send 1 token from addr1 (0 tokens) to owner
      await expect(
        swfToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't change
      expect(await swfToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await swfToken.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1
      await swfToken.transfer(addr1.address, 100);
      
      // Transfer 50 tokens from owner to addr2
      await swfToken.transfer(addr2.address, 50);

      // Check balances
      const finalOwnerBalance = await swfToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));
      
      const addr1Balance = await swfToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);
      
      const addr2Balance = await swfToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe("Pausable functionality", function () {
    it("Should pause and unpause transfers", async function () {
      // Pause transfers
      await swfToken.pause();
      
      // Try to transfer tokens
      await expect(
        swfToken.transfer(addr1.address, 100)
      ).to.be.revertedWith("Pausable: paused");

      // Unpause transfers
      await swfToken.unpause();
      
      // Transfer should work now
      await swfToken.transfer(addr1.address, 100);
      expect(await swfToken.balanceOf(addr1.address)).to.equal(100);
    });

    it("Should only allow pauser role to pause", async function () {
      await expect(
        swfToken.connect(addr1).pause()
      ).to.be.reverted;
    });
  });

  describe("Staking functionality", function () {
    it("Should allow staking tokens", async function () {
      // Transfer tokens to addr1 for staking
      const stakeAmount = ethers.utils.parseUnits("100", 18);
      await swfToken.transfer(addr1.address, stakeAmount);
      
      // Stake tokens
      await swfToken.connect(addr1).stake(stakeAmount);
      
      // Check staked amount
      const totalStaked = await swfToken.getTotalStaked(addr1.address);
      expect(totalStaked).to.equal(stakeAmount);
      
      // Check wallet balances
      const balanceAfterStaking = await swfToken.balanceOf(addr1.address);
      expect(balanceAfterStaking).to.equal(0);
    });

    it("Should distribute tokens across 16 virtual wallets", async function () {
      // Transfer tokens to addr1 for staking
      const stakeAmount = ethers.utils.parseUnits("160", 18); // 10 tokens per wallet
      await swfToken.transfer(addr1.address, stakeAmount);
      
      // Stake tokens
      await swfToken.connect(addr1).stake(stakeAmount);
      
      // Get wallet breakdown
      const breakdown = await swfToken.getWalletBreakdown(addr1.address);
      
      // Should have 16 wallets
      expect(breakdown.wallets.length).to.equal(16);
      expect(breakdown.balances.length).to.equal(16);
      expect(breakdown.roles.length).to.equal(16);
      
      // Each wallet should have an equal share
      const expectedPerWallet = stakeAmount.div(16);
      for (let i = 0; i < 16; i++) {
        expect(breakdown.balances[i]).to.equal(expectedPerWallet);
      }
    });

    it("Should not allow staking below minimum amount", async function () {
      // Get minimum stake amount
      const minStake = await swfToken.MINIMUM_STAKE_AMOUNT();
      const belowMinStake = minStake.sub(1);
      
      // Transfer tokens to addr1
      await swfToken.transfer(addr1.address, belowMinStake);
      
      // Try to stake below minimum
      await expect(
        swfToken.connect(addr1).stake(belowMinStake)
      ).to.be.revertedWith("Below minimum stake amount");
    });
  });

  // Other test sections for minting, APR management, etc. would be added here
});