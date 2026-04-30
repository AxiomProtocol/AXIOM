'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { CORE_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_CHAIN_ID = 42161;
const TREASURY_ADDRESS = CORE_CONTRACTS.TREASURY_REVENUE;
const ARBISCAN_BASE = 'https://arbiscan.io/address/';

const PRESET_AMOUNTS = [25, 100, 500, 1000];

interface OnrampConfig {
  configured: boolean;
}

interface IntentResponse {
  intentId: string;
  widgetUrl: string | null;
  status: string;
}

interface IntentError {
  error: string;
}

export default function FundTreasuryCardPage() {
  const [amount, setAmount] = useState<string>('100');
  const [config, setConfig] = useState<OnrampConfig | null>(null);
  const [launching, setLaunching] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastIntentId, setLastIntentId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/onramp/config')
      .then(r => r.json() as Promise<OnrampConfig>)
      .then(setConfig)
      .catch(() => setConfig({ configured: false }));
  }, []);

  const parsedAmount = parseFloat(amount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 25000;
  const ready = config?.configured && validAmount && !launching;

  async function handleContinue() {
    if (!validAmount) return;
    setLaunching(true);
    setError(null);
    setPopupClosed(false);

    try {
      const res = await fetch('/api/onramp/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: TREASURY_ADDRESS,
          asset: 'USDC',
          fiatAmount: parsedAmount,
          fiatCurrency: 'USD',
          chainId: ARBITRUM_CHAIN_ID,
          flow: 'buy',
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as IntentError;
        throw new Error(errData.error ?? 'Failed to create onramp session');
      }

      const data = (await res.json()) as IntentResponse;
      if (!data.widgetUrl) throw new Error('Coinbase Onramp is not configured.');

      setLastIntentId(data.intentId);

      const popup = window.open(
        data.widgetUrl,
        'coinbase-treasury-onramp',
        'width=600,height=750,popup=yes,noopener=no',
      );

      setLaunching(false);

      if (!popup) {
        setError('Popup blocked. Allow popups for this site and try again.');
        return;
      }

      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setPopupClosed(true);
        }
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLaunching(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Fund the On-Chain Treasury (Card) — Axiom</title>
        <meta
          name="description"
          content="Fund the Axiom Protocol on-chain Treasury wallet (USDC on Arbitrum One) with a credit or debit card via Coinbase Onramp."
        />
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-serif mb-2">Fund the On-Chain Treasury</h1>
        <p className="text-sm text-dl-muted font-mono mb-6">
          Card &rarr; USDC on Arbitrum One &rarr; Axiom Treasury wallet. Payment
          and identity checks are handled by Coinbase under its own compliance
          standards. No bank verification (Plaid) required.
        </p>

        {/* Status banner */}
        {config !== null && !config.configured && (
          <div className="border border-dl-line p-4 mb-6 bg-dl-surface">
            <p className="text-xs font-mono text-dl-muted uppercase tracking-wide mb-1">
              Service Status
            </p>
            <p className="text-sm font-mono">
              Coinbase Onramp is not currently configured for this environment.
              Card funding is unavailable until the operator completes the
              Coinbase setup. Use the wire / ACH path in the meantime.
            </p>
          </div>
        )}

        {/* Destination disclosure */}
        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-3">Where the Money Lands</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-dl-line pb-2 gap-1">
              <span className="text-xs uppercase tracking-wide text-dl-muted">
                Destination
              </span>
              <span>On-chain Treasury wallet</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-dl-line pb-2 gap-1">
              <span className="text-xs uppercase tracking-wide text-dl-muted">
                Address
              </span>
              <a
                href={`${ARBISCAN_BASE}${TREASURY_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline md:text-right"
              >
                {TREASURY_ADDRESS}
              </a>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-dl-line pb-2 gap-1">
              <span className="text-xs uppercase tracking-wide text-dl-muted">
                Network
              </span>
              <span>Arbitrum One (chainId 42161)</span>
            </div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-2 gap-1">
              <span className="text-xs uppercase tracking-wide text-dl-muted">
                Asset Delivered
              </span>
              <span>USDC (6 decimals)</span>
            </div>
          </div>
          <p className="text-xs text-dl-muted font-mono mt-4">
            This flow funds the on-chain Treasury wallet directly. ACH/wire treasury funding is currently offline.
          </p>
        </div>

        {/* Amount selector */}
        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-3">Choose Amount</h2>
          <p className="text-xs text-dl-muted font-mono mb-3">
            Card purchases are typically capped between $1 and $25,000 per
            transaction depending on the buyer&apos;s Coinbase verification
            tier. Larger contributions should use the wire path.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_AMOUNTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`px-4 py-2 font-mono text-sm border ${
                  parsedAmount === p
                    ? 'border-dl-ink bg-dl-ink text-dl-surface'
                    : 'border-dl-line hover:border-dl-ink'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-dl-muted mb-1">
            Amount (USD)
          </label>
          <div className="flex items-stretch border border-dl-line">
            <span className="px-3 py-2 font-mono text-sm bg-dl-surface border-r border-dl-line">
              $
            </span>
            <input
              type="number"
              min="1"
              max="25000"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 px-3 py-2 font-mono text-sm bg-transparent outline-none"
              placeholder="100"
            />
          </div>
          {!validAmount && amount.length > 0 && (
            <p className="text-xs font-mono text-red-700 mt-2">
              Enter an amount between $1 and $25,000.
            </p>
          )}
        </div>

        {/* Fees disclosure */}
        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-2">Fees</h2>
          <ul className="text-sm font-mono space-y-1 list-disc pl-5">
            <li>
              Coinbase charges a card processing fee on top of your selected
              amount. Typical fees are 3.5%&ndash;4% for card payments and lower
              for ACH or Apple Pay. Fees are paid by the buyer, not the
              Treasury.
            </li>
            <li>
              Arbitrum One network fees on the USDC delivery are paid by
              Coinbase as part of the onramp flow.
            </li>
            <li>
              Axiom does not take a fee on Treasury funding. The full USDC
              amount lands at the Treasury address.
            </li>
          </ul>
        </div>

        {/* Action button */}
        <div className="border border-dl-line p-6 mb-6">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!ready}
            className={`w-full px-6 py-4 font-mono text-sm uppercase tracking-wide ${
              ready
                ? 'bg-dl-ink text-dl-surface hover:opacity-90 cursor-pointer'
                : 'bg-dl-surface text-dl-muted cursor-not-allowed border border-dl-line'
            }`}
          >
            {launching
              ? 'Opening Coinbase…'
              : config === null
              ? 'Checking service status…'
              : !config.configured
              ? 'Coinbase Onramp not configured'
              : !validAmount
              ? 'Enter a valid amount'
              : `Continue to Coinbase — Fund $${parsedAmount.toFixed(2)}`}
          </button>

          {error && (
            <p className="text-xs font-mono text-red-700 mt-3">{error}</p>
          )}

          {popupClosed && lastIntentId && (
            <div className="mt-4 border border-dl-line p-4 bg-dl-surface">
              <p className="text-xs font-mono uppercase tracking-wide text-dl-muted mb-1">
                Popup Closed
              </p>
              <p className="text-sm font-mono">
                If you completed payment, USDC will arrive at the Treasury
                wallet within a few minutes. You can verify the inbound transfer
                on{' '}
                <a
                  href={`${ARBISCAN_BASE}${TREASURY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Arbiscan
                </a>
                .
              </p>
              <p className="text-xs font-mono text-dl-muted mt-2">
                Reference id: <span className="break-all">{lastIntentId}</span>
              </p>
            </div>
          )}
        </div>

        {/* Cross-links */}
        <div className="text-xs text-dl-muted font-mono space-y-2">
          <p>
            <strong>Settlement:</strong> Coinbase typically delivers USDC to
            Arbitrum One within minutes of card authorization, subject to
            Coinbase fraud and KYC checks on the buyer.
          </p>
          <p>
            <strong>Verification:</strong> Inbound Treasury credits are
            reflected in the daily solvency snapshot at{' '}
            <Link href="/disclosure" className="underline">
              /disclosure
            </Link>
            .
          </p>
          <p>
            <strong>Other paths:</strong>{' '}
            <Link href="/treasury/fund" className="underline">
              Wire / ACH to the bank account
            </Link>
            {' • '}
            <Link href="/onramp" className="underline">
              Buy AXUSD or AXAU for your own wallet
            </Link>
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
