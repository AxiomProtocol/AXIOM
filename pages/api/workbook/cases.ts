import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const testMode = process.env.WORKBOOK_TEST_MODE === 'true';

  if (req.method === 'GET') {
    try {
      // Check if table exists first
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'workbook_cases'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Create table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS workbook_cases (
            id SERIAL PRIMARY KEY,
            case_title VARCHAR(255) NOT NULL,
            ancestor_primary_name VARCHAR(255) NOT NULL,
            ancestor_name_variants TEXT,
            jurisdiction_code VARCHAR(50),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
      }
      
      const result = await pool.query(`
        SELECT * FROM workbook_cases ORDER BY created_at DESC
      `);
      
      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error fetching cases:', error);
      return res.status(200).json({
        success: true,
        data: [],
      });
    }
  }

  if (req.method === 'POST') {
    if (!testMode) {
      return res.status(401).json({
        error: 'Subscription required to create cases',
      });
    }

    try {
      const { caseTitle, ancestorPrimaryName, ancestorNameVariants, jurisdictionCode } = req.body;

      if (!caseTitle || !ancestorPrimaryName) {
        return res.status(400).json({
          error: 'Case title and ancestor name are required',
        });
      }

      // Ensure table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workbook_cases (
          id SERIAL PRIMARY KEY,
          case_title VARCHAR(255) NOT NULL,
          ancestor_primary_name VARCHAR(255) NOT NULL,
          ancestor_name_variants TEXT,
          jurisdiction_code VARCHAR(50),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      const result = await pool.query(`
        INSERT INTO workbook_cases (case_title, ancestor_primary_name, ancestor_name_variants, jurisdiction_code, status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING *
      `, [caseTitle, ancestorPrimaryName, ancestorNameVariants || null, jurisdictionCode || null]);

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating case:', error);
      return res.status(500).json({
        error: 'Failed to create case',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
