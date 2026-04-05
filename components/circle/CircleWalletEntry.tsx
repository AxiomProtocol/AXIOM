import { useCircleWalletContext } from '../WalletConnect/CircleWalletProvider';

interface CircleWalletEntryProps {
  onWalletReady?: (address: string) => void;
  context?: 'wealth-practice' | 'community-credit' | 'early-access';
}

const CONTEXT_LABEL: Record<string, string> = {
  'wealth-practice': 'Join the Wealth Practice',
  'community-credit': 'Apply for Community Credit',
  'early-access': 'Apply for Reserve Access',
};

export default function CircleWalletEntry({ onWalletReady, context = 'early-access' }: CircleWalletEntryProps) {
  const { isAvailable, isAuthenticated, walletAddress, loading, error, authenticate } = useCircleWalletContext();

  if (!isAvailable) return null;

  const label = CONTEXT_LABEL[context] ?? 'Continue';

  if (isAuthenticated && walletAddress) {
    return (
      <div
        style={{
          padding: '12px 16px',
          border: '1px solid #2d6a4f',
          background: '#f0fdf4',
          marginBottom: 16,
        }}
      >
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: '#2d6a4f', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Circle Wallet — Connected
        </p>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#1e3a5f', margin: 0, wordBreak: 'break-all' }}>
          {walletAddress}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e2e8f0',
        background: '#f8f9fa',
        marginBottom: 16,
      }}
    >
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: '#718096', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
        No Web3 Wallet?
      </p>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#4a5568', margin: '0 0 12px', lineHeight: 1.6 }}>
        Create a secure on-chain wallet using your email or Google account — no browser extension required.
      </p>
      {error && (
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: '#e53e3e', margin: '0 0 10px' }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={async () => {
          const address = await authenticate();
          if (address) onWalletReady?.(address);
        }}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? '#94a3b8' : '#1e3a5f',
          color: '#fff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: '"Courier New", monospace',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {loading ? 'Creating Wallet…' : `Continue with Email / Google — ${label}`}
      </button>
    </div>
  );
}
