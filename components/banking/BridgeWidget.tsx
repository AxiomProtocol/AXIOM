import React, { useState } from 'react';

interface BridgeQuote {
  direction: string;
  fiatAmountCents: number;
  cryptoAsset: string;
  cryptoAmountStr: string;
  exchangeRateStr: string;
  feeCents: number;
  feePercent: number;
  netFiatCents: number;
  estimatedSettlementMinutes: number;
  snapshotId?: string;
}

interface BridgeWidgetProps {
  unitAccountId?: string;
  bitgoWalletId?: string;
  onGetQuote: (params: {
    direction: 'fiat_to_crypto' | 'crypto_to_fiat';
    fiatAmountCents: number;
    cryptoAsset: string;
  }) => Promise<BridgeQuote | null>;
  onTransfer: (params: {
    direction: 'fiat_to_crypto' | 'crypto_to_fiat';
    fiatAmountCents: number;
    cryptoAsset: string;
    quoteSnapshotId?: string;
  }) => Promise<{ transferId: string } | null>;
}

const ASSETS = ['AXUSD', 'AXM', 'ETH', 'USDC'] as const;
type CryptoAsset = typeof ASSETS[number];

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `~${d} business day${d > 1 ? 's' : ''}`;
  return `~${h} hours`;
}

export function BridgeWidget({ unitAccountId, bitgoWalletId, onGetQuote, onTransfer }: BridgeWidgetProps) {
  const [direction, setDirection] = useState<'fiat_to_crypto' | 'crypto_to_fiat'>('fiat_to_crypto');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<CryptoAsset>('AXUSD');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputCls = 'w-full border border-dl-border bg-white text-sm font-dl-mono text-dl-navy px-3 py-2 focus:outline-none focus:border-dl-navy';
  const selectCls = 'border border-dl-border bg-white text-sm font-dl-mono text-dl-navy px-3 py-2 focus:outline-none';

  const handleQuote = async () => {
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) { setError('Enter a valid dollar amount.'); return; }
    setQuoteLoading(true);
    try {
      const q = await onGetQuote({ direction, fiatAmountCents: cents, cryptoAsset: asset });
      setQuote(q);
      if (!q) setError('Unable to get a quote right now. Try again.');
    } catch {
      setError('Quote request failed.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!quote) return;
    setTransferring(true);
    setError(null);
    try {
      const result = await onTransfer({
        direction,
        fiatAmountCents: quote.fiatAmountCents,
        cryptoAsset: quote.cryptoAsset,
        quoteSnapshotId: quote.snapshotId,
      });
      if (result) {
        setSuccess(`Transfer initiated. ID: ${result.transferId.slice(0, 8)}...`);
        setQuote(null);
        setAmount('');
      } else {
        setError('Transfer failed. Please try again.');
      }
    } catch {
      setError('Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const disabled = !unitAccountId || !bitgoWalletId;

  return (
    <div className="border border-dl-border p-6 space-y-4">
      <div>
        <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-3">Fiat ↔ Crypto Bridge</p>
        {disabled && (
          <p className="text-xs font-dl-mono text-dl-muted mb-3 p-2 border border-dl-border">
            Requires an Axiom bank account and custody wallet to use the bridge.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setDirection('fiat_to_crypto'); setQuote(null); }}
          className={`flex-1 text-xs font-dl-mono py-2 border transition-colors ${direction === 'fiat_to_crypto' ? 'bg-dl-navy text-white border-dl-navy' : 'border-dl-border text-dl-navy'}`}
        >
          USD → Crypto
        </button>
        <button
          onClick={() => { setDirection('crypto_to_fiat'); setQuote(null); }}
          className={`flex-1 text-xs font-dl-mono py-2 border transition-colors ${direction === 'crypto_to_fiat' ? 'bg-dl-navy text-white border-dl-navy' : 'border-dl-border text-dl-navy'}`}
        >
          Crypto → USD
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-1">
            {direction === 'fiat_to_crypto' ? 'USD Amount' : 'Equivalent USD'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-1">Asset</label>
          <select
            className={`${selectCls} w-full`}
            value={asset}
            onChange={(e) => { setAsset(e.target.value as CryptoAsset); setQuote(null); }}
            disabled={disabled}
          >
            {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm font-dl-mono text-red-600">{error}</p>}
      {success && <p className="text-sm font-dl-mono text-dl-forest">{success}</p>}

      {quote && (
        <div className="border border-dl-border p-4 space-y-2">
          <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-2">Quote</p>
          <div className="flex justify-between">
            <span className="text-xs font-dl-mono text-dl-muted">You receive</span>
            <span className="text-sm font-dl-mono text-dl-navy">{quote.cryptoAmountStr} {quote.cryptoAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-dl-mono text-dl-muted">Exchange rate</span>
            <span className="text-xs font-dl-mono text-dl-navy">${parseFloat(quote.exchangeRateStr).toLocaleString()} / {quote.cryptoAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-dl-mono text-dl-muted">Fee ({quote.feePercent}%)</span>
            <span className="text-xs font-dl-mono text-dl-navy">${(quote.feeCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-dl-border pt-2">
            <span className="text-xs font-dl-mono text-dl-muted">Settlement</span>
            <span className="text-xs font-dl-mono text-dl-navy">{formatMinutes(quote.estimatedSettlementMinutes)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleQuote}
          disabled={disabled || quoteLoading || !amount}
          className="flex-1 border border-dl-navy text-dl-navy text-sm font-dl-mono py-2 hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-40"
        >
          {quoteLoading ? 'Loading...' : 'Get Quote'}
        </button>
        {quote && (
          <button
            onClick={handleTransfer}
            disabled={transferring}
            className="flex-1 bg-dl-navy text-white text-sm font-dl-mono py-2 hover:opacity-90 disabled:opacity-50"
          >
            {transferring ? 'Processing...' : 'Confirm Transfer'}
          </button>
        )}
      </div>
    </div>
  );
}
