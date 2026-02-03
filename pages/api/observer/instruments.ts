import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const INSTRUMENT_REGISTRY = '0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5';
const POOL_REGISTRY = '0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9';
const SERVICING_LOG = '0x4A152350e3df79CbE895453ee1B7d486E7338093';

const INSTRUMENT_ABI = [
  'function getInstrumentCount() view returns (uint256)',
  'function getInstrumentInfo(uint256 instrumentId) view returns (tuple(uint256 instrumentId, uint8 instrumentType, bytes32 metadataHash, bytes32 legalDocHash, uint256 principalAmount, uint256 maturityDate, address issuer, uint8 status, uint256 registeredAt))',
];

const POOL_ABI = [
  'function getPoolCount() view returns (uint256)',
  'function getPoolInfo(uint256 poolId) view returns (tuple(uint256 poolId, bytes32 metadataHash, uint256[] instrumentIds, uint256 totalValue, address creator, uint256 createdAt))',
];

const SERVICING_ABI = [
  'function getEventCount() view returns (uint256)',
  'function getInstrumentEventCount(uint256 instrumentId) view returns (uint256)',
];

const INSTRUMENT_TYPES = ['WholeLoan', 'Participation', 'Note', 'Certificate'];
const INSTRUMENT_STATUSES = ['Active', 'Matured', 'Defaulted', 'Redeemed'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const instrumentRegistry = new ethers.Contract(INSTRUMENT_REGISTRY, INSTRUMENT_ABI, provider);
    const poolRegistry = new ethers.Contract(POOL_REGISTRY, POOL_ABI, provider);
    const servicingLog = new ethers.Contract(SERVICING_LOG, SERVICING_ABI, provider);

    const { id, type } = req.query;

    if (id) {
      const instrumentId = Number(id);
      if (isNaN(instrumentId) || instrumentId < 1) {
        return res.status(400).json({ error: 'Invalid instrument ID. Must be a positive integer.' });
      }
      const instrument = await instrumentRegistry.getInstrumentInfo(instrumentId);
      
      if (instrument.instrumentId === 0n) {
        return res.status(404).json({ error: 'Instrument not found' });
      }

      let eventCount = 0;
      try {
        eventCount = Number(await servicingLog.getInstrumentEventCount(instrumentId));
      } catch {
        // Events might not be available
      }

      return res.status(200).json({
        success: true,
        instrument: {
          instrumentId: Number(instrument.instrumentId),
          instrumentType: INSTRUMENT_TYPES[instrument.instrumentType] || 'Unknown',
          typeCode: instrument.instrumentType,
          metadataHash: instrument.metadataHash,
          legalDocHash: instrument.legalDocHash,
          principalAmount: ethers.formatEther(instrument.principalAmount),
          maturityDate: new Date(Number(instrument.maturityDate) * 1000).toISOString(),
          issuer: instrument.issuer,
          status: INSTRUMENT_STATUSES[instrument.status] || 'Unknown',
          statusCode: instrument.status,
          registeredAt: new Date(Number(instrument.registeredAt) * 1000).toISOString(),
          servicingEventCount: eventCount,
        },
        contracts: {
          instrumentRegistry: INSTRUMENT_REGISTRY,
          servicingLog: SERVICING_LOG,
        },
      });
    }

<<<<<<< HEAD
    let instrumentCount = 0n;
    let poolCount = 0n;
    let eventCount = 0n;
    
    try {
      [instrumentCount, poolCount, eventCount] = await Promise.all([
        instrumentRegistry.getInstrumentCount().catch(() => 0n),
        poolRegistry.getPoolCount().catch(() => 0n),
        servicingLog.getEventCount().catch(() => 0n),
      ]);
    } catch {
      // Contracts may revert if no items registered yet
    }
=======
    const [instrumentCount, poolCount, eventCount] = await Promise.all([
      instrumentRegistry.getInstrumentCount(),
      poolRegistry.getPoolCount(),
      servicingLog.getEventCount(),
    ]);
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26

    const instruments = [];
    const fetchLimit = Math.min(Number(instrumentCount), 50);

    for (let i = 1; i <= fetchLimit; i++) {
      try {
        const instrument = await instrumentRegistry.getInstrumentInfo(i);
        if (instrument.instrumentId > 0n) {
          const typeFilter = type ? String(type).toLowerCase() : null;
          const instrumentType = INSTRUMENT_TYPES[instrument.instrumentType]?.toLowerCase();
          
          if (!typeFilter || instrumentType === typeFilter) {
            instruments.push({
              instrumentId: Number(instrument.instrumentId),
              instrumentType: INSTRUMENT_TYPES[instrument.instrumentType] || 'Unknown',
              principalAmount: ethers.formatEther(instrument.principalAmount),
              status: INSTRUMENT_STATUSES[instrument.status] || 'Unknown',
              maturityDate: new Date(Number(instrument.maturityDate) * 1000).toISOString(),
              registeredAt: new Date(Number(instrument.registeredAt) * 1000).toISOString(),
            });
          }
        }
      } catch {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalInstruments: Number(instrumentCount),
        totalPools: Number(poolCount),
        totalServicingEvents: Number(eventCount),
      },
      instruments,
      contracts: {
        instrumentRegistry: INSTRUMENT_REGISTRY,
        poolRegistry: POOL_REGISTRY,
        servicingLog: SERVICING_LOG,
      },
    });
  } catch (error) {
    console.error('Instruments API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
