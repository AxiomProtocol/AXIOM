// Mocha unit tests for the corrected AXIOMOracleAdapter.
// Asserts AXUSD→USDC quotes are non-zero when primaryPsm is the zero address.

const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;

const USDC          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ERC3643_AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const LEGACY_AXUSD  = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';
const ZERO          = '0x0000000000000000000000000000000000000000';

describe('AXIOMOracleAdapter — corrected _psmRate / _axusdToUsdc', function () {
  let adapter;
  let deployer;

  before(async () => {
    [deployer] = await ethers.getSigners();
    const F = await ethers.getContractFactory('AXIOMOracleAdapter');
    // Deploy with the v2-bug-surface configuration: primaryPsm = address(0).
    adapter = await F.deploy(deployer.address, ERC3643_AXUSD, LEGACY_AXUSD, ZERO, ZERO);
    await adapter.waitForDeployment();
  });

  describe('Scenario 1: primaryPsm = address(0) — the deployed v2 config', () => {
    const oneAxusd = ethers.parseUnits('1', 18);
    const oneUsdc  = ethers.parseUnits('1', 6);
    const fiftyKAx = ethers.parseUnits('50000', 18);

    it('AXUSD→USDC returns a strictly positive quote (legacy bug fixed)', async () => {
      const q = await adapter.getQuote(oneAxusd, ERC3643_AXUSD, USDC);
      expect(q).to.be.gt(0n);
    });

    it('1 AXUSD → 1.000000 USDC at the neutral 1:1 rate', async () => {
      const q = await adapter.getQuote(oneAxusd, ERC3643_AXUSD, USDC);
      expect(q).to.equal(oneUsdc);
    });

    it('50,000 AXUSD → 50,000.000000 USDC', async () => {
      const q = await adapter.getQuote(fiftyKAx, ERC3643_AXUSD, USDC);
      expect(q).to.equal(ethers.parseUnits('50000', 6));
    });

    it('reverse direction (1 USDC → 1.0 AXUSD) is intact', async () => {
      const q = await adapter.getQuote(oneUsdc, USDC, ERC3643_AXUSD);
      expect(q).to.equal(oneAxusd);
    });

    it('legacy AXUSD address (eulerAxusd) → USDC also non-zero', async () => {
      const q = await adapter.getQuote(oneAxusd, LEGACY_AXUSD, USDC);
      expect(q).to.be.gt(0n);
    });

    it('AXUSD → USDC → AXUSD round-trip is lossless at 50k', async () => {
      const usdc = await adapter.getQuote(fiftyKAx, ERC3643_AXUSD, USDC);
      const back = await adapter.getQuote(usdc, USDC, ERC3643_AXUSD);
      expect(back).to.equal(fiftyKAx);
    });
  });

  describe('Scenario 2: psmFallbackEnabled = false (governance off-switch)', () => {
    it('returns the pure decimal-normalised quote with PSM disabled', async () => {
      const oneAxusd = ethers.parseUnits('1', 18);
      const oneUsdc  = ethers.parseUnits('1', 6);
      await (await adapter.setPsmFallback(false)).wait();
      try {
        const q = await adapter.getQuote(oneAxusd, ERC3643_AXUSD, USDC);
        expect(q).to.equal(oneUsdc);
      } finally {
        await (await adapter.setPsmFallback(true)).wait();
      }
    });
  });

  describe('Scenario 3: ERC-7726 zero-input convention', () => {
    it('getQuote(0, AXUSD, USDC) returns 0', async () => {
      const q = await adapter.getQuote(0n, ERC3643_AXUSD, USDC);
      expect(q).to.equal(0n);
    });
  });

  describe('Scenario 4: unsupported pair', () => {
    it('USDC → USDC reverts as unsupported', async () => {
      const oneUsdc = ethers.parseUnits('1', 6);
      let reverted = false;
      try { await adapter.getQuote(oneUsdc, USDC, USDC); } catch { reverted = true; }
      expect(reverted).to.equal(true);
    });
  });
});
