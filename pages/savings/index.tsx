import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../../components/design-law';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { openAppKit } from '../../lib/web3/appKitModal';

interface EthProvider {
  request(args: { method: 'eth_sendTransaction'; params: [{ from: string; to: string; data: string; value?: string }] }): Promise<string>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getEthProvider(): EthProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EthProvider }).ethereum ?? null;
}

interface SavingsInfo {
  supplyApyPct: string;
  tvlAxusd: string;
  protocolDepositsAxusd: string;
  utilizationPct: string;
  vaultDeployed: boolean;
  vaultAddress: string | null;
  axusdAddress: string;
}

interface DepositHistoryItem {
  id: number;
  operation: string;
  amount: string;
  balance: string;
  yieldEarned: string;
  txHash: string | null;
  status: string;
  date: string;
}

interface SavingsPosition {
  currentBalanceAxusd: string;
  onChainBalanceAxusd: string;
  totalDepositedAxusd: string;
  totalWithdrawnAxusd: string;
  yieldEarnedAxusd: string;
  hasPosition: boolean;
  depositHistory: DepositHistoryItem[];
}

function fmt(val: string | number | null | undefined, decimals = 2) {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
  if (isNaN(n as number)) return '0.00';
  return (n as number).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function IconArrowDown({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function IconArrowUp({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.5v2.25A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V16.5m13.5-9L12 3m0 0L7.5 7.5M12 3v13.5" />
    </svg>
  );
}

function Loader() {
  return <span className="font-dl-mono text-dl-gray animate-pulse">···</span>;
}

function TxStatusBadge({ status }: { status: string }) {
  const color = status === 'confirmed'
    ? 'text-dl-forest border-dl-forest'
    : status === 'pending'
    ? 'text-dl-gold border-dl-gold'
    : 'text-dl-gray border-dl-border';
  return (
    <span className={`font-dl-mono text-xs border px-2 py-0.5 uppercase ${color}`}>
      {status}
    </span>
  );
}

export default function SavingsPage() {
  const { walletState, siweState } = useWallet();
  const walletAddress = walletState.address;
  const isAuthenticated = siweState.isAuthenticated;

  const [info, setInfo] = useState<SavingsInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [position, setPosition] = useState<SavingsPosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAll, setWithdrawAll] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState('');

  useEffect(() => {
    fetch('/api/savings/info')
      .then(r => r.json())
      .then(d => setInfo(d))
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, []);

  const fetchPosition = useCallback(async (addr: string) => {
    setPositionLoading(true);
    try {
      const r = await fetch(`/api/savings/position?address=${addr}`);
      const d = await r.json();
      if (d.success) setPosition(d);
    } catch {}
    finally { setPositionLoading(false); }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchPosition(walletAddress);
    }
  }, [walletAddress, fetchPosition]);

  const requireAuth = () => {
    if (!walletAddress) {
      openAppKit();
      return false;
    }
    if (!isAuthenticated) {
      setTxMessage('Please sign in with your wallet to continue (SIWE).');
      return false;
    }
    return true;
  };

  const handleDeposit = async () => {
    if (!requireAuth()) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setTxMessage('Enter a valid amount.');
      return;
    }

    setTxStatus('pending');
    setTxMessage('Preparing deposit…');

    try {
      const r = await fetch('/api/savings/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountAxusd: depositAmount }),
      });
      const data = await r.json();

      if (r.status === 401) {
        setTxStatus('error');
        setTxMessage('Wallet authentication required. Please sign in first.');
        return;
      }
      if (!data.success) throw new Error(data.error || 'Deposit preparation failed');

      if (data.pendingDeployment) {
        setTxStatus('success');
        setTxMessage('Vault not yet live. Your deposit intent has been recorded.');
        return;
      }

      const eth = getEthProvider();
      if (!eth) throw new Error('Wallet disconnected');

      let lastTxHash: string | null = null;
      for (const step of data.steps) {
        setTxMessage(`Step ${step.step}: ${step.description}…`);
        lastTxHash = (await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: walletAddress as string, to: step.to, data: step.data }],
        })) as string;
        setTxMessage(`Step ${step.step} submitted: ${lastTxHash?.slice(0, 10)}…`);
      }

      if (lastTxHash) {
        await fetch('/api/savings/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountAxusd: depositAmount, txHash: lastTxHash }),
        });
      }

      setTxStatus('success');
      setTxMessage(`Deposit of ${depositAmount} AXUSD submitted. Hash: ${lastTxHash?.slice(0, 10)}…`);
      setDepositAmount('');
      if (walletAddress) fetchPosition(walletAddress);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMessage(e instanceof Error ? e.message : 'Deposit failed.');
    }
  };

  const handleWithdraw = async () => {
    if (!requireAuth()) return;
    if (!withdrawAll) {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        setTxMessage('Enter a valid withdrawal amount.');
        return;
      }
    }

    setTxStatus('pending');
    setTxMessage('Preparing withdrawal…');

    try {
      const r = await fetch('/api/savings/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountAxusd: withdrawAll ? position?.currentBalanceAxusd : withdrawAmount,
          withdrawAll,
        }),
      });
      const data = await r.json();

      if (r.status === 401) {
        setTxStatus('error');
        setTxMessage('Wallet authentication required. Please sign in first.');
        return;
      }
      if (!data.success) throw new Error(data.error || 'Withdrawal preparation failed');

      if (data.pendingDeployment) {
        setTxStatus('success');
        setTxMessage('Vault not yet live. Your withdrawal intent has been recorded.');
        return;
      }

      const eth = getEthProvider();
      if (!eth) throw new Error('Wallet disconnected');

      let lastTxHash: string | null = null;
      for (const step of data.steps) {
        setTxMessage(`Step ${step.step}: ${step.description}…`);
        lastTxHash = (await eth.request({
          method: 'eth_sendTransaction',
          params: [{ from: walletAddress as string, to: step.to, data: step.data }],
        })) as string;
        setTxMessage(`Withdrawal submitted: ${lastTxHash?.slice(0, 10)}…`);
      }

      if (lastTxHash) {
        await fetch('/api/savings/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountAxusd: withdrawAll ? position?.currentBalanceAxusd : withdrawAmount,
            withdrawAll,
            txHash: lastTxHash,
          }),
        });
      }

      setTxStatus('success');
      setTxMessage('Withdrawal submitted. Estimated settlement: 1–2 blocks (~2–4 seconds).');
      setWithdrawAmount('');
      setWithdrawAll(false);
      if (walletAddress) fetchPosition(walletAddress);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMessage(e instanceof Error ? e.message : 'Withdrawal failed.');
    }
  };

  const apyDisplay = infoLoading ? null : info?.supplyApyPct ?? '0.00';
  const tvl = infoLoading ? null : info?.tvlAxusd ?? '0.00';
  const protocolDeposits = infoLoading ? null : info?.protocolDepositsAxusd ?? '0.00';

  return (
    <DesignLawLayout>
      <Head>
        <title>AXUSD Yield Savings — Axiom Protocol</title>
        <meta name="description" content="Deposit AXUSD into the Axiom savings vault and earn variable yield from Euler V2 lending markets on Arbitrum One." />
      </Head>

      <div className="border-b border-dl-border mb-10">
        <div className="py-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5">Layer 01 Capital Formation</span>
            <span className="font-dl-mono text-xs text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>
          </div>
          <h1 className="font-dl-serif text-3xl md:text-5xl text-dl-navy leading-tight mb-4">
            AXUSD Yield Savings
          </h1>
          <p className="text-sm text-dl-gray max-w-2xl leading-relaxed mb-5">
            Deposit AXUSD into a protocol-managed savings vault backed by Euler V2 lending markets on Arbitrum One.
            Yield accrues continuously and is denominated entirely in AXUSD. Rate is variable — not guaranteed.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {['Variable APY', 'Euler V2', 'Arbitrum One', 'AXUSD Denominated', 'Non-Custodial'].map(tag => (
              <span key={tag} className="px-3 py-1 text-xs font-dl-mono text-dl-gray border border-dl-border bg-dl-bg">
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Current APY</p>
              <p className="font-dl-mono text-2xl font-bold text-dl-navy">
                {infoLoading ? <Loader /> : `${fmt(apyDisplay ?? '0')}%`}
              </p>
              <p className="text-xs text-dl-gray">Variable</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Vault TVL</p>
              <p className="font-dl-mono text-2xl font-bold text-dl-navy">
                {infoLoading ? <Loader /> : fmt(tvl ?? '0')}
              </p>
              <p className="text-xs text-dl-gray">AXUSD</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
              <p className="text-xs text-dl-gray mb-1">Protocol Deposits</p>
              <p className="font-dl-mono text-2xl font-bold text-dl-navy">
                {infoLoading ? <Loader /> : fmt(protocolDeposits ?? '0')}
              </p>
              <p className="text-xs text-dl-gray">AXUSD</p>
            </div>
            <div className="px-4 py-4 bg-dl-bg-alt">
              <p className="text-xs text-dl-gray mb-1">Settlement</p>
              <p className="font-dl-mono text-lg font-bold text-dl-navy">On-Chain</p>
              <p className="text-xs text-dl-gray">Arbitrum One</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          {walletAddress && (
            <div className="mb-8">
              <SectionHeading>Your Position</SectionHeading>
              {positionLoading ? (
                <div className="border border-dl-border p-6">
                  <Loader />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border">
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Balance</p>
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">
                      {fmt(position?.currentBalanceAxusd ?? '0', 4)}
                    </p>
                    <p className="text-xs text-dl-gray">AXUSD</p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Total Deposited</p>
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">
                      {fmt(position?.totalDepositedAxusd ?? '0', 4)}
                    </p>
                    <p className="text-xs text-dl-gray">AXUSD</p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg border-r border-dl-border">
                    <p className="text-xs text-dl-gray mb-1">Yield Earned</p>
                    <p className="font-dl-mono text-lg font-semibold text-dl-forest">
                      {fmt(position?.yieldEarnedAxusd ?? '0', 6)}
                    </p>
                    <p className="text-xs text-dl-gray">AXUSD</p>
                  </div>
                  <div className="px-4 py-4 bg-dl-bg-alt">
                    <p className="text-xs text-dl-gray mb-1">Total Withdrawn</p>
                    <p className="font-dl-mono text-lg font-semibold text-dl-navy">
                      {fmt(position?.totalWithdrawnAxusd ?? '0', 4)}
                    </p>
                    <p className="text-xs text-dl-gray">AXUSD</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {walletAddress && position?.depositHistory && position.depositHistory.length > 0 && (
            <div className="mb-8">
              <SectionHeading>Transaction History</SectionHeading>
              <div className="border border-dl-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dl-border bg-dl-bg">
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-dl-mono text-dl-gray">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-dl-mono text-dl-gray">Balance</th>
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-dl-mono text-dl-gray">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {position.depositHistory.map(h => (
                      <tr key={h.id} className="border-b border-dl-border last:border-0">
                        <td className="px-4 py-2">
                          <span className={`flex items-center gap-1 font-dl-mono text-xs ${h.operation === 'deposit' ? 'text-dl-forest' : 'text-dl-navy'}`}>
                            {h.operation === 'deposit'
                              ? <IconArrowDown className="w-3.5 h-3.5" />
                              : <IconArrowUp className="w-3.5 h-3.5" />}
                            {h.operation.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-dl-mono text-xs text-dl-navy">
                          {fmt(h.amount, 4)}
                        </td>
                        <td className="px-4 py-2 text-right font-dl-mono text-xs text-dl-navy">
                          {fmt(h.balance, 4)}
                        </td>
                        <td className="px-4 py-2">
                          <TxStatusBadge status={h.status} />
                        </td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-gray">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 font-dl-mono text-xs text-dl-gray">
                          {h.txHash
                            ? <a href={`https://arbiscan.io/tx/${h.txHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-dl-navy">{h.txHash.slice(0, 8)}…</a>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mb-8">
            <SectionHeading>How It Works</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
              {[
                {
                  num: '01',
                  title: 'Deposit AXUSD',
                  desc: 'Approve and deposit AXUSD into the savings vault. Funds are deployed into the Euler V2 lending market.',
                },
                {
                  num: '02',
                  title: 'Yield Accrues',
                  desc: 'Borrowers pay interest on the capital you supply. Your share of interest accrues continuously as vault shares appreciate.',
                },
                {
                  num: '03',
                  title: 'Withdraw Anytime',
                  desc: 'Redeem your shares for AXUSD at any time. The returned amount reflects your principal plus accrued yield.',
                },
              ].map(step => (
                <div key={step.num} className="p-6 border-r border-dl-border last:border-0">
                  <p className="font-dl-mono text-xs text-dl-gray mb-2">{step.num}</p>
                  <p className="font-dl-serif text-lg text-dl-navy mb-2">{step.title}</p>
                  <p className="text-xs text-dl-gray leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="border border-dl-border sticky top-6">
            {!walletAddress ? (
              <div className="p-6 text-center">
                <p className="font-dl-serif text-lg text-dl-navy mb-2">Connect Wallet</p>
                <p className="text-xs text-dl-gray mb-4 leading-relaxed">
                  Connect your wallet to deposit AXUSD and view your savings position.
                </p>
                <SolidButton onClick={() => openAppKit()}>Connect Wallet</SolidButton>
              </div>
            ) : (
              <>
                <div className="flex border-b border-dl-border">
                  <button
                    onClick={() => { setActiveTab('deposit'); setTxStatus('idle'); setTxMessage(''); }}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'deposit' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'}`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => { setActiveTab('withdraw'); setTxStatus('idle'); setTxMessage(''); }}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === 'withdraw' ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray'}`}
                  >
                    Withdraw
                  </button>
                </div>

                <div className="p-6">
                  <p className="font-dl-mono text-xs text-dl-gray mb-1 truncate">
                    {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </p>
                  {!isAuthenticated && (
                    <p className="text-xs text-dl-gold mt-1 mb-2">Sign in with wallet (SIWE) to transact.</p>
                  )}

                  {activeTab === 'deposit' ? (
                    <>
                      <label className="block text-xs text-dl-gray mb-1 mt-4">Amount (AXUSD)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-dl-border bg-dl-bg font-dl-mono text-dl-navy px-3 py-2 text-sm mb-4 focus:outline-none focus:border-dl-navy"
                      />
                      <SolidButton
                        onClick={handleDeposit}
                        className="w-full"
                        disabled={txStatus === 'pending'}
                      >
                        {txStatus === 'pending' ? 'Processing…' : 'Deposit AXUSD'}
                      </SolidButton>
                      <p className="text-xs text-dl-gray mt-3 leading-relaxed">
                        Depositing requires two on-chain transactions: approve and deposit. Actual execution happens in your wallet.
                      </p>
                      <div className="mt-4 border border-dl-border overflow-hidden">
                        <div className="relative" style={{ height: '100px' }}>
                          <img
                            src="/images/coinbase/onramp-hero.png"
                            alt="Coinbase Pay onramp"
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 60%' }}
                          />
                          <div
                            className="absolute inset-0 flex items-end px-4 pb-3"
                            style={{ background: 'linear-gradient(to top, rgba(30,58,95,0.95) 0%, rgba(30,58,95,0.5) 60%, transparent 100%)' }}
                          >
                            <p className="font-dl-mono text-xs text-blue-200 uppercase tracking-widest">Don't have AXUSD yet?</p>
                          </div>
                        </div>
                        <div className="p-4 bg-dl-bg">
                          <p className="text-xs text-dl-gray leading-relaxed mb-1">
                            The fastest way is to buy USDC with a debit or credit card via Coinbase Pay, then convert 1:1 to AXUSD through the Peg Stability Module — all in one guided flow.
                          </p>
                          <p className="text-xs text-dl-gray leading-relaxed mb-3">
                            No Coinbase account required. USDC arrives in your wallet on Arbitrum One within minutes. The PSM conversion takes two wallet confirmations and has no price impact.
                          </p>
                          <Link
                            href="/onramp"
                            className="font-dl-mono text-xs text-dl-navy underline underline-offset-2"
                          >
                            Get AXUSD via Capital Stack Entry
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-4 mb-3">
                        <label className="flex items-center gap-2 text-xs text-dl-gray cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={withdrawAll}
                            onChange={e => setWithdrawAll(e.target.checked)}
                            className="w-3.5 h-3.5"
                          />
                          Withdraw full balance
                        </label>
                        {!withdrawAll && (
                          <>
                            <label className="block text-xs text-dl-gray mb-1">Amount (AXUSD)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={withdrawAmount}
                              onChange={e => setWithdrawAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-dl-border bg-dl-bg font-dl-mono text-dl-navy px-3 py-2 text-sm mb-4 focus:outline-none focus:border-dl-navy"
                            />
                          </>
                        )}
                      </div>
                      <SolidButton
                        onClick={handleWithdraw}
                        className="w-full"
                        disabled={txStatus === 'pending'}
                      >
                        {txStatus === 'pending' ? 'Processing…' : 'Withdraw AXUSD'}
                      </SolidButton>
                      <p className="text-xs text-dl-gray mt-3 leading-relaxed">
                        Estimated settlement: 1–2 Arbitrum One blocks (~2–4 seconds).
                      </p>
                    </>
                  )}

                  {txMessage && (
                    <div className={`mt-4 px-3 py-2 border text-xs font-dl-mono ${
                      txStatus === 'success'
                        ? 'border-dl-forest text-dl-forest bg-dl-bg'
                        : txStatus === 'error'
                        ? 'border-red-400 text-red-600 bg-dl-bg'
                        : 'border-dl-border text-dl-gray bg-dl-bg'
                    }`}>
                      {txMessage}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-dl-border px-6 py-4">
              <p className="text-xs text-dl-gray leading-relaxed">
                Yield is variable — not guaranteed. Rate reflects Euler V2 market conditions. No fixed rate is promised. AXUSD must be held in your wallet prior to deposit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
