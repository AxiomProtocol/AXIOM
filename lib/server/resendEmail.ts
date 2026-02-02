import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendWelcomeEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Axiom <noreply@axiom.money>',
      to: [to],
      subject: 'Welcome to Axiom Academy - Your Wealth Journey Begins',
      html: getWelcomeEmailHtml()
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

function getWelcomeEmailHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Axiom Academy</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <div style="background: linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">AXIOM</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Build Wealth Through Discipline</p>
    </div>
    
    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      
      <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">Welcome to Your Wealth Journey</h2>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Thank you for joining Axiom Academy. You've taken the first step toward building real wealth through discipline, structure, and community.
      </p>
      
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #92400e; margin: 0 0 15px; font-size: 18px;">Your Journey: Learn → Connect → Save Together</h3>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; align-items: flex-start;">
            <span style="background: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; font-size: 12px; margin-right: 12px; flex-shrink: 0;">1</span>
            <div>
              <strong style="color: #1f2937;">Learn</strong>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Master financial literacy, budgeting, and wealth-building fundamentals.</p>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; align-items: flex-start;">
            <span style="background: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; font-size: 12px; margin-right: 12px; flex-shrink: 0;">2</span>
            <div>
              <strong style="color: #1f2937;">Connect</strong>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Find interest groups near you that share your financial goals.</p>
            </div>
          </div>
        </div>
        
        <div>
          <div style="display: flex; align-items: flex-start;">
            <span style="background: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; font-size: 12px; margin-right: 12px; flex-shrink: 0;">3</span>
            <div>
              <strong style="color: #1f2937;">Save Together</strong>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Join SUSU savings circles with clear rules and shared accountability.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://AxiomProtocol.app/academy/free" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #1f2937; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px;">
          Start Your First Course
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 25px;">
        <h4 style="color: #1f2937; margin: 0 0 15px; font-size: 16px;">What You'll Learn:</h4>
        <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Financial Foundations 101 - Build your wealth mindset</li>
          <li>Budgeting & Saving Strategies - Control your money flow</li>
          <li>The Wealth Practice (SUSU) - Community savings that work</li>
          <li>Path to Homeownership - KeyGrow rent-to-own explained</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0;">
        Questions? Reply to this email or visit our FAQ. We're here to help you succeed.
      </p>
      
      <p style="color: #1f2937; margin: 20px 0 0; font-size: 14px;">
        Welcome to the community,<br>
        <strong>The Axiom Team</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 10px;">Axiom - Build Wealth Through Discipline, Structure, and Community</p>
      <p style="margin: 0;">
        <a href="https://AxiomProtocol.app" style="color: #f59e0b; text-decoration: none;">AxiomProtocol.app</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}

