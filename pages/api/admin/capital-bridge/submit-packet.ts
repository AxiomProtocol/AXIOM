import type { NextApiRequest, NextApiResponse } from 'next';
import { keccak256, toUtf8Bytes } from 'ethers';

interface PropertyPacketSubmission {
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  acreage: string;
  estimatedValue: string;
  propertyType: string;
  dueDiligenceNotes: string;
  riskScore: string;
}

interface PacketRecord {
  id: string;
  propertyDataHash: string;
  dueDiligenceHash: string;
  riskSummaryHash: string;
  submission: PropertyPacketSubmission;
  status: 'pending' | 'submitted_onchain' | 'attested' | 'approved' | 'rejected';
  createdAt: string;
  submittedBy: string;
}

const packets: PacketRecord[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as PropertyPacketSubmission;

    if (!body.propertyAddress || !body.city || !body.state || !body.zipCode) {
      return res.status(400).json({ error: 'Property address, city, state, and ZIP code are required' });
    }

    if (!body.acreage || !body.estimatedValue) {
      return res.status(400).json({ error: 'Acreage and estimated value are required' });
    }

    const propertyData = JSON.stringify({
      address: body.propertyAddress,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      acreage: body.acreage,
      estimatedValue: body.estimatedValue,
      propertyType: body.propertyType,
    });

    const dueDiligenceData = JSON.stringify({
      notes: body.dueDiligenceNotes,
      timestamp: new Date().toISOString(),
    });

    const riskData = JSON.stringify({
      score: parseInt(body.riskScore),
      propertyType: body.propertyType,
      estimatedValue: body.estimatedValue,
    });

    const propertyDataHash = keccak256(toUtf8Bytes(propertyData));
    const dueDiligenceHash = keccak256(toUtf8Bytes(dueDiligenceData));
    const riskSummaryHash = keccak256(toUtf8Bytes(riskData));

    const packetId = `PKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const packet: PacketRecord = {
      id: packetId,
      propertyDataHash,
      dueDiligenceHash,
      riskSummaryHash,
      submission: body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      submittedBy: 'admin',
    };

    packets.push(packet);

    return res.status(201).json({
      success: true,
      packetId,
      message: 'Property packet created successfully. Ready for on-chain submission.',
      hashes: {
        propertyDataHash,
        dueDiligenceHash,
        riskSummaryHash,
      },
      nextSteps: [
        'Connect wallet with RISK_COMMITTEE_ROLE',
        'Submit packet to CapitalBridgeHub.submitPacket()',
        'Obtain dual attestation from Attestor A and B',
        'Wait for approval by Risk Committee',
      ],
    });
  } catch (error) {
    console.error('Submit packet error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
