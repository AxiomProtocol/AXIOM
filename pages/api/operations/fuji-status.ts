/**
 * GET /api/operations/fuji-status
 *
 * Reads live on-chain state from the 8 deployed ERC-3643 contracts on
 * Avalanche Fuji testnet (chainId 43113) and returns a structured status
 * snapshot. Also embeds metadata from the last smoke test run.
 *
 * No wallet / signing needed — all reads are view calls.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { FUJI_CONTRACTS, FUJI_CHAIN_ID } from '../../../shared/contracts-avalanche';
import smokeResults from '../../../deployments/avalanche/fuji-smoke-results.json';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';

const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const TEST_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const EXPLORER = 'https://testnet.snowtrace.io';

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function compliance() view returns (address)',
  'function identityRegistry() view returns (address)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function AGENT_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const MC_ABI = [
  'function getModules() view returns (address[])',
  'function getTokenBound() view returns (address)',
];

const IR_ABI = [
  'function issuersRegistry() view returns (address)',
  'function topicsRegistry() view returns (address)',
  'function identityStorage() view returns (address)',
];

const TLM_ABI = [
  'function getTransferLimit(address _compliance) view returns (uint256)',
  'function isComplianceBound(address _compliance) view returns (bool)',
];

function addrSlug(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export interface FujiStatusResponse {
  ok: boolean;
  chainId: number;
  timestamp: string;
  rpcLatencyMs: number;
  error?: string;
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    paused: boolean;
    complianceAddress: string;
    identityRegistryAddress: string;
  };
  balances: {
    deployer: { address: string; balance: string };
    testWallet: { address: string; balance: string };
  };
  roles: {
    deployer: {
      isAdmin: boolean;
      isMinter: boolean;
      isAgent: boolean;
      mainnetReady: false;
    };
  };
  compliance: {
    modules: string[];
    countryAllowModuleBound: boolean;
    transferLimitModuleBound: boolean;
    transferLimitAxusd: string;
    countryAllowTestnetWarning: string;
  };
  identityRegistry: {
    address: string;
    issuersRegistry: string;
    topicsRegistry: string;
    identityStorage: string;
  };
  contracts: Record<string, { address: string; explorer: string }>;
  smokeTest: {
    task: string;
    completedAt: string;
    passed: number;
    failed: number;
    total: number;
  };
  mainnetPromotionGate: {
    items: Array<{ label: string; done: boolean }>;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FujiStatusResponse | { ok: false; error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const t0 = Date.now();

  try {
    const provider = new ethers.JsonRpcProvider(FUJI_RPC, {
      chainId: FUJI_CHAIN_ID,
      name: 'avalanche-fuji',
    });

    const token = new ethers.Contract(FUJI_CONTRACTS.AxiomStable3643, TOKEN_ABI, provider);
    const mc = new ethers.Contract(FUJI_CONTRACTS.ModularCompliance, MC_ABI, provider);
    const ir = new ethers.Contract(FUJI_CONTRACTS.IdentityRegistry, IR_ABI, provider);
    const tlm = new ethers.Contract(FUJI_CONTRACTS.TransferLimitModule, TLM_ABI, provider);

    const [
      name,
      symbol,
      decimals,
      totalSupplyRaw,
      paused,
      complianceAddr,
      identityRegistryAddr,
      ADMIN_ROLE,
      MINTER_ROLE,
      AGENT_ROLE,
      deployerBalance,
      testWalletBalance,
      modules,
      tokenBound,
      irIssuers,
      irTopics,
      irStorage,
      transferLimitRaw,
      tlmBound,
    ] = await Promise.all([
      token.name().catch(() => 'UNKNOWN'),
      token.symbol().catch(() => 'UNKNOWN'),
      token.decimals().catch(() => 6),
      token.totalSupply().catch(() => BigInt(0)),
      token.paused().catch(() => null),
      token.compliance().catch(() => ''),
      token.identityRegistry().catch(() => ''),
      token.DEFAULT_ADMIN_ROLE().catch(() => null),
      token.MINTER_ROLE().catch(() => null),
      token.AGENT_ROLE().catch(() => null),
      token.balanceOf(DEPLOYER).catch(() => BigInt(0)),
      token.balanceOf(TEST_WALLET).catch(() => BigInt(0)),
      mc.getModules().catch(() => [] as string[]),
      mc.getTokenBound().catch(() => ''),
      ir.issuersRegistry().catch(() => ''),
      ir.topicsRegistry().catch(() => ''),
      ir.identityStorage().catch(() => ''),
      tlm.getTransferLimit(FUJI_CONTRACTS.ModularCompliance).catch(() => BigInt(0)),
      tlm.isComplianceBound(FUJI_CONTRACTS.ModularCompliance).catch(() => false),
    ]);

    const [isAdmin, isMinter, isAgent] = await Promise.all([
      ADMIN_ROLE ? token.hasRole(ADMIN_ROLE, DEPLOYER).catch(() => false) : false,
      MINTER_ROLE ? token.hasRole(MINTER_ROLE, DEPLOYER).catch(() => false) : false,
      AGENT_ROLE ? token.hasRole(AGENT_ROLE, DEPLOYER).catch(() => false) : false,
    ]);

    const dec = Number(decimals);
    const totalSupply = ethers.formatUnits(totalSupplyRaw, dec);
    const deployerBal = ethers.formatUnits(deployerBalance, dec);
    const testWalBal = ethers.formatUnits(testWalletBalance, dec);
    const transferLimit = ethers.formatUnits(transferLimitRaw, dec);

    const lowerModules = (modules as string[]).map((m: string) => m.toLowerCase());
    const hasCAM = lowerModules.includes(FUJI_CONTRACTS.CountryAllowModule.toLowerCase());
    const hasTLM = lowerModules.includes(FUJI_CONTRACTS.TransferLimitModule.toLowerCase());

    const rpcLatencyMs = Date.now() - t0;

    const contractEntries: Record<string, { address: string; explorer: string }> = {};
    for (const [key, addr] of Object.entries(FUJI_CONTRACTS)) {
      contractEntries[key] = {
        address: addr,
        explorer: `${EXPLORER}/address/${addr}`,
      };
    }

    const payload: FujiStatusResponse = {
      ok: true,
      chainId: FUJI_CHAIN_ID,
      timestamp: new Date().toISOString(),
      rpcLatencyMs,
      token: {
        address: FUJI_CONTRACTS.AxiomStable3643,
        name: String(name),
        symbol: String(symbol),
        decimals: dec,
        totalSupply,
        paused: Boolean(paused),
        complianceAddress: String(complianceAddr),
        identityRegistryAddress: String(identityRegistryAddr),
      },
      balances: {
        deployer: { address: DEPLOYER, balance: deployerBal },
        testWallet: { address: TEST_WALLET, balance: testWalBal },
      },
      roles: {
        deployer: {
          isAdmin: Boolean(isAdmin),
          isMinter: Boolean(isMinter),
          isAgent: Boolean(isAgent),
          mainnetReady: false,
        },
      },
      compliance: {
        modules: modules as string[],
        countryAllowModuleBound: hasCAM,
        transferLimitModuleBound: hasTLM && Boolean(tlmBound),
        transferLimitAxusd: transferLimit,
        countryAllowTestnetWarning:
          'setAllowAll(true) is active — Fuji testnet only. Must be replaced with per-country allowlist before mainnet.',
      },
      identityRegistry: {
        address: FUJI_CONTRACTS.IdentityRegistry,
        issuersRegistry: String(irIssuers),
        topicsRegistry: String(irTopics),
        identityStorage: String(irStorage),
      },
      contracts: contractEntries,
      smokeTest: {
        task: smokeResults.task,
        completedAt: smokeResults.completedAt,
        passed: smokeResults.passed,
        failed: smokeResults.failed,
        total: smokeResults.total,
      },
      mainnetPromotionGate: {
        items: [
          { label: 'All Fuji smoke tests pass', done: smokeResults.passed === smokeResults.total && smokeResults.failed === 0 },
          { label: 'Replace setAllowAll(true) with per-country allowlist', done: false },
          { label: 'Assign Gnosis Safe as DEFAULT_ADMIN / AGENT / MINTER', done: false },
          { label: 'Set production TransferLimitModule cap', done: false },
          { label: 'External security audit signed off', done: false },
          { label: 'Capinfra AVALANCHE adapter DRY_RUN + LIVE tested', done: false },
          { label: 'Multi-party authorization wallet (Safe on Avalanche) funded', done: false },
          { label: 'Disclosure documents updated for Avalanche C-Chain', done: false },
        ],
      },
    };

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(payload);
  } catch (err: any) {
    console.error('[fuji-status] error:', err);
    return res.status(500).json({ ok: false, error: err?.message ?? 'RPC failure' });
  }
}
