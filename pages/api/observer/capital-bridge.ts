import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

let _pgPool: any = null;
function getPgPool() {
  if (!_pgPool) {
    const { Pool } = require('pg');
    _pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pgPool;
}

const CONTRACTS = {
  CapitalBridgeHub: '0x6a00455dC277C9430e5c45324B34F2425ba0408d',
  CapitalReadinessGate: '0xc3f798066e1401aa30Da8703A4c0588A1076ff39',
  InstrumentRegistry: '0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5',
  PoolRegistry: '0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9',
  ServicingEventLog: '0x4A152350e3df79CbE895453ee1B7d486E7338093',
};

const CAPITAL_BRIDGE_HUB_ABI = [
  'function getPacketCount() view returns (uint256)',
  'function getSPVCount() view returns (uint256)',
  'function getAuthorizationCount() view returns (uint256)',
  'function getSettlementCount() view returns (uint256)',
  'function capitalReadinessGate() view returns (address)',
];

const READINESS_GATE_ABI = [
  'function isReady() view returns (bool)',
  'function observationStartTimestamp() view returns (uint256)',
  'function freezeWindow() view returns (uint256)',
  'function latestAttestation() view returns (uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash, uint256 timestamp)',
];

const INSTRUMENT_REGISTRY_ABI = [
  'function getInstrumentCount() view returns (uint256)',
  'function poolRegistry() view returns (address)',
];

const POOL_REGISTRY_ABI = [
  'function getPoolCount() view returns (uint256)',
  'function instrumentRegistry() view returns (address)',
];

const SERVICING_LOG_ABI = [
  'function getEventCount() view returns (uint256)',
  'function instrumentRegistry() view returns (address)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const capitalBridgeHub = new ethers.Contract(CONTRACTS.CapitalBridgeHub, CAPITAL_BRIDGE_HUB_ABI, provider);
    const readinessGate = new ethers.Contract(CONTRACTS.CapitalReadinessGate, READINESS_GATE_ABI, provider);
    const instrumentRegistry = new ethers.Contract(CONTRACTS.InstrumentRegistry, INSTRUMENT_REGISTRY_ABI, provider);
    const poolRegistry = new ethers.Contract(CONTRACTS.PoolRegistry, POOL_REGISTRY_ABI, provider);
    const servicingLog = new ethers.Contract(CONTRACTS.ServicingEventLog, SERVICING_LOG_ABI, provider);

    const notesSummaryQuery = getPgPool().query(`
      SELECT 
        COUNT(*) as total_notes,
        COUNT(*) FILTER (WHERE status IN ('active', 'current')) as active_notes,
        COUNT(*) FILTER (WHERE status = 'delinquent') as delinquent_notes,
        COALESCE(SUM(outstanding_principal), 0) as total_outstanding
      FROM private_credit_notes
    `).catch(() => ({ rows: [{ total_notes: 0, active_notes: 0, delinquent_notes: 0, total_outstanding: 0 }] }));

    const [
      packetCount,
      spvCount,
      authCount,
      settlementCount,
      isReady,
      observationStart,
      freezeWindow,
      attestation,
      instrumentCount,
      poolCount,
      eventCount,
      notesSummaryResult,
    ] = await Promise.all([
      capitalBridgeHub.getPacketCount().catch(() => 0n),
      capitalBridgeHub.getSPVCount().catch(() => 0n),
      capitalBridgeHub.getAuthorizationCount().catch(() => 0n),
      capitalBridgeHub.getSettlementCount().catch(() => 0n),
      readinessGate.isReady().catch(() => false),
      readinessGate.observationStartTimestamp().catch(() => 0n),
      readinessGate.freezeWindow().catch(() => 0n),
      readinessGate.latestAttestation().catch(() => ({ uptimeBps: 0n, incidentsCount: 0n, tvlUsd: 0n, auditHash: ethers.ZeroHash, timestamp: 0n })),
      instrumentRegistry.getInstrumentCount().catch(() => 0n),
      poolRegistry.getPoolCount().catch(() => 0n),
      servicingLog.getEventCount().catch(() => 0n),
      notesSummaryQuery,
    ]);
    
    const notesSummary = notesSummaryResult.rows[0];

    const now = Math.floor(Date.now() / 1000);
    const observationStartNum = Number(observationStart);
    const daysElapsed = observationStartNum > 0 ? Math.floor((now - observationStartNum) / 86400) : 0;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      capitalBridge: {
        status: isReady ? 'READY' : 'OBSERVATION',
        packets: {
          total: Number(packetCount),
          label: 'Property Packets',
        },
        spvs: {
          total: Number(spvCount),
          label: 'Registered SPVs',
        },
        authorizations: {
          total: Number(authCount),
          label: 'Authorizations',
        },
        settlements: {
          total: Number(settlementCount),
          label: 'Settlements',
        },
      },
      readinessGate: {
        isReady,
        observationStartDate: observationStartNum > 0 ? new Date(observationStartNum * 1000).toISOString() : null,
        daysElapsed,
        freezeWindowDays: Number(freezeWindow) / 86400,
        attestation: {
          uptimeBps: Number(attestation.uptimeBps || attestation[0] || 0),
          incidentsCount: Number(attestation.incidentsCount || attestation[1] || 0),
          tvlUsd: Number(attestation.tvlUsd || attestation[2] || 0),
          auditHash: attestation.auditHash || attestation[3] || ethers.ZeroHash,
          lastUpdated: Number(attestation.timestamp || attestation[4] || 0) > 0 
            ? new Date(Number(attestation.timestamp || attestation[4]) * 1000).toISOString() 
            : null,
        },
      },
      securitization: {
        instruments: {
          total: Number(instrumentCount),
          label: 'Registered Instruments',
        },
        pools: {
          total: Number(poolCount),
          label: 'Active Pools',
        },
        servicingEvents: {
          total: Number(eventCount),
          label: 'Servicing Events',
        },
      },
      notePortal: {
        totalNotes: parseInt(notesSummary.total_notes) || 0,
        activeNotes: parseInt(notesSummary.active_notes) || 0,
        delinquentNotes: parseInt(notesSummary.delinquent_notes) || 0,
        totalOutstanding: parseFloat(notesSummary.total_outstanding) || 0,
        status: parseInt(notesSummary.delinquent_notes) > 0 ? 'ATTENTION' : 'HEALTHY',
      },
      contracts: CONTRACTS,
      proofLinks: [
        { label: 'CapitalBridgeHub', url: `https://arbitrum.blockscout.com/address/${CONTRACTS.CapitalBridgeHub}` },
        { label: 'CapitalReadinessGate', url: `https://arbitrum.blockscout.com/address/${CONTRACTS.CapitalReadinessGate}` },
        { label: 'InstrumentRegistry', url: `https://arbitrum.blockscout.com/address/${CONTRACTS.InstrumentRegistry}` },
        { label: 'PoolRegistry', url: `https://arbitrum.blockscout.com/address/${CONTRACTS.PoolRegistry}` },
        { label: 'ServicingEventLog', url: `https://arbitrum.blockscout.com/address/${CONTRACTS.ServicingEventLog}` },
      ],
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Capital Bridge API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
