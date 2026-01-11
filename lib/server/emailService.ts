import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@axiom.city';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const msg: any = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
    };

    if (options.templateId) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData;
    } else {
      msg.text = options.text || '';
      msg.html = options.html || options.text || '';
    }

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error:', error?.response?.body || error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

export async function sendPaymentReminder(params: {
  to: string;
  memberName: string;
  groupName: string;
  amount: number;
  dueDate: string;
  reminderType: 'early' | 'due' | 'late';
}): Promise<{ success: boolean; error?: string }> {
  const { to, memberName, groupName, amount, dueDate, reminderType } = params;

  const subjects = {
    early: `Reminder: ${groupName} payment due in 3 days`,
    due: `Payment Due Today: ${groupName}`,
    late: `Gentle Reminder: ${groupName} payment overdue`
  };

  const messages = {
    early: `Hi ${memberName},\n\nThis is a friendly reminder that your ${groupName} contribution of $${amount} is due on ${dueDate}.\n\nPreparing your payment early helps keep our circle strong and ensures everyone benefits on time.\n\nThank you for being part of our community!\n\n- The Axiom Team`,
    due: `Hi ${memberName},\n\nYour ${groupName} contribution of $${amount} is due today (${dueDate}).\n\nPlease complete your payment to help maintain our circle's momentum and trust.\n\nThank you for your commitment!\n\n- The Axiom Team`,
    late: `Hi ${memberName},\n\nWe noticed your ${groupName} contribution of $${amount} was due on ${dueDate}.\n\nLife happens, and we understand. If you're facing any challenges, please reach out to your organizer.\n\nYour participation matters to our community.\n\n- The Axiom Team`
  };

  return sendEmail({
    to,
    subject: subjects[reminderType],
    text: messages[reminderType],
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; border-radius: 10px;">
        <h2 style="color: #fbbf24; margin: 0 0 20px;">Axiom - The Wealth Practice</h2>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; color: #e2e8f0;">
          ${messages[reminderType].replace(/\n/g, '<br>')}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
          This is an automated message from Axiom. Please do not reply directly to this email.
        </p>
      </div>
    </div>`
  });
}

export async function sendMilestoneNotification(params: {
  to: string;
  memberName: string;
  milestone: string;
  details: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, memberName, milestone, details } = params;

  return sendEmail({
    to,
    subject: `Congratulations! You've reached a milestone: ${milestone}`,
    text: `Hi ${memberName},\n\nCongratulations on reaching this milestone:\n\n${milestone}\n\n${details}\n\nKeep up the great work!\n\n- The Axiom Team`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; border-radius: 10px;">
        <h2 style="color: #fbbf24; margin: 0 0 20px;">🎉 Milestone Achieved!</h2>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; color: #e2e8f0;">
          <p>Hi ${memberName},</p>
          <p>Congratulations on reaching:</p>
          <h3 style="color: #fbbf24;">${milestone}</h3>
          <p>${details}</p>
          <p>Keep up the great work!</p>
        </div>
      </div>
    </div>`
  });
}

export async function sendGraduationNotification(params: {
  to: string;
  memberName: string;
  groupName: string;
  newStage: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, memberName, groupName, newStage } = params;

  return sendEmail({
    to,
    subject: `You've Graduated! Welcome to ${newStage}`,
    text: `Hi ${memberName},\n\nCongratulations! You and your ${groupName} circle have successfully graduated to ${newStage}!\n\nThis is a significant achievement that demonstrates trust, consistency, and community commitment.\n\nNew opportunities and benefits are now available to you.\n\n- The Axiom Team`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; border-radius: 10px;">
        <h2 style="color: #fbbf24; margin: 0 0 20px;">🎓 Graduation Celebration!</h2>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; color: #e2e8f0; text-align: center;">
          <p style="font-size: 18px;">Hi ${memberName},</p>
          <h3 style="color: #22c55e; font-size: 24px;">You've Graduated!</h3>
          <p>Your ${groupName} circle has successfully advanced to:</p>
          <div style="background: #fbbf24; color: #1a1a2e; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: bold; margin: 20px 0;">
            ${newStage}
          </div>
          <p>New opportunities await you!</p>
        </div>
      </div>
    </div>`
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  memberName: string;
  region: string;
  purpose: string;
  commitmentAmount: number;
}): Promise<{ success: boolean; error?: string }> {
  const { to, memberName, region, purpose, commitmentAmount } = params;

  const purposeLabels: Record<string, string> = {
    'emergency_fund': 'Emergency Fund',
    'land_acquisition': 'Land Acquisition',
    'business_capital': 'Business Capital',
    'education': 'Education',
    'family_wealth': 'Family Wealth',
    'community_development': 'Community Development'
  };

  const purposeDisplay = purposeLabels[purpose] || purpose;
  const regionDisplay = region.charAt(0).toUpperCase() + region.slice(1).replace(/-/g, ' ');

  return sendEmail({
    to,
    subject: `Welcome to The Wealth Practice, ${memberName}!`,
    text: `Hi ${memberName},\n\nWelcome to The Wealth Practice!\n\nYou've taken the first step toward building wealth together through Group Economics. Here's a summary of your registration:\n\n• Region: ${regionDisplay}\n• Purpose: ${purposeDisplay}\n• Monthly Commitment: $${commitmentAmount}\n\nWhat's Next?\n\n1. Join your regional Interest Hub to connect with like-minded members\n2. Meet your fellow Purpose Group members\n3. Prepare for your first contribution\n4. Explore your personalized dashboard\n\nRemember: Wealth is built through consistency, trust, and community. You're now part of a movement that believes in Group Economics - the principle that together, we can achieve what none of us could alone.\n\nWe're excited to have you on this journey!\n\n- The Axiom Team`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px;">✨ Welcome to The Wealth Practice</h1>
          <p style="color: #94a3b8; margin: 10px 0 0;">Building Wealth Together Through Group Economics</p>
        </div>
        
        <div style="background: #1e293b; padding: 25px; border-radius: 8px; color: #e2e8f0;">
          <p style="font-size: 18px; margin: 0 0 15px;">Hi ${memberName},</p>
          <p>Congratulations on taking the first step toward building wealth together! You're now part of a community that believes in the power of Group Economics.</p>
          
          <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #fbbf24; margin: 0 0 15px;">Your Registration Summary</h3>
            <table style="width: 100%; color: #e2e8f0;">
              <tr><td style="padding: 8px 0; color: #94a3b8;">Region:</td><td style="padding: 8px 0; text-align: right;">${regionDisplay}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Purpose:</td><td style="padding: 8px 0; text-align: right;">${purposeDisplay}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Monthly Commitment:</td><td style="padding: 8px 0; text-align: right; color: #fbbf24; font-weight: bold;">$${commitmentAmount}</td></tr>
            </table>
          </div>
          
          <h3 style="color: #fbbf24; margin: 25px 0 15px;">What's Next?</h3>
          <div style="margin-left: 10px;">
            <p style="margin: 10px 0;"><span style="color: #fbbf24;">✓</span> Join your regional Interest Hub</p>
            <p style="margin: 10px 0;"><span style="color: #fbbf24;">✓</span> Meet your fellow Purpose Group members</p>
            <p style="margin: 10px 0;"><span style="color: #fbbf24;">✓</span> Prepare for your first contribution</p>
            <p style="margin: 10px 0;"><span style="color: #fbbf24;">✓</span> Explore your personalized dashboard</p>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://axiomprotocol.app/dashboard" style="display: inline-block; background: #fbbf24; color: #1a1a2e; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Your Dashboard</a>
          </div>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
          Remember: Wealth is built through consistency, trust, and community.<br>
          Together, we can achieve what none of us could alone.
        </p>
      </div>
    </div>`
  });
}
