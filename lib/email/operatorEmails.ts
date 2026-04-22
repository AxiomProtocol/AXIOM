import { getResendClient } from './resend';

const PHASE_LABELS: Record<string, string> = {
  'APPLIED': 'Applied',
  'VERIFIED': 'Verified',
  'PROVISIONED': 'Provisioned',
  'DRY_RUN_PASSED': 'Dry-Run Complete',
  'CERTIFIED': 'Certified',
  'ACTIVE': 'Active',
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'VERIFIED': 'Your identity has been verified. You will receive your operator credentials shortly.',
  'PROVISIONED': 'Your operator credentials have been issued. You can now access training materials and set up your secure signing environment.',
  'DRY_RUN_PASSED': 'Congratulations! You have completed all dry-run training exercises. Final certification review is next.',
  'CERTIFIED': 'You have been certified as a Node Operator. Final activation is pending.',
  'ACTIVE': 'Welcome to the network! You are now fully active and can participate in live settlements.',
};

export async function sendOperatorAdvancedEmail(
  to: string,
  displayName: string,
  operatorId: string,
  newPhase: string
) {
  try {
    const { client, fromEmail } = await getResendClient();

    const phaseLabel = PHASE_LABELS[newPhase] || newPhase;
    const phaseDescription = PHASE_DESCRIPTIONS[newPhase] || 'Your application status has been updated.';
    const isActive = newPhase === 'ACTIVE';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Node Operator Update</h1>
              <p style="color: #ccfbf1; margin: 10px 0 0 0; font-size: 16px;">Your status has been updated</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Hi ${displayName},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your Node Operator application has been advanced to the next phase.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: ${isActive ? '#ecfdf5' : '#f0fdfa'}; border: 2px solid ${isActive ? '#10b981' : '#14b8a6'}; border-radius: 12px; padding: 25px; text-align: center;">
                <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">New Status</div>
                <div style="font-size: 28px; font-weight: 700; color: ${isActive ? '#059669' : '#0d9488'}; margin-bottom: 12px;">${phaseLabel}</div>
                <p style="color: #4b5563; font-size: 14px; margin: 0;">${phaseDescription}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Operator ID</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${operatorId}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <a href="https://axiomprotocol.app/operator" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Your Status
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #1f2937; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">
                <strong style="color: #ffffff;">Axiom Protocol</strong> | Node Operator Network
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                You're receiving this because you applied to become a Node Operator.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: isActive 
        ? `Welcome to the Network, ${displayName}! You're Now Active`
        : `${displayName}, your operator status has been updated to ${phaseLabel}`,
      html: emailHtml,
    });

    console.log(`[Email] Sent advancement email to ${to} for phase ${newPhase}`);
    return result;
  } catch (error) {
    console.error('[Email] Failed to send advancement email:', error);
    throw error;
  }
}

export async function sendOperatorRejectedEmail(
  to: string,
  displayName: string,
  operatorId: string,
  reason?: string
) {
  try {
    const { client, fromEmail } = await getResendClient();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Application Update</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Hi ${displayName},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in becoming a Node Operator with Axiom Protocol.
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                After careful review, we are unable to approve your application at this time.
                ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px;">
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                  <strong>What's next?</strong><br>
                  You may reapply after 30 days if you believe the issues can be addressed. 
                  If you have questions about this decision, please contact our support team.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Application ID</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${operatorId}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #1f2937; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">
                <strong style="color: #ffffff;">Axiom Protocol</strong> | Node Operator Network
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                You're receiving this because you applied to become a Node Operator.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${displayName}, update on your Node Operator application`,
      html: emailHtml,
    });

    console.log(`[Email] Sent rejection email to ${to}`);
    return result;
  } catch (error) {
    console.error('[Email] Failed to send rejection email:', error);
    throw error;
  }
}

export async function sendCustomOperatorEmail(
  to: string,
  displayName: string,
  subject: string,
  message: string
) {
  try {
    const { client, fromEmail } = await getResendClient();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Message from Axiom</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Hi ${displayName},</h2>
              <div style="color: #4b5563; font-size: 16px; line-height: 1.8;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <a href="https://axiomprotocol.app/operator" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Go to Operator Portal
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #1f2937; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">
                <strong style="color: #ffffff;">Axiom Protocol</strong> | Node Operator Network
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                You're receiving this because you are a Node Operator applicant.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    console.log(`[Email] Sent custom email to ${to}: ${subject}`);
    return result;
  } catch (error) {
    console.error('[Email] Failed to send custom email:', error);
    throw error;
  }
}
