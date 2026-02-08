import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ethers } from 'ethers';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hashData(data: any): string {
  const jsonStr = JSON.stringify(data);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM dscr_investor_onboarding WHERE wallet_address = $1`,
        [walletAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.json({ investor: null, status: 'not_started' });
      }

      const investor = result.rows[0];
      return res.json({
        investor: {
          legalName: investor.legal_name,
          email: investor.email,
          ppmAcknowledged: investor.ppm_acknowledged,
          riskDisclosureAcknowledged: investor.risk_disclosure_acknowledged,
          subscriptionSigned: investor.subscription_signed,
          questionnaireCompleted: investor.questionnaire_completed,
          accreditationMethod: investor.accreditation_method
        },
        status: investor.status || 'pending'
      });
    } catch (error: any) {
      if (error.code === '42P01') {
        return res.json({ investor: null, status: 'not_started' });
      }
      console.error('Error fetching investor:', error);
      return res.status(500).json({ error: 'Failed to fetch investor status' });
    }
  }

  if (req.method === 'POST') {
    const { step, walletAddress, signature, timestamp, nonce, data } = req.body;

    if (!walletAddress || !signature || !step) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!timestamp || !nonce) {
      return res.status(400).json({ error: 'Missing timestamp or nonce' });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dscr_investor_onboarding (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(42) UNIQUE NOT NULL,
          legal_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          date_of_birth DATE,
          street VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(50),
          zip_code VARCHAR(20),
          country VARCHAR(50) DEFAULT 'USA',
          is_entity BOOLEAN DEFAULT FALSE,
          entity_name VARCHAR(255),
          entity_type VARCHAR(50),
          entity_state VARCHAR(50),
          accreditation_method VARCHAR(50),
          income_amount VARCHAR(50),
          net_worth_amount VARCHAR(50),
          professional_license VARCHAR(100),
          investment_amount VARCHAR(50),
          questionnaire_completed BOOLEAN DEFAULT FALSE,
          ppm_acknowledged BOOLEAN DEFAULT FALSE,
          ppm_signature VARCHAR(132),
          ppm_signature_timestamp BIGINT,
          risk_disclosure_acknowledged BOOLEAN DEFAULT FALSE,
          risk_disclosure_signature VARCHAR(132),
          risk_disclosure_signature_timestamp BIGINT,
          subscription_signed BOOLEAN DEFAULT FALSE,
          subscription_signature VARCHAR(132),
          subscription_signature_timestamp BIGINT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      if (step === 'personal_info') {
        const dataForHash = {
          legalName: data.legalName,
          email: data.email,
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth || '',
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || 'USA',
          isEntity: !!data.isEntity,
          entityName: data.entityName || '',
          entityType: data.entityType || '',
          entityState: data.entityState || ''
        };
        const dataHash = hashData(dataForHash);

        const expectedMessage = `AXUSD DSCR Rental Lending Fund - Submit Personal Information

Wallet: ${normalizedWallet}
Name: ${data.legalName}
Email: ${data.email}
Data Hash: ${dataHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I confirm this information is accurate.`;

        const isValid = verifySignature(expectedMessage, signature, walletAddress);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid signature - wallet verification failed' });
        }

        await pool.query(`
          INSERT INTO dscr_investor_onboarding (
            wallet_address, legal_name, email, phone, date_of_birth,
            street, city, state, zip_code, country,
            is_entity, entity_name, entity_type, entity_state
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (wallet_address) DO UPDATE SET
            legal_name = EXCLUDED.legal_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            date_of_birth = EXCLUDED.date_of_birth,
            street = EXCLUDED.street,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            country = EXCLUDED.country,
            is_entity = EXCLUDED.is_entity,
            entity_name = EXCLUDED.entity_name,
            entity_type = EXCLUDED.entity_type,
            entity_state = EXCLUDED.entity_state,
            updated_at = NOW()
        `, [
          normalizedWallet,
          data.legalName,
          data.email,
          data.phone || null,
          data.dateOfBirth || null,
          data.street || null,
          data.city || null,
          data.state || null,
          data.zipCode || null,
          data.country || 'USA',
          data.isEntity || false,
          data.entityName || null,
          data.entityType || null,
          data.entityState || null
        ]);

        return res.json({ success: true, message: 'Personal info saved' });
      }

      if (step === 'accreditation') {
        const responsesHashData = {
          method: data.method,
          incomeAmount: data.incomeAmount || '',
          netWorthAmount: data.netWorthAmount || '',
          professionalLicense: data.professionalLicense || '',
          investmentAmount: data.investmentAmount || ''
        };
        const responsesHash = hashData(responsesHashData);

        const expectedMessage = `AXUSD DSCR Rental Lending Fund - Accreditation Declaration

Wallet: ${normalizedWallet}
Method: ${data.method}
Responses Hash: ${responsesHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I declare under penalty of perjury that I qualify as an accredited investor under SEC Rule 501(a) and that the information provided is true and complete.`;

        const isValid = verifySignature(expectedMessage, signature, walletAddress);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid signature - wallet verification failed' });
        }

        await pool.query(`
          UPDATE dscr_investor_onboarding SET
            accreditation_method = $2,
            income_amount = $3,
            net_worth_amount = $4,
            professional_license = $5,
            investment_amount = $6,
            questionnaire_completed = TRUE,
            updated_at = NOW()
          WHERE wallet_address = $1
        `, [
          normalizedWallet,
          data.method,
          data.incomeAmount || null,
          data.netWorthAmount || null,
          data.professionalLicense || null,
          data.investmentAmount || null
        ]);

        return res.json({ success: true, message: 'Accreditation info saved' });
      }

      if (step === 'documents') {
        const docType = data.documentType;
        const docVersion = data.documentVersion || '1.0';
        const docHash = data.documentHash || 'unknown';

        const expectedMessage = `AXUSD DSCR Rental Lending Fund - Document Acknowledgment

Wallet: ${normalizedWallet}
Document: ${docType}
Version: ${docVersion}
Document Hash: ${docHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I have read and understood this document.`;

        const isValid = verifySignature(expectedMessage, signature, walletAddress);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid signature - wallet verification failed' });
        }
        
        if (docType === 'ppm') {
          await pool.query(`
            UPDATE dscr_investor_onboarding SET
              ppm_acknowledged = TRUE,
              ppm_signature = $2,
              ppm_signature_timestamp = $3,
              updated_at = NOW()
            WHERE wallet_address = $1
          `, [normalizedWallet, signature, timestamp]);
        } else if (docType === 'risk_disclosure') {
          await pool.query(`
            UPDATE dscr_investor_onboarding SET
              risk_disclosure_acknowledged = TRUE,
              risk_disclosure_signature = $2,
              risk_disclosure_signature_timestamp = $3,
              updated_at = NOW()
            WHERE wallet_address = $1
          `, [normalizedWallet, signature, timestamp]);
        } else if (docType === 'subscription') {
          await pool.query(`
            UPDATE dscr_investor_onboarding SET
              subscription_signed = TRUE,
              subscription_signature = $2,
              subscription_signature_timestamp = $3,
              updated_at = NOW()
            WHERE wallet_address = $1
          `, [normalizedWallet, signature, timestamp]);
        }

        return res.json({ success: true, message: 'Document acknowledged' });
      }

      if (step === 'signature') {
        const investmentAmount = data.investmentAmount || '25000';
        
        const expectedMessage = `AXUSD DSCR Rental Lending Fund - Subscription Agreement

Wallet: ${normalizedWallet}
Subscription Amount: $${investmentAmount}
Fund: Series B - DSCR Rental Lending Fund
Minimum Investment: $25,000
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I agree to subscribe for Membership Interests in the AXUSD DSCR Rental Lending Fund on the terms set forth in the Private Placement Memorandum and Subscription Agreement.

I represent that I am an accredited investor and have read and understood all fund documents.`;

        const isValid = verifySignature(expectedMessage, signature, walletAddress);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid signature - wallet verification failed' });
        }

        await pool.query(`
          UPDATE dscr_investor_onboarding SET
            subscription_signed = TRUE,
            subscription_signature = $2,
            subscription_signature_timestamp = $3,
            investment_amount = $4,
            status = 'under_review',
            updated_at = NOW()
          WHERE wallet_address = $1
        `, [normalizedWallet, signature, timestamp, investmentAmount]);

        return res.json({ success: true, message: 'Subscription signed' });
      }

      return res.status(400).json({ error: 'Invalid step' });
    } catch (error) {
      console.error('Error in onboarding:', error);
      return res.status(500).json({ error: 'Failed to process onboarding step' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
