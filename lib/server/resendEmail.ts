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
        <a href="https://axiom.money/academy" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #1f2937; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px;">
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
        <a href="https://axiom.money" style="color: #f59e0b; text-decoration: none;">axiom.money</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}
