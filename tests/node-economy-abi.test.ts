import { ethers } from 'ethers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

const NODE_ECONOMY_CONTRACTS = {
  NODE_REGISTRY: '0x31bc6268155219B627FC3B2d8434d010F33DCb03',
  NODE_REWARDS: '0x0c1c96F38566d056877cEf4791c701C4F5AEf362',
  SLASHING_ENGINE: '0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87',
};

const NODE_REGISTRY_ABI = [
  'function getTotalNodeCount() view returns (uint256)',
  'function getActiveNodeCount(uint8 nodeClass) view returns (uint256)',
  'function getStakeRequirement(uint8 nodeClass) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool active))',
  'function areContractsConfigured() view returns (bool)',
  'function getNodesByOperator(address operator) view returns (uint256[])',
  'function isNodeActive(uint256 nodeId) view returns (bool)',
  'function paused() view returns (bool)',
];

const NODE_REWARDS_ABI = [
  'function getCurrentEpoch() view returns (uint256)',
  'function epochStartTime() view returns (uint256)',
  'function globalEpochDuration() view returns (uint256)',
  'function maxRewardsPerEpoch() view returns (uint256)',
  'function getTimeUntilNextEpoch() view returns (uint256)',
  'function calculateNodeReward(uint256 nodeId) view returns (uint256)',
  'function paused() view returns (bool)',
];

