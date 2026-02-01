import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

const REG_CF_ANNUAL_LIMIT = 5_000_000;
const NON_ACCREDITED_MAX = 124_000;
const LOW_INCOME_THRESHOLD = 124_000;

interface InvestorProfile {
  annualIncome: number;
  netWorth: number;
  accredited: boolean;
}

function calculateInvestmentLimit(profile: InvestorProfile): {
  maxInvestment: number;
  limitType: string;
  explanation: string;
} {
  if (profile.accredited) {
    return {
      maxInvestment: REG_CF_ANNUAL_LIMIT,
      limitType: 'accredited',
      explanation: 'As an accredited investor, you have no individual investment limit under Reg CF (subject only to the offering\'s $5M cap).'
    };
  }

  const income = profile.annualIncome;
  const netWorth = profile.netWorth;

  if (income < LOW_INCOME_THRESHOLD && netWorth < LOW_INCOME_THRESHOLD) {
    const fivePercentOfGreater = Math.max(income, netWorth) * 0.05;
    const limit = Math.max(2500, fivePercentOfGreater);
    const cappedLimit = Math.min(limit, NON_ACCREDITED_MAX);
    
    return {
      maxInvestment: cappedLimit,
      limitType: 'low_income',
      explanation: `Based on your annual income and net worth (both under $124,000), you may invest the greater of $2,500 or 5% of the greater of your income or net worth.`
    };
  } else {
    const lesser = Math.min(income, netWorth);
    const tenPercent = lesser * 0.10;
    const cappedLimit = Math.min(tenPercent, NON_ACCREDITED_MAX);
    
    return {
      maxInvestment: cappedLimit,
      limitType: 'standard',
      explanation: `Based on your annual income and net worth, you may invest up to 10% of the lesser of your income or net worth, capped at $124,000.`
    };
  }
}

