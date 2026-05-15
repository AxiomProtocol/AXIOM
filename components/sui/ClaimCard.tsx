import type { SuiWalletState } from './useSuiWallet';
import type { ClaimTxStatus } from './ClaimStatus';
import { ClaimStatus } from './ClaimStatus';

// =============================================================================
// ClaimCard — core claim interaction UI
// Shows eligibility result and handles the claim execution flow.
// Design Law styling throughout.
// =============================================================================

export type PageClaimState =
  | 'idle'
  | 'checking'
  | 'eligible'
  | 'not_eligible'
  | 'already_claimed'
  | 'campaign_inactive'
  | 'campaign_closed'
  | 'proof_unavailable'
  | 'wallet_mismatch'
  | 'error';

interface ProofData {
  proof: string[];
  amountPerClaim: string;
  campaignObjectId: string;
  packageId: string;
  merkleRoot: string;
}

interface Props {
  claimState: PageClaimState;
  proofData: ProofData | null;
  txStatus: ClaimTxStatus;
  txDigest?: string;
  txError?: string;
  wallet: SuiWalletState;
  manualAddress: string;
  network?: 'mainnet' | 'testnet';
  onClaim: () => Promise<void>;
  onRetry: () => void;
}

const STATE_MESSAGES: Record<
  PageClaimState,
  { title: string; body: string; tone: 'neutral' | 'ok' | 'warn' | 'block' }
> = {
  idle:             { title: '', body: '', tone: 'neutral' },
  checking:         { title: 'Checking eligibility...', body: 'Querying campaign state and eligibility tree.', tone: 'neutral' },
  eligible:         { title: 'Address is eligible', body: 'This address has an unclaimed allocation ready to claim.', tone: 'ok' },
  not_eligible:     { title: 'Address not eligible', body: 'This address is not in the current campaign eligibility tree.', tone: 'warn' },
  already_claimed:  { title: 'Already claimed', body: 'This address has already claimed its allocation from this campaign.', tone: 'warn' },
  campaign_inactive:{ title: 'Campaign paused', body: 'This campaign is currently paused by the operator. Check back later.', tone: 'block' },
  campaign_closed:  { title: 'Campaign closed', body: 'This campaign has been permanently closed. No further claims are possible.', tone: 'block' },
  proof_unavailable:{ title: 'Proof data unavailable', body: 'Eligibility proof data has not been loaded yet. Contact the operator.', tone: 'block' },
  wallet_mismatch:  { title: 'Wallet mismatch', body: 'The connected wallet address does not match the checked address. Please connect the correct wallet.', tone: 'block' },
  error:            { title: 'Check failed', body: 'Unable to verify eligibility. Please try again.', tone: 'warn' },
};

const TONE_BORDER: Record<'neutral' | 'ok' | 'warn' | 'block', string> = {
  neutral: 'border-dl-border',
  ok:      'border-green-700',
  warn:    'border-yellow-700',
  block:   'border-red-800',
};

export function ClaimCard({
  claimState,
  proofData,
  txStatus,
  txDigest,
  txError,
  wallet,
  manualAddress,
  network = 'mainnet',
  onClaim,
  onRetry,
}: Props) {
  if (claimState === 'idle') return null;

  const info = STATE_MESSAGES[claimState];
  const amountFormatted = proofData
    ? (Number(proofData.amountPerClaim) / 1_000_000).toFixed(6)
    : null;

  const packagePublished = Boolean(proofData?.packageId);
  const walletReady = wallet.isConnected && wallet.address;
  const addressMatch =
    !walletReady ||
    !manualAddress ||
    wallet.address?.toLowerCase() === manualAddress.toLowerCase();

  const canClaim =
    claimState === 'eligible' &&
    walletReady &&
    addressMatch &&
    txStatus === 'idle' &&
    packagePublished;

  return (
    <div className="space-y-4">
      {/* State result */}
      {claimState !== 'checking' && (
        <section className={`border p-5 ${TONE_BORDER[info.tone]}`}>
          <h2 className="font-serif text-lg text-dl-heading mb-2">{info.title}</h2>
          <p className="text-sm text-dl-muted">{info.body}</p>

          {claimState === 'eligible' && amountFormatted && (
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-dl-muted font-mono text-xs uppercase">Allocation</dt>
              <dd className="text-dl-fg font-mono text-xs">{amountFormatted} AMC</dd>
              <dt className="text-dl-muted font-mono text-xs uppercase">Proof depth</dt>
              <dd className="text-dl-fg font-mono text-xs">
                {proofData?.proof.length ?? 0} element{proofData?.proof.length !== 1 ? 's' : ''}
              </dd>
              <dt className="text-dl-muted font-mono text-xs uppercase">Token type</dt>
              <dd className="text-dl-fg font-mono text-xs">Non-financial — community reward</dd>
            </dl>
          )}
        </section>
      )}

      {/* Claim execution section — only when eligible */}
      {claimState === 'eligible' && txStatus === 'idle' && (
        <section className="border border-dl-border p-5">
          <h2 className="font-serif text-base text-dl-heading mb-3">Execute Claim</h2>

          {/* Wallet mismatch warning */}
          {walletReady && !addressMatch && (
            <div className="border border-red-800 px-4 py-3 mb-4">
              <p className="font-mono text-xs text-red-400 mb-1">WALLET MISMATCH</p>
              <p className="text-xs text-dl-muted">
                Connected wallet <span className="text-dl-fg font-mono">{wallet.address?.slice(0, 10)}...</span>{' '}
                does not match the checked address. Please connect the correct wallet.
              </p>
            </div>
          )}

          {/* No wallet */}
          {!walletReady && (
            <p className="font-mono text-xs text-dl-muted mb-4">
              Connect your Sui wallet above to execute the claim on-chain.
            </p>
          )}

          {/* Package not published */}
          {!packagePublished && (
            <div className="border border-yellow-700 px-4 py-3 mb-4">
              <p className="font-mono text-xs text-yellow-400 mb-1">PACKAGE NOT YET PUBLISHED</p>
              <p className="text-xs text-dl-muted">
                The mainnet package is pending deployment. Claim button will activate
                once the frozen package is published on Sui Mainnet.
              </p>
            </div>
          )}

          <button
            onClick={onClaim}
            disabled={!canClaim}
            className="px-6 py-2 font-mono text-sm bg-dl-heading text-dl-bg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {!walletReady
              ? 'Connect Wallet to Claim'
              : !packagePublished
              ? 'Package Not Published'
              : 'Submit Claim'}
          </button>

          <p className="font-mono text-xs text-dl-muted mt-3">
            Transaction will be signed by your wallet. No private keys are
            held by this application.
          </p>
        </section>
      )}

      {/* Tx status */}
      {txStatus !== 'idle' && (
        <ClaimStatus
          status={txStatus}
          txDigest={txDigest}
          amount={proofData?.amountPerClaim}
          network={network}
          error={txError}
          onRetry={onRetry}
        />
      )}
    </div>
  );
}
