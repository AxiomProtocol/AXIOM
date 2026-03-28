/**
 * LiquidityManager — ERC-4626 vault deposit UI for EulerSwap V2 pools
 *
 * Architecture:
 *   USDC/AXUSD pool  → LP deposits AXUSD into eAXUSD-6 vault (0xacdA87...)
 *   AXM/AXUSD  pool  → LP deposits AXM into eAXM-1 vault (0x8e28ff...)
 *
 * ERC-3643: AXUSD is a permissioned token. Users must be identity-verified
 *   (whitelisted) to hold and transfer AXUSD.  AXM is unrestricted ERC-20.
 *
 * TX flow: check balance → approve (if needed) → deposit → confirm
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { useWallet } from '../../lib/web3/useWallet';
import { useUserLiquidity } from '../../lib/hooks/useDex';

// ── Contract addresses ─────────────────────────────────────────────────────
const AXUSD_TOKEN    = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' as const;
const AXM_TOKEN      = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' as const;
const EAXUSD_VAULT   = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2' as const; // eAXUSD-6
const EAXM_VAULT     = '0x8e28ffa89d168599156004db4f4d12c2af7c250e' as const; // eAXM-1
const IDENTITY_REG   = '0x58f64a1262d5434d6C7637a2309b0999bB6D1970' as const;

// ── Minimal ABIs ───────────────────────────────────────────────────────────
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf',  inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance',  inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve',    inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'decimals',   inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

const ERC4626_ABI = [
  { type: 'function', name: 'deposit',        inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'previewDeposit', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'maxDeposit',     inputs: [{ name: 'receiver', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf',      inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalAssets',    inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'convertToAssets',inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol',         inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const;

const IDENTITY_ABI = [
  { type: 'function', name: 'contains',    inputs: [{ name: 'u', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isVerified',  inputs: [{ name: 'u', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
] as const;

// ── Vault configuration ───────────────────────────────────────────────────
interface VaultConfig {
  id:           string;
  label:        string;
  token:        `0x${string}`;
  tokenSymbol:  string;
  tokenDec:     number;
  vault:        `0x${string}`;
  shareSymbol:  string;
  pool:         string;
  poolLabel:    string;
  erc3643:      boolean;
}

const VAULTS: VaultConfig[] = [
  {
    id:          'axusd',
    label:       'AXUSD Vault',
    token:       AXUSD_TOKEN,
    tokenSymbol: 'AXUSD',
    tokenDec:    18,
    vault:       EAXUSD_VAULT,
    shareSymbol: 'eAXUSD',
    pool:        '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8',
    poolLabel:   'USDC / AXUSD',
    erc3643:     true,
  },
  {
    id:          'axm',
    label:       'AXM Vault',
    token:       AXM_TOKEN,
    tokenSymbol: 'AXM',
    tokenDec:    18,
    vault:       EAXM_VAULT,
    shareSymbol: 'eAXM',
    pool:        '0x981763699D269E129a08E216b1AeC7caa376A8a8',
    poolLabel:   'AXM / AXUSD',
    erc3643:     false,
  },
];

// ── Design Law tokens ──────────────────────────────────────────────────────
const DL = {
  navy:    '#1B2A4A',
  forest:  '#1D3D2A',
  gold:    '#B8973A',
  muted:   'rgba(27,42,74,0.50)',
  border:  'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
  warn:    '#B8973A',
  error:   '#8B1A1A',
};

// ── Helper ─────────────────────────────────────────────────────────────────
function fmtBalance(raw: bigint | undefined, dec: number, digits = 4): string {
  if (raw === undefined) return '—';
  const n = parseFloat(formatUnits(raw, dec));
  if (n === 0) return '0';
  if (n < 0.0001) return '< 0.0001';
  return n.toFixed(digits);
}

// ══════════════════════════════════════════════════════════════════════════
export default function LiquidityManager() {
  const { isConnected, address } = useWallet();
  const { positions, loading: positionsLoading } = useUserLiquidity(address ?? undefined);
  const [activeTab, setActiveTab] = useState<'positions' | 'add'>('positions');

  return (
    <div style={{ border: `1px solid ${DL.border}`, background: '#fff' }}>
      {/* Tab bar */}
      <div style={{ borderBottom: `1px solid ${DL.border}`, display: 'flex' }}>
        {(['positions', 'add'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: activeTab === tab ? DL.navy : DL.muted,
              borderBottom: activeTab === tab ? `2px solid ${DL.navy}` : '2px solid transparent',
              background: activeTab === tab ? '#fff' : DL.surface,
              transition: 'color 0.15s',
            }}
          >
            {tab === 'positions' ? 'Your Positions' : 'Add Liquidity'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {activeTab === 'positions' && (
          <PositionsTab
            isConnected={isConnected}
            address={address}
            loading={positionsLoading}
            positions={positions}
            onAddLiquidity={() => setActiveTab('add')}
          />
        )}
        {activeTab === 'add' && (
          <AddLiquidityTab isConnected={isConnected} address={address} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Positions Tab — shows vault share balances for each vault
// ══════════════════════════════════════════════════════════════════════════
function PositionsTab({
  isConnected,
  address,
  loading,
  positions,
  onAddLiquidity,
}: {
  isConnected: boolean;
  address: string | null;
  loading: boolean;
  positions: any[];
  onAddLiquidity: () => void;
}) {
  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 12 }}>
          Connect wallet to view your vault positions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{ borderLeft: `3px solid ${DL.border}`, paddingLeft: 12, marginBottom: 20 }}>
        <p style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
          LP positions are held as ERC-4626 vault shares (eAXUSD, eAXM).
          Balances are read directly from the EVK vault contracts on Arbitrum One.
        </p>
      </div>

      {/* Live vault share balances */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {VAULTS.map((v) => (
          <VaultShareRow key={v.id} vault={v} address={address} />
        ))}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={onAddLiquidity}
          style={{
            background: DL.navy,
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Add Liquidity
        </button>
      </div>
    </div>
  );
}

function VaultShareRow({ vault, address }: { vault: VaultConfig; address: string | null }) {
  const addr = address as `0x${string}` | undefined;

  const { data: shares } = useReadContract({
    address: vault.vault,
    abi:     ERC4626_ABI,
    functionName: 'balanceOf',
    args:    addr ? [addr] : undefined,
    query:   { enabled: !!addr, refetchInterval: 15_000 },
  });

  const { data: assetsForShares } = useReadContract({
    address: vault.vault,
    abi:     ERC4626_ABI,
    functionName: 'convertToAssets',
    args:    shares !== undefined ? [shares as bigint] : undefined,
    query:   { enabled: shares !== undefined },
  });

  return (
    <div
      style={{
        border: `1px solid ${DL.border}`,
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
          {vault.label}
        </div>
        <div style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 10, marginTop: 2 }}>
          {vault.poolLabel} · {vault.vault.slice(0, 8)}…
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
          {fmtBalance(shares as bigint | undefined, 18)} {vault.shareSymbol}
        </div>
        {assetsForShares !== undefined && (
          <div style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 10, marginTop: 2 }}>
            ≈ {fmtBalance(assetsForShares as bigint | undefined, vault.tokenDec, 4)} {vault.tokenSymbol}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Add Liquidity Tab — vault selector → amount → approve → deposit
// ══════════════════════════════════════════════════════════════════════════
function AddLiquidityTab({
  isConnected,
  address,
}: {
  isConnected: boolean;
  address: string | null;
}) {
  const [selectedVault, setSelectedVault] = useState<VaultConfig>(VAULTS[0]);
  const [amountStr, setAmountStr]         = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'depositing' | 'done'>('idle');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [inputError, setInputError]       = useState<string | null>(null);

  const addr = address as `0x${string}` | undefined;

  // ── On-chain reads ──────────────────────────────────────────────────────
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: selectedVault.token,
    abi:     ERC20_ABI,
    functionName: 'balanceOf',
    args:    addr ? [addr] : undefined,
    query:   { enabled: !!addr, refetchInterval: 15_000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedVault.token,
    abi:     ERC20_ABI,
    functionName: 'allowance',
    args:    addr ? [addr, selectedVault.vault] : undefined,
    query:   { enabled: !!addr, refetchInterval: 8_000 },
  });

  const { data: maxDepositRaw } = useReadContract({
    address: selectedVault.vault,
    abi:     ERC4626_ABI,
    functionName: 'maxDeposit',
    args:    addr ? [addr] : undefined,
    query:   { enabled: !!addr },
  });

  // ERC-3643 whitelist check — only relevant for AXUSD vault
  // isVerified() validates both registration AND that all required claims are current
  const { data: isWhitelisted } = useReadContract({
    address: IDENTITY_REG,
    abi:     IDENTITY_ABI,
    functionName: 'isVerified',
    args:    addr ? [addr] : undefined,
    query:   { enabled: !!addr && selectedVault.erc3643 },
  });

  // Preview shares from deposit amount
  const parsedAmount = (() => {
    try {
      const n = parseFloat(amountStr);
      if (!amountStr || isNaN(n) || n <= 0) return undefined;
      return parseUnits(amountStr, selectedVault.tokenDec);
    } catch { return undefined; }
  })();

  const { data: sharesPreview } = useReadContract({
    address: selectedVault.vault,
    abi:     ERC4626_ABI,
    functionName: 'previewDeposit',
    args:    parsedAmount ? [parsedAmount] : undefined,
    query:   { enabled: !!parsedAmount },
  });

  // ── Write hooks ─────────────────────────────────────────────────────────
  const { writeContract: writeApprove, data: approveTxData, isPending: approveIsPending, error: approveError } = useWriteContract();
  const { writeContract: writeDeposit, data: depositTxData, isPending: depositIsPending, error: depositError } = useWriteContract();

  // Track approve tx
  const { isLoading: approveConfirming, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Track deposit tx
  const { isLoading: depositConfirming, isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  // Propagate tx hashes when writeContract resolves
  useEffect(() => { if (approveTxData) setApproveTxHash(approveTxData); }, [approveTxData]);
  useEffect(() => { if (depositTxData) setDepositTxHash(depositTxData); }, [depositTxData]);

  // After approve confirmed → refetch allowance, move to depositing
  useEffect(() => {
    if (approveConfirmed && step === 'approving') {
      refetchAllowance();
      setStep('depositing');
    }
  }, [approveConfirmed, step, refetchAllowance]);

  // After deposit confirmed → done
  useEffect(() => {
    if (depositConfirmed && step === 'depositing') {
      setStep('done');
      refetchBalance();
    }
  }, [depositConfirmed, step, refetchBalance]);

  // Reset on vault change
  useEffect(() => {
    setAmountStr('');
    setInputError(null);
    setStep('idle');
    setApproveTxHash(undefined);
    setDepositTxHash(undefined);
  }, [selectedVault]);

  // ── Derived state ───────────────────────────────────────────────────────
  const balanceBigInt   = tokenBalance as bigint | undefined;
  const allowanceBigInt = allowance    as bigint | undefined;
  const maxDepBigInt    = maxDepositRaw as bigint | undefined;

  const needsApproval =
    !!parsedAmount &&
    allowanceBigInt !== undefined &&
    allowanceBigInt < parsedAmount;

  const exceedsBalance =
    !!parsedAmount &&
    balanceBigInt !== undefined &&
    parsedAmount > balanceBigInt;

  const exceedsMax =
    !!parsedAmount &&
    maxDepBigInt !== undefined &&
    maxDepBigInt < maxUint256 - 1n &&
    parsedAmount > maxDepBigInt;

  const notWhitelisted = selectedVault.erc3643 && isWhitelisted === false;

  const canDeposit =
    isConnected &&
    !!addr &&
    !!parsedAmount &&
    !exceedsBalance &&
    !exceedsMax &&
    !notWhitelisted &&
    step !== 'done';

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSetMax = () => {
    if (!balanceBigInt) return;
    setAmountStr(formatUnits(balanceBigInt, selectedVault.tokenDec));
  };

  const handleAmountChange = (v: string) => {
    setAmountStr(v);
    setInputError(null);
    if (!v) return;
    const n = parseFloat(v);
    if (isNaN(n) || n <= 0) { setInputError('Enter a valid amount'); return; }
    if (balanceBigInt !== undefined) {
      try {
        const wei = parseUnits(v, selectedVault.tokenDec);
        if (wei > balanceBigInt) setInputError('Exceeds your balance');
      } catch { setInputError('Invalid amount'); }
    }
  };

  const handleApprove = () => {
    if (!addr || !parsedAmount) return;
    setStep('approving');
    writeApprove({
      address: selectedVault.token,
      abi:     ERC20_ABI,
      functionName: 'approve',
      args:    [selectedVault.vault, parsedAmount],
    });
  };

  const handleDeposit = () => {
    if (!addr || !parsedAmount) return;
    setStep('depositing');
    writeDeposit({
      address: selectedVault.vault,
      abi:     ERC4626_ABI,
      functionName: 'deposit',
      args:    [parsedAmount, addr],
    });
  };

  const handleReset = () => {
    setStep('idle');
    setAmountStr('');
    setApproveTxHash(undefined);
    setDepositTxHash(undefined);
    setInputError(null);
    refetchBalance();
    refetchAllowance();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 12 }}>
          Connect wallet to add liquidity.
        </p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div
          style={{
            width: 48, height: 48, border: `2px solid ${DL.forest}`,
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={DL.forest} strokeWidth={2}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Deposit confirmed
        </p>
        <p style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 11, marginBottom: 16 }}>
          {selectedVault.shareSymbol} vault shares have been credited to your wallet.
        </p>
        {depositTxHash && (
          <a
            href={`https://arbiscan.io/tx/${depositTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: DL.gold, fontFamily: 'monospace', fontSize: 10, display: 'block', marginBottom: 20 }}
          >
            View on Arbiscan →
          </a>
        )}
        <button onClick={handleReset} style={btnStyle(DL.navy)}>Deposit Again</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Vault selector */}
      <div>
        <Label>Select vault</Label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {VAULTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVault(v)}
              style={{
                flex: 1,
                padding: '10px 8px',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: selectedVault.id === v.id ? 600 : 400,
                color: selectedVault.id === v.id ? '#fff' : DL.navy,
                background: selectedVault.id === v.id ? DL.navy : DL.surface,
                border: `1px solid ${selectedVault.id === v.id ? DL.navy : DL.border}`,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ERC-3643 notice for AXUSD vault */}
      {selectedVault.erc3643 && (
        <div style={{ borderLeft: `3px solid ${DL.gold}`, paddingLeft: 12, background: 'rgba(184,151,58,0.05)' }}>
          <p style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, margin: '8px 0' }}>
            <strong>ERC-3643 required.</strong> AXUSD is a permissioned token. Your wallet must be identity-verified
            to hold and transfer AXUSD. If you received AXUSD through the Capital Program, you are already whitelisted.
          </p>
          {notWhitelisted && (
            <p style={{ color: DL.error, fontFamily: 'monospace', fontSize: 11, margin: '4px 0 8px' }}>
              Your wallet is not registered in the identity registry. Contact Axiom to complete verification.
            </p>
          )}
        </div>
      )}

      {/* Pool / vault metadata */}
      <InfoRow>
        <InfoCell label="Pool" value={selectedVault.poolLabel} />
        <InfoCell label="Vault" value={`${selectedVault.vault.slice(0, 8)}…${selectedVault.vault.slice(-4)}`} />
        <InfoCell label="Yield" value="Variable — swap fees + lending" />
      </InfoRow>

      {/* Token balance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>{selectedVault.tokenSymbol} Balance</Label>
        <span style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 12 }}>
          {fmtBalance(balanceBigInt, selectedVault.tokenDec)} {selectedVault.tokenSymbol}
        </span>
      </div>

      {/* Amount input */}
      <div>
        <div
          style={{
            border: `1px solid ${inputError ? DL.error : DL.border}`,
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
          }}
        >
          <input
            type="number"
            value={amountStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.0"
            min="0"
            disabled={step !== 'idle' || notWhitelisted}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '14px 16px',
              fontFamily: 'monospace',
              fontSize: 20,
              color: DL.navy,
              background: 'transparent',
              width: 0,
            }}
          />
          <span style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 12, paddingRight: 12 }}>
            {selectedVault.tokenSymbol}
          </span>
          <button
            onClick={handleSetMax}
            disabled={!balanceBigInt || notWhitelisted}
            style={{
              padding: '6px 12px',
              marginRight: 8,
              border: `1px solid ${DL.border}`,
              background: DL.surface,
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: DL.navy,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            MAX
          </button>
        </div>
        {inputError && (
          <p style={{ color: DL.error, fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>{inputError}</p>
        )}
        {exceedsMax && (
          <p style={{ color: DL.error, fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>
            Exceeds vault deposit capacity.
          </p>
        )}
      </div>

      {/* Shares preview */}
      {parsedAmount && sharesPreview !== undefined && !exceedsBalance && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${DL.border}` }}>
          <span style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 11 }}>You will receive</span>
          <span style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
            ~{parseFloat(formatUnits(sharesPreview as bigint, 18)).toFixed(6)} {selectedVault.shareSymbol}
          </span>
        </div>
      )}

      {/* Step indicator */}
      {step !== 'idle' && (
        <StepIndicator
          step={step}
          approveConfirming={approveConfirming}
          approveConfirmed={approveConfirmed}
          depositConfirming={depositConfirming}
          approveTxHash={approveTxHash}
          depositTxHash={depositTxHash}
          error={(approveError || depositError)?.message ?? null}
        />
      )}

      {/* Action buttons */}
      {step === 'idle' && (
        <>
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={!canDeposit || approveIsPending}
              style={btnStyle(canDeposit && !approveIsPending ? DL.forest : 'rgba(27,42,74,0.25)')}
            >
              {approveIsPending ? 'CONFIRMING IN WALLET…' : `APPROVE ${selectedVault.tokenSymbol}`}
            </button>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={!canDeposit || depositIsPending}
              style={btnStyle(canDeposit && !depositIsPending ? DL.navy : 'rgba(27,42,74,0.25)')}
            >
              {depositIsPending
                ? 'CONFIRMING IN WALLET…'
                : !amountStr
                ? 'ENTER AN AMOUNT'
                : exceedsBalance
                ? 'INSUFFICIENT BALANCE'
                : notWhitelisted
                ? 'IDENTITY VERIFICATION REQUIRED'
                : `DEPOSIT ${selectedVault.tokenSymbol}`}
            </button>
          )}
        </>
      )}

      {/* Approving → then deposit */}
      {step === 'approving' && approveConfirmed && (
        <button
          onClick={handleDeposit}
          disabled={depositIsPending}
          style={btnStyle(depositIsPending ? 'rgba(27,42,74,0.25)' : DL.navy)}
        >
          {depositIsPending ? 'CONFIRMING IN WALLET…' : `DEPOSIT ${selectedVault.tokenSymbol}`}
        </button>
      )}

      {/* Error recovery */}
      {(approveError || depositError) && step !== 'idle' && (
        <button onClick={handleReset} style={btnStyle(DL.error)}>
          RESET
        </button>
      )}

      {/* Footer note */}
      <p style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5 }}>
        Deposits go into the EulerSwap backing vault.
        Vault shares accrue swap fees and Euler lending yield automatically.
        Withdraw at any time by redeeming shares.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function StepIndicator({
  step,
  approveConfirming,
  approveConfirmed,
  depositConfirming,
  approveTxHash,
  depositTxHash,
  error,
}: {
  step: string;
  approveConfirming: boolean;
  approveConfirmed: boolean;
  depositConfirming: boolean;
  approveTxHash?: `0x${string}`;
  depositTxHash?: `0x${string}`;
  error: string | null;
}) {
  const items = [
    {
      label: 'Approve',
      done:  approveConfirmed,
      active: step === 'approving' && !approveConfirmed,
      txHash: approveTxHash,
    },
    {
      label: 'Deposit',
      done:  depositConfirming || !!depositTxHash,
      active: step === 'depositing' && !depositTxHash,
      txHash: depositTxHash,
    },
  ];

  return (
    <div style={{ background: DL.surface, border: `1px solid ${DL.border}`, padding: '12px 16px' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: error ? 8 : 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 18, height: 18,
                border: `1px solid ${item.done ? DL.forest : item.active ? DL.gold : DL.border}`,
                background: item.done ? DL.forest : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {item.done && (
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {item.active && (
                <div style={{
                  width: 6, height: 6, background: DL.gold,
                  animation: 'pulse 1s infinite',
                }} />
              )}
            </div>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: item.done ? DL.forest : item.active ? DL.navy : DL.muted,
                fontWeight: item.active || item.done ? 600 : 400,
              }}
            >
              {item.label}
              {item.active && (approveConfirming || depositConfirming) && '…'}
              {item.txHash && (
                <a
                  href={`https://arbiscan.io/tx/${item.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 6, color: DL.gold, textDecoration: 'none' }}
                >
                  ↗
                </a>
              )}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <p style={{ color: DL.error, fontFamily: 'monospace', fontSize: 10, marginTop: 4 }}>
          {error.includes('User rejected') ? 'Transaction rejected in wallet.' : `Error: ${error.slice(0, 120)}`}
        </p>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 0, border: `1px solid ${DL.border}`, background: DL.surface }}>
      {children}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: '8px 12px', borderRight: `1px solid ${DL.border}` }}>
      <div style={{ color: DL.muted, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: DL.navy, fontFamily: 'monospace', fontSize: 11, marginTop: 2, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '14px',
    background: bg,
    color: bg === DL.surface || bg.includes('rgba') ? DL.muted : '#fff',
    border: 'none',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: '0.1em',
    fontWeight: 600,
    cursor: bg.includes('rgba') ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
