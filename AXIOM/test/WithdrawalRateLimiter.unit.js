// Mocha unit tests for WithdrawalRateLimiter (deferred follow-up from
// the Trust Differentiator Stack). Covers:
//   1. Configuration: governor-only, windowSecs > 0 required.
//   2. Fail-closed: outflow on an unconfigured market reverts.
//   3. Cap enforcement: cumulative outflow within window cannot exceed
//      windowCap.
//   4. Window rollover: outflow ages out after windowSecs and capacity
//      is restored.
//   5. Emergency bypass requires IncidentController.isGloballyHalted();
//      otherwise BypassRequiresHalt.
//   6. Bypass once active disables cap enforcement but still records
//      the outflow (so the post-incident audit shows the unwind flow).
//   7. Consumer role: only CONSUMER_ROLE can call requireOutflowAllowed.

const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;

const id = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

describe('WithdrawalRateLimiter', function () {
  let governor, guardian, consumer, attacker;
  let incident, limiter;
  const MARKET = id('market.AXAU');

  beforeEach(async () => {
    [governor, guardian, consumer, attacker] = await ethers.getSigners();
    incident = await (await ethers.getContractFactory('IncidentController'))
      .deploy(governor.address, guardian.address);
    limiter = await (await ethers.getContractFactory('WithdrawalRateLimiter'))
      .deploy(governor.address, guardian.address, await incident.getAddress());
    await limiter.connect(governor).grantRole(
      await limiter.CONSUMER_ROLE(),
      consumer.address,
    );
  });

  describe('configuration', () => {
    it('rejects windowSecs == 0', async () => {
      await expect(
        limiter.connect(governor).configureMarket(MARKET, 1000, 0),
      ).to.be.revertedWithCustomError(limiter, 'WindowSecsZero');
    });

    it('rejects non-governor configuration', async () => {
      await expect(
        limiter.connect(attacker).configureMarket(MARKET, 1000, 3600),
      ).to.be.revertedWithCustomError(limiter, 'MissingRole');
    });

    it('emits MarketConfigured', async () => {
      await expect(
        limiter.connect(governor).configureMarket(MARKET, 1000, 3600),
      )
        .to.emit(limiter, 'MarketConfigured')
        .withArgs(MARKET, 1000, 3600);
    });
  });

  describe('fail-closed admission', () => {
    it('reverts on unconfigured market', async () => {
      await expect(
        limiter.connect(consumer).requireOutflowAllowed(MARKET, 1),
      ).to.be.revertedWithCustomError(limiter, 'MarketNotConfigured');
    });

    it('rejects calls from non-CONSUMER_ROLE', async () => {
      await limiter.connect(governor).configureMarket(MARKET, 1_000_000, 3600);
      await expect(
        limiter.connect(attacker).requireOutflowAllowed(MARKET, 1),
      ).to.be.revertedWithCustomError(limiter, 'MissingRole');
    });
  });

  describe('cap enforcement', () => {
    beforeEach(async () => {
      await limiter.connect(governor).configureMarket(MARKET, 1_000_000, 3600);
    });

    it('admits outflow strictly below the cap', async () => {
      await expect(limiter.connect(consumer).requireOutflowAllowed(MARKET, 100_000))
        .to.emit(limiter, 'OutflowRecorded');
      expect(await limiter.currentWindowTotal(MARKET)).to.equal(100_000n);
      expect(await limiter.remainingWindowCapacity(MARKET)).to.equal(900_000n);
    });

    it('reverts when cumulative outflow would exceed the cap', async () => {
      await limiter.connect(consumer).requireOutflowAllowed(MARKET, 600_000);
      await expect(
        limiter.connect(consumer).requireOutflowAllowed(MARKET, 500_000),
      ).to.be.revertedWithCustomError(limiter, 'WindowCapExceeded');
    });

    it('admits outflow that exactly hits the cap', async () => {
      await limiter.connect(consumer).requireOutflowAllowed(MARKET, 999_999);
      await expect(limiter.connect(consumer).requireOutflowAllowed(MARKET, 1))
        .to.emit(limiter, 'OutflowRecorded');
      expect(await limiter.remainingWindowCapacity(MARKET)).to.equal(0n);
    });
  });

  describe('window rollover', () => {
    it('restores capacity after windowSecs has elapsed', async () => {
      const windowSecs = 600; // 10 minutes
      await limiter.connect(governor).configureMarket(MARKET, 1_000_000, windowSecs);
      await limiter.connect(consumer).requireOutflowAllowed(MARKET, 800_000);
      // Advance time past the window. Add 12 buckets * bucketSize so
      // every bucket has aged out.
      await ethers.provider.send('evm_increaseTime', [windowSecs + 60]);
      await ethers.provider.send('evm_mine', []);
      expect(await limiter.currentWindowTotal(MARKET)).to.equal(0n);
      await expect(limiter.connect(consumer).requireOutflowAllowed(MARKET, 800_000))
        .to.emit(limiter, 'OutflowRecorded');
    });
  });

  describe('emergency bypass', () => {
    beforeEach(async () => {
      await limiter.connect(governor).configureMarket(MARKET, 1_000_000, 3600);
    });

    it('refuses to activate bypass when protocol is not halted', async () => {
      await expect(
        limiter.connect(guardian).activateBypass('drain test'),
      ).to.be.revertedWithCustomError(limiter, 'BypassRequiresHalt');
    });

    it('activates bypass only after IncidentController.haltGlobal', async () => {
      await incident.connect(guardian).haltGlobal('incident');
      await expect(limiter.connect(guardian).activateBypass('post-halt unwind'))
        .to.emit(limiter, 'BypassActivated');
      expect(await limiter.bypassActive()).to.equal(true);
    });

    it('with bypass active, outflow above cap is admitted (and recorded)', async () => {
      await incident.connect(guardian).haltGlobal('incident');
      await limiter.connect(guardian).activateBypass('post-halt unwind');
      await expect(limiter.connect(consumer).requireOutflowAllowed(MARKET, 5_000_000))
        .to.emit(limiter, 'OutflowRecorded');
      expect(await limiter.currentWindowTotal(MARKET)).to.equal(5_000_000n);
    });

    it('governor can deactivate bypass', async () => {
      await incident.connect(guardian).haltGlobal('incident');
      await limiter.connect(guardian).activateBypass('x');
      await expect(limiter.connect(governor).deactivateBypass())
        .to.emit(limiter, 'BypassDeactivated');
      expect(await limiter.bypassActive()).to.equal(false);
    });

    it('non-governor cannot deactivate bypass', async () => {
      await incident.connect(guardian).haltGlobal('incident');
      await limiter.connect(guardian).activateBypass('x');
      await expect(
        limiter.connect(guardian).deactivateBypass(),
      ).to.be.revertedWithCustomError(limiter, 'MissingRole');
    });
  });
});
