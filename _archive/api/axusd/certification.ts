import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

/**
 * AXUSD Executive Certification API
 * 
 * GENIUS Act Compliance Endpoint
 * Manages CEO/CFO certifications for monthly reserve disclosures
 * 
 * POST /api/axusd/certification - Submit new certification
 * GET /api/axusd/certification - Get certification history
 */

interface CertificationSubmission {
  disclosureDate: string;
  totalAXUSDSupply: string;
  totalReserves: string;
  reserveBreakdown: {
    usdc: string;
    tbills: string;
    other: string;
  };
  certifierName: string;
  certifierTitle: 'CEO' | 'CFO' | 'Compliance Officer';
  certifierEmail: string;
  attestationStatement: string;
  ipfsHash?: string;
}

interface CertificationRecord {
  id: number;
  disclosure_date: string;
  total_supply: string;
  total_reserves: string;
  reserve_ratio: number;
  certifier_name: string;
  certifier_title: string;
  attestation_statement: string;
  ipfs_hash: string | null;
  created_at: string;
  status: 'pending' | 'certified' | 'revoked';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return getCertifications(req, res);
  } else if (req.method === 'POST') {
    return submitCertification(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getCertifications(req: NextApiRequest, res: NextApiResponse) {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    
    const result = await db.execute(`
      SELECT 
        id,
        disclosure_date,
        total_supply,
        total_reserves,
        reserve_ratio,
        certifier_name,
        certifier_title,
        attestation_statement,
        ipfs_hash,
        created_at,
        status
      FROM axusd_certifications
      ORDER BY disclosure_date DESC
      LIMIT $1
    `, [limit]);
    
    return res.status(200).json({
      success: true,
      certifications: result.rows || [],
      count: result.rows?.length || 0
    });
    
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return res.status(200).json({
        success: true,
        certifications: [],
        count: 0,
        note: 'No certifications table yet. Run migrations to create.'
      });
    }
    
    console.error('Certification fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch certifications'
    });
  }
}

async function submitCertification(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body: CertificationSubmission = req.body;
    
    if (!body.disclosureDate || !body.totalAXUSDSupply || !body.totalReserves) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: disclosureDate, totalAXUSDSupply, totalReserves'
      });
    }
    
    if (!body.certifierName || !body.certifierTitle || !body.attestationStatement) {
      return res.status(400).json({
        success: false,
        error: 'Missing certifier information'
      });
    }
    
    const supply = parseFloat(body.totalAXUSDSupply) || 0;
    const reserves = parseFloat(body.totalReserves) || 0;
    const reserveRatio = supply > 0 ? (reserves / supply) * 100 : 0;
    
    if (reserveRatio < 100) {
      return res.status(400).json({
        success: false,
        error: `Reserve ratio is ${reserveRatio.toFixed(2)}% which is below the 100% GENIUS Act requirement`,
        reserveRatio
      });
    }
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS axusd_certifications (
        id SERIAL PRIMARY KEY,
        disclosure_date DATE NOT NULL,
        total_supply DECIMAL(28, 18) NOT NULL,
        total_reserves DECIMAL(28, 18) NOT NULL,
        reserve_ratio DECIMAL(10, 4) NOT NULL,
        usdc_reserves DECIMAL(28, 18),
        tbill_reserves DECIMAL(28, 18),
        other_reserves DECIMAL(28, 18),
        certifier_name VARCHAR(255) NOT NULL,
        certifier_title VARCHAR(100) NOT NULL,
        certifier_email VARCHAR(255),
        attestation_statement TEXT NOT NULL,
        ipfs_hash VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'certified'
      )
    `);
    
    const result = await db.execute(`
      INSERT INTO axusd_certifications (
        disclosure_date,
        total_supply,
        total_reserves,
        reserve_ratio,
        usdc_reserves,
        tbill_reserves,
        other_reserves,
        certifier_name,
        certifier_title,
        certifier_email,
        attestation_statement,
        ipfs_hash,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'certified')
      RETURNING id, created_at
    `, [
      body.disclosureDate,
      body.totalAXUSDSupply,
      body.totalReserves,
      reserveRatio,
      body.reserveBreakdown?.usdc || '0',
      body.reserveBreakdown?.tbills || '0',
      body.reserveBreakdown?.other || '0',
      body.certifierName,
      body.certifierTitle,
      body.certifierEmail || null,
      body.attestationStatement,
      body.ipfsHash || null
    ]);
    
    const certification = result.rows?.[0];
    
    return res.status(201).json({
      success: true,
      message: 'Certification submitted successfully',
      certification: {
        id: certification?.id,
        disclosureDate: body.disclosureDate,
        reserveRatio: reserveRatio.toFixed(2) + '%',
        certifiedAt: certification?.created_at,
        geniusCompliant: reserveRatio >= 100
      }
    });
    
  } catch (error) {
    console.error('Certification submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit certification'
    });
  }
}
