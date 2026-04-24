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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@axiomprotocol.app'
  };
}

export async function sendWorkbookWelcomeEmail(to: string, firstName: string) {
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
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Land Reclamation Workbook</h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Your Heir Property Research Checklist</p>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 30px 20px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Welcome, ${firstName}!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                Thank you for joining our community of families working to reclaim their ancestral land. 
                Below is your free Heir Property Research Checklist to help you get started.
              </p>
            </td>
          </tr>
          
          <!-- Checklist Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 25px;">
                <h3 style="color: #92400e; margin: 0 0 20px 0; font-size: 18px;">📋 Your Heir Property Research Checklist</h3>
                
                <div style="margin-bottom: 15px;">
                  <p style="color: #78350f; font-weight: 600; margin: 0 0 10px 0;">Step 1: Gather Family Information</p>
                  <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Names of ancestors who may have owned land</li>
                    <li>Approximate birth/death dates</li>
                    <li>States/counties where they lived</li>
                    <li>Family stories about property ownership</li>
                  </ul>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <p style="color: #78350f; font-weight: 600; margin: 0 0 10px 0;">Step 2: Search Census Records</p>
                  <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>1870 Census (first census with freed persons)</li>
                    <li>1880-1940 Census records</li>
                    <li>Look for "O" (owns) or "R" (rents) columns</li>
                    <li>Note property values listed</li>
                  </ul>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <p style="color: #78350f; font-weight: 600; margin: 0 0 10px 0;">Step 3: Search Land Records</p>
                  <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>County deed records</li>
                    <li>BLM General Land Office (glorecords.blm.gov)</li>
                    <li>Freedmen's Bureau records</li>
                    <li>Tax records and property maps</li>
                  </ul>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <p style="color: #78350f; font-weight: 600; margin: 0 0 10px 0;">Step 4: Document the Chain of Title</p>
                  <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Track property from original owner to present</li>
                    <li>Note any probate or estate records</li>
                    <li>Identify all potential heirs</li>
                    <li>Check for partition sales or tax forfeitures</li>
                  </ul>
                </div>
                
                <div>
                  <p style="color: #78350f; font-weight: 600; margin: 0 0 10px 0;">Step 5: Consult Legal Resources</p>
                  <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Check if your state has UPHPA protections</li>
                    <li>Contact a real estate attorney</li>
                    <li>Explore heirs' property legal clinics</li>
                    <li>Consider an Affidavit of Heirship</li>
                  </ul>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Stats Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #fef2f2; border-radius: 8px 0 0 8px;">
                    <div style="color: #dc2626; font-size: 24px; font-weight: 700;">$28B</div>
                    <div style="color: #7f1d1d; font-size: 12px;">Heir Property Value</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #fffbeb;">
                    <div style="color: #d97706; font-size: 24px; font-weight: 700;">3.5M</div>
                    <div style="color: #78350f; font-size: 12px;">Families Affected</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #eff6ff; border-radius: 0 8px 8px 0;">
                    <div style="color: #2563eb; font-size: 24px; font-weight: 700;">18</div>
                    <div style="color: #1e3a8a; font-size: 12px;">UPHPA States</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <a href="https://axiomprotocol.app/workbook" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start Using the Workbook →
              </a>
              <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0;">
                Get AI-powered research assistance, family tree building, and more.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">
                <strong style="color: #ffffff;">Axiom Protocol</strong> | Building Generational Wealth On-Chain
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                You're receiving this because you signed up for the Land Reclamation Workbook checklist.<br>
                <a href="https://axiomprotocol.app/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
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
    subject: `${firstName}, here's your Heir Property Research Checklist`,
    html: emailHtml,
  });

  return result;
}

export async function sendAxauEarlyAccessConfirmation(params: {
  to: string;
  fullName: string;
  walletAddress: string;
  submissionId: string;
}) {
  const { client, fromEmail } = await getResendClient();
  const { to, fullName, walletAddress, submissionId } = params;
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const shortId = submissionId.slice(0, 8).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f5f5f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1e3a5f;padding:32px 36px;">
            <p style="color:#b8860b;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px 0;">AXIOM PROTOCOL</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;line-height:1.2;">AXAU Early Access</h1>
            <p style="color:#94a3b8;font-family:'Courier New',monospace;font-size:11px;margin:8px 0 0 0;letter-spacing:0.1em;">APPLICATION RECEIVED</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Dear ${fullName},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
              Your application for AXAU Early Access has been received and is under review. The Axiom Protocol compliance team will process your identity verification and notify you once your wallet is approved.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin:0 0 24px 0;">
              <tr><td style="padding:20px 24px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin:0 0 12px 0;">Submission Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:4px 0;">Reference ID</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:4px 0;">#${shortId}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:4px 0;">Wallet</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:4px 0;">${shortWallet}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:4px 0;">Status</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#b8860b;font-weight:700;text-align:right;padding:4px 0;">UNDER REVIEW</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              Once approved, your wallet address will be registered on-chain as an eligible AXAU minter. You can then access the AXAU mint terminal at <a href="https://axiomprotocol.app/axau#mint-terminal" style="color:#1e3a5f;">axiomprotocol.app/axau</a>.
            </p>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
              AXAU is a gold reserve unit. Participation is subject to identity verification and eligibility requirements.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin:0;">AXIOM PROTOCOL — ARBITRUM ONE — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `AXAU Early Access — Application Received (#${shortId})`,
    html,
  });
}

