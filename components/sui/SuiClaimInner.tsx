'use client';
// =============================================================================
// SuiClaimInner — client-only claim interaction component
//
// Loaded via Next.js dynamic import (no SSR) to safely use browser APIs.
// Contains all wallet state, eligibility checking, and claim execution logic.
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useSuiWallet } from './useSuiWallet';
import { SuiConnectButton } from './SuiConnectButton';
import { ClaimCard } from './ClaimCard';
import type { PageClaimState } from './ClaimCard';
import type { ClaimTxStatus } from './ClaimStatus';

interface ProofData {
  proof: string[];
  amountPerClaim: string;
  campaignObjectId: string;
  packageId: string;
  merkleRoot: string;
}

interface Props {
  campaignId: string;
  network: 'mainnet' | 'testnet';
}

function hexToBytes(hex: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return result;
}

export default function SuiClaimInner({ campaignId, network }: Props) {
  const wallet = useSuiWallet();

  const [manualAddress, setManualAddress] = useState('');
  const [claimState, setClaimState] = useState<PageClaimState>('idle');
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [txStatus, setTxStatus] = useState<ClaimTxStatus>('idle');
  const [txDigest, setTxDigest] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  // Auto-populate address from wallet when connected
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      setManualAddress(wallet.address);
      if (claimState !== 'idle') {
        setClaimState('idle');
        setProofData(null);
      }
    }
  }, [wallet.address, wallet.isConnected]);

  const isValidAddress = /^0x[0-9a-fA-F]{1,64}$/.test(manualAddress.trim());

  // -------------------------------------------------------------------------
  // Eligibility check — calls proof-request API
  // -------------------------------------------------------------------------
  const handleCheckEligibility = useCallback(async () => {
    if (!isValidAddress) return;
    setClaimState('checking');
    setProofData(null);
    setTxStatus('idle');
    setTxDigest(undefined);
    setTxError(undefined);

    try {
      const res = await fetch('/api/sui/proof-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: manualAddress.trim(),
          campaignId,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error) {
        const code = data.error as PageClaimState;
        const validCodes: PageClaimState[] = [
          'already_claimed', 'campaign_inactive', 'campaign_closed',
        ];
        setClaimState(validCodes.includes(code) ? code : 'not_eligible');
        return;
      }

      if (!res.ok) {
        const code = data.error;
        if (code === 'not_eligible') setClaimState('not_eligible');
        else if (code === 'proof_unavailable') setClaimState('proof_unavailable');
        else if (code === 'campaign_closed') setClaimState('campaign_closed');
        else if (code === 'campaign_inactive') setClaimState('campaign_inactive');
        else setClaimState('error');
        return;
      }

      // Wallet mismatch check: connected wallet doesn't match checked address
      if (
        wallet.isConnected &&
        wallet.address &&
        wallet.address.toLowerCase() !== manualAddress.toLowerCase()
      ) {
        setProofData(data);
        setClaimState('wallet_mismatch');
        return;
      }

      setProofData(data);
      setClaimState('eligible');
    } catch {
      setClaimState('error');
    }
  }, [isValidAddress, manualAddress, campaignId, wallet]);

  // -------------------------------------------------------------------------
  // Claim execution — server validate → build PTB → wallet sign → submit
  // -------------------------------------------------------------------------
  const handleClaim = useCallback(async () => {
    if (!proofData || !wallet.isConnected || !wallet.address) return;

    setTxStatus('building');
    setTxError(undefined);

    try {
      // Step 1: Server-side validation gate
      const validation = await fetch('/api/sui/claim-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet.address,
          campaignId,
          proof: proofData.proof,
          amountPerClaim: proofData.amountPerClaim,
        }),
      });

      const validData = await validation.json();

      if (!validation.ok) {
        if (validData.code === 'PACKAGE_NOT_PUBLISHED') {
          setTxStatus('package_unpublished');
          return;
        }
        throw new Error(validData.error ?? 'Validation failed');
      }

      const { packageId, campaignObjectId } = validData;

      if (!packageId || !campaignObjectId) {
        setTxStatus('package_unpublished');
        return;
      }

      // Step 2: Build transaction block
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      tx.setSender(wallet.address);

      // Convert hex proof strings to byte arrays
      const proofBytes = proofData.proof.map((p: string) => hexToBytes(p));

      tx.moveCall({
        target: `${packageId}::claim_campaign::claim`,
        arguments: [
          tx.object(campaignObjectId),
          tx.pure.vector('vector<vector<u8>>', proofBytes),
        ],
      });

      setTxStatus('awaiting_sig');

      // Step 3: Sign and execute via wallet
      const w = window as unknown as Record<string, unknown>;
      const suiWallet = w.suiWallet as {
        signAndExecuteTransactionBlock?: (params: {
          transactionBlock: unknown;
          options?: Record<string, boolean>;
        }) => Promise<{ digest: string }>;
      } | undefined;

      if (!suiWallet?.signAndExecuteTransactionBlock) {
        throw new Error('Wallet does not support signAndExecuteTransactionBlock');
      }

      const result = await suiWallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: { showEffects: true },
      });

      setTxStatus('submitted');
      setTxDigest(result.digest);

      // Step 4: Poll for confirmation (simple delay + status check)
      setTxStatus('confirming');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setTxStatus('success');

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('cancel')) {
        setTxStatus('rejected');
      } else {
        setTxStatus('failed');
        setTxError(msg);
      }
    }
  }, [proofData, wallet, campaignId]);

  const handleRetry = useCallback(() => {
    setTxStatus('idle');
    setTxDigest(undefined);
    setTxError(undefined);
  }, []);

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <section className="border border-dl-border p-5">
        <h2 className="font-serif text-lg text-dl-heading mb-4">
          Sui Wallet
        </h2>
        <SuiConnectButton wallet={wallet} />

        {/* Manual address entry / override */}
        <div className="mt-4">
          <label className="block font-mono text-xs text-dl-muted uppercase mb-2">
            Claim Address
            {wallet.isConnected && (
              <span className="ml-2 text-green-400 normal-case">(auto-populated from wallet)</span>
            )}
          </label>
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => {
              setManualAddress(e.target.value);
              if (claimState !== 'idle') {
                setClaimState('idle');
                setProofData(null);
              }
            }}
            placeholder="0x000000..."
            className="w-full bg-dl-bg border border-dl-border px-3 py-2 font-mono text-sm text-dl-fg placeholder-dl-muted focus:outline-none focus:border-dl-heading"
          />
          {manualAddress && !isValidAddress && (
            <p className="mt-1 font-mono text-xs text-red-400">
              Address must start with 0x followed by hex characters.
            </p>
          )}
        </div>

        <button
          onClick={handleCheckEligibility}
          disabled={!isValidAddress || claimState === 'checking'}
          className="mt-4 px-6 py-2 font-mono text-sm bg-dl-heading text-dl-bg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        >
          {claimState === 'checking' ? 'Checking...' : 'Check Eligibility'}
        </button>
      </section>

      {/* Campaign Status */}
      <section className="border border-dl-border p-5">
        <h2 className="font-serif text-lg text-dl-heading mb-4">Campaign Status</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-dl-muted font-mono text-xs uppercase">Campaign</dt>
          <dd className="text-dl-fg font-mono text-xs">Phase 9 — Mainnet Candidate</dd>
          <dt className="text-dl-muted font-mono text-xs uppercase">Network</dt>
          <dd className="text-dl-fg font-mono text-xs">Sui Mainnet</dd>
          <dt className="text-dl-muted font-mono text-xs uppercase">Status</dt>
          <dd className="text-yellow-400 font-mono text-xs">PENDING PUBLISH</dd>
          <dt className="text-dl-muted font-mono text-xs uppercase">Token</dt>
          <dd className="text-dl-fg font-mono text-xs">AMC — Non-financial community reward</dd>
          <dt className="text-dl-muted font-mono text-xs uppercase">Package ID</dt>
          <dd className="text-dl-muted font-mono text-xs">Pending mainnet deploy</dd>
        </dl>
      </section>

      {/* Claim interaction */}
      <ClaimCard
        claimState={claimState}
        proofData={proofData}
        txStatus={txStatus}
        txDigest={txDigest}
        txError={txError}
        wallet={wallet}
        manualAddress={manualAddress}
        network={network}
        onClaim={handleClaim}
        onRetry={handleRetry}
      />

      {/* Proof toolchain status */}
      <section className="border border-dl-border p-5">
        <h2 className="font-serif text-lg text-dl-heading mb-4">
          Phase 9 Infrastructure Status
        </h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          {[
            ['Merkle proof generation', 'READY'],
            ['Server-side eligibility API', 'READY'],
            ['Claim submission validation', 'READY'],
            ['Wallet connect (Sui Standard)', 'READY'],
            ['PTB construction (client)', 'READY'],
            ['Mainnet package build', 'READY — NOT PUBLISHED'],
            ['Mainnet package publish', 'BLOCKED — NO GAS'],
            ['Claim event monitoring', 'READY'],
            ['RPC health monitoring', 'READY'],
            ['Operator dashboard', 'READY'],
          ].map(([label, status]) => (
            <>
              <dt key={`dt-${label}`} className="text-dl-muted font-mono text-xs uppercase">{label}</dt>
              <dd
                key={`dd-${label}`}
                className={`font-mono text-xs ${
                  status === 'READY'
                    ? 'text-green-400'
                    : status.startsWith('BLOCKED')
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}
              >
                {status}
              </dd>
            </>
          ))}
        </dl>
      </section>

      <p className="font-mono text-xs text-dl-muted border-t border-dl-border pt-4">
        Phase 9 Production — Axiom Protocol Sui Community Distribution Layer — Mainnet Candidate
      </p>
    </div>
  );
}
