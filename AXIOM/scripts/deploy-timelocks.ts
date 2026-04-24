/**
 * Deploy TimelockController contracts for the Axiom Protocol governance
 * migration. One per delay tier (STANDARD_DELAY = 48h, GOVERNANCE_DELAY
 * = 14d). FAST_PATH halts do not need a timelock.
 *
 * Usage:
 *   npx hardhat run AXIOM/scripts/deploy-timelocks.ts --network arbitrumOne
 *
 * After deployment:
 *   - Update documents/governance/timelock-migration-plan.md with the
 *     deployed addresses (replace TBD entries).
 *   - For each role to migrate, the current governor must call
 *     setGovernor(timelock) on the role-holding contract. That call
 *     is itself the last unilateral governor action before the
 *     migration takes effect.
 *
 * Inputs from environment:
 *   - PROPOSER_ADDRESS     (required) — addr that can queue proposals
 *   - EXECUTOR_ADDRESS     (required) — addr that can execute after delay
 *   - ADMIN_ADDRESS        (required) — addr that can change proposer/
 *                                       executor sets. Should be set to
 *                                       address(0) post-bootstrap.
 *
 * STANDARD_DELAY = 48 hours (172_800 seconds)
 * GOVERNANCE_DELAY = 14 days (1_209_600 seconds)
 */

import hre from 'hardhat';

const STANDARD_DELAY_SECS = 48 * 60 * 60; // 48h
const GOVERNANCE_DELAY_SECS = 14 * 24 * 60 * 60; // 14d

async function main() {
  const proposer = process.env.PROPOSER_ADDRESS;
  const executor = process.env.EXECUTOR_ADDRESS;
  const admin = process.env.ADMIN_ADDRESS;

  if (!proposer || !executor || !admin) {
    throw new Error(
      'PROPOSER_ADDRESS, EXECUTOR_ADDRESS, and ADMIN_ADDRESS env vars are required.',
    );
  }

  const ethers = (hre as any).ethers;
  const Tlc = await ethers.getContractFactory('TimelockController');

  console.log('Deploying STANDARD_DELAY (48h) TimelockController...');
  const standard = await Tlc.deploy(
    STANDARD_DELAY_SECS,
    [proposer],
    [executor],
    admin,
  );
  await standard.waitForDeployment();
  const standardAddr = await standard.getAddress();
  console.log(`  STANDARD_DELAY deployed: ${standardAddr}`);

  console.log('Deploying GOVERNANCE_DELAY (14d) TimelockController...');
  const governance = await Tlc.deploy(
    GOVERNANCE_DELAY_SECS,
    [proposer],
    [executor],
    admin,
  );
  await governance.waitForDeployment();
  const governanceAddr = await governance.getAddress();
  console.log(`  GOVERNANCE_DELAY deployed: ${governanceAddr}`);

  console.log('\nNext steps:');
  console.log('  1. Update documents/governance/timelock-migration-plan.md');
  console.log(`     STANDARD_DELAY  → ${standardAddr}`);
  console.log(`     GOVERNANCE_DELAY → ${governanceAddr}`);
  console.log(
    '  2. For each role-holding contract (CollateralGuard, IncidentController,',
  );
  console.log(
    '     AXIOMFixedLoan, MintRedeemController, WithdrawalRateLimiter), the',
  );
  console.log(
    '     current governor must call setGovernor(<timelock>) per the migration',
  );
  console.log(
    '     order in the plan document. Each migration is atomic per contract.',
  );
  console.log(
    '  3. Verify on Arbiscan and confirm the State column on /trust/governance',
  );
  console.log('     turns LIVE for each migrated row.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
