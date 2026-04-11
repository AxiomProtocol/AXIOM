import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required' });
  }

  let wallet: string;
  if (siweWallet === '__dev__') {
    const w = req.query.wallet;
    if (!w || typeof w !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(w)) {
      return res.status(400).json({ error: 'Dev mode: pass ?wallet=0x... to identify the participant' });
    }
    wallet = w.toLowerCase();
  } else {
    wallet = siweWallet;
  }

  try {
    const rows = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const p = rows[0];
    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    const routingNumber = hasVirtualAccount ? p.virtualRoutingNumber! : '071006486';
    const accountNumber = hasVirtualAccount ? p.virtualAccountNumber! : '— pending provisioning —';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Direct Deposit Authorization — ${p.fullName}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white; }
      .page { box-shadow: none; }
    }

    * { box-sizing: border-box; }

    body {
      font-family: 'Georgia', serif;
      background: #f5f5f0;
      margin: 0;
      padding: 24px;
      color: #1a1a1a;
    }

    .no-print {
      text-align: center;
      margin-bottom: 24px;
    }

    .no-print button {
      background: #1B2A4A;
      color: white;
      border: none;
      padding: 12px 32px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      margin-right: 12px;
    }

    .no-print button:hover { background: #243659; }
    .no-print .note { font-size: 13px; color: #6b7280; margin-top: 10px; }

    .page {
      max-width: 760px;
      margin: 0 auto;
      background: white;
      border: 2px solid #1B2A4A;
      padding: 48px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    .header {
      border-bottom: 3px solid #1B2A4A;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .org-name {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #b8860b;
      margin: 0 0 4px 0;
    }

    h1 {
      font-size: 22px;
      color: #1B2A4A;
      margin: 0;
      font-weight: 700;
    }

    .subtitle {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #6b7280;
      margin: 4px 0 0 0;
    }

    .date-ref {
      text-align: right;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #6b7280;
    }

    .section-title {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #1B2A4A;
      background: #f0f4fa;
      padding: 6px 12px;
      margin: 24px 0 14px 0;
      font-weight: 700;
      border-left: 3px solid #1B2A4A;
    }

    .field-grid {
      display: grid;
      gap: 0;
      border: 1px solid #d1d5db;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #d1d5db;
    }

    .field-row:last-child { border-bottom: none; }

    .field-row.single { grid-template-columns: 1fr; }

    .field-row.three { grid-template-columns: 1fr 1fr 1fr; }

    .field {
      padding: 12px 16px;
      border-right: 1px solid #d1d5db;
    }

    .field:last-child { border-right: none; }

    .field-label {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .field-value {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #1B2A4A;
      font-weight: 700;
      word-break: break-all;
    }

    .field-value.large {
      font-size: 18px;
      letter-spacing: 0.08em;
    }

    .highlight-box {
      background: #f0f9f4;
      border: 2px solid #1D3D2A;
      padding: 16px 20px;
      margin: 20px 0;
    }

    .highlight-box p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #1D3D2A;
    }

    .steps-section { margin: 24px 0; }

    .step {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
    }

    .step-num {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #b8860b;
      font-weight: 700;
      min-width: 20px;
      margin-top: 1px;
    }

    .instructions-box {
      border: 1px solid #d1d5db;
      padding: 16px 20px;
      margin: 20px 0;
      background: #fafafa;
    }

    .instructions-box p {
      margin: 0 0 8px 0;
      font-size: 12px;
      line-height: 1.6;
      color: #4b5563;
    }

    .instructions-box p:last-child { margin-bottom: 0; }

    .signature-section {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
    }

    .sig-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-top: 16px;
    }

    .sig-line {
      border-bottom: 1px solid #1B2A4A;
      padding-bottom: 4px;
      margin-bottom: 6px;
      min-height: 36px;
    }

    .sig-label {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-left {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #9ca3af;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .footer-right {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #9ca3af;
    }

    .badge {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 8px;
      border: 1px solid #1D3D2A;
      color: #1D3D2A;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button id="btn-print">Print / Save as PDF</button>
    <button id="btn-close">Close</button>
    <p class="note">
      Use your browser's Print dialog (Ctrl+P or Cmd+P) and choose "Save as PDF" to download.
    </p>
  </div>

  <div class="page">
    <div class="header">
      <div class="header-top">
        <div>
          <p class="org-name">Axiom Protocol</p>
          <h1>Direct Deposit Authorization Form</h1>
          <p class="subtitle">Axiom Nexus Banking — First Internet Bank — FDIC Insured</p>
        </div>
        <div class="date-ref">
          <p style="margin:0 0 4px 0;">Date: ${today}</p>
          <p style="margin:0;"><span class="badge">Checking Account</span></p>
        </div>
      </div>
    </div>

    <div class="highlight-box">
      <p>
        <strong>Instructions:</strong> Complete this form and submit it to your employer's payroll or HR department,
        or upload it directly to your payroll portal (ADP, Gusto, Paychex, Rippling, etc.). Your payroll provider
        will route direct deposits to your Axiom Nexus Account at First Internet Bank.
        Funds typically arrive 1–2 business days before the official pay date.
      </p>
    </div>

    <div class="section-title">Part 1 — Employee Information</div>
    <div class="field-grid">
      <div class="field-row single">
        <div class="field">
          <div class="field-label">Full Legal Name</div>
          <div class="field-value">${p.fullName}</div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <div class="field-label">Email Address</div>
          <div class="field-value" style="font-size:13px;">${p.email}</div>
        </div>
        <div class="field">
          <div class="field-label">Account Reference Code</div>
          <div class="field-value">${p.participantRef}</div>
        </div>
      </div>
    </div>

    <div class="section-title">Part 2 — Bank Account Information</div>
    <div class="field-grid">
      <div class="field-row">
        <div class="field">
          <div class="field-label">Bank Name</div>
          <div class="field-value" style="font-size:13px;">First Internet Bank</div>
        </div>
        <div class="field">
          <div class="field-label">Account Type</div>
          <div class="field-value">CHECKING</div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <div class="field-label">ABA Routing Number</div>
          <div class="field-value large">${routingNumber}</div>
        </div>
        <div class="field">
          <div class="field-label">Account Number</div>
          <div class="field-value large">${accountNumber}</div>
        </div>
      </div>
      <div class="field-row single">
        <div class="field">
          <div class="field-label">Account Name (Payee)</div>
          <div class="field-value" style="font-size:13px;">Axiom Protocol LLC — Nexus Account / ${p.fullName}</div>
        </div>
      </div>
    </div>

    ${!hasVirtualAccount ? `
    <div class="instructions-box" style="border-color:#b8860b;background:#fffbeb;margin-top:12px;">
      <p style="color:#92400e;font-weight:700;font-size:12px;">Important: Memo Field Required</p>
      <p style="color:#78350f;">
        Your dedicated account number is still being provisioned. In the meantime, use the shared Axiom Nexus Account
        routing number above and include your reference code <strong>${p.participantRef}</strong> in the memo or description field
        of every direct deposit. This ensures your payment is correctly attributed to your account.
      </p>
    </div>` : ''}

    <div class="section-title">Part 3 — Deposit Instructions</div>
    <div class="steps-section">
      <div class="step">
        <span class="step-num">1.</span>
        <span>Select <strong>"Add Direct Deposit"</strong> or <strong>"Set Up Direct Deposit"</strong> in your employer's HR or payroll portal.</span>
      </div>
      <div class="step">
        <span class="step-num">2.</span>
        <span>Choose <strong>Checking</strong> as the account type.</span>
      </div>
      <div class="step">
        <span class="step-num">3.</span>
        <span>Enter routing number <strong>${routingNumber}</strong> and account number <strong>${accountNumber}</strong>.</span>
      </div>
      <div class="step">
        <span class="step-num">4.</span>
        <span>Set the deposit amount to <strong>100% of net pay</strong> (or enter a specific dollar amount for partial deposit).</span>
      </div>
      <div class="step">
        <span class="step-num">5.</span>
        <span>Submit the form and allow 1–2 pay cycles for the change to take effect.</span>
      </div>
      <div class="step">
        <span class="step-num">6.</span>
        <span>You will receive an email notification at <strong>${p.email}</strong> when your first direct deposit arrives.</span>
      </div>
    </div>

    <div class="section-title">Part 4 — Authorization</div>
    <p style="font-size:13px;line-height:1.6;color:#374151;margin:12px 0 20px 0;">
      I authorize my employer to initiate ACH credit entries to the account described above and authorize
      First Internet Bank (through Axiom Protocol LLC) to accept and credit these entries to my account.
      This authorization remains in effect until I cancel it in writing with sufficient notice to both my employer
      and Axiom Protocol.
    </p>

    <div class="signature-section">
      <div class="sig-grid">
        <div>
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Signature</div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div class="sig-label">Date</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        Axiom Protocol LLC · Nexus Banking · First Internet Bank · FDIC Insured up to $250,000
      </div>
      <div class="footer-right">
        Ref: ${p.participantRef} · axiomprotocol.app/direct-deposit
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
      document.getElementById('btn-close').addEventListener('click', function() { window.close(); });
      setTimeout(function() { window.print(); }, 800);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="direct-deposit-${p.participantRef}.html"`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; media-src 'none'; connect-src 'none'; font-src 'none'");
    return res.status(200).send(html);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
