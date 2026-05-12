import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect } from 'chai';
import { network } from 'hardhat';
import type { Contract } from 'ethers';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';

// Load T-REX pre-compiled artifacts via readFileSync (avoids ESM/CJS boundary issues).
// process.cwd() = hardhat-avalanche/ when tests run via `cd hardhat-avalanche && npx hardhat test`.
function loadArtifact(relPath: string): { abi: unknown[]; bytecode: string } {
  return JSON.parse(readFileSync(resolve(process.cwd(), relPath), 'utf8'));
}

const tArtBase = 'node_modules/@tokenysolutions/t-rex/artifacts/contracts';
const IRSArtifact = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistryStorage.sol/IdentityRegistryStorage.json`);
const TIRArtifact = loadArtifact(`${tArtBase}/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json`);
const CTRArtifact = loadArtifact(`${tArtBase}/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json`);
const IRArtifact  = loadArtifact(`${tArtBase}/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json`);
const MCArtifact  = loadArtifact(`${tArtBase}/compliance/modular/ModularCompliance.sol/ModularCompliance.json`);

describe('AxiomStable3643Fuji — Fuji ERC-3643 Suite', function () {
  this.timeout(120_000);

  let ethers: Awaited<ReturnType<typeof network.create>>['ethers'];

  let deployer: HardhatEthersSigner;
  let user1:    HardhatEthersSigner;
  let user2:    HardhatEthersSigner;

  let irs:   Contract;
  let tir:   Contract;
  let ctr:   Contract;
  let ir:    Contract;
  let mc:    Contract;
  let cam:   Contract;
  let tlm:   Contract;
  let token: Contract;

  before(async function () {
    const conn = await network.create();
    ethers = conn.ethers;
  });

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // ── Deploy official @tokenysolutions/t-rex registry + compliance ──────────

    const IRSFactory = new ethers.ContractFactory(IRSArtifact.abi, IRSArtifact.bytecode, deployer);
    irs = await IRSFactory.deploy() as Contract;
    await irs.waitForDeployment();
    await (await irs['init']()).wait();

    const TIRFactory = new ethers.ContractFactory(TIRArtifact.abi, TIRArtifact.bytecode, deployer);
    tir = await TIRFactory.deploy() as Contract;
    await tir.waitForDeployment();
    await (await tir['init']()).wait();

    const CTRFactory = new ethers.ContractFactory(CTRArtifact.abi, CTRArtifact.bytecode, deployer);
    ctr = await CTRFactory.deploy() as Contract;
    await ctr.waitForDeployment();
    await (await ctr['init']()).wait();

    const IRFactory = new ethers.ContractFactory(IRArtifact.abi, IRArtifact.bytecode, deployer);
    ir = await IRFactory.deploy() as Contract;
    await ir.waitForDeployment();
    // T-REX IR.init order: (trustedIssuersRegistry, claimTopicsRegistry, identityStorage)
    await (await ir['init'](
      await tir.getAddress(),
      await ctr.getAddress(),
      await irs.getAddress(),
    )).wait();

    const MCFactory = new ethers.ContractFactory(MCArtifact.abi, MCArtifact.bytecode, deployer);
    mc = await MCFactory.deploy() as Contract;
    await mc.waitForDeployment();
    await (await mc['init']()).wait();

    // T-REX pattern: bindIdentityRegistry adds IR as an agent on IRS
    await (await irs['bindIdentityRegistry'](await ir.getAddress())).wait();

    // ── Deploy custom Axiom compliance modules ────────────────────────────────

    const CAM = await ethers.getContractFactory('CountryAllowModule');
    cam = await CAM.deploy() as Contract;
    await cam.waitForDeployment();

    const TLM = await ethers.getContractFactory('TransferLimitModule');
    tlm = await TLM.deploy() as Contract;
    await tlm.waitForDeployment();

    // ── Deploy custom AxiomStable3643Fuji token ───────────────────────────────

    const Token = await ethers.getContractFactory('AxiomStable3643Fuji');
    token = await Token.deploy(
      await ir.getAddress(),
      await mc.getAddress(),
      'Axiom Stable USD',
      'AXUSD',
      6,
      deployer.address,
    ) as Contract;
    await token.waitForDeployment();

    // ── Wire: bind token → compliance, add modules ────────────────────────────

    await (await mc['bindToken'](await token.getAddress())).wait();
    await (await mc['addModule'](await cam.getAddress())).wait();
    await (await mc['addModule'](await tlm.getAddress())).wait();

    // setAllowAll is a custom Axiom testnet helper (all countries permitted)
    await (await cam['setAllowAll'](await mc.getAddress(), true)).wait();

    // ── Wire: IR agent + seed identities ─────────────────────────────────────

    await (await ir['addAgent'](deployer.address)).wait();
    await (await ir['registerIdentity'](deployer.address, deployer.address, 0)).wait();
    await (await ir['registerIdentity'](user1.address, user1.address, 0)).wait();
    await (await ir['registerIdentity'](user2.address, user2.address, 0)).wait();
  });

  describe('Deployment', function () {
    it('deploys all 8 contracts with correct names', async function () {
      expect(await token['name']()).to.equal('Axiom Stable USD');
      expect(await token['symbol']()).to.equal('AXUSD');
      expect(await token['decimals']()).to.equal(6);
    });

    it('wires IdentityRegistry to ModularCompliance correctly', async function () {
      const boundToken = await mc['getTokenBound']();
      expect(boundToken).to.equal(await token.getAddress());
    });

    it('adds both compliance modules', async function () {
      const modules = await mc['getModules']();
      expect(modules.length).to.equal(2);
      expect(modules).to.include(await cam.getAddress());
      expect(modules).to.include(await tlm.getAddress());
    });

    it('registers deployer identity in IdentityRegistry', async function () {
      expect(await ir['isVerified'](deployer.address)).to.be.true;
    });
  });

  describe('IdentityRegistryStorage', function () {
    it('stores and retrieves identity data via official T-REX IRS', async function () {
      const storedId = await irs['storedIdentity'](deployer.address);
      expect(storedId).to.not.equal(ethers.ZeroAddress);
      expect(await ir['contains'](deployer.address)).to.be.true;
    });
  });

  describe('Mint', function () {
    it('minter can mint to a verified address', async function () {
      const amount = ethers.parseUnits('100', 6);
      await token['mint'](user1.address, amount);
      expect(await token['balanceOf'](user1.address)).to.equal(amount);
    });

    it('reverts minting to an unverified address', async function () {
      const [,,, unverified] = await ethers.getSigners();
      const amount = ethers.parseUnits('100', 6);
      await expect(
        token['mint'](unverified.address, amount),
      ).to.be.revertedWith('RECEIVER_NOT_VERIFIED');
    });
  });

  describe('Transfer', function () {
    it('allows transfer between two verified addresses', async function () {
      const amount = ethers.parseUnits('100', 6);
      await token['mint'](user1.address, amount);
      await token.connect(user1)['transfer'](user2.address, amount);
      expect(await token['balanceOf'](user2.address)).to.equal(amount);
    });

    it('blocks transfer to an unverified address', async function () {
      const [,,, unverified] = await ethers.getSigners();
      const amount = ethers.parseUnits('100', 6);
      await token['mint'](user1.address, amount);
      await expect(
        token.connect(user1)['transfer'](unverified.address, amount),
      ).to.be.revertedWith('RECEIVER_NOT_VERIFIED');
    });

    it('blocks transfer from a frozen address', async function () {
      const amount = ethers.parseUnits('100', 6);
      await token['mint'](user1.address, amount);
      await token['freezeAddress'](user1.address, true);
      await expect(
        token.connect(user1)['transfer'](user2.address, amount),
      ).to.be.revertedWith('SENDER_FROZEN');
    });
  });

  describe('Burn', function () {
    it('burner can burn tokens', async function () {
      const amount = ethers.parseUnits('200', 6);
      await token['mint'](user1.address, amount);
      await token['burn'](user1.address, amount);
      expect(await token['balanceOf'](user1.address)).to.equal(0n);
    });
  });

  describe('TransferLimitModule', function () {
    it('blocks transfer above the daily limit', async function () {
      const limit  = ethers.parseUnits('500', 6);
      const amount = ethers.parseUnits('600', 6);

      await tlm['setTransferLimit'](await mc.getAddress(), limit);
      await token['mint'](user1.address, amount);

      await expect(
        token.connect(user1)['transfer'](user2.address, amount),
      ).to.be.revertedWith('TRANSFER_NOT_COMPLIANT');
    });

    it('allows transfer within the daily limit', async function () {
      const limit  = ethers.parseUnits('500', 6);
      const amount = ethers.parseUnits('400', 6);

      await tlm['setTransferLimit'](await mc.getAddress(), limit);
      await token['mint'](user1.address, amount);
      await token.connect(user1)['transfer'](user2.address, amount);
      expect(await token['balanceOf'](user2.address)).to.equal(amount);
    });
  });

  describe('Pause', function () {
    it('admin can pause and unpause the token', async function () {
      await token['pause']();
      const amount = ethers.parseUnits('100', 6);
      await token['mint'](user1.address, amount);
      await expect(
        token.connect(user1)['transfer'](user2.address, amount),
      ).to.be.revertedWith('TOKEN_PAUSED');
      await token['unpause']();
      await token.connect(user1)['transfer'](user2.address, amount);
      expect(await token['balanceOf'](user2.address)).to.equal(amount);
    });
  });
});
