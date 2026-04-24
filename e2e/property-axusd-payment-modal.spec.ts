/**
 * e2e/property-axusd-payment-modal.spec.ts
 *
 * Task #249 — end-to-end coverage for the Property Analysis AXUSD payment
 * modal that replaced Stripe Checkout in task #230.
 *
 * What this test covers:
 *   1. Selecting a paid tier on /property opens the wagmi-driven modal.
 *   2. The modal POSTs /api/property/create-payment-intent with the connected
 *      wallet, surfaces the AXUSD amount, and unlocks the Pay button.
 *   3. Clicking Pay drives writeContract through the mock wallet, which
 *      emits an `eth_sendTransaction` we intercept at the mocked Arbitrum RPC.
 *   4. useWaitForTransactionReceipt resolves against our mocked successful
 *      receipt, the modal POSTs /api/property/confirm-payment, and the page
 *      navigates to /property/reports/<id>.
 *   5. The deprecated Stripe endpoints (create-checkout, checkout-status,
 *      webhook) all return HTTP 410.
 *
 * Wallet mocking:
 *   - lib/web3/wagmiConfig.ts swaps to a `mock` connector when
 *     NEXT_PUBLIC_E2E_WAGMI=1 (set by playwright.config.ts webServer.env).
 *   - The mock connector forwards eth_sendTransaction to the chain's default
 *     HTTP RPC (https://arb1.arbitrum.io/rpc), which is intercepted below.
 */

import { test, expect, Page, Route } from '@playwright/test';

const E2E_BUYER = '0xE2E1234567890123456789012345678901234567';
const FAKE_TX_HASH = `0x${'ab'.repeat(32)}` as const;
const ARB_CHAIN_ID = 42161;

// Synthetic AXUSD token + recipient — the test owns these values end-to-end
// because the API mock returns them and the RPC mock echoes them back. They
// don't need to match any real on-chain contract.
const MOCK_TOKEN = '0x1111111111111111111111111111111111111111';
const MOCK_RECIPIENT = '0x2222222222222222222222222222222222222222';

const MOCK_REPORT_ID = 'rpt_e2e_axusd_modal_249';

// 4.99 AXUSD with 6 decimals == 4_990_000.
const AMOUNT_TOKEN_UNITS = '4990000';

function jsonRpcSuccess(id: number | string | null, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

interface JsonRpcRequest {
  id: number | string | null;
  method: string;
  params?: unknown[];
}

function handleJsonRpc(req: JsonRpcRequest, state: { blockNumber: number }) {
  state.blockNumber += 1;
  const blockHex = `0x${state.blockNumber.toString(16)}`;

  switch (req.method) {
    case 'eth_chainId':
      return jsonRpcSuccess(req.id, `0x${ARB_CHAIN_ID.toString(16)}`);
    case 'net_version':
      return jsonRpcSuccess(req.id, String(ARB_CHAIN_ID));
    case 'eth_blockNumber':
      return jsonRpcSuccess(req.id, blockHex);
    case 'eth_getBlockByNumber':
      return jsonRpcSuccess(req.id, {
        number: blockHex,
        hash: `0x${'b'.repeat(64)}`,
        parentHash: `0x${'a'.repeat(64)}`,
        timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
        baseFeePerGas: '0x1',
        gasLimit: '0x1c9c380',
        gasUsed: '0x0',
        miner: `0x${'0'.repeat(40)}`,
        difficulty: '0x0',
        totalDifficulty: '0x0',
        size: '0x0',
        transactions: [],
        uncles: [],
      });
    case 'eth_gasPrice':
      return jsonRpcSuccess(req.id, '0x3b9aca00');
    case 'eth_maxPriorityFeePerGas':
      return jsonRpcSuccess(req.id, '0x3b9aca00');
    case 'eth_feeHistory':
      return jsonRpcSuccess(req.id, {
        oldestBlock: blockHex,
        baseFeePerGas: ['0x1', '0x1'],
        gasUsedRatio: [0],
        reward: [['0x1']],
      });
    case 'eth_estimateGas':
      return jsonRpcSuccess(req.id, '0x5208');
    case 'eth_getTransactionCount':
      return jsonRpcSuccess(req.id, '0x1');
    case 'eth_getBalance':
      return jsonRpcSuccess(req.id, '0xde0b6b3a7640000');
    case 'eth_call':
      // Any read call (e.g. AXUSD decimals) — return a generic 32-byte zero
      // word. The modal doesn't read on-chain state, but the public client
      // may probe.
      return jsonRpcSuccess(req.id, `0x${'0'.repeat(64)}`);
    case 'eth_sendRawTransaction':
    case 'eth_sendTransaction':
      return jsonRpcSuccess(req.id, FAKE_TX_HASH);
    case 'eth_getTransactionByHash':
      return jsonRpcSuccess(req.id, {
        hash: FAKE_TX_HASH,
        nonce: '0x1',
        blockHash: `0x${'b'.repeat(64)}`,
        blockNumber: blockHex,
        transactionIndex: '0x0',
        from: E2E_BUYER.toLowerCase(),
        to: MOCK_TOKEN,
        value: '0x0',
        gas: '0x5208',
        gasPrice: '0x3b9aca00',
        input: '0x',
        type: '0x0',
        chainId: `0x${ARB_CHAIN_ID.toString(16)}`,
      });
    case 'eth_getTransactionReceipt':
      return jsonRpcSuccess(req.id, {
        transactionHash: (req.params?.[0] as string) ?? FAKE_TX_HASH,
        transactionIndex: '0x0',
        blockHash: `0x${'b'.repeat(64)}`,
        blockNumber: blockHex,
        from: E2E_BUYER.toLowerCase(),
        to: MOCK_TOKEN,
        cumulativeGasUsed: '0x5208',
        gasUsed: '0x5208',
        contractAddress: null,
        logs: [],
        logsBloom: `0x${'0'.repeat(512)}`,
        status: '0x1',
        type: '0x0',
        effectiveGasPrice: '0x3b9aca00',
      });
    default:
      // Unknown method — return null result rather than erroring so wagmi /
      // viem polling doesn't blow up the test on incidental probes.
      return jsonRpcSuccess(req.id, null);
  }
}

async function installRpcMock(page: Page) {
  const state = { blockNumber: 0x1000000 };
  await page.route('**/arb1.arbitrum.io/**', async (route: Route) => {
    if (route.request().method() !== 'POST') return route.continue();
    let body: JsonRpcRequest | JsonRpcRequest[];
    try {
      body = route.request().postDataJSON() as JsonRpcRequest | JsonRpcRequest[];
    } catch {
      return route.fulfill({ status: 400, body: 'bad json' });
    }
    const responses = Array.isArray(body)
      ? body.map((r) => handleJsonRpc(r, state))
      : handleJsonRpc(body, state);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses),
    });
  });
}