const REQUIRED_DISCLOSURES = [
  {
    id: 'risk_of_loss',
    title: 'Risk of Loss',
    text: 'Investing in real estate involves substantial risk, including the possible loss of your entire investment. Past performance is not indicative of future results.',
    required: true
  },
  {
    id: 'illiquidity',
    title: 'Illiquidity',
    text: 'Securities purchased through this offering may be difficult or impossible to sell. There is no public market for these securities and one may never develop.',
    required: true
  },
  {
    id: 'no_guarantee',
    title: 'No Guarantee of Returns',
    text: 'There is no guarantee that you will receive any return on your investment or that you will receive your principal back. Projected returns are estimates only.',
    required: true
  },
  {
    id: 'cancellation',
    title: 'Cancellation Right',
    text: 'You have the right to cancel your investment commitment at any time up to 48 hours before the offering deadline without penalty.',
    required: true
  },
  {
    id: 'reg_cf_limits',
    title: 'Regulation CF Investment Limits',
    text: 'The amount you can invest is limited by SEC regulations based on your annual income and net worth. These limits apply across all Reg CF offerings in a 12-month period.',
    required: true
  },
  {
    id: 'development_risk',
    title: 'Development Risk',
    text: 'Land development projects face numerous risks including zoning changes, permitting delays, environmental issues, construction cost overruns, and market conditions.',
    required: true
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action } = req.body;

    try {
      switch (action) {
        case 'calculate_limit': {
          const { annualIncome, netWorth, accredited } = req.body;

          if (annualIncome === undefined || netWorth === undefined) {
            return res.status(400).json({
              success: false,
              error: 'Annual income and net worth are required'
            });
          }

          const result = calculateInvestmentLimit({
            annualIncome: parseFloat(annualIncome),
            netWorth: parseFloat(netWorth),
            accredited: accredited === true
          });

          return res.status(200).json({
            success: true,
            data: result
          });
        }

        case 'check_prior_investments': {
          const { userId, walletAddress } = req.body;

          if (!userId && !walletAddress) {
            return res.status(400).json({
              success: false,
              error: 'User ID or wallet address required'
            });
          }

          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          const result = await db.execute(sql`
            SELECT COALESCE(SUM(amount), 0) as total_invested
            FROM crowdfunding_investments
            WHERE (investor_id = ${userId} OR wallet_address = ${walletAddress})
              AND created_at >= ${oneYearAgo}
              AND status != 'refunded'
          `);

          const totalInvested = parseFloat((result.rows[0] as any)?.total_invested || 0);

          return res.status(200).json({
            success: true,
            data: {
              priorInvestments: totalInvested,
              remainingAllowance: NON_ACCREDITED_MAX - totalInvested,
              period: '12 months'
            }
          });
        }

        case 'submit_kyc': {
          const { 
            userId, 
            fullName, 
            dateOfBirth, 
            ssn, 
            address, 
            annualIncome, 
            netWorth,
            employmentStatus,
            investmentExperience
          } = req.body;

          if (!userId || !fullName || !dateOfBirth) {
            return res.status(400).json({
              success: false,
              error: 'User ID, full name, and date of birth are required'
            });
          }

          await db.execute(sql`
            INSERT INTO investor_kyc (
              user_id, full_name, date_of_birth, ssn_last_four,
              address, annual_income, net_worth, employment_status,
              investment_experience, status, submitted_at, created_at
            ) VALUES (
              ${userId},
              ${fullName},
              ${dateOfBirth},
              ${ssn ? ssn.slice(-4) : null},
              ${JSON.stringify(address || {})},
              ${annualIncome || null},
              ${netWorth || null},
              ${employmentStatus || null},
              ${investmentExperience || null},
              'pending',
              NOW(),
              NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              date_of_birth = EXCLUDED.date_of_birth,
              ssn_last_four = EXCLUDED.ssn_last_four,
              address = EXCLUDED.address,
              annual_income = EXCLUDED.annual_income,
              net_worth = EXCLUDED.net_worth,
              employment_status = EXCLUDED.employment_status,
              investment_experience = EXCLUDED.investment_experience,
              status = 'pending',
              submitted_at = NOW(),
              updated_at = NOW()
          `);

          return res.status(200).json({
            success: true,
            data: {
              status: 'pending',
              message: 'KYC information submitted for verification'
            }
          });
        }

        case 'verify_kyc': {
          const { userId, approved, notes, verifiedBy } = req.body;

          if (!userId || approved === undefined) {
            return res.status(400).json({
              success: false,
              error: 'User ID and approval status required'
            });
          }

          await db.execute(sql`
            UPDATE investor_kyc
            SET status = ${approved ? 'verified' : 'rejected'},
                verification_notes = ${notes || null},
                verified_by = ${verifiedBy || null},
                verified_at = NOW(),
                updated_at = NOW()
            WHERE user_id = ${userId}
          `);

          return res.status(200).json({
            success: true,
            data: {
              status: approved ? 'verified' : 'rejected',
              message: approved ? 'KYC verification approved' : 'KYC verification rejected'
            }
          });
        }

        case 'acknowledge_disclosures': {
          const { userId, campaignId, acknowledgedDisclosures } = req.body;

          if (!userId || !campaignId || !acknowledgedDisclosures) {
            return res.status(400).json({
              success: false,
              error: 'User ID, campaign ID, and acknowledgments required'
            });
          }

          const requiredIds = REQUIRED_DISCLOSURES.filter(d => d.required).map(d => d.id);
          const missingAcknowledgments = requiredIds.filter(
            id => !acknowledgedDisclosures.includes(id)
          );

          if (missingAcknowledgments.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'All required disclosures must be acknowledged',
              missingDisclosures: missingAcknowledgments
            });
          }

          await db.execute(sql`
            INSERT INTO investment_acknowledgments (
              user_id, campaign_id, acknowledged_disclosures,
              ip_address, user_agent, acknowledged_at, created_at
            ) VALUES (
              ${userId},
              ${campaignId},
              ${JSON.stringify(acknowledgedDisclosures)},
              ${req.headers['x-forwarded-for'] || req.socket.remoteAddress || null},
              ${req.headers['user-agent'] || null},
              NOW(),
              NOW()
            )
          `);

          return res.status(200).json({
            success: true,
            data: {
              acknowledged: true,
              timestamp: new Date().toISOString()
            }
          });
        }

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    } catch (error: any) {
      console.error('Compliance API error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'GET') {
    const { action, userId, campaignId } = req.query;

    try {
      switch (action) {
        case 'disclosures':
          return res.status(200).json({
            success: true,
            data: {
              disclosures: REQUIRED_DISCLOSURES,
              regCFInfo: {
                annualLimit: REG_CF_ANNUAL_LIMIT,
                investorMaximum: NON_ACCREDITED_MAX,
                incomeThreshold: LOW_INCOME_THRESHOLD
              }
            }
          });

        case 'kyc_status':
          if (!userId) {
            return res.status(400).json({
              success: false,
              error: 'User ID required'
            });
          }

          const kycResult = await db.execute(sql`
            SELECT status, verified_at, annual_income, net_worth
            FROM investor_kyc
            WHERE user_id = ${Number(userId)}
          `);

          if (kycResult.rows.length === 0) {
            return res.status(200).json({
              success: true,
              data: { status: 'not_submitted', kycVerified: false }
            });
          }

          const kyc = kycResult.rows[0] as any;
          return res.status(200).json({
            success: true,
            data: {
              status: kyc.status,
              kycVerified: kyc.status === 'verified',
              verifiedAt: kyc.verified_at,
              annualIncome: kyc.annual_income,
              netWorth: kyc.net_worth
            }
          });

        case 'investment_eligibility':
          if (!userId || !campaignId) {
            return res.status(400).json({
              success: false,
              error: 'User ID and campaign ID required'
            });
          }

          const [kycCheck, priorInvestments, acknowledgmentCheck] = await Promise.all([
            db.execute(sql`
              SELECT status, annual_income, net_worth FROM investor_kyc WHERE user_id = ${Number(userId)}
            `),
            db.execute(sql`
              SELECT COALESCE(SUM(amount), 0) as total
              FROM crowdfunding_investments
              WHERE investor_id = ${Number(userId)}
                AND created_at >= NOW() - INTERVAL '12 months'
                AND status != 'refunded'
            `),
            db.execute(sql`
              SELECT id FROM investment_acknowledgments
              WHERE user_id = ${Number(userId)} AND campaign_id = ${Number(campaignId)}
            `)
          ]);

          const kycData = kycCheck.rows[0] as any;
          const priorTotal = parseFloat((priorInvestments.rows[0] as any)?.total || 0);
          const hasAcknowledged = acknowledgmentCheck.rows.length > 0;

          const kycVerified = kycData?.status === 'verified';
          let maxAllowed = 0;
          let limitExplanation = '';

          if (kycVerified && kycData.annual_income && kycData.net_worth) {
            const limitCalc = calculateInvestmentLimit({
              annualIncome: parseFloat(kycData.annual_income),
              netWorth: parseFloat(kycData.net_worth),
              accredited: false
            });
            maxAllowed = Math.max(0, limitCalc.maxInvestment - priorTotal);
            limitExplanation = limitCalc.explanation;
          }

          return res.status(200).json({
            success: true,
            data: {
              eligible: kycVerified && hasAcknowledged && maxAllowed > 0,
              kycVerified,
              disclosuresAcknowledged: hasAcknowledged,
              priorInvestments: priorTotal,
              maxInvestment: maxAllowed,
              limitExplanation,
              requirements: {
                kyc: kycVerified ? 'complete' : 'required',
                disclosures: hasAcknowledged ? 'complete' : 'required',
                investmentRoom: maxAllowed > 0 ? 'available' : 'exceeded'
              }
            }
          });

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Use: disclosures, kyc_status, or investment_eligibility'
          });
      }
    } catch (error: any) {
      console.error('Compliance API error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
