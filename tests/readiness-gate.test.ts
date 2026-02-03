import { ethers } from 'ethers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

const CAPITAL_READINESS_GATE_ADDRESS = '0xc3f798066e1401aa30Da8703A4c0588A1076ff39';

const CAPITAL_READINESS_GATE_ABI = [
  'function checkReadiness() view returns (bool isReady, string failureReason)',
  'function assertReady() view returns (bool ready)',
  'function getObservationDaysElapsed() view returns (uint256)',
  'function getAttestation() view returns (tuple(uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, uint64 lastUpdated, uint64 observationStartTimestamp, bytes32 auditHash))',
  'function getConfig() view returns (tuple(bytes32 requiredAuditHash, uint16 minimumUptimeBps, uint16 minimumObservationDaysElapsed, uint16 maxIncidentsAllowed, uint256 minimumTVLUsd, uint256 freezeWindowSeconds))',
  'function checkFreezeStatus() view returns (bool inFreeze, uint64 unfreezeAt)',
  'function getAttestationFreshness() view returns (uint256 secondsRemaining)',
  'function maxAttestationStaleness() view returns (uint256)',
  'function paused() view returns (bool)'
];

async function test(name: string, fn: () => Promise<boolean>) {
  try {
    const result = await fn();
    console.log(result ? `✓ ${name}` : `✗ ${name}`);
    return result;
  } catch (e: any) {
    console.log(`✗ ${name}: ${e.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== CapitalReadinessGate Contract Tests ===\n');
  console.log(`Contract: ${CAPITAL_READINESS_GATE_ADDRESS}`);
  console.log(`RPC: ${ARBITRUM_RPC.substring(0, 50)}...`);
  console.log('');

  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const contract = new ethers.Contract(CAPITAL_READINESS_GATE_ADDRESS, CAPITAL_READINESS_GATE_ABI, provider);

  let passed = 0;
  let failed = 0;

  const results = await Promise.all([
    test('Contract address is valid', async () => {
      return ethers.isAddress(CAPITAL_READINESS_GATE_ADDRESS);
    }),
    test('checkReadiness() returns boolean and string', async () => {
      const result = await contract.checkReadiness();
      return typeof result.isReady === 'boolean' && typeof result.failureReason === 'string';
    }),
    test('getObservationDaysElapsed() returns number', async () => {
      const days = await contract.getObservationDaysElapsed();
      return typeof days === 'bigint' && Number(days) >= 0;
    }),
    test('getConfig() returns config struct', async () => {
      const config = await contract.getConfig();
      return config && typeof config.minimumUptimeBps === 'bigint';
    }),
    test('checkFreezeStatus() returns freeze state', async () => {
      const status = await contract.checkFreezeStatus();
      return typeof status.inFreeze === 'boolean' && typeof status.unfreezeAt === 'bigint';
    }),
    test('maxAttestationStaleness() returns max staleness', async () => {
      const staleness = await contract.maxAttestationStaleness();
      return typeof staleness === 'bigint' && Number(staleness) > 0;
    }),
    test('paused() returns boolean', async () => {
      const isPaused = await contract.paused();
      return typeof isPaused === 'boolean';
    }),
  ]);

  results.forEach(r => r ? passed++ : failed++);

  console.log('\n=== API Endpoint Tests ===\n');
  console.log(`API Base: ${BASE_URL}`);
  console.log('');

  const apiResults = await Promise.all([
    test('GET /api/operator/readiness returns 200', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      return response.status === 200;
    }),
    test('Response has isReady property', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      return typeof data.isReady === 'boolean';
    }),
    test('Response has observationDaysElapsed', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      return typeof data.observationDaysElapsed === 'number';
    }),
    test('Response has freezeStatus', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      return data.freezeStatus && typeof data.freezeStatus.inFreeze === 'boolean';
    }),
    test('Response has attestationFreshness', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      return typeof data.attestationFreshness === 'number';
    }),
    test('Response has config object when available', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      if (data.config === null) return true;
      return typeof data.config.minimumObservationDaysElapsed === 'number';
    }),
    test('Response has paused boolean', async () => {
      const response = await fetch(`${BASE_URL}/api/operator/readiness`);
      const data = await response.json();
      return typeof data.paused === 'boolean';
    }),
  ]);

  apiResults.forEach(r => r ? passed++ : failed++);

  console.log('\n=== Service Integration Tests ===\n');

  const serviceResults = await Promise.all([
    test('NODE_ECONOMY_CONTRACTS includes CAPITAL_READINESS_GATE', async () => {
      const { NODE_ECONOMY_CONTRACTS } = await import('../lib/contracts/node-economy');
      return NODE_ECONOMY_CONTRACTS.CAPITAL_READINESS_GATE === CAPITAL_READINESS_GATE_ADDRESS;
    }),
    test('getNodeEconomyService returns service instance', async () => {
      const { getNodeEconomyService } = await import('../lib/contracts/node-economy');
      const service = getNodeEconomyService();
      return typeof service.getReadinessStatus === 'function';
    }),
    test('getReadinessStatus returns valid data', async () => {
      const { getNodeEconomyService } = await import('../lib/contracts/node-economy');
      const service = getNodeEconomyService();
      const status = await service.getReadinessStatus();
      return typeof status.isReady === 'boolean' && typeof status.observationDaysElapsed === 'number';
    }),
  ]);

  serviceResults.forEach(r => r ? passed++ : failed++);

  console.log('\n=== Summary ===\n');
  console.log(`Total: ${passed + failed} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
