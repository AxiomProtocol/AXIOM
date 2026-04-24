import { useEffect } from 'react';
import { usePaymaster } from '../../hooks/usePaymaster';

interface PaymasterToggleProps {
  onEstimateChange?: (usdcCost: string | null) => void;
}

export default function PaymasterToggle({ onEstimateChange }: PaymasterToggleProps) {
  const { featureAvailable, paymasterEnabled, togglePaymaster, estimatedUsdcGas, estimating, estimateGas } = usePaymaster();

  useEffect(() => {
    if (paymasterEnabled) {
      estimateGas();
    } else {
      onEstimateChange?.(null);
    }
  }, [paymasterEnabled]);

  useEffect(() => {
    onEstimateChange?.(estimatedUsdcGas);
  }, [estimatedUsdcGas]);

  if (!featureAvailable) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        border: '1px solid #c0b090',
        background: '#fffdf5',
        marginBottom: 12,
      }}
    >
      <div>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: '#7a6500', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>
          Pay Gas in USDC
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#4a5568', margin: 0 }}>
          {estimating
            ? 'Estimating gas cost…'
            : paymasterEnabled && estimatedUsdcGas
            ? `Estimated gas: ~${estimatedUsdcGas} USDC (includes 10% surcharge)`
            : 'Use USDC instead of ETH for gas. Requires ERC-4337 wallet.'}
        </p>
      </div>
      <button
        type="button"
        onClick={togglePaymaster}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: paymasterEnabled ? '#1e3a5f' : '#cbd5e0',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
          marginLeft: 12,
        }}
        aria-label={paymasterEnabled ? 'Disable USDC gas' : 'Enable USDC gas'}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: paymasterEnabled ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}
