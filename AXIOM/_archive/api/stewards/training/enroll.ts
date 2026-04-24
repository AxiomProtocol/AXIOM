import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import Stripe from 'stripe';
import { getTierById } from '../../../../lib/stewardTraining';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { programId, tier, walletAddress, application, scholarshipInfo } = req.body;

    if (!programId || !tier || !walletAddress || !application) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tierData = getTierById(tier);
    if (!tierData) {
      return res.status(400).json({ error: 'Invalid training tier' });
    }

    const existingEnrollment = await pool.query(
      `SELECT id FROM training_enrollments WHERE wallet_address = $1 AND program_id = $2`,
      [walletAddress, programId]
    );

    if (existingEnrollment.rows && existingEnrollment.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You are already enrolled in this training program' 
      });
    }

    let user = await pool.query(
      `SELECT id FROM users WHERE wallet_address = $1`,
      [walletAddress]
    );

    let userId: number;
    
    if (!user.rows || user.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (wallet_address, email, first_name, created_at) 
         VALUES ($1, $2, $3, now()) RETURNING id`,
        [walletAddress, application.email || '', application.fullName || '']
      );
      userId = newUser.rows[0].id;
    } else {
      userId = user.rows[0].id;
    }

    if (tier === 'scholarship') {
      await pool.query(
        `INSERT INTO training_enrollments (
          program_id, user_id, wallet_address, tier, current_phase,
          payment_status, scholarship_reason, amount_paid, enrolled_at
        ) VALUES ($1, $2, $3, 'scholarship', 'enrolled', 'scholarship_pending', $4, 0, now())`,
        [programId, userId, walletAddress, JSON.stringify({ application, scholarshipInfo })]
      );

      return res.status(200).json({
        success: true,
        message: 'Scholarship application submitted',
        redirectTo: '/stewards/training/scholarship-submitted'
      });
    }

    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://axiom.community';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tierData.name} - Steward Corps Training`,
              description: `Complete training program with ${tierData.axusdReward} AXUSD reward upon graduation`,
            },
            unit_amount: tierData.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/stewards/training/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/stewards/training/enroll?tier=${tier}`,
      metadata: {
        programId: programId.toString(),
        userId: userId.toString(),
        walletAddress,
        tier,
        application: JSON.stringify(application)
      },
    });

    await pool.query(
      `INSERT INTO training_enrollments (
        program_id, user_id, wallet_address, tier, current_phase,
        payment_status, stripe_payment_intent_id, amount_paid, enrolled_at
      ) VALUES ($1, $2, $3, $4::training_tier, 'enrolled', 'pending', $5, $6, now())`,
      [programId, userId, walletAddress, tier, session.id, tierData.price]
    );

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url
    });

  } catch (error: any) {
    console.error('Enrollment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process enrollment'
    });
  }
}
