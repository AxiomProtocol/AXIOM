import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status } = req.query;
      
      let query = `
        SELECT 
          c.id,
          c.land_option_id,
          c.title,
          c.subtitle,
          c.description,
          c.target_amount,
          c.amount_raised as raised_amount,
          c.investor_count,
          c.status,
          c.start_date,
          c.end_date,
          c.min_investment,
          c.max_investment,
          c.created_at,
          lo.location,
          lo.acreage,
          lo.purchase_price,
          lo.property_type,
          lo.image_url as featured_image,
          CASE WHEN c.target_amount > 0 
            THEN ROUND((COALESCE(c.amount_raised, 0) / c.target_amount) * 100, 1)::text 
            ELSE '0' 
          END as percent_funded,
          CASE WHEN c.end_date > NOW() 
            THEN EXTRACT(DAY FROM c.end_date - NOW())::integer 
            ELSE 0 
          END as days_remaining
        FROM crowdfunding_campaigns c
        LEFT JOIN land_options lo ON c.land_option_id = lo.id
      `;
      
      const params: string[] = [];
      if (status && status !== 'all') {
        query += ` WHERE c.status = $1`;
        params.push(status as string);
      }
      
      query += ` ORDER BY c.created_at DESC`;
      
      const result = await pool.query(query, params);
      
      const campaigns = result.rows.map(row => ({
        id: row.id,
        landOptionId: row.land_option_id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        targetAmount: row.target_amount,
        raisedAmount: row.raised_amount || '0',
        participantCount: row.investor_count || 0,
        investorCount: row.investor_count || 0,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        minCommitment: row.min_investment,
        minInvestment: row.min_investment,
        maxCommitment: row.max_investment,
        maxInvestment: row.max_investment,
        percentFunded: row.percent_funded,
        daysRemaining: row.days_remaining,
        featuredImage: row.featured_image,
        requiresAccreditation: false,
        landOption: {
          location: row.location,
          acreage: row.acreage,
          propertyType: row.property_type,
          purchasePrice: row.purchase_price
        }
      }));

      const statsResult = await pool.query(`
        SELECT 
          COUNT(*)::integer as total,
          COUNT(*) FILTER (WHERE status = 'draft')::integer as draft,
<<<<<<< HEAD
          COUNT(*) FILTER (WHERE status = 'active')::integer as active,
=======
          COUNT(*) FILTER (WHERE status = 'live' OR status = 'active')::integer as active,
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
          COUNT(*) FILTER (WHERE status = 'funded')::integer as funded,
          COUNT(*) FILTER (WHERE status = 'closed')::integer as closed,
          COALESCE(SUM(amount_raised), 0)::text as total_raised,
          COALESCE(SUM(investor_count), 0)::integer as total_investors
        FROM crowdfunding_campaigns
      `);
      
      const stats = statsResult.rows[0];

      res.json({
        success: true,
        data: {
          campaigns,
          stats: {
            total: stats.total,
            draft: stats.draft,
            active: stats.active,
            funded: stats.funded,
            closed: stats.closed,
            total_raised: stats.total_raised,
            total_participants: stats.total_investors,
            total_investors: stats.total_investors
          }
        }
      });
    } catch (error: any) {
      console.error('Campaigns fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaigns',
        details: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        landOptionId,
        title,
        subtitle,
        description,
        targetAmount,
        minInvestment,
        maxInvestment,
        durationDays,
        riskFactors,
        useOfFunds
      } = req.body;

      if (!landOptionId || !title || !targetAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: landOptionId, title, targetAmount'
        });
      }

      if (parseFloat(targetAmount) > 5000000) {
        return res.status(400).json({
          success: false,
          error: 'Reg CF campaigns cannot exceed $5,000,000'
        });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (durationDays || 90));

      const result = await pool.query(`
        INSERT INTO crowdfunding_campaigns (
          land_option_id, title, subtitle, description, target_amount,
          min_investment, max_investment, start_date, end_date,
          risk_factors, use_of_funds, status, amount_raised, investor_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', 0, 0)
        RETURNING *
      `, [
        landOptionId,
        title,
        subtitle || null,
        description || '',
        targetAmount,
        minInvestment || '100',
        maxInvestment || '124000',
        startDate,
        endDate,
        riskFactors || null,
        useOfFunds ? JSON.stringify(useOfFunds) : null
      ]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Crowdfunding campaign created successfully'
      });
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign',
        details: error.message
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, amountRaised, investorCount } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (amountRaised !== undefined) {
        updates.push(`amount_raised = $${paramIndex++}`);
        params.push(amountRaised);
      }
      if (investorCount !== undefined) {
        updates.push(`investor_count = $${paramIndex++}`);
        params.push(investorCount);
      }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(`
        UPDATE crowdfunding_campaigns 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Campaign updated successfully'
      });
    } catch (error: any) {
      console.error('Campaign update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