export async function sendLandSubmissionNotification(params: {
  ownerEmail: string;
  ownerName: string;
  propertyAddress: string;
  acreage: number;
  leadScore: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Axiom Land Team <land@axiom.city>',
      to: [params.ownerEmail],
      subject: 'Property Submission Received - Axiom Land Acquisition',
      html: getLandSubmissionEmailHtml(params)
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Land submission email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send land submission email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendLandStatusUpdateEmail(params: {
  ownerEmail: string;
  ownerName: string;
  propertyAddress: string;
  newStatus: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const statusMessages: Record<string, { subject: string; heading: string; body: string }> = {
      reviewing: {
        subject: 'Your Property is Under Review',
        heading: 'We\'re Reviewing Your Property',
        body: 'Our team is currently evaluating your property submission. We\'ll be in touch soon with next steps.'
      },
      qualified: {
        subject: 'Great News! Your Property Qualifies',
        heading: 'Your Property Has Qualified!',
        body: 'Congratulations! Your property meets our acquisition criteria. A steward will contact you shortly to discuss the option agreement terms.'
      },
      approved: {
        subject: 'Property Approved for Acquisition',
        heading: 'Property Approved!',
        body: 'Your property has been approved for our community acquisition program. Our team will reach out to finalize the agreement.'
      },
      rejected: {
        subject: 'Property Submission Update',
        heading: 'Thank You for Your Submission',
        body: 'After careful review, your property doesn\'t meet our current acquisition criteria. We appreciate your interest and encourage you to stay connected with Axiom.'
      }
    };
    
    const statusInfo = statusMessages[params.newStatus] || {
      subject: 'Property Status Update',
      heading: 'Status Update',
      body: params.message || 'Your property submission status has been updated.'
    };
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Axiom Land Team <land@axiom.city>',
      to: [params.ownerEmail],
      subject: statusInfo.subject,
      html: getLandStatusEmailHtml({ ...params, ...statusInfo })
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Land status email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send land status email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAdminNewSubmissionAlert(params: {
  adminEmail: string;
  ownerName: string;
  propertyAddress: string;
  acreage: number;
  leadScore: number;
  submissionId: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const scoreColor = params.leadScore >= 70 ? '#10b981' : params.leadScore >= 50 ? '#f59e0b' : '#ef4444';
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Axiom System <system@axiom.city>',
      to: [params.adminEmail],
      subject: `New Land Submission - Score: ${params.leadScore}/100`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 10px;">
            <h2 style="color: #00D4AA; margin: 0 0 20px;">New Property Submission</h2>
            <div style="background: #2d2d44; padding: 20px; border-radius: 8px;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${scoreColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${params.leadScore}</div>
                <div style="margin-left: 16px;">
                  <div style="color: white; font-weight: bold;">${params.ownerName}</div>
                  <div style="color: #94a3b8; font-size: 14px;">${params.propertyAddress}</div>
                </div>
              </div>
              <div style="color: #e2e8f0; font-size: 14px;">
                <p><strong>Acreage:</strong> ${params.acreage} acres</p>
                <p><strong>Lead Score:</strong> ${params.leadScore}/100</p>
              </div>
              <a href="https://axiom.city/admin/land-deals" style="display: inline-block; background: #00D4AA; color: #1a1a2e; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                Review Submission
              </a>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function getLandSubmissionEmailHtml(params: {
  ownerName: string;
  propertyAddress: string;
  acreage: number;
  leadScore: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Property Submission Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Property Submission Received</h1>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi ${params.ownerName},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Thank you for submitting your property for consideration in Axiom's community land acquisition program!
      </p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #1f2937; margin: 0 0 12px;">Submission Details</h3>
        <p style="color: #4b5563; margin: 8px 0;"><strong>Property:</strong> ${params.propertyAddress}</p>
        <p style="color: #4b5563; margin: 8px 0;"><strong>Acreage:</strong> ${params.acreage} acres</p>
      </div>
      <h3 style="color: #1f2937; margin: 24px 0 12px;">What Happens Next?</h3>
      <ol style="color: #4b5563; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        <li>Our team will review your property details within 48 hours</li>
        <li>If qualified, a Steward will be assigned to evaluate the land</li>
        <li>We'll contact you to discuss option agreement terms</li>
        <li>Community voting determines final acquisition approval</li>
      </ol>
      <p style="color: #4b5563; font-size: 14px; margin-top: 24px;">
        Questions? Reply to this email or visit <a href="https://axiom.city/land-acquisition" style="color: #00D4AA;">our land program page</a>.
      </p>
      <p style="color: #1f2937; margin-top: 24px;">
        Best regards,<br>
        <strong>The Axiom Land Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getLandStatusEmailHtml(params: {
  ownerName: string;
  propertyAddress: string;
  heading: string;
  body: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Property Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">${params.heading}</h1>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi ${params.ownerName},
      </p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #4b5563; margin: 8px 0;"><strong>Property:</strong> ${params.propertyAddress}</p>
      </div>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        ${params.body}
      </p>
      <p style="color: #4b5563; font-size: 14px; margin-top: 24px;">
        Questions? Reply to this email or visit <a href="https://axiom.city/land-acquisition" style="color: #00D4AA;">our land program page</a>.
      </p>
      <p style="color: #1f2937; margin-top: 24px;">
        Best regards,<br>
        <strong>The Axiom Land Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendLendingFundDepositEmail(params: {
  investorEmail: string;
  investorName: string;
  amount: string;
  shares: string;
  txHash: string;
  newBalance: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'AXUSD Lending Fund <fund@axiom.money>',
      to: [params.investorEmail],
      subject: 'Investment Confirmed - AXUSD Fix & Flip Fund',
      html: getLendingFundDepositHtml(params)
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Lending fund deposit email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send deposit email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendLendingFundWithdrawalEmail(params: {
  investorEmail: string;
  investorName: string;
  amount: string;
  shares: string;
  txHash: string;
  remainingBalance: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'AXUSD Lending Fund <fund@axiom.money>',
      to: [params.investorEmail],
      subject: 'Withdrawal Processed - AXUSD Fix & Flip Fund',
      html: getLendingFundWithdrawalHtml(params)
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Lending fund withdrawal email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send withdrawal email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendLendingFundYieldEmail(params: {
  investorEmail: string;
  investorName: string;
  yieldAmount: string;
  period: string;
  apy: string;
  totalEarned: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'AXUSD Lending Fund <fund@axiom.money>',
      to: [params.investorEmail],
      subject: `Yield Distribution - $${params.yieldAmount} Earned`,
      html: getLendingFundYieldHtml(params)
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Lending fund yield email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send yield email:', error);
    return { success: false, error: error.message };
  }
}

function getLendingFundDepositHtml(params: {
  investorName: string;
  amount: string;
  shares: string;
  txHash: string;
  newBalance: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Investment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #0891b2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
      <h1 style="color: white; margin: 0; font-size: 28px;">Investment Confirmed</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">AXUSD Fix & Flip Lending Fund</p>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi ${params.investorName},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Your investment in the AXUSD Fix & Flip Lending Fund has been confirmed and recorded on-chain.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #166534; margin: 0 0 16px; font-size: 18px;">Transaction Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Amount Invested</td>
            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">$${params.amount}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Shares Received</td>
            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">${params.shares}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">New Total Balance</td>
            <td style="color: #00D4AA; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">$${params.newBalance}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">Transaction Hash</p>
        <a href="https://arbiscan.io/tx/${params.txHash}" style="color: #00D4AA; font-size: 12px; word-break: break-all; text-decoration: none;">
          ${params.txHash}
        </a>
      </div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        Your investment is now earning yield from our portfolio of fix-and-flip bridge loans. View your dashboard anytime to track performance.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://axiomprotocol.app/lending-fund/dashboard" style="display: inline-block; background: #00D4AA; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Dashboard
        </a>
      </div>
      <p style="color: #1f2937; margin-top: 24px; font-size: 14px;">
        Thank you for investing with us,<br>
        <strong>AXUSD Lending Fund Team</strong>
      </p>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">SEC Regulation D 506(c) - Accredited Investors Only</p>
      <p style="margin: 8px 0 0;">Axiom Nexus LLC | Mississippi</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getLendingFundWithdrawalHtml(params: {
  investorName: string;
  amount: string;
  shares: string;
  txHash: string;
  remainingBalance: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Withdrawal Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">💸</div>
      <h1 style="color: white; margin: 0; font-size: 28px;">Withdrawal Processed</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">AXUSD Fix & Flip Lending Fund</p>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi ${params.investorName},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Your withdrawal request has been processed and funds have been sent to your wallet.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px; font-size: 18px;">Withdrawal Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Amount Withdrawn</td>
            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">$${params.amount}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Shares Redeemed</td>
            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">${params.shares}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Remaining Balance</td>
            <td style="color: #00D4AA; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">$${params.remainingBalance}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">Transaction Hash</p>
        <a href="https://arbiscan.io/tx/${params.txHash}" style="color: #00D4AA; font-size: 12px; word-break: break-all; text-decoration: none;">
          ${params.txHash}
        </a>
      </div>
      <p style="color: #1f2937; margin-top: 24px; font-size: 14px;">
        Best regards,<br>
        <strong>AXUSD Lending Fund Team</strong>
      </p>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">SEC Regulation D 506(c) - Accredited Investors Only</p>
      <p style="margin: 8px 0 0;">Axiom Nexus LLC | Mississippi</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getLendingFundYieldHtml(params: {
  investorName: string;
  yieldAmount: string;
  period: string;
  apy: string;
  totalEarned: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Yield Distribution</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
      <h1 style="color: white; margin: 0; font-size: 28px;">Yield Distribution</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${params.period}</p>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi ${params.investorName},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Great news! Your investment in the AXUSD Fix & Flip Lending Fund has generated yield this period.
      </p>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #92400e; margin: 0 0 8px; font-size: 14px;">Yield This Period</p>
        <p style="color: #1f2937; margin: 0; font-size: 36px; font-weight: bold;">$${params.yieldAmount}</p>
        <p style="color: #92400e; margin: 8px 0 0; font-size: 14px;">Current APY: ${params.apy}</p>
      </div>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Total Lifetime Earnings</td>
            <td style="color: #00D4AA; padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold;">$${params.totalEarned}</td>
          </tr>
        </table>
      </div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        Your yield is automatically reinvested into your position, compounding your returns. View your full earnings history on your dashboard.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://axiomprotocol.app/lending-fund/dashboard" style="display: inline-block; background: #00D4AA; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Dashboard
        </a>
      </div>
      <p style="color: #1f2937; margin-top: 24px; font-size: 14px;">
        Keep building wealth,<br>
        <strong>AXUSD Lending Fund Team</strong>
      </p>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;">
      <p style="margin: 0;">SEC Regulation D 506(c) - Accredited Investors Only</p>
      <p style="margin: 8px 0 0;">Axiom Nexus LLC | Mississippi</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendOperatorCertificateEmail(
  to: string,
  operatorName: string,
  operatorId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const roleTitle = role === 'OBSERVER' ? 'Observer' : role === 'VALIDATOR' ? 'Validator' : 'Attestor';
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'Axiom <noreply@axiom.money>',
      to: [to],
      subject: 'Your AXIOM Node Operator Certificate',
      html: getOperatorCertificateEmailHtml(operatorName, operatorId, roleTitle, issueDate)
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Certificate email sent:', data?.id);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send certificate email:', error);
    return { success: false, error: error.message };
  }
}

function getOperatorCertificateEmailHtml(name: string, operatorId: string, role: string, issueDate: string): string {
  return \`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node Operator Certificate</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 8px; letter-spacing: 1px;">AXIOM PROTOCOL</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Node Operator Certificate</h1>
    </div>
    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 10px; text-align: center;">This certifies that</p>
      <h2 style="color: #1f2937; margin: 0 0 5px; font-size: 28px; text-align: center; font-weight: bold;">\${name}</h2>
      <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px; text-align: center; font-family: monospace;">\${operatorId}</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px; text-align: center;">
        has successfully completed all certification requirements and is authorized to operate as a <strong style="color: #0d9488;">\${role}</strong> on the AXIOM network.
      </p>
      <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #99f6e4;">
        <h3 style="color: #0f766e; margin: 0 0 15px; font-size: 16px; text-align: center;">Certification Completed</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: center; padding: 8px;"><div style="color: #0d9488; font-size: 12px; margin-bottom: 4px;">NODE CHARTER</div><div style="color: #0f766e; font-size: 14px; font-weight: bold;">Acknowledged</div></td>
            <td style="text-align: center; padding: 8px;"><div style="color: #0d9488; font-size: 12px; margin-bottom: 4px;">DRY-RUN</div><div style="color: #0f766e; font-size: 14px; font-weight: bold;">Completed</div></td>
            <td style="text-align: center; padding: 8px;"><div style="color: #0d9488; font-size: 12px; margin-bottom: 4px;">KEY SECURITY</div><div style="color: #0f766e; font-size: 14px; font-weight: bold;">Confirmed</div></td>
          </tr>
        </table>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px; text-align: center;">Issued on \${issueDate}</p>
        <div style="text-align: center;">
          <a href="https://axiom.money/operator" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Operator Portal</a>
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">This certificate serves as official documentation of your Node Operator certification.<br>Keep this email for your records.</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;"><p style="margin: 0;">AXIOM Protocol - Decentralized Land Settlement Network</p></div>
  </div>
</body>
</html>
  \`.trim();
}
