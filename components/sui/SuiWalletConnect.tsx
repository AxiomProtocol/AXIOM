import React, { useState, useEffect, useCallback, useRef } from 'react';

interface WalletAccount {
  address: string;
  chains: string[];
  features: string[];
  icon?: string;
  label?: string;
  publicKey: Uint8Array;
}

interface WalletLike {
  name: string;
  icon?: string;
  version: string;
  chains: readonly string[];
  accounts: readonly WalletAccount[];
  features: Record<string, unknown>;
}

export interface SuiClaimParams {
  packageId: string;
  campaignId: string;
  proof: string[];
}

interface Props {
  onAddressFilled: (address: string) => void;
  claimParams: SuiClaimParams | null;
  onClaimSuccess: (digest: string) => void;
  onClaimError: (err: string) => void;
  disabled?: boolean;
}

const SUI_SIGN_AND_EXECUTE = 'sui:signAndExecuteTransaction';
const SUI_SIGN_AND_EXECUTE_BLOCK = 'sui:signAndExecuteTransactionBlock';
const STANDARD_CONNECT = 'standard:connect';
const SUISCAN_BASE = 'https://suiscan.xyz/mainnet/tx';

function isSuiWallet(wallet: WalletLike): boolean {
  return (
    wallet.chains.some(c => c.startsWith('sui:')) &&
    STANDARD_CONNECT in wallet.features &&
    (SUI_SIGN_AND_EXECUTE in wallet.features ||
      SUI_SIGN_AND_EXECUTE_BLOCK in wallet.features)
  );
}

