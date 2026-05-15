// =============================================================================
// ClaimStatus — displays the result of a claim transaction
// Design Law: serif headings, monospace data, dl-* color tokens.
// =============================================================================

export type ClaimTxStatus =
  | 'idle'
  | 'building'     // Building PTB
  | 'awaiting_sig' // Waiting for wallet signature
  | 'submitted'    // Tx submitted to RPC
  | 'confirming'   // Polling for confirmation
  | 'success'      // Confirmed on-chain
  | 'already_claimed'
  | 'rejected'     // User rejected in wallet
  | 'failed'       // On-chain failure
  | 'package_unpublished'; // Package not yet on-chain

interface Props {
  status: ClaimTxStatus;
  txDigest?: string;
  amount?: string;
  network?: 'mainnet' | 'testnet';
  error?: string;
  onRetry?: () => void;
}

const EXPLORER_BASE: Record<string, string> = {
  mainnet: 'https://suiscan.xyz/mainnet/tx',
  testnet: 'https://suiscan.xyz/testnet/tx',
};

export function ClaimStatus({ status, txDigest, amount, network = 'mainnet', error, onRetry }: Props) {
  if (status === 'idle') return null;

  const explorerUrl =
    txDigest ? `${EXPLORER_BASE[network]}/${txDigest}` : null;

  const amountFormatted = amount
    ? (Number(amount) / 1_000_000).toFixed(6)
    : null;

  if (status === 'success') {
    return (
      <div className="border border-green-700 p-5">
        <p className="font-mono text-xs text-green-400 uppercase tracking-widest mb-3">
          CLAIM CONFIRMED
        </p>
        <h3 className="font-serif text-lg text-dl-heading mb-3">
          Community reward distributed
        </h3>
        {amountFormatted && (
          <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <dt className="text-dl-muted font-mono text-xs uppercase">Amount</dt>
            <dd className="text-dl-fg font-mono text-xs">{amountFormatted} AMC</dd>
            <dt className="text-dl-muted font-mono text-xs uppercase">Token</dt>
            <dd className="text-dl-fg font-mono text-xs">AXIOM MAINNET CLAIM — Non-financial</dd>
          </dl>
        )}
        {txDigest && (
          <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <dt className="text-dl-muted font-mono text-xs uppercase">Tx Digest</dt>
            <dd className="font-mono text-xs text-dl-fg break-all">{txDigest}</dd>
          </dl>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs underline text-dl-fg"
          >
            View on Sui Explorer →
          </a>
        )}
      </div>
    );
  }

  if (status === 'already_claimed') {
    return (
      <div className="border border-yellow-700 p-5">
        <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
          ALREADY CLAIMED
        </p>
        <p className="text-sm text-dl-muted">
          This address has already claimed its allocation from this campaign.
          Each address may only claim once.
        </p>
      </div>
    );
  }

  if (status === 'package_unpublished') {
    return (
      <div className="border border-yellow-700 p-5">
        <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
          PACKAGE NOT YET PUBLISHED
        </p>
        <p className="text-sm text-dl-muted">
          The mainnet package has not been deployed yet. The deployer wallet
          requires SUI gas funding before the frozen publish can complete.
          Claim execution will be available once the package is live.
        </p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="border border-red-800 p-5">
        <p className="font-mono text-xs text-red-400 uppercase tracking-widest mb-2">
          TRANSACTION REJECTED
        </p>
        <p className="text-sm text-dl-muted mb-3">
          The transaction was rejected by your wallet.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 font-mono text-xs bg-dl-heading text-dl-bg hover:opacity-90"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="border border-red-800 p-5">
        <p className="font-mono text-xs text-red-400 uppercase tracking-widest mb-2">
          CLAIM FAILED
        </p>
        {error && <p className="text-sm text-dl-muted mb-3">{error}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 font-mono text-xs bg-dl-heading text-dl-bg hover:opacity-90"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // building | awaiting_sig | submitted | confirming
  const LABELS: Record<string, string> = {
    building: 'Building transaction...',
    awaiting_sig: 'Waiting for wallet signature...',
    submitted: 'Transaction submitted — waiting for confirmation...',
    confirming: 'Confirming on Sui Mainnet...',
  };

  return (
    <div className="border border-dl-border p-5">
      <p className="font-mono text-xs text-dl-muted animate-pulse">
        {LABELS[status] ?? 'Processing...'}
      </p>
      {txDigest && (
        <p className="font-mono text-xs text-dl-fg mt-2 break-all">{txDigest}</p>
      )}
    </div>
  );
}
