import React, { useState } from 'react';

interface CustodyWalletCardProps {
  walletId?: string;
  coin?: string;
  receiveAddress?: string;
  confirmedBalance?: string;
  spendableBalance?: string;
  onCreateWallet?: () => void;
  onSend?: (params: { toAddress: string; amount: string }) => void;
  loading?: boolean;
  creating?: boolean;
}

export function CustodyWalletCard({
  walletId,
  coin,
  receiveAddress,
  confirmedBalance,
  spendableBalance,
  onCreateWallet,
  onSend,
  loading,
  creating,
}: CustodyWalletCardProps) {
  const [showAddress, setShowAddress] = useState(false);
  const [sendMode, setSendMode] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');

  const inputCls = 'w-full border border-dl-border bg-white text-sm font-dl-mono text-dl-navy px-3 py-2 focus:outline-none focus:border-dl-navy';

  if (loading) {
    return (
      <div className="border border-dl-border p-6">
        <div className="h-4 bg-dl-border w-32 animate-pulse mb-4" />
        <div className="h-8 bg-dl-border w-48 animate-pulse" />
      </div>
    );
  }

  if (!walletId) {
    return (
      <div className="border border-dl-border p-6">
        <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Crypto Custody</p>
        <p className="text-sm font-dl-mono text-dl-muted mb-4">
          No custody wallet yet. Create a segregated BitGo custody wallet to hold AXM, AXUSD, and ETH.
        </p>
        {onCreateWallet && (
          <button
            onClick={onCreateWallet}
            disabled={creating}
            className="border border-dl-navy text-dl-navy text-sm font-dl-mono px-4 py-2 hover:bg-dl-navy hover:text-white transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Custody Wallet'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-dl-border p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1">
            Crypto Custody — {coin?.toUpperCase() ?? 'ARBITRUM'}
          </p>
          <p className="text-2xl font-dl-serif text-dl-navy">
            {confirmedBalance ?? '0'} <span className="text-sm font-dl-mono">units</span>
          </p>
          {spendableBalance && (
            <p className="text-xs font-dl-mono text-dl-muted mt-1">{spendableBalance} spendable</p>
          )}
        </div>
        <span className="text-xs font-dl-mono text-dl-muted border border-dl-border px-2 py-1">
          {coin?.includes('t') ? 'Testnet' : 'Mainnet'}
        </span>
      </div>

      <div className="border-t border-dl-border pt-4 space-y-3">
        <div>
          <button
            onClick={() => setShowAddress((v) => !v)}
            className="text-xs font-dl-mono text-dl-muted underline"
          >
            {showAddress ? 'Hide' : 'Show'} deposit address
          </button>
          {showAddress && receiveAddress && (
            <div className="mt-2 p-2 bg-gray-50 border border-dl-border">
              <p className="text-xs font-dl-mono text-dl-navy break-all">{receiveAddress}</p>
            </div>
          )}
        </div>

        {!sendMode ? (
          <div className="flex gap-2">
            {onSend && (
              <button
                onClick={() => setSendMode(true)}
                className="flex-1 border border-dl-navy text-dl-navy text-xs font-dl-mono py-2 hover:bg-dl-navy hover:text-white transition-colors"
              >
                Send
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-1">To Address</label>
              <input className={inputCls} placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-1">Amount</label>
              <input className={inputCls} type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSendMode(false)} className="flex-1 border border-dl-border text-dl-navy text-xs font-dl-mono py-2">Cancel</button>
              <button
                onClick={() => { onSend?.({ toAddress, amount }); setSendMode(false); }}
                className="flex-1 bg-dl-navy text-white text-xs font-dl-mono py-2 hover:opacity-90"
              >
                Confirm Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