export async function sendInboundAchNotification(params: {
  to: string;
  fullName: string;
  participantRef: string;
  amountCents: number;
  senderName: string | null;
  newBalanceCents?: number | null;
  receivedAt: Date;
}) {
  const { client, fromEmail } = await getResendClient();
  const { to, fullName, participantRef, amountCents, senderName, newBalanceCents, receivedAt } = params;

  const fmtUSD = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const formattedAmount = fmtUSD(amountCents);
  const formattedBalance = newBalanceCents != null ? fmtUSD(newBalanceCents) : null;
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(receivedAt);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f5f5f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1D3D2A;padding:32px 36px;">
            <p style="color:#b8860b;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px 0;">AXIOM NEXUS BANKING</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;line-height:1.2;">Direct Deposit Received</h1>
            <p style="color:#a7c4a0;font-family:'Courier New',monospace;font-size:11px;margin:8px 0 0 0;letter-spacing:0.1em;">GET PAID EARLY — FUNDS AVAILABLE</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Dear ${fullName},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
              Great news — your direct deposit has arrived in your Axiom Nexus Account. Funds are available now,
              typically 1–2 business days before the official settlement date.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9f0;border:2px solid #1D3D2A;margin:0 0 24px 0;">
              <tr><td style="padding:24px 28px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;color:#1D3D2A;text-transform:uppercase;margin:0 0 16px 0;font-weight:700;">Deposit Summary</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:6px 0;border-bottom:1px solid #d1fae5;">Amount Received</td>
                    <td style="font-family:'Courier New',monospace;font-size:20px;color:#1D3D2A;font-weight:700;text-align:right;padding:6px 0;border-bottom:1px solid #d1fae5;">${formattedAmount}</td>
                  </tr>
                  ${senderName ? `<tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:6px 0;border-bottom:1px solid #d1fae5;">From</td>
                    <td style="font-family:'Courier New',monospace;font-size:13px;color:#1B2A4A;font-weight:600;text-align:right;padding:6px 0;border-bottom:1px solid #d1fae5;">${senderName}</td>
                  </tr>` : ''}
                  ${formattedBalance ? `<tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:6px 0;border-bottom:1px solid #d1fae5;">New Balance</td>
                    <td style="font-family:'Courier New',monospace;font-size:13px;color:#1B2A4A;font-weight:700;text-align:right;padding:6px 0;border-bottom:1px solid #d1fae5;">${formattedBalance}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:6px 0;border-bottom:1px solid #d1fae5;">Received At</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1B2A4A;text-align:right;padding:6px 0;border-bottom:1px solid #d1fae5;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:6px 0;">Account Ref</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1B2A4A;font-weight:600;text-align:right;padding:6px 0;">${participantRef}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              Your funds are held at First Internet Bank under the Axiom Nexus program, FDIC-insured up to $250,000.
              View your complete account history and balance at <a href="https://axiomprotocol.app/banking/my-account" style="color:#1D3D2A;font-weight:600;">axiomprotocol.app/banking/my-account</a>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td align="center">
                  <a href="https://axiomprotocol.app/banking/my-account" style="display:inline-block;background:#1D3D2A;color:#ffffff;text-decoration:none;padding:14px 36px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;">
                    View My Account →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
              To update or share your direct deposit details with an employer, visit
              <a href="https://axiomprotocol.app/direct-deposit" style="color:#6b7280;">axiomprotocol.app/direct-deposit</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin:0;">
              AXIOM NEXUS BANKING — FIRST INTERNET BANK — FDIC INSURED — axiomprotocol.app
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Direct Deposit Received — ${formattedAmount} in your Axiom Nexus Account`,
    html,
  });
}

