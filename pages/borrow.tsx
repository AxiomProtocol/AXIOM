import Head from 'next/head';
import { useState, useEffect } from 'react';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface CollateralVault {
  symbol: string;
  name: string;
  address: string;
  borrowLTV: number;
  liquidationLTV: number;
  icon: string;
  eulerVaultLink: string;
}

const COLLATERAL_VAULTS: CollateralVault[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x0A1a3b5f2041F33522C4efc754a7D096f880eE16',
    borrowLTV: 90,
    liquidationLTV: 95,
    icon: '💵',
    eulerVaultLink: 'https://app.euler.finance/vault/0x0A1a3b5f2041F33522C4efc754a7D096f880eE16?network=arbitrumone'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x0a9af77e34F29610c92E06F9F0B5E96e1F6780D0',
    borrowLTV: 90,
    liquidationLTV: 95,
    icon: '💴',
    eulerVaultLink: 'https://app.euler.finance/vault/0x0a9af77e34F29610c92E06F9F0B5E96e1F6780D0?network=arbitrumone'
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xF0A842995E5198fe5edBf2aa1A6f5Bd9E5D9d597',
    borrowLTV: 80,
    liquidationLTV: 85,
    icon: '⟠',
    eulerVaultLink: 'https://app.euler.finance/vault/0xF0A842995E5198fe5edBf2aa1A6f5Bd9E5D9d597?network=arbitrumone'
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    address: '0xd32335B3F568E1EED6D20fbC00cB3f7beeC76b92',
    borrowLTV: 70,
    liquidationLTV: 75,
    icon: '🔵',
    eulerVaultLink: 'https://app.euler.finance/vault/0xd32335B3F568E1EED6D20fbC00cB3f7beeC76b92?network=arbitrumone'
  }
];

const AXUSD_VAULT_ADDRESS = '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059';
const EULER_BORROW_LINK = `https://app.euler.finance/vault/${AXUSD_VAULT_ADDRESS}?network=arbitrumone`;

export default function BorrowPage() {
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVaultStats();
  }, []);

  const fetchVaultStats = async () => {
    try {
      const res = await fetch('/api/euler/vault-stats');
      const data = await res.json();
      if (data.success) {
        setVaultStats(data.vault);
      }
    } catch (err) {
      console.error('Error fetching vault stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Borrow AXUSD | Axiom Protocol</title>
        <meta name="description" content="Borrow AXUSD against your crypto collateral through Euler Finance." />
      </Head>

      <div className="mb-8">
        <h1 className="font-dl-serif text-3xl text-dl-navy">Borrow AXUSD</h1>
        <p className="text-dl-gray mt-1">
          Use your crypto assets as collateral to borrow AXUSD through Euler Finance
        </p>
      </div>

      <div className="bg-dl-bg-alt border border-dl-border p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-dl-bg-alt flex items-center justify-center border border-dl-border">
              <span className="text-3xl">🏦</span>
            </div>
            <div>
              <h2 className="font-dl-serif text-xl text-dl-navy">AXUSD Lending Market</h2>
              <p className="text-dl-gray">Powered by Euler Finance on Arbitrum</p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-dl-gray text-sm">Available to Borrow</p>
              <p className="text-2xl font-dl-mono text-dl-navy">
                {loading ? '...' : `$${vaultStats?.totalSupply || '0'}`}
              </p>
            </div>
            <div>
              <p className="text-dl-gray text-sm">Borrow APY</p>
              <p className="text-2xl font-dl-mono text-dl-forest">
                {loading ? '...' : `${vaultStats?.borrowAPY || 'Variable'}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dl-bg border border-dl-border p-6 mb-8">
        <SectionHeading>How to Borrow</SectionHeading>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-dl-bg-alt">
            <div className="w-10 h-10 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
              1
            </div>
            <div>
              <h4 className="text-dl-navy font-medium mb-1">Deposit Collateral</h4>
              <p className="text-dl-gray text-sm">
                First, deposit your assets (USDC, USDT, WETH, or ARB) into an Euler vault to receive vault shares.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-dl-bg-alt">
            <div className="w-10 h-10 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
              2
            </div>
            <div>
              <h4 className="text-dl-navy font-medium mb-1">Enable as Collateral</h4>
              <p className="text-dl-gray text-sm">
                In the Euler app, enable your vault shares as collateral for the AXUSD lending market.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-dl-bg-alt">
            <div className="w-10 h-10 bg-dl-navy flex items-center justify-center text-white font-medium shrink-0">
              3
            </div>
            <div>
              <h4 className="text-dl-navy font-medium mb-1">Borrow AXUSD</h4>
              <p className="text-dl-gray text-sm">
                Borrow AXUSD up to your collateral limit. You can use AXUSD anywhere in the Axiom ecosystem.
              </p>
            </div>
          </div>
        </div>

        <a
          href={EULER_BORROW_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block w-full py-4 bg-dl-navy text-white text-center font-medium"
        >
          Open Euler App to Borrow
        </a>
      </div>

      <div className="bg-dl-bg border border-dl-border p-6 mb-8">
        <SectionHeading>Accepted Collateral</SectionHeading>
        
        <div className="grid gap-4 md:grid-cols-2">
          {COLLATERAL_VAULTS.map((vault) => (
            <a
              key={vault.symbol}
              href={vault.eulerVaultLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-dl-bg-alt border border-dl-border group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{vault.icon}</span>
                  <div>
                    <p className="text-dl-navy font-medium">{vault.symbol}</p>
                    <p className="text-dl-gray text-sm">{vault.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-dl-forest font-dl-mono font-medium">{vault.borrowLTV}% LTV</p>
                  <p className="text-dl-gray text-xs">Liq: {vault.liquidationLTV}%</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-dl-gray flex items-center gap-1">
                <span>Deposit to get vault shares</span>
                <span>→</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-dl-bg border border-dl-border p-6">
        <SectionHeading>Use Cases for Borrowed AXUSD</SectionHeading>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-dl-bg-alt border border-dl-border">
            <span className="text-2xl mb-2 block">🏠</span>
            <h4 className="text-dl-navy font-medium mb-1">Real Estate</h4>
            <p className="text-dl-gray text-sm">Use AXUSD for KeyGrow property payments or Wealth Practice contributions</p>
          </div>
          <div className="p-4 bg-dl-bg-alt border border-dl-border">
            <span className="text-2xl mb-2 block">💱</span>
            <h4 className="text-dl-navy font-medium mb-1">Trading</h4>
            <p className="text-dl-gray text-sm">Swap AXUSD for other assets on DEX without selling collateral</p>
          </div>
          <div className="p-4 bg-dl-bg-alt border border-dl-border">
            <span className="text-2xl mb-2 block">🌾</span>
            <h4 className="text-dl-navy font-medium mb-1">Yield Farming</h4>
            <p className="text-dl-gray text-sm">Deploy AXUSD in liquidity pools to earn additional yield</p>
          </div>
        </div>
      </div>

      <div className="mt-8 border border-dl-error p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="text-dl-error font-medium mb-1">Liquidation Risk</h4>
            <p className="text-dl-gray text-sm">
              If your collateral value drops below the liquidation threshold, your position may be liquidated. 
              Monitor your health factor and maintain a safe margin.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <a href="/earn" className="text-dl-navy text-sm font-medium">
          ← Back to Earn Yield
        </a>
      </div>
    </DesignLawLayout>
  );
}
