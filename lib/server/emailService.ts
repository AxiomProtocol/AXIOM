import { getResendClient as getBaseResendClient } from '../email/resend';

async function getResendClient() {
  return getBaseResendClient('noreply@axiom.city');
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text || '',
      html: options.html || options.text || ''
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Resend error:', error);
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

  const purposeDescriptions: Record<string, string> = {
    'emergency_fund': 'Build a financial safety net with your community. Your group will help you prepare for life\'s unexpected moments.',
    'land_acquisition': 'Pool resources with like-minded individuals to acquire land and build generational wealth through real property ownership.',
    'business_capital': 'Access the capital you need to start or grow your business through community-backed funding.',
    'education': 'Invest in yourself and your family\'s future through coordinated educational funding.',
    'family_wealth': 'Create lasting prosperity that spans generations through disciplined group savings and investment.',
    'community_development': 'Transform your community by pooling resources for infrastructure, programs, and local economic development.'
  };

  const purposeDisplay = purposeLabels[purpose] || purpose;
  const purposeDesc = purposeDescriptions[purpose] || 'Build wealth together with your community through Group Economics.';
  const regionDisplay = region.charAt(0).toUpperCase() + region.slice(1).replace(/-/g, ' ');
  const annualProjection = commitmentAmount * 12;
  const threeYearProjection = annualProjection * 3;

  return sendEmail({
    to,
    subject: `Welcome to The Wealth Practice, ${memberName}! Your Journey Begins Now`,
    text: `Hi ${memberName},

WELCOME TO THE WEALTH PRACTICE!

You've just taken the most important step toward building real, lasting wealth - joining a community that believes in Group Economics.

YOUR REGISTRATION SUMMARY
-------------------------
Region: ${regionDisplay}
Purpose: ${purposeDisplay}
Monthly Commitment: $${commitmentAmount}
Annual Projection: $${annualProjection}
3-Year Potential: $${threeYearProjection}+

ABOUT YOUR PURPOSE GROUP
------------------------
${purposeDesc}

YOUR FIRST 30 DAYS - ACTION PLAN
--------------------------------
Week 1: Orientation
- Log into your personalized dashboard at axiomprotocol.app/dashboard
- Complete your member profile (add photo and bio)
- Review the Purpose Group guidelines and expectations
- Introduce yourself in the community chat

Week 2: Connection
- Attend your first regional Interest Hub virtual meetup
- Connect with at least 3 fellow Purpose Group members
- Set up your payment method for contributions
- Review the savings calendar and payout schedule

Week 3: Education
- Complete the "Wealth Practice Foundations" course in our Academy
- Learn about the 3-stage wealth building system
- Understand how trust scores work
- Explore the land acquisition opportunities

Week 4: Activation
- Make your first contribution
- Set up automatic monthly payments (recommended)
- Share your journey with one person who could benefit
- Celebrate your commitment to Group Economics!

THE THREE STAGES OF WEALTH BUILDING
-----------------------------------
Stage 1: Purpose Groups (You Are Here)
Build trust through consistent participation. Prove your commitment.

Stage 2: Wealth Circles
Graduate to larger savings pools with proven, trusted members.

Stage 3: Capital Mode
Access significant investment opportunities, land deals, and business funding.

IMPORTANT RESOURCES
-------------------
- Dashboard: axiomprotocol.app/dashboard
- Learn More: axiomprotocol.app/learn-wealth-practice
- FAQ: axiomprotocol.app/susu-faq
- Support: support@axiomprotocol.app

THE WEALTH PRACTICE PRINCIPLES
------------------------------
1. Consistency Over Intensity - Small, regular contributions beat sporadic large ones
2. Trust Is Currency - Your reputation is your most valuable asset
3. Community Over Competition - We rise together
4. Transparency Always - Every transaction is recorded and visible
5. Long-Term Thinking - Wealth is built over years, not days

WHAT MAKES US DIFFERENT
-----------------------
Unlike traditional savings, The Wealth Practice combines:
- Group accountability and support
- Transparent, on-chain record keeping
- Real asset acquisition (land, property)
- Community governance and ownership
- Education and skill development

Your commitment of $${commitmentAmount}/month isn't just saving - it's an investment in a new economic system where communities own their future.

Remember: "The best time to plant a tree was 20 years ago. The second best time is now." You've planted your tree today.

Welcome to the family, ${memberName}. We're honored to have you.

Building Wealth Together,
The Axiom Team

---
Axiom Protocol | The Wealth Practice
axiomprotocol.app
`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%); border-radius: 20px 20px 0 0; padding: 40px 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 15px;">✨</div>
      <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: 700;">Welcome to The Wealth Practice</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0; font-size: 16px;">Building Wealth Together Through Group Economics</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: #FFFFFF; padding: 35px 30px; color: #0A0F1C; border-left: 1px solid rgba(0,0,0,0.06); border-right: 1px solid rgba(0,0,0,0.06);">
      
      <!-- Personal Greeting -->
      <p style="font-size: 20px; margin: 0 0 20px; color: #0A0F1C;">Hi ${memberName},</p>
      <p style="margin: 0 0 25px; line-height: 1.7; font-size: 16px; color: rgba(10, 15, 28, 0.75);">
        Congratulations! You've just taken the most important step toward building real, lasting wealth - 
        joining a community that believes in the power of <strong style="color: #00D4AA;">Group Economics</strong>.
      </p>
      
      <!-- Registration Summary Box -->
      <div style="background: linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(123, 104, 238, 0.08) 100%); border-radius: 16px; padding: 25px; margin: 25px 0; border: 1px solid rgba(0, 212, 170, 0.2);">
        <h2 style="color: #0A0F1C; margin: 0 0 20px; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">📋 Your Registration Summary</h2>
        <table style="width: 100%; color: #0A0F1C; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; color: rgba(10, 15, 28, 0.6);">Region:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">${regionDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: rgba(10, 15, 28, 0.6);">Purpose:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">${purposeDisplay}</td>
          </tr>
          <tr style="border-top: 1px solid rgba(0,0,0,0.08);">
            <td style="padding: 15px 0 10px; color: rgba(10, 15, 28, 0.6);">Monthly Commitment:</td>
            <td style="padding: 15px 0 10px; text-align: right; color: #00D4AA; font-weight: 700; font-size: 20px;">$${commitmentAmount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: rgba(10, 15, 28, 0.6);">Annual Projection:</td>
            <td style="padding: 10px 0; text-align: right; color: #059669; font-weight: 600;">$${annualProjection}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: rgba(10, 15, 28, 0.6);">3-Year Potential:</td>
            <td style="padding: 10px 0; text-align: right; color: #059669; font-weight: 600;">$${threeYearProjection}+</td>
          </tr>
        </table>
      </div>
      
      <!-- Purpose Description -->
      <div style="background: #F9FAFB; border-radius: 16px; padding: 20px; margin: 25px 0; border: 1px solid rgba(0,0,0,0.06);">
        <h3 style="color: #7B68EE; margin: 0 0 10px; font-size: 16px;">🎯 About Your Purpose Group</h3>
        <p style="margin: 0; color: rgba(10, 15, 28, 0.75); line-height: 1.6;">${purposeDesc}</p>
      </div>
      
      <!-- 30-Day Action Plan -->
      <h2 style="color: #0A0F1C; margin: 35px 0 20px; font-size: 20px; border-bottom: 2px solid #00D4AA; padding-bottom: 10px;">
        📅 Your First 30 Days - Action Plan
      </h2>
      
      <!-- Week 1 -->
      <div style="margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <span style="background: #00D4AA; color: #FFFFFF; padding: 5px 12px; border-radius: 20px; font-weight: 700; font-size: 12px;">WEEK 1</span>
          <span style="color: #0A0F1C; margin-left: 12px; font-weight: 600;">Orientation</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: rgba(10, 15, 28, 0.7); line-height: 1.8;">
          <li>Log into your personalized dashboard</li>
          <li>Complete your member profile (add photo and bio)</li>
          <li>Review Purpose Group guidelines and expectations</li>
          <li>Introduce yourself in the community chat</li>
        </ul>
      </div>
      
      <!-- Week 2 -->
      <div style="margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <span style="background: #7B68EE; color: #FFFFFF; padding: 5px 12px; border-radius: 20px; font-weight: 700; font-size: 12px;">WEEK 2</span>
          <span style="color: #0A0F1C; margin-left: 12px; font-weight: 600;">Connection</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: rgba(10, 15, 28, 0.7); line-height: 1.8;">
          <li>Attend your first regional Interest Hub meetup</li>
          <li>Connect with at least 3 fellow members</li>
          <li>Set up your payment method for contributions</li>
          <li>Review the savings calendar and payout schedule</li>
        </ul>
      </div>
      
      <!-- Week 3 -->
      <div style="margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <span style="background: #FFD700; color: #0A0F1C; padding: 5px 12px; border-radius: 20px; font-weight: 700; font-size: 12px;">WEEK 3</span>
          <span style="color: #0A0F1C; margin-left: 12px; font-weight: 600;">Education</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: rgba(10, 15, 28, 0.7); line-height: 1.8;">
          <li>Complete "Wealth Practice Foundations" course</li>
          <li>Learn about the 3-stage wealth building system</li>
          <li>Understand how trust scores work</li>
          <li>Explore land acquisition opportunities</li>
        </ul>
      </div>
      
      <!-- Week 4 -->
      <div style="margin-bottom: 25px;">
        <div style="margin-bottom: 10px;">
          <span style="background: #059669; color: #FFFFFF; padding: 5px 12px; border-radius: 20px; font-weight: 700; font-size: 12px;">WEEK 4</span>
          <span style="color: #0A0F1C; margin-left: 12px; font-weight: 600;">Activation</span>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: rgba(10, 15, 28, 0.7); line-height: 1.8;">
          <li>Make your first contribution</li>
          <li>Set up automatic monthly payments (recommended)</li>
          <li>Share your journey with someone who could benefit</li>
          <li>Celebrate your commitment to Group Economics!</li>
        </ul>
      </div>
      
      <!-- Three Stages -->
      <h2 style="color: #0A0F1C; margin: 35px 0 20px; font-size: 20px; border-bottom: 2px solid #7B68EE; padding-bottom: 10px;">
        🚀 The Three Stages of Wealth Building
      </h2>
      
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="background: #FFFFFF; border-radius: 12px; padding: 20px; border: 2px solid #00D4AA; box-shadow: 0 4px 12px rgba(0, 212, 170, 0.15);">
          <div style="margin-bottom: 8px;">
            <span style="background: #00D4AA; color: #FFFFFF; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 10px;">1</span>
            <strong style="color: #00D4AA;">Purpose Groups</strong>
            <span style="background: #059669; color: #FFFFFF; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 10px;">YOU ARE HERE</span>
          </div>
          <p style="margin: 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">Build trust through consistent participation. Prove your commitment to the community.</p>
        </div>
        
        <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; border: 1px solid rgba(0,0,0,0.08);">
          <div style="margin-bottom: 8px;">
            <span style="background: #9CA3AF; color: #FFFFFF; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 10px;">2</span>
            <strong style="color: #0A0F1C;">Wealth Circles</strong>
          </div>
          <p style="margin: 0; color: rgba(10, 15, 28, 0.6); font-size: 14px;">Graduate to larger savings pools with proven, trusted members. Access bigger opportunities.</p>
        </div>
        
        <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; border: 1px solid rgba(0,0,0,0.08);">
          <div style="margin-bottom: 8px;">
            <span style="background: #9CA3AF; color: #FFFFFF; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 10px;">3</span>
            <strong style="color: #0A0F1C;">Capital Mode</strong>
          </div>
          <p style="margin: 0; color: rgba(10, 15, 28, 0.6); font-size: 14px;">Access significant investment opportunities, land deals, and business funding with your trusted network.</p>
        </div>
      </div>
      
      <!-- Principles -->
      <h2 style="color: #0A0F1C; margin: 35px 0 20px; font-size: 20px; border-bottom: 2px solid #FFD700; padding-bottom: 10px;">
        📜 The Wealth Practice Principles
      </h2>
      
      <div style="background: #F9FAFB; border-radius: 16px; padding: 25px; border: 1px solid rgba(0,0,0,0.06);">
        <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
          <span style="color: #00D4AA; font-size: 18px; margin-right: 12px; font-weight: 700;">1.</span>
          <div>
            <strong style="color: #0A0F1C;">Consistency Over Intensity</strong>
            <p style="margin: 5px 0 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">Small, regular contributions beat sporadic large ones.</p>
          </div>
        </div>
        <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
          <span style="color: #00D4AA; font-size: 18px; margin-right: 12px; font-weight: 700;">2.</span>
          <div>
            <strong style="color: #0A0F1C;">Trust Is Currency</strong>
            <p style="margin: 5px 0 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">Your reputation is your most valuable asset in this community.</p>
          </div>
        </div>
        <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
          <span style="color: #00D4AA; font-size: 18px; margin-right: 12px; font-weight: 700;">3.</span>
          <div>
            <strong style="color: #0A0F1C;">Community Over Competition</strong>
            <p style="margin: 5px 0 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">We rise together. Your success is our success.</p>
          </div>
        </div>
        <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
          <span style="color: #00D4AA; font-size: 18px; margin-right: 12px; font-weight: 700;">4.</span>
          <div>
            <strong style="color: #0A0F1C;">Transparency Always</strong>
            <p style="margin: 5px 0 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">Every transaction is recorded and visible. No hidden dealings.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start;">
          <span style="color: #00D4AA; font-size: 18px; margin-right: 12px; font-weight: 700;">5.</span>
          <div>
            <strong style="color: #0A0F1C;">Long-Term Thinking</strong>
            <p style="margin: 5px 0 0; color: rgba(10, 15, 28, 0.7); font-size: 14px;">Wealth is built over years, not days. Patience pays dividends.</p>
          </div>
        </div>
      </div>
      
      <!-- CTA Buttons -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://axiomprotocol.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%); color: #FFFFFF; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin-bottom: 15px; box-shadow: 0 4px 14px rgba(0, 212, 170, 0.3);">
          Go to Your Dashboard →
        </a>
        <div style="margin-top: 15px;">
          <a href="https://axiomprotocol.app/learn-wealth-practice" style="color: #7B68EE; text-decoration: none; margin: 0 15px; font-size: 14px;">Learn More</a>
          <span style="color: #D1D5DB;">|</span>
          <a href="https://axiomprotocol.app/susu-faq" style="color: #7B68EE; text-decoration: none; margin: 0 15px; font-size: 14px;">FAQ</a>
          <span style="color: #D1D5DB;">|</span>
          <a href="https://axiomprotocol.app/academy" style="color: #7B68EE; text-decoration: none; margin: 0 15px; font-size: 14px;">Academy</a>
        </div>
      </div>
      
      <!-- Inspirational Quote -->
      <div style="background: linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.1) 100%); border-radius: 16px; padding: 25px; text-align: center; margin: 25px 0; border: 1px solid rgba(0, 212, 170, 0.2);">
        <p style="margin: 0; color: #0A0F1C; font-size: 18px; font-style: italic; font-weight: 500;">
          "The best time to plant a tree was 20 years ago.<br>The second best time is now."
        </p>
        <p style="margin: 15px 0 0; color: #00D4AA; font-weight: 700;">You've planted your tree today. 🌳</p>
      </div>
      
      <!-- Closing -->
      <div style="text-align: center; padding-top: 20px;">
        <p style="color: #0A0F1C; font-size: 18px; margin: 0 0 10px;">
          Welcome to the family, <strong>${memberName}</strong>.
        </p>
        <p style="color: rgba(10, 15, 28, 0.6); margin: 0;">We're honored to have you on this journey.</p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background: #FFFFFF; border-radius: 0 0 20px 20px; padding: 25px 30px; text-align: center; border: 1px solid rgba(0,0,0,0.06); border-top: none;">
      <p style="color: #00D4AA; font-weight: 600; margin: 0 0 10px; font-size: 14px;">Building Wealth Together</p>
      <p style="color: rgba(10, 15, 28, 0.5); margin: 0 0 15px; font-size: 13px;">
        Axiom Protocol | The Wealth Practice
      </p>
      <div style="margin-bottom: 15px;">
        <a href="https://axiomprotocol.app" style="color: #7B68EE; text-decoration: none; font-size: 12px; margin: 0 10px;">Website</a>
        <a href="https://axiomprotocol.app/transparency" style="color: #7B68EE; text-decoration: none; font-size: 12px; margin: 0 10px;">Transparency</a>
        <a href="https://axiomprotocol.app/governance" style="color: #7B68EE; text-decoration: none; font-size: 12px; margin: 0 10px;">Governance</a>
      </div>
      <p style="color: rgba(10, 15, 28, 0.4); margin: 0; font-size: 11px;">
        © 2026 Axiom Protocol. All rights reserved.<br>
        You're receiving this email because you registered for The Wealth Practice.
      </p>
    </div>
    
  </div>
</body>
</html>`
  });
}
