import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const CAPITAL_BRIDGE_HUB = '0x6a00455dC277C9430e5c45324B34F2425ba0408d';

const ABI = [
  'function getPacketCount() view returns (uint256)',
  'function packets(uint256) view returns (uint256 packetId, address submitter, bytes32 propertyDataHash, bytes32 dueDiligencePackageCid, bytes32 underwritingModelHash, bytes32 riskSummaryHash, uint256 maxApprovedCapital, uint8 state, uint8 rejectionReason, uint64 submittedAt, uint64 expiresAt, uint64 approvedAt)',
];

const PACKET_STATES = ['Submitted', 'Attested', 'Approved', 'Rejected', 'Archived', 'Expired'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const hub = new ethers.Contract(CAPITAL_BRIDGE_HUB, ABI, provider);

    const { id } = req.query;

    if (id) {
      const packetId = Number(id);
      const packet = await hub.packets(packetId);
      
      if (packet.packetId === 0n) {
        return res.status(404).json({ error: 'Packet not found' });
      }

      return res.status(200).json({
        success: true,
        packet: {
          packetId: Number(packet.packetId),
          submitter: packet.submitter,
          propertyDataHash: packet.propertyDataHash,
          dueDiligencePackageCid: packet.dueDiligencePackageCid,
          underwritingModelHash: packet.underwritingModelHash,
          riskSummaryHash: packet.riskSummaryHash,
          maxApprovedCapital: ethers.formatEther(packet.maxApprovedCapital),
          state: PACKET_STATES[packet.state] || 'Unknown',
          stateCode: packet.state,
          submittedAt: new Date(Number(packet.submittedAt) * 1000).toISOString(),
          expiresAt: new Date(Number(packet.expiresAt) * 1000).toISOString(),
          approvedAt: Number(packet.approvedAt) > 0 ? new Date(Number(packet.approvedAt) * 1000).toISOString() : null,
        },
        proofLink: `https://arbitrum.blockscout.com/address/${CAPITAL_BRIDGE_HUB}`,
      });
    }

    const count = await hub.getPacketCount();
    const packets = [];

    const fetchLimit = Math.min(Number(count), 50);
    for (let i = 1; i <= fetchLimit; i++) {
      try {
        const packet = await hub.packets(i);
        if (packet.packetId > 0n) {
          packets.push({
            packetId: Number(packet.packetId),
            submitter: packet.submitter,
            maxApprovedCapital: ethers.formatEther(packet.maxApprovedCapital),
            state: PACKET_STATES[packet.state] || 'Unknown',
            submittedAt: new Date(Number(packet.submittedAt) * 1000).toISOString(),
          });
        }
      } catch {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      totalCount: Number(count),
      packets,
      contract: CAPITAL_BRIDGE_HUB,
    });
  } catch (error) {
    console.error('Packets API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