export async function sendAxauPurchaseRequestConfirmation(params: {
  to: string;
  walletAddress: string;
  requestId: string;
  axusdAmount: string;
  axauQuoted: string;
  xauUsdPrice: string | null;
}) {
  const { client, fromEmail } = await getResendClient();
  const { to, walletAddress, requestId, axusdAmount, axauQuoted, xauUsdPrice } = params;
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const shortId = requestId.slice(0, 8).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f5f5f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1e3a5f;padding:32px 36px;">
            <p style="color:#b8860b;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px 0;">AXIOM PROTOCOL</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;line-height:1.2;">AXAU Purchase Request</h1>
            <p style="color:#94a3b8;font-family:'Courier New',monospace;font-size:11px;margin:8px 0 0 0;letter-spacing:0.1em;">REQUEST RECEIVED</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
              Your AXAU purchase request has been received. The Axiom Protocol operations team will process your request — acquiring PAXG, depositing it to the vault, and minting AXAU to your wallet.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin:0 0 24px 0;">
              <tr><td style="padding:20px 24px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin:0 0 14px 0;">Order Summary</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Reference ID</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">#${shortId}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">You Spend</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">${axusdAmount} AXUSD</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">You Receive</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#b8860b;font-weight:700;text-align:right;padding:5px 0;">${axauQuoted} AXAU</td>
                  </tr>
                  ${xauUsdPrice ? `<tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">XAU/USD at Request</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">$${xauUsdPrice}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Wallet</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">${shortWallet}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Status</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#b8860b;font-weight:700;text-align:right;padding:5px 0;">PENDING FULFILLMENT</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
              You will receive a separate confirmation once AXAU has been minted to your wallet. Processing typically completes within 1 business day.
            </p>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
              AXAU is a gold reserve unit backed by PAXG on Arbitrum One. All minting is subject to vault availability and compliance verification.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin:0;">AXIOM PROTOCOL — ARBITRUM ONE — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `AXAU Purchase Request Received — ${axauQuoted} AXAU (#${shortId})`,
    html,
  });
}