async function installApiMocks(
  page: Page,
  observed: { intentBody?: unknown; confirmBody?: unknown },
) {
  await page.route('**/api/property/usage', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ used: 0, limit: 3 }),
    }),
  );

  await page.route('**/api/property/create-payment-intent', async (route) => {
    try {
      observed.intentBody = route.request().postDataJSON();
    } catch {
      observed.intentBody = null;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reportId: MOCK_REPORT_ID,
        payment: {
          chainId: ARB_CHAIN_ID,
          token: MOCK_TOKEN,
          recipient: MOCK_RECIPIENT,
          amountUsd: '4.99',
          amountTokenUnits: AMOUNT_TOKEN_UNITS,
          decimals: 6,
          symbol: 'AXUSD',
        },
      }),
    });
  });

  await page.route('**/api/property/confirm-payment', async (route) => {
    try {
      observed.confirmBody = route.request().postDataJSON();
    } catch {
      observed.confirmBody = null;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reportId: MOCK_REPORT_ID, status: 'ready' }),
    });
  });

  // The modal navigates the browser to /property/reports/<id> on success.
  // Stub the HTML response so the test doesn't depend on the real renderer.
  await page.route(`**/property/reports/${MOCK_REPORT_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html><body>
        <h1 data-testid="report-loaded">Property report ${MOCK_REPORT_ID}</h1>
      </body></html>`,
    }),
  );
}

test.describe('Property Analysis — AXUSD payment modal e2e', () => {
  // Cold Next.js dev compilation of /property + the dynamic-imported wagmi
  // bundle can easily blow past the default 30s test timeout on the first run.
  test.setTimeout(120_000);

  test('drives every modal phase and lands on the generated report page', async ({ page }) => {
    const observed: { intentBody?: unknown; confirmBody?: unknown } = {};
    await installRpcMock(page);
    await installApiMocks(page, observed);

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/property');

    await page
      .locator('input[placeholder*="Main Street"]')
      .fill('123 Test Avenue, Springfield, IL 62701');

    await page.getByRole('button', { name: 'Purchase Base Report' }).click();

    // Modal opens with the tier label. `exact: true` is required because the
    // page itself shows a "Base Report Sample" heading further down.
    await expect(
      page.getByRole('heading', { name: 'Base Report', exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    // Wagmi mock connector auto-reconnects, the modal POSTs to
    // create-payment-intent, and the Pay button becomes enabled.
    const payBtn = page.getByRole('button', { name: /^Pay 4\.99 AXUSD$/ });
    await expect(payBtn).toBeEnabled({ timeout: 15_000 });

    // The intent request must have carried the connected wallet + tier.
    // viem normalises addresses with EIP-55 mixed-case, so compare lower-cased.
    expect(observed.intentBody).toMatchObject({
      tier: 'base',
      address: '123 Test Avenue, Springfield, IL 62701',
    });
    expect((observed.intentBody as { wallet?: string }).wallet?.toLowerCase()).toBe(
      E2E_BUYER.toLowerCase(),
    );

    // Pay → mock connector signs → RPC mock returns success receipt →
    // modal POSTs confirm-payment → window.location to the report page.
    await payBtn.click();

    await page.waitForURL(`**/property/reports/${MOCK_REPORT_ID}`, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('report-loaded')).toBeVisible();

    // The confirm-payment call must include the report id and the on-chain
    // tx hash that came back from the mock connector.
    expect(observed.confirmBody).toMatchObject({
      reportId: MOCK_REPORT_ID,
      txHash: FAKE_TX_HASH,
    });

    expect(consoleErrors, 'no unhandled JS errors during the flow').toEqual([]);
  });

  test('deprecated Stripe endpoints are gone (HTTP 410)', async ({ request }) => {
    const checkout = await request.post('/api/property/create-checkout', {
      data: { tier: 'base', address: '1 Removed St' },
    });
    expect(checkout.status()).toBe(410);
    const checkoutBody = await checkout.json();
    expect(checkoutBody.code).toBe('STRIPE_REMOVED');

    const status = await request.get(
      '/api/property/checkout-status?session_id=cs_test_should_be_gone',
    );
    expect(status.status()).toBe(410);
    const statusBody = await status.json();
    expect(statusBody.code).toBe('STRIPE_REMOVED');

    const webhook = await request.post('/api/property/webhook', {
      headers: { 'stripe-signature': 'should-be-rejected' },
      data: 'irrelevant',
    });
    expect(webhook.status()).toBe(410);
    const webhookBody = await webhook.json();
    expect(webhookBody.code).toBe('STRIPE_REMOVED');
  });
});
