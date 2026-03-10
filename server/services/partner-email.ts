import { Resend } from 'resend';
import crypto from 'crypto';

let connectionSettings: any;

async function getResendClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    console.warn('Resend connector not available, using fallback');
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings.api_key) {
      console.warn('Resend not connected');
      return null;
    }
    
    return {
      client: new Resend(connectionSettings.settings.api_key),
      fromEmail: connectionSettings.settings.from_email || 'partners@axiomprotocol.app'
    };
  } catch (error) {
    console.error('Failed to get Resend client:', error);
    return null;
  }
}

export function generatePasswordToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function sendPartnerWelcomeEmail(
  email: string,
  name: string,
  passwordSetupToken: string,
  dealId: number
): Promise<boolean> {
  const resend = await getResendClient();
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : 'http://localhost:5000';
    
  const setupUrl = `${baseUrl}/partner/setup-password?token=${passwordSetupToken}&email=${encodeURIComponent(email)}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 32px; font-weight: 800; color: #FFD700; letter-spacing: -1px;">AXIOM</div>
                <div style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 4px;">Partner Portal</div>
              </div>
              
              <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px; text-align: center;">Welcome to Axiom, ${name}!</h1>
              
              <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Your deal submission (ID: #${dealId}) has been received. Our team will review it within 24-48 hours.
              </p>
              
              <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                To access your Partner Dashboard and track your deals, please set up your account password:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${setupUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #00D4AA, #7B68EE); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Set Up Your Password
                </a>
              </div>
              
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                This link will expire in 24 hours. If you didn't submit a deal with Axiom, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;">
              
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin: 0;">
                Axiom Protocol - Building Wealth Together, On-Chain<br>
                <a href="${baseUrl}/partner/dashboard" style="color: #00D4AA; text-decoration: none;">Partner Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (resend) {
    try {
      const result = await resend.client.emails.send({
        from: resend.fromEmail,
        to: email,
        subject: `Welcome to Axiom Partner Portal - Set Up Your Account`,
        html: emailHtml,
      });
      console.log('Partner welcome email sent:', result);
      return true;
    } catch (error) {
      console.error('Failed to send partner welcome email:', error);
      return false;
    }
  } else {
    console.log('Email service not available. Setup URL:', setupUrl);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resend = await getResendClient();
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : 'http://localhost:5000';
    
  const resetUrl = `${baseUrl}/partner/setup-password?token=${resetToken}&email=${encodeURIComponent(email)}&reset=true`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 32px; font-weight: 800; color: #FFD700;">AXIOM</div>
              </div>
              
              <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px; text-align: center;">Reset Your Password</h1>
              
              <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${name}, we received a request to reset your Axiom Partner Portal password.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #00D4AA, #7B68EE); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
                This link expires in 24 hours. If you didn't request this, ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (resend) {
    try {
      await resend.client.emails.send({
        from: resend.fromEmail,
        to: email,
        subject: `Reset Your Axiom Partner Password`,
        html: emailHtml,
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
  
  console.log('Email service not available. Reset URL:', resetUrl);
  return false;
}

export async function sendPartnerEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = await getResendClient();
  
  if (resend) {
    try {
      const result = await resend.client.emails.send({
        from: resend.fromEmail,
        to,
        subject,
        html,
      });
      console.log('Email sent:', result);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }
  
  console.log('Email service not available. Would send to:', to, 'Subject:', subject);
  return false;
}
