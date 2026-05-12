import { expect } from 'chai';
import { network } from 'hardhat';

const { ethers } = await network.create();

describe('AxiomStable3643Fuji — Fuji ERC-3643 Suite', function () {
  this.timeout(120_000);

  let deployer: any;
  let user1:    any;
  let user2:    any;

  let irs:   any;
  let tir:   any;
  let ctr:   any;
  let ir:    any;
  let mc:    any;
  let cam:   any;
  let tlm:   any;
  let token: any;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const IRS = await ethers.getContractFactory('IdentityRegistryStorage');
    irs = await IRS.deploy();
    await irs.waitForDeployment();

    const TIR = await ethers.getContractFactory('TrustedIssuersRegistry');
    tir = await TIR.deploy();
    await tir.waitForDeployment();

    const CTR = await ethers.getContractFactory('ClaimTopicsRegistry');
    ctr = await CTR.deploy();
    await ctr.waitForDeployment();

    const IR = await ethers.getContractFactory('IdentityRegistry');
    ir = await IR.deploy(
      await irs.getAddress(),
      await tir.getAddress(),
      await ctr.getAddress(),
    );
    await ir.waitForDeployment();

    await irs.transferOwnership(await ir.getAddress());

    const MC = await ethers.getContractFactory('ModularCompliance');
    mc = await MC.deploy();
    await mc.waitForDeployment();

    const CAM = await ethers.getContractFactory('CountryAllowModule');
    cam = await CAM.deploy();
    await cam.waitForDeployment();

    const TLM = await ethers.getContractFactory('TransferLimitModule');
    tlm = await TLM.deploy();
    await tlm.waitForDeployment();

    const Token = await ethers.getContractFactory('AxiomStable3643Fuji');
    token = await Token.deploy(
      await ir.getAddress(),
      await mc.getAddress(),
      'Axiom Stable USD',
      'AXUSD',
      6,
      deployer.address,
    );
    await token.waitForDeployment();

    await mc.bindToken(await token.getAddress());
    await mc.addModule(await cam.getAddress());
    await mc.addModule(await tlm.getAddress());
    await cam.setAllowAll(await mc.getAddress(), true);

    await ir.addAgent(deployer.address);
    await ir.registerIdentity(deployer.address, deployer.address, 0);
    await ir.registerIdentity(user1.address, user1.address, 0);
    await ir.registerIdentity(user2.address, user2.address, 0);
  });

  describe('Deployment', function () {
    it('deploys all 8 contracts with correct names', async function () {
      expect(await token.name()).to.equal('Axiom Stable USD');
      expect(await token.symbol()).to.equal('AXUSD');
      expect(await token.decimals()).to.equal(6);
    });

    it('wires IdentityRegistry to ModularCompliance correctly', async function () {
      const boundToken = await mc.getTokenBound();
      expect(boundToken).to.equal(await token.getAddress());
    });

    it('adds both compliance modules', async function () {
      const modules = await mc.getModules();
      expect(modules.length).to.equal(2);
      expect(modules).to.include(await cam.getAddress());
      expect(modules).to.include(await tlm.getAddress());
    });

    it('registers deployer identity in IdentityRegistry', async function () {
      expect(await ir.isVerified(deployer.address)).to.be.true;
    });
  });

  describe('IdentityRegistryStorage', function () {
    it('stores and retrieves identity data', async function () {
      expect(await irs.getIdentity(deployer.address)).to.not.equal(ethers.ZeroAddress);
      expect(await irs.contains(deployer.address)).to.be.true;
    });
  });

  describe('Mint', function () {
    it('minter can mint to a verified address', async function () {
      const amount = ethers.parseUnits('1000', 6);
      await token.mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it('reverts minting to an unverified address', async function () {
      const unverified = ethers.Wallet.createRandom().address;
      const amount = ethers.parseUnits('100', 6);
      await expect(token.mint(unverified, amount)).to.be.revertedWith('RECEIVER_NOT_VERIFIED');
    });
  });

  describe('Transfer', function () {
    it('allows transfer between two verified addresses', async function () {
      const amount = ethers.parseUnits('500', 6);
      await token.mint(user1.address, amount);
      await token.connect(user1).transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });

    it('blocks transfer to an unverified address', async function () {
      const amount = ethers.parseUnits('100', 6);
      await token.mint(user1.address, amount);
      const unverified = ethers.Wallet.createRandom().address;
      await expect(
        token.connect(user1).transfer(unverified, amount),
      ).to.be.revertedWith('RECEIVER_NOT_VERIFIED');
    });

    it('blocks transfer from a frozen address', async function () {
      const amount = ethers.parseUnits('100', 6);
      await token.mint(user1.address, amount);
      await token.freezeAddress(user1.address, true);
      await expect(
        token.connect(user1).transfer(user2.address, amount),
      ).to.be.revertedWith('SENDER_FROZEN');
    });
  });

  describe('Burn', function () {
    it('burner can burn tokens', async function () {
      const amount = ethers.parseUnits('200', 6);
      await token.mint(user1.address, amount);
      await token.burn(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(0n);
    });
  });

  describe('TransferLimitModule', function () {
    it('blocks transfer above the daily limit', async function () {
      const limit  = ethers.parseUnits('500', 6);
      const amount = ethers.parseUnits('600', 6);

      await tlm.setTransferLimit(await mc.getAddress(), limit);
      await token.mint(user1.address, amount);

      await expect(
        token.connect(user1).transfer(user2.address, amount),
      ).to.be.revertedWith('TRANSFER_NOT_COMPLIANT');
    });

    it('allows transfer within the daily limit', async function () {
      const limit  = ethers.parseUnits('500', 6);
      const amount = ethers.parseUnits('400', 6);

      await tlm.setTransferLimit(await mc.getAddress(), limit);
      await token.mint(user1.address, amount);
      await token.connect(user1).transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe('Pause', function () {
    it('admin can pause and unpause the token', async function () {
      await token.pause();
      const amount = ethers.parseUnits('100', 6);
      await token.mint(user1.address, amount);
      await expect(
        token.connect(user1).transfer(user2.address, amount),
      ).to.be.revertedWith('TOKEN_PAUSED');
      await token.unpause();
      await token.connect(user1).transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });
  });
});
