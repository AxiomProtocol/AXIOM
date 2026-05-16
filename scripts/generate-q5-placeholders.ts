/**
 * scripts/generate-q5-placeholders.ts
 *
 * Generates the seven Q5 internal-system MFA screenshot file slots required
 * by the Plaid Production Access Security Questionnaire. The actual screenshots
 * MUST be captured manually by the Information Security Lead from each vendor's
 * admin UI while signed in — they cannot be produced programmatically because
 * they need to show real account identifiers and the active second factor.
 *
 * This script produces clearly-marked placeholder PNGs (rendered via headless
 * Chromium) at the exact filenames the answer sheet references, so the upload
 * paths resolve and the operator has a visible reminder of what to capture.
 *
 * Run: npx tsx scripts/generate-q5-placeholders.ts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'screenshots', 'plaid');

const VENDORS: Array<{ slug: string; name: string; expects: string }> = [
  { slug: 'replit', name: 'Replit', expects: 'Account email + TOTP/WebAuthn enabled in account security settings' },
  { slug: 'neon', name: 'Neon (PostgreSQL)', expects: 'Account email + MFA method enabled in console.neon.tech account settings' },
  { slug: 'banking-provider', name: 'Banking Provider (TBD)', expects: 'Operator email + MFA enabled in banking provider dashboard settings' },
  { slug: 'plaid', name: 'Plaid', expects: 'Operator email + MFA method enabled in dashboard.plaid.com team settings' },
  { slug: 'bitgo', name: 'BitGo', expects: 'Operator email + YubiKey/TOTP enabled in app.bitgo.com user settings' },
  { slug: 'auth0', name: 'Auth0', expects: 'Tenant admin email + MFA factor enabled in manage.auth0.com user profile' },
  { slug: 'github', name: 'GitHub', expects: 'Operator handle + WebAuthn/TOTP enabled at github.com/settings/security' },
];

function htmlFor(vendor: { slug: string; name: string; expects: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><style>
  html,body{margin:0;padding:0;width:1200px;height:800px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff8e7;color:#1a1a2e;}
  .wrap{padding:80px 100px;}
  .badge{display:inline-block;padding:8px 16px;background:#c1272d;color:#fff;font-weight:700;letter-spacing:.1em;font-size:14px;text-transform:uppercase;}
  h1{font-family:Georgia,serif;font-size:48px;margin:24px 0 8px;color:#1a1a2e;}
  h2{font-family:Georgia,serif;font-size:28px;margin:16px 0 32px;color:#3d3d5c;font-weight:400;}
  .panel{border:2px solid #1a1a2e;padding:32px;background:#fff;}
  .label{font-family:"SF Mono",Menlo,monospace;font-size:13px;color:#6b6b80;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
  .value{font-size:18px;line-height:1.5;color:#1a1a2e;margin-bottom:20px;}
  .footer{margin-top:32px;font-size:14px;color:#6b6b80;line-height:1.6;}
  code{font-family:"SF Mono",Menlo,monospace;background:#f0f0f0;padding:2px 6px;}
</style></head><body><div class="wrap">
  <span class="badge">Placeholder &mdash; replace before Plaid submission</span>
  <h1>${vendor.name}</h1>
  <h2>Multi-factor authentication evidence (Plaid Q5)</h2>
  <div class="panel">
    <div class="label">Required content</div>
    <div class="value">${vendor.expects}</div>
    <div class="label">File slot</div>
    <div class="value"><code>screenshots/plaid/q5-mfa-${vendor.slug}.png</code></div>
    <div class="label">Capture instructions</div>
    <div class="value">Sign in to ${vendor.name} as the Information Security Lead. Navigate to the account / security settings page that lists the enabled second factor. Take a screenshot that clearly shows (a) the account identifier (email or handle) and (b) the active MFA method. Save it at the exact path above, overwriting this placeholder.</div>
  </div>
  <div class="footer">This placeholder file exists so the Plaid Production Access answer sheet
    (<code>documents/plaid/security-questionnaire-answers.md</code>) resolves to a real path
    on disk for every Q5 row. It must be replaced with the genuine vendor screenshot before
    the questionnaire is submitted.</div>
</div></body></html>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    for (const v of VENDORS) {
      const page = await ctx.newPage();
      await page.setContent(htmlFor(v), { waitUntil: 'load' });
      const out = path.join(OUT_DIR, `q5-mfa-${v.slug}.png`);
      await page.screenshot({ path: out, fullPage: false, type: 'png' });
      await page.close();
      const stat = await fs.stat(out);
      // eslint-disable-next-line no-console
      console.log(`[q5-placeholders] wrote ${path.basename(out)} (${stat.size.toLocaleString()} bytes)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[q5-placeholders] failed:', err);
  process.exit(1);
});
