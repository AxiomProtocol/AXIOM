import type { SuiWalletState } from './useSuiWallet';

// =============================================================================
// SuiConnectButton — wallet connect / disconnect control
// Design Law: flat, no rounded corners, no gradients, monospace labels.
// =============================================================================

interface Props {
  wallet: SuiWalletState;
  onAddressOverride?: (addr: string) => void;
}

export function SuiConnectButton({ wallet, onAddressOverride }: Props) {
  const { status, address, walletInfo, connect, disconnect, error } = wallet;

  const shorten = (addr: string) =>
    `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  if (status === 'undetected') {
    return (
      <div className="border border-yellow-700 px-4 py-3">
        <p className="font-mono text-xs text-yellow-400 mb-1">NO SUI WALLET DETECTED</p>
        <p className="text-xs text-dl-muted">
          Install{' '}
          <a
            href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-dl-fg"
          >
            Sui Wallet
          </a>{' '}
          or{' '}
          <a
            href="https://martianwallet.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-dl-fg"
          >
            Martian
          </a>{' '}
          to claim.
        </p>
        {onAddressOverride && (
          <p className="text-xs text-dl-muted mt-2">
            Or enter your address manually below.
          </p>
        )}
      </div>
    );
  }

  if (status === 'connected' && address) {
    return (
      <div className="flex items-center gap-4 border border-green-700 px-4 py-3">
        <div>
          <p className="font-mono text-xs text-dl-muted uppercase mb-0.5">Connected</p>
          <p className="font-mono text-sm text-dl-fg">{shorten(address)}</p>
          {walletInfo && (
            <p className="font-mono text-xs text-dl-muted">{walletInfo.name}</p>
          )}
        </div>
        <button
          onClick={disconnect}
          className="ml-auto px-4 py-1.5 font-mono text-xs border border-dl-border text-dl-muted hover:text-dl-fg hover:border-dl-fg"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="border border-dl-border px-4 py-3">
        <p className="font-mono text-xs text-dl-muted animate-pulse">
          Connecting to {walletInfo?.name ?? 'Sui wallet'}...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="border border-red-800 px-4 py-3">
        <p className="font-mono text-xs text-red-400 mb-2">Connection failed</p>
        {error && <p className="text-xs text-dl-muted mb-3">{error}</p>}
        <button
          onClick={connect}
          className="px-4 py-1.5 font-mono text-xs bg-dl-heading text-dl-bg hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  // detected / disconnected
  return (
    <button
      onClick={connect}
      className="w-full px-4 py-3 font-mono text-sm bg-dl-heading text-dl-bg hover:opacity-90 text-left"
    >
      Connect {walletInfo?.name ?? 'Sui Wallet'}
    </button>
  );
}
