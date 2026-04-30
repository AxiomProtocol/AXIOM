/**
 * One-shot Stripe cutover smoke test (task #398).
 * Run: `npx tsx scripts/stripe-smoke.ts`
 *
 * Tests, in order:
 *   1. getStripe() resolves the right account (account-id pin guard)
 *   2. checkout.sessions.create succeeds against the live account ($1 USD,
 *      then immediately expired so no human can pay it)
 *   3. webhooks.constructEvent verifies a payload we sign with the
 *      STRIPE_WEBHOOK_SECRET in env (proves the secret in env can verify
 *      anything signed with itself — final live confirmation requires
 *      Stripe to send a real event from the dashboard, which proves the
 *      secret in env equals the secret on the registered endpoint)
 *   4. POST the signed payload to the running webhook handler and
 *      assert 200
 */
import { getStripe, getStripeAccountInfo } from '../lib/stripe/client';

const BASE_URL = process.env.STRIPE_SMOKE_BASE_URL ?? 'http://127.0.0.1:5000';

async function main() {
  console.log('=== Stripe cutover smoke test ===\n');

  // 1) Account guard
  console.log('[1] getStripeAccountInfo()');
  const info = await getStripeAccountInfo();
  console.log('   ', info);
  if (!info.match) {
    console.error('   FAIL: account does not match expected pin');
    process.exit(1);
  }
  console.log('    OK: account matches pin\n');

  // 2) Live checkout.sessions.create + immediate expire
  console.log('[2] checkout.sessions.create ($1 USD test, then expire)');
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'cutover-smoke (do not pay)' },
        unit_amount: 100,
      },
      quantity: 1,
    }],
    metadata: { smoke: 'task-398', cardDepositId: 'smoke-' + Date.now() },
    success_url: `${BASE_URL}/treasury/fund/success`,
    cancel_url: `${BASE_URL}/treasury/fund/cancel`,
  });
  console.log('    session id:', session.id);
  console.log('    livemode  :', session.livemode);
  console.log('    status    :', session.status);
  if (!session.id?.startsWith('cs_')) {
    console.error('   FAIL: session id missing cs_ prefix');
    process.exit(1);
  }
  // Expire so nobody can accidentally pay this $1
  try {
    const expired = await stripe.checkout.sessions.expire(session.id);
    console.log('    expired   :', expired.status);
  } catch (e: any) {
    console.warn('    (expire failed:', e?.message, ') — session still expires automatically in 24h');
  }
  console.log('    OK: live session created on the new account\n');

  // 3) Sign a synthetic webhook payload with STRIPE_WEBHOOK_SECRET and verify
  console.log('[3] webhooks.constructEvent against STRIPE_WEBHOOK_SECRET');
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    console.error('   FAIL: STRIPE_WEBHOOK_SECRET not set');
    process.exit(1);
  }
  const payload = JSON.stringify({
    id: 'evt_smoke_' + Date.now(),
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_smoke_no_match', payment_status: 'unpaid', metadata: {} } },
  });
  const ts = Math.floor(Date.now() / 1000);
  const crypto = await import('node:crypto');
  const signedPayload = `${ts}.${payload}`;
  const sig = crypto.createHmac('sha256', whSecret).update(signedPayload).digest('hex');
  const header = `t=${ts},v1=${sig}`;

  // Verify locally first to confirm signing is correct
  try {
    const event = stripe.webhooks.constructEvent(payload, header, whSecret);
    console.log('    constructEvent OK, event id:', event.id, 'type:', event.type);
  } catch (e: any) {
    console.error('    FAIL: constructEvent rejected our self-signed payload:', e?.message);
    process.exit(1);
  }
  console.log('    OK: signing secret round-trips\n');

  // 4) POST the signed payload to the live webhook handler
  console.log('[4] POST signed payload to webhook handler');
  const res = await fetch(`${BASE_URL}/api/capinfra/treasury/card-deposit/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': header,
    },
    body: payload,
  });
  const body = await res.text();
  console.log('    status:', res.status);
  console.log('    body  :', body.slice(0, 300));
  if (res.status !== 200) {
    console.error('   FAIL: webhook did not return 200');
    process.exit(1);
  }
  console.log('    OK: webhook handler accepts properly-signed events\n');

  console.log('=== ALL SMOKE TESTS PASSED ===');
  console.log('Note: this proves the LOCAL env secrets work end-to-end.');
  console.log('The final confirmation that Stripe-dashboard signing-secret');
  console.log('matches STRIPE_WEBHOOK_SECRET requires a real test event from');
  console.log('the Stripe dashboard webhook page (Send test webhook button).');
  process.exit(0);
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
