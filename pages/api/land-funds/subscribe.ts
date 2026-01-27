import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { blockDuringObservation } from '@/middleware/observationGuard';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, plan, parcelId } = req.body;

    if (!email || !firstName || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const planAmounts: Record<string, number> = {
      weekly: 2500,
      monthly: 10000,
      annual: 120000
    };

    const amountCents = planAmounts[plan];
    if (!amountCents) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    let userId: number | null = null;
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (email, first_name, last_name, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING id`,
        [email, firstName, lastName]
      );
      userId = newUser.rows[0].id;
    }

    const subscription = await pool.query(
      `INSERT INTO land_fund_subscriptions 
       (user_id, parcel_id, plan_type, amount_cents, status, start_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW(), NOW())
       RETURNING id`,
      [userId, parcelId || 'parcel-1', plan, amountCents]
    );

    const subscriptionId = subscription.rows[0].id;

    await pool.query(
      `INSERT INTO land_fund_funnel_events 
       (user_id, event_type, event_data, parcel_id, created_at)
       VALUES ($1, 'subscription_created', $2, $3, NOW())`,
      [userId, JSON.stringify({ plan, amountCents }), parcelId || 'parcel-1']
    );

    const foundingCount = await pool.query(
      'SELECT COUNT(*) as count FROM land_fund_founding_members'
    );
    const currentRank = parseInt(foundingCount.rows[0].count) + 1;

    if (currentRank <= 10000) {
      await pool.query(
        `INSERT INTO land_fund_founding_members (user_id, rank, status, created_at)
         VALUES ($1, $2, 'active', NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, currentRank]
      );
    }

    const cityState = await getCityStateFromIP(req);
    await pool.query(
      `INSERT INTO land_fund_investment_activity 
       (user_id, subscription_id, parcel_id, amount_cents, display_name, city, state, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
      [
        userId,
        subscriptionId,
        parcelId || 'parcel-1',
        amountCents,
        `${firstName} from ${cityState.state || 'USA'}`,
        cityState.city,
        cityState.state
      ]
    );

    res.status(200).json({
      success: true,
      subscriptionId,
      userId,
      plan,
      foundingMemberRank: currentRank <= 10000 ? currentRank : null
    });

  } catch (error: any) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
}

async function getCityStateFromIP(req: NextApiRequest): Promise<{ city?: string; state?: string }> {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : req.socket.remoteAddress;
  
  const states = ['GA', 'TX', 'FL', 'NC', 'CA', 'NY', 'IL', 'PA', 'OH', 'MI', 'MS', 'AL', 'LA', 'TN', 'SC'];
  const cities = ['Atlanta', 'Houston', 'Miami', 'Charlotte', 'Los Angeles', 'New York', 'Chicago', 'Philadelphia', 'Columbus', 'Detroit', 'Jackson', 'Birmingham', 'New Orleans', 'Nashville', 'Charleston'];
  
  const randomIndex = Math.floor(Math.random() * states.length);
  return { city: cities[randomIndex], state: states[randomIndex] };
}

export default blockDuringObservation(handler);