export async function sendEscrowCounterpartyInvitation(
  to: string,
  opts: {
    counterpartyName: string;
    initiatorName: string;
    amountUsd: string;
    purpose: string;
    escrowUrl: string;
    counterpartyToken: string;
  }
) {
  let client: Resend;
  let fromEmail: string;
  try {
    const creds = await getResendClient();
    client = creds.client;
    fromEmail = creds.fromEmail;
  } catch (err) {
    console.warn('[Escrow] Resend not configured — logging counterparty token delivery only:', opts.escrowUrl);
    return;
  }

  const purposeLabel: Record<string, string> = {
    security_deposit: 'Security Deposit',
    earnest_money: 'Earnest Money',
    milestone: 'Milestone Payment',
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:monospace,Courier,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dde4ee;max-width:600px;width:100%;">
        <tr><td style="background:#1e3a5f;padding:28px 32px;">
          <span style="color:#fff;font-family:monospace;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">AXIOM RAIL / ESCROW</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="color:#1e3a5f;font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">You have been invited to an escrow agreement</h1>
          <p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 20px;">
            <strong>${opts.initiatorName}</strong> has opened a <strong>${purposeLabel[opts.purpose] ?? opts.purpose}</strong>
            escrow for <strong>$${Number(opts.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            and has named you as the counterparty.
          </p>
          <p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 24px;">
            To view the escrow status, confirm funding, or approve the release, visit the link below
            and enter your unique access token. <strong>Save this token — it will not be shown again.</strong>
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#1e3a5f;padding:12px 28px;">
              <a href="${opts.escrowUrl}" style="color:#fff;font-family:monospace;font-size:13px;text-decoration:none;letter-spacing:0.06em;">VIEW ESCROW →</a>
            </td></tr>
          </table>
          <div style="background:#f8f9fb;border:1px solid #dde4ee;padding:16px 20px;margin:0 0 20px;">
            <div style="font-size:11px;color:#7a8fa8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your Counterparty Access Token</div>
            <div style="font-family:monospace;font-size:12px;color:#1e3a5f;word-break:break-all;">${opts.counterpartyToken}</div>
          </div>
          <p style="color:#7a8fa8;font-size:12px;line-height:1.6;margin:0;">
            This token grants you the ability to approve or dispute the escrow release.
            Keep it confidential. If you did not expect this email, you may disregard it.
          </p>
        </td></tr>
        <tr><td style="background:#f4f7fa;border-top:1px solid #dde4ee;padding:20px 32px;">
          <span style="color:#7a8fa8;font-size:11px;font-family:monospace;">Axiom Rail — Escrow Service</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Escrow Invitation: ${opts.initiatorName} has opened a ${purposeLabel[opts.purpose] ?? opts.purpose} escrow with you`,
    html,
  });
}

// ─── Property Report — auto-resolved stuck-payment notifications (task #275) ──
//
// The stuck-payment resolver (task #248) silently auto-confirms or auto-expires
// pending property_reports rows when a buyer abandons the on-chain payment
// flow. These two emails close the loop so the buyer hears about it.

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiomprotocol.app';
}

function shortenTxHash(txHash: string): string {
  const clean = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  return `${clean.slice(0, 10)}…${clean.slice(-8)}`;
}

export async function sendPropertyReportReadyEmail(params: {
  to: string;
  reportId: string;
  address: string;
  txHash: string;
  arbiscanUrl: string;
  amountAxusd: string;
}) {
  const { client, fromEmail } = await getResendClient();
  const { to, reportId, address, txHash, arbiscanUrl, amountAxusd } = params;
  const reportUrl = `${appBaseUrl()}/property/reports/${reportId}`;
  const shortId = reportId.slice(0, 8).toUpperCase();
  const shortTx = shortenTxHash(txHash);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f5f5f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1e3a5f;padding:32px 36px;">
            <p style="color:#b8860b;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px 0;">AXIOM PROTOCOL — PROPERTY ANALYSIS</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;line-height:1.2;">Your Report Is Ready</h1>
            <p style="color:#94a3b8;font-family:'Courier New',monospace;font-size:11px;margin:8px 0 0 0;letter-spacing:0.1em;">PAYMENT AUTO-CONFIRMED</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
              We confirmed your AXUSD payment on Arbitrum One and generated your property report. You can read it at the link below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin:0 0 24px 0;">
              <tr><td style="padding:20px 24px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin:0 0 14px 0;">Receipt</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Report ID</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">#${shortId}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Property</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">${address}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Amount Paid</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#b8860b;font-weight:700;text-align:right;padding:5px 0;">${amountAxusd} AXUSD</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Tx Hash</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">
                      <a href="${arbiscanUrl}" style="color:#1e3a5f;text-decoration:none;">${shortTx} ↗</a>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td align="center">
                <a href="${reportUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 36px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;">
                  View Report →
                </a>
              </td></tr>
            </table>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
              You're receiving this because we detected your on-chain AXUSD payment for a report you started but didn't return to confirm. The on-chain receipt above is also viewable on Arbiscan.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin:0;">AXIOM PROTOCOL — ARBITRUM ONE — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Your AXIOM property report is ready (#${shortId})`,
    html,
  });
}

export async function sendPropertyReportExpiredEmail(params: {
  to: string;
  reportId: string;
  address: string;
}) {
  const { client, fromEmail } = await getResendClient();
  const { to, reportId, address } = params;
  const retryUrl = `${appBaseUrl()}/property`;
  const supportUrl = `${appBaseUrl()}/contact`;
  const shortId = reportId.slice(0, 8).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f5f5f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d1d5db;">
        <tr>
          <td style="background:#1e3a5f;padding:32px 36px;">
            <p style="color:#b8860b;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px 0;">AXIOM PROTOCOL — PROPERTY ANALYSIS</p>
            <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0;line-height:1.2;">Report Request Expired</h1>
            <p style="color:#94a3b8;font-family:'Courier New',monospace;font-size:11px;margin:8px 0 0 0;letter-spacing:0.1em;">NO ON-CHAIN PAYMENT RECEIVED</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
              We didn't receive an on-chain AXUSD payment for your property report request. The pending request has been closed.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;margin:0 0 24px 0;">
              <tr><td style="padding:20px 24px;">
                <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin:0 0 14px 0;">Request Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Reference ID</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">#${shortId}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Property</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#1e3a5f;font-weight:700;text-align:right;padding:5px 0;">${address}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#6b7280;padding:5px 0;">Status</td>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#b8860b;font-weight:700;text-align:right;padding:5px 0;">EXPIRED</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td align="center">
                <a href="${retryUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:14px 36px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;">
                  Request a New Report →
                </a>
              </td></tr>
            </table>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              <strong>Did you actually pay?</strong> If you sent AXUSD on Arbitrum One but the request still expired, your transaction may have landed outside the auto-detection window. Reach out at <a href="${supportUrl}" style="color:#1e3a5f;font-weight:600;">${supportUrl.replace(/^https?:\/\//, '')}</a> with your tx hash and we can manually confirm it.
            </p>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
              You're receiving this because you started a property report request but no on-chain AXUSD transfer was detected within the expiry window.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="font-family:'Courier New',monospace;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin:0;">AXIOM PROTOCOL — ARBITRUM ONE — axiomprotocol.app</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return client.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Your AXIOM property report request expired (#${shortId})`,
    html,
  });
}
