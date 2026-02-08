import type { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface NotificationPayload {
  type: 'payment_reminder' | 'milestone' | 'graduation' | 'general';
  recipient: {
    email?: string;
    walletAddress?: string;
  };
  data: Record<string, string | number>;
}

const emailTemplates = {
  payment_reminder: (data: Record<string, string | number>) => ({
    subject: `Payment Reminder: ${data.groupName} SUSU Circle`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
          <p style="color: #6B7280; font-size: 14px;">The Wealth Practice</p>
        </div>
        
        <div style="background: #1F2937; border-radius: 12px; padding: 24px; color: white;">
          <h2 style="margin-top: 0; color: #F59E0B;">Payment Reminder</h2>
          <p>Hi there,</p>
          <p>Your next contribution to <strong>${data.groupName}</strong> is due ${data.dueDate}.</p>
          
          <div style="background: #374151; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #9CA3AF;">Amount Due:</span>
              <span style="color: white; font-weight: bold;">$${data.amount}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9CA3AF;">Due Date:</span>
              <span style="color: white; font-weight: bold;">${data.dueDate}</span>
            </div>
          </div>
          
          <p style="color: #9CA3AF; font-size: 14px;">
            Your consistent participation helps build trust within your circle and moves your group closer to graduation.
          </p>
          
          <a href="${data.actionUrl || 'https://axiom.city/susu'}" 
             style="display: inline-block; background: #F59E0B; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Make Payment
          </a>
        </div>
        
        <p style="color: #6B7280; font-size: 12px; text-align: center; margin-top: 24px;">
          Axiom Nexus LLC - Build Wealth Together, On-Chain
        </p>
      </div>
    `
  }),

  milestone: (data: Record<string, string | number>) => ({
    subject: `Congratulations! ${data.milestoneName} Achieved`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
        </div>
        
        <div style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 12px; padding: 24px; color: white; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">${data.icon || '🎉'}</div>
          <h2 style="margin: 0; color: #F59E0B;">Milestone Achieved!</h2>
          <p style="font-size: 18px; margin-top: 8px;">${data.milestoneName}</p>
          
          <div style="background: #374151; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left;">
            <p style="color: #9CA3AF; margin: 0;">${data.description}</p>
          </div>
          
          <p style="color: #10B981; font-weight: bold;">+${data.points || 0} Trust Points</p>
        </div>
      </div>
    `
  }),

  graduation: (data: Record<string, string | number>) => ({
    subject: `Your Group Has Graduated to Capital Mode!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
        </div>
        
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎓</div>
          <h2 style="margin: 0; color: #FCD34D;">Congratulations!</h2>
          <p style="font-size: 20px; margin-top: 8px;">${data.groupName} has graduated to Capital Mode</p>
          
          <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #FCD34D;">What's Next?</h3>
            <ul style="text-align: left; padding-left: 20px;">
              <li>Access to real estate investment pools</li>
              <li>DePIN infrastructure opportunities</li>
              <li>Enhanced governance voting power</li>
              <li>Treasury yield products</li>
            </ul>
          </div>
          
          <a href="${data.actionUrl || 'https://axiom.city/learn-wealth-practice'}" 
             style="display: inline-block; background: #FCD34D; color: black; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Explore Opportunities
          </a>
        </div>
      </div>
    `
  }),

  general: (data: Record<string, string | number>) => ({
    subject: data.subject as string || 'Update from Axiom',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
        </div>
        
        <div style="background: #1F2937; border-radius: 12px; padding: 24px; color: white;">
          <h2 style="margin-top: 0; color: #F59E0B;">${data.title || 'Update'}</h2>
          <p>${data.message}</p>
        </div>
      </div>
    `
  })
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, recipient, data } = req.body as NotificationPayload;

    if (!type || !recipient) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results: { email?: boolean; inApp?: boolean } = {};

    if (recipient.email && process.env.SENDGRID_API_KEY) {
      const template = emailTemplates[type](data);
      
      await sgMail.send({
        to: recipient.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axiom.city',
        subject: template.subject,
        html: template.html
      });
      
      results.email = true;
    }

    results.inApp = true;

    return res.status(200).json({
      success: true,
      results,
      message: 'Notification sent successfully'
    });
  } catch (error: unknown) {
    console.error('Notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