const SLASHING_ENGINE_ABI = [
  'function totalSlashed() view returns (uint256)',
  'function totalEscrowed() view returns (uint256)',
  'function getAvailableForWithdrawal() view returns (uint256)',
  'function getSlashingParams(uint8 nodeClass) view returns (tuple(uint256 slashPercentBps, uint256 cooldownPeriod, uint256 maxSlashesBeforeSuspension, bool active))',
  'function paused() view returns (bool)',
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
  console.log('Node Economy ABI Integration Tests\n');
  console.log('Testing against Arbitrum One mainnet contracts...\n');
  
  let passed = 0, failed = 0;
  
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, provider);
  const nodeRewards = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REWARDS, NODE_REWARDS_ABI, provider);
  const slashingEngine = new ethers.Contract(NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE, SLASHING_ENGINE_ABI, provider);

  console.log('--- NodeRegistry Contract Tests ---\n');

  if (await test('NodeRegistry.getTotalNodeCount() returns uint256', async () => {
    const result = await nodeRegistry.getTotalNodeCount();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('NodeRegistry.getActiveNodeCount(0) returns uint256', async () => {
    const result = await nodeRegistry.getActiveNodeCount(0);
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('NodeRegistry.getActiveNodeCount works for all 4 node classes', async () => {
    const results = await Promise.all([
      nodeRegistry.getActiveNodeCount(0),
      nodeRegistry.getActiveNodeCount(1),
      nodeRegistry.getActiveNodeCount(2),
      nodeRegistry.getActiveNodeCount(3),
    ]);
    return results.every(r => typeof r === 'bigint');
  })) passed++; else failed++;

  if (await test('NodeRegistry.getStakeRequirement(0) returns tuple', async () => {
    const result = await nodeRegistry.getStakeRequirement(0);
    return result.minStake !== undefined && result.lockPeriod !== undefined && result.active !== undefined;
  })) passed++; else failed++;

  if (await test('NodeRegistry.areContractsConfigured() returns bool', async () => {
    const result = await nodeRegistry.areContractsConfigured();
    return typeof result === 'boolean';
  })) passed++; else failed++;

  if (await test('NodeRegistry.getNodesByOperator(address) returns uint256[]', async () => {
    const result = await nodeRegistry.getNodesByOperator('0x0000000000000000000000000000000000000000');
    return Array.isArray(result);
  })) passed++; else failed++;

  if (await test('NodeRegistry.paused() returns bool', async () => {
    const result = await nodeRegistry.paused();
    return typeof result === 'boolean';
  })) passed++; else failed++;

  console.log('\n--- NodeRewards Contract Tests ---\n');

  if (await test('NodeRewards.getCurrentEpoch() returns uint256', async () => {
    const result = await nodeRewards.getCurrentEpoch();
    return typeof result === 'bigint' && result >= 1n;
  })) passed++; else failed++;

  if (await test('NodeRewards.epochStartTime() returns uint256', async () => {
    const result = await nodeRewards.epochStartTime();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('NodeRewards.globalEpochDuration() returns uint256', async () => {
    const result = await nodeRewards.globalEpochDuration();
    return typeof result === 'bigint' && result > 0n;
  })) passed++; else failed++;

  if (await test('NodeRewards.maxRewardsPerEpoch() returns uint256', async () => {
    const result = await nodeRewards.maxRewardsPerEpoch();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('NodeRewards.getTimeUntilNextEpoch() returns uint256', async () => {
    const result = await nodeRewards.getTimeUntilNextEpoch();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('NodeRewards.calculateNodeReward(0) function exists (may revert for non-existent node)', async () => {
    try {
      const result = await nodeRewards.calculateNodeReward(0);
      return typeof result === 'bigint';
    } catch (e: any) {
      return e.message.includes('Node not found') || e.message.includes('execution reverted');
    }
  })) passed++; else failed++;

  if (await test('NodeRewards.paused() returns bool', async () => {
    const result = await nodeRewards.paused();
    return typeof result === 'boolean';
  })) passed++; else failed++;

  console.log('\n--- SlashingEngine Contract Tests ---\n');

  if (await test('SlashingEngine.totalSlashed() returns uint256', async () => {
    const result = await slashingEngine.totalSlashed();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('SlashingEngine.totalEscrowed() returns uint256', async () => {
    const result = await slashingEngine.totalEscrowed();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('SlashingEngine.getAvailableForWithdrawal() returns uint256', async () => {
    const result = await slashingEngine.getAvailableForWithdrawal();
    return typeof result === 'bigint';
  })) passed++; else failed++;

  if (await test('SlashingEngine.getSlashingParams(0) returns tuple', async () => {
    const result = await slashingEngine.getSlashingParams(0);
    return result.slashPercentBps !== undefined && result.cooldownPeriod !== undefined;
  })) passed++; else failed++;

  if (await test('SlashingEngine.getSlashingParams works for all 4 node classes', async () => {
    const results = await Promise.all([
      slashingEngine.getSlashingParams(0),
      slashingEngine.getSlashingParams(1),
      slashingEngine.getSlashingParams(2),
      slashingEngine.getSlashingParams(3),
    ]);
    return results.every(r => r.slashPercentBps !== undefined);
  })) passed++; else failed++;

  if (await test('SlashingEngine.paused() returns bool', async () => {
    const result = await slashingEngine.paused();
    return typeof result === 'boolean';
  })) passed++; else failed++;

  console.log('\n--- API Endpoint Tests ---\n');

  if (await test('GET /api/observer/node-economy returns success', async () => {
    const res = await fetch(`${BASE_URL}/api/observer/node-economy`);
    const data = await res.json();
    return res.status === 200 && data.success === true;
  })) passed++; else failed++;

  if (await test('API returns correct node class structure (4 classes)', async () => {
    const res = await fetch(`${BASE_URL}/api/observer/node-economy`);
    const data = await res.json();
    const byClass = data.nodes?.byClass;
    return byClass?.storage !== undefined && 
           byClass?.execution !== undefined && 
           byClass?.indexing !== undefined && 
           byClass?.research !== undefined;
  })) passed++; else failed++;

  if (await test('API returns stakeRequirements for all 4 classes', async () => {
    const res = await fetch(`${BASE_URL}/api/observer/node-economy`);
    const data = await res.json();
    return data.stakeRequirements?.length === 4;
  })) passed++; else failed++;

  if (await test('API returns slashingParams for all 4 classes', async () => {
    const res = await fetch(`${BASE_URL}/api/observer/node-economy`);
    const data = await res.json();
    return data.slashingParams?.length === 4;
  })) passed++; else failed++;

  if (await test('API contract addresses match expected', async () => {
    const res = await fetch(`${BASE_URL}/api/observer/node-economy`);
    const data = await res.json();
    return data.contracts?.NODE_REGISTRY === NODE_ECONOMY_CONTRACTS.NODE_REGISTRY &&
           data.contracts?.NODE_REWARDS === NODE_ECONOMY_CONTRACTS.NODE_REWARDS &&
           data.contracts?.SLASHING_ENGINE === NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE;
  })) passed++; else failed++;

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. This may indicate ABI drift from deployed contracts.');
    process.exit(1);
  } else {
    console.log('\n✅ All ABI integration tests passed!');
  }
}

runTests().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