export default function SuiWalletConnect({
  onAddressFilled,
  claimParams,
  onClaimSuccess,
  onClaimError,
  disabled = false,
}: Props) {
  const [wallets, setWallets] = useState<WalletLike[]>([]);
  const [connected, setConnected] = useState<WalletLike | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;

    async function discover() {
      try {
        const { getWallets } = await import('@wallet-standard/core');
        const registry = getWallets();
        const allWallets = registry.get() as WalletLike[];
        if (active) {
          setWallets(allWallets.filter(isSuiWallet));
        }

        const unsub = registry.on('register', (...newWallets: unknown[]) => {
          if (active) {
            setWallets(prev => {
              const incoming = (newWallets as WalletLike[]).filter(isSuiWallet);
              if (!incoming.length) return prev;
              const names = new Set(prev.map(w => w.name));
              return [...prev, ...incoming.filter(w => !names.has(w.name))];
            });
          }
        });
        unsubRef.current = unsub;
      } catch {
      }
    }

    discover();
    return () => {
      active = false;
      unsubRef.current?.();
    };
  }, []);

  const connect = useCallback(async (wallet: WalletLike) => {
    setConnecting(true);
    setShowPicker(false);
    try {
      const feature = wallet.features[STANDARD_CONNECT] as {
        connect: (input?: { silent?: boolean }) => Promise<{ accounts: WalletAccount[] }>;
      };
      const result = await feature.connect();
      const acc = result.accounts[0];
      if (!acc) throw new Error('No accounts returned from wallet');
      setConnected(wallet);
      setAccount(acc);
      onAddressFilled(acc.address);
    } catch (e) {
      onClaimError(e instanceof Error ? e.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, [onAddressFilled, onClaimError]);

  const disconnect = useCallback(() => {
    setConnected(null);
    setAccount(null);
  }, []);

  const submitClaim = useCallback(async () => {
    if (!connected || !account || !claimParams) return;
    setClaiming(true);

    try {
      const [{ Transaction }, { bcs }] = await Promise.all([
        import('@mysten/sui/transactions'),
        import('@mysten/sui/bcs'),
      ]);

      const proofBytes = claimParams.proof.map(h =>
        Uint8Array.from(
          (h.match(/.{1,2}/g) ?? []).map(b => parseInt(b, 16))
        )
      );

      const tx = new Transaction();
      tx.setSender(account.address);
      tx.setGasBudget(10_000_000);
      tx.moveCall({
        target: `${claimParams.packageId}::claim_campaign::claim`,
        arguments: [
          tx.object(claimParams.campaignId),
          tx.pure(
            bcs.vector(bcs.vector(bcs.u8())).serialize(proofBytes).toBytes()
          ),
        ],
      });

      const chain = (account.chains.find(c => c.startsWith('sui:')) ??
        'sui:mainnet') as `sui:${string}`;

      if (SUI_SIGN_AND_EXECUTE in connected.features) {
        const feature = connected.features[SUI_SIGN_AND_EXECUTE] as {
          signAndExecuteTransaction: (input: {
            transaction: { toJSON: () => Promise<string> };
            account: WalletAccount;
            chain: string;
          }) => Promise<{ digest: string }>;
        };
        const result = await feature.signAndExecuteTransaction({
          transaction: tx,
          account,
          chain,
        });
        onClaimSuccess(result.digest);
      } else if (SUI_SIGN_AND_EXECUTE_BLOCK in connected.features) {
        const { toBase64 } = await import('@mysten/sui/utils');
        const feature = connected.features[SUI_SIGN_AND_EXECUTE_BLOCK] as {
          signAndExecuteTransactionBlock: (input: {
            transactionBlock: { serialize: () => string };
            account: WalletAccount;
            chain: string;
            options?: Record<string, boolean>;
          }) => Promise<{ digest: string }>;
        };
        const bytes = await tx.build();
        const serialized = toBase64(bytes);
        const result = await feature.signAndExecuteTransactionBlock({
          transactionBlock: { serialize: () => serialized },
          account,
          chain,
          options: { showEffects: true },
        });
        onClaimSuccess(result.digest);
      } else {
        throw new Error('Wallet does not support Sui transaction signing');
      }
    } catch (e) {
      onClaimError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setClaiming(false);
    }
  }, [connected, account, claimParams, onClaimSuccess, onClaimError]);

  if (account && connected) {
    return (
      <div className="space-y-3">
        <div className="border border-dl-border p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-dl-muted uppercase tracking-widest mb-1">
              {connected.name} — Connected
            </p>
            <p className="text-xs font-mono text-dl-primary break-all">
              {account.address}
            </p>
          </div>
          <button
            onClick={disconnect}
            className="ml-4 px-3 py-1 text-xs font-mono uppercase tracking-widest border border-dl-border text-dl-muted"
          >
            Disconnect
          </button>
        </div>

        {claimParams && (
          <button
            onClick={submitClaim}
            disabled={claiming || disabled}
            className="w-full py-3 text-sm font-mono uppercase tracking-widest bg-dl-primary text-white disabled:opacity-40"
          >
            {claiming ? 'Submitting…' : 'Submit Claim via Wallet →'}
          </button>
        )}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="border border-dl-border p-3 text-xs font-mono text-dl-muted">
        No Sui wallet extension detected. Install{' '}
        <a
          href="https://suiwallet.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dl-primary underline"
        >
          Sui Wallet
        </a>
        ,{' '}
        <a
          href="https://suiet.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dl-primary underline"
        >
          Suiet
        </a>
        , or another Sui wallet extension, then refresh.
      </div>
    );
  }

  if (wallets.length === 1) {
    return (
      <button
        onClick={() => connect(wallets[0])}
        disabled={connecting}
        className="w-full py-2 text-xs font-mono uppercase tracking-widest border border-dl-primary text-dl-primary disabled:opacity-40 enabled:bg-dl-primary enabled:text-white"
      >
        {connecting ? 'Connecting…' : `Connect ${wallets[0].name} →`}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(v => !v)}
        disabled={connecting}
        className="w-full py-2 text-xs font-mono uppercase tracking-widest border border-dl-primary text-dl-primary disabled:opacity-40 enabled:bg-dl-primary enabled:text-white"
      >
        {connecting ? 'Connecting…' : 'Connect Sui Wallet →'}
      </button>
      {showPicker && (
        <div className="absolute top-full left-0 right-0 z-50 border border-dl-border bg-dl-surface mt-1">
          {wallets.map(w => (
            <button
              key={w.name}
              onClick={() => connect(w)}
              className="w-full px-4 py-2 text-left text-xs font-mono text-dl-primary border-b border-dl-border last:border-b-0"
            >
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SUISCAN_BASE };
