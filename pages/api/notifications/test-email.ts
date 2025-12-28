import type { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, type = 'test' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'SendGrid API key not configured - email simulated successfully',
        wouldSendTo: email
      });
    }

    const testTemplates: Record<string, { subject: string; html: string }> = {
      test: {
        subject: 'Axiom Email Test - Configuration Verified',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
              <p style="color: #6B7280; font-size: 14px;">The Wealth Practice</p>
            </div>
            
            <div style="background: #1F2937; border-radius: 12px; padding: 24px; color: white;">
              <h2 style="margin-top: 0; color: #10B981;">Email Configuration Verified!</h2>
              <p>This test email confirms that your SendGrid integration is working correctly.</p>
              
              <div style="background: #374151; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #9CA3AF; margin: 0; font-size: 14px;">
                  <strong style="color: #F59E0B;">Test Details:</strong><br/>
                  Timestamp: ${new Date().toISOString()}<br/>
                  Recipient: ${email}<br/>
                  Status: Delivered Successfully
                </p>
              </div>
              
              <p style="color: #9CA3AF; font-size: 14px;">
                Your notification system is ready to send payment reminders, milestone celebrations, and graduation announcements.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 12px; text-align: center; margin-top: 24px;">
              Axiom Nexus LLC - Build Wealth Together, On-Chain
            </p>
          </div>
        `
      },
      payment_reminder: {
        subject: 'Test: Payment Reminder Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
            </div>
            <div style="background: #1F2937; border-radius: 12px; padding: 24px; color: white;">
              <h2 style="margin-top: 0; color: #F59E0B;">Payment Reminder (Test)</h2>
              <p>This is a test of the payment reminder email template.</p>
              <div style="background: #374151; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Amount:</strong> $100</p>
                <p style="margin: 8px 0 0;"><strong>Due Date:</strong> In 3 days</p>
              </div>
              <a href="https://axiom.city/susu" style="display: inline-block; background: #F59E0B; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Make Payment</a>
            </div>
          </div>
        `
      },
      milestone: {
        subject: 'Test: Milestone Achievement Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
            </div>
            <div style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); border-radius: 12px; padding: 24px; color: white; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h2 style="margin: 0; color: #F59E0B;">Milestone Achieved! (Test)</h2>
              <p style="font-size: 18px;">3 Consecutive Cycles Completed</p>
              <p style="color: #10B981; font-weight: bold;">+50 Trust Points</p>
            </div>
          </div>
        `
      },
      graduation: {
        subject: 'Test: Graduation Announcement Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #F59E0B; margin: 0;">AXIOM</h1>
            </div>
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 16px;">🎓</div>
              <h2 style="margin: 0; color: #FCD34D;">Congratulations! (Test)</h2>
              <p style="font-size: 20px;">Your Group Has Graduated to Capital Mode</p>
              <a href="https://axiom.city/wealth-practice" style="display: inline-block; background: #FCD34D; color: black; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Explore Opportunities</a>
            </div>
          </div>
        `
      }
    };

    const template = testTemplates[type] || testTemplates.test;

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axiom.city',
      subject: template.subject,
      html: template.html
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      type: type,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Test email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
