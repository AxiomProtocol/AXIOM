import React, { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { KycForm, KycFormData } from '../../components/banking/KycForm';
import { AccountCard } from '../../components/banking/AccountCard';
import { WealthPoolCard } from '../../components/banking/WealthPoolCard';
import { CustodyWalletCard } from '../../components/banking/CustodyWalletCard';
import { BridgeWidget } from '../../components/banking/BridgeWidget';
import { CardDisplay } from '../../components/banking/CardDisplay';
import { TransactionList } from '../../components/banking/TransactionList';
import { PendingApprovals } from '../../components/banking/PendingApprovals';
import { BankingLanding } from '../../components/banking/BankingLanding';
import { useWallet } from '../../lib/web3/useWallet';
import { openAppKit } from '../../lib/web3/appKitModal';

type Tab = 'overview' | 'identity' | 'account' | 'wealth' | 'custody' | 'bridge';

interface BankingStatus {
  hasCustomer: boolean;
  isApproved: boolean;
  applicationStatus: string | null;
  customerId: string | null;
  firstName: string | null;
  accounts: Array<{
    id: string;
    unitAccountId: string;
    accountType: string;
    status: string;
    balanceCents: number;
    availableBalanceCents?: number;
    routingNumber?: string;
    maskedAccountNumber?: string;
    susuGroupId?: string | null;
  }>;
}

interface CustodyData {
  wallets: Array<{
    id: string;
    bitgoWalletId: string;
    coin: string;
    receiveAddress: string;
    confirmedBalanceStr: string;
    spendableBalanceStr: string;
  }>;
}

export default function BankingPage() {
  const { address, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [status, setStatus] = useState<BankingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [custody, setCustody] = useState<CustodyData | null>(null);
  const [custodyLoading, setCustodyLoading] = useState(false);
  const [custodyCreating, setCustodyCreating] = useState(false);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<unknown[]>([]);
  const [bridgeHistory, setBridgeHistory] = useState<unknown[]>([]);

  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isConnected) return;
    setStatusLoading(true);
    try {
      const r = await fetch('/api/unit/status');
      if (r.ok) setStatus(await r.json());
    } catch {
    } finally {
      setStatusLoading(false);
    }
  }, [isConnected]);

  const fetchCustody = useCallback(async () => {
    if (!isConnected) return;
    setCustodyLoading(true);
    try {
      const r = await fetch('/api/bitgo/wallets/list');
      if (r.ok) {
        const data = await r.json();
        setCustody(data);
      }
    } catch {
    } finally {
      setCustodyLoading(false);
    }
  }, [isConnected]);

  const fetchApprovals = useCallback(async () => {
    if (!isConnected) return;
    try {
      const r = await fetch('/api/bitgo/treasury/pending');
      if (r.ok) {
        const data = await r.json();
        setPendingApprovals(data.pendingApprovals ?? []);
      }
    } catch {}
  }, [isConnected]);

  const fetchBridgeHistory = useCallback(async () => {
    if (!isConnected) return;
    try {
      const r = await fetch('/api/bridge/history');
      if (r.ok) {
        const data = await r.json();
        setBridgeHistory(data.transfers ?? []);
      }
    } catch {}
  }, [isConnected]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === 'custody') {
      fetchCustody();
      fetchApprovals();
    }
    if (activeTab === 'bridge') {
      fetchBridgeHistory();
    }
  }, [activeTab, fetchCustody, fetchApprovals, fetchBridgeHistory]);

  const primaryAccount = status?.accounts?.find((a) => a.accountType === 'member');
  const poolAccounts = status?.accounts?.filter((a) => a.accountType === 'susu_pool') ?? [];
  const custodyWallet = custody?.wallets?.[0] ?? null;

  const fetchTxForAccount = async (unitAccountId: string) => {
    setTxLoading(true);
    try {
      const account = status?.accounts?.find((a) => a.unitAccountId === unitAccountId);
      if (!account) return;
      const r = await fetch(`/api/unit/accounts/${account.id}/transactions?limit=20`);
      if (r.ok) {
        const data = await r.json();
        setTransactions(data.transactions ?? []);
      }
    } catch {
    } finally {
      setTxLoading(false);
    }
  };

  const handleKycSubmit = async (data: KycFormData) => {
    setKycLoading(true);
    setKycError(null);
    try {
      const r = await fetch('/api/unit/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await r.json();
      if (!r.ok) { setKycError(json.error ?? 'Submission failed.'); return; }
      await fetchStatus();
      setActionMsg('Application submitted. We will notify you once your identity is verified.');
    } catch {
      setKycError('Network error. Please try again.');
    } finally {
      setKycLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setActionErr(null);
    const r = await fetch('/api/unit/accounts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountType: 'member' }),
    });
    const json = await r.json();
    if (!r.ok) { setActionErr(json.error); return; }
    await fetchStatus();
    setActionMsg('Account created successfully.');
  };

  const handleCreateWallet = async () => {
    setCustodyCreating(true);
    setActionErr(null);
    try {
      const r = await fetch('/api/bitgo/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) { setActionErr(json.error); return; }
      await fetchCustody();
      setActionMsg('Custody wallet created.');
    } catch {
      setActionErr('Failed to create wallet.');
    } finally {
      setCustodyCreating(false);
    }
  };

  const handleSend = async (params: { toAddress: string; amount: string }) => {
    if (!custodyWallet) return;
    setActionErr(null);
    const r = await fetch('/api/bitgo/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId: custodyWallet.bitgoWalletId,
        toAddress: params.toAddress,
        amount: params.amount,
      }),
    });
    const json = await r.json();
    if (!r.ok) { setActionErr(json.error); return; }
    setActionMsg(`Transaction submitted. Tx ID: ${json.txId ?? 'pending'}`);
    await fetchCustody();
  };

  const handleApprove = async (approvalId: string) => {
    const r = await fetch('/api/bitgo/treasury/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingApprovalId: approvalId, action: 'approve' }),
    });
    if (r.ok) { await fetchApprovals(); setActionMsg('Authorization approved.'); }
  };

  const handleReject = async (approvalId: string) => {
    const r = await fetch('/api/bitgo/treasury/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingApprovalId: approvalId, action: 'reject' }),
    });
    if (r.ok) { await fetchApprovals(); setActionMsg('Authorization rejected.'); }
  };

  const handleGetQuote = async (params: {
    direction: 'fiat_to_crypto' | 'crypto_to_fiat';
    fiatAmountCents: number;
    cryptoAsset: string;
  }) => {
    const r = await fetch('/api/bridge/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await r.json();
    return r.ok ? json.quote : null;
  };

  const handleTransfer = async (params: {
    direction: 'fiat_to_crypto' | 'crypto_to_fiat';
    fiatAmountCents: number;
    cryptoAsset: string;
    quoteSnapshotId?: string;
  }) => {
    if (!primaryAccount || !custodyWallet) return null;
    const r = await fetch('/api/bridge/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        unitAccountId: primaryAccount.unitAccountId,
        bitgoWalletId: custodyWallet.bitgoWalletId,
      }),
    });
    const json = await r.json();
    if (r.ok) { await fetchBridgeHistory(); }
    return r.ok ? { transferId: json.transferId } : null;
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'identity', label: 'Identity' },
    { id: 'account', label: 'Account' },
    { id: 'wealth', label: 'Wealth Practice' },
    { id: 'custody', label: 'Crypto Custody' },
    { id: 'bridge', label: 'Bridge' },
  ];

  const kycStatus = status?.applicationStatus;
  const kycApproved = status?.isApproved;

  function KycStatusBadge() {
    if (!status?.hasCustomer) return null;
    const colors: Record<string, string> = {
      Approved: 'border-dl-forest text-dl-forest',
      Denied: 'border-red-400 text-red-500',
      PendingReview: 'border-yellow-500 text-yellow-600',
      AwaitingDocuments: 'border-yellow-500 text-yellow-600',
      Pending: 'border-dl-muted text-dl-muted',
    };
    const label = kycApproved ? 'Verified' : (kycStatus ?? 'Pending');
    const cls = colors[kycApproved ? 'Approved' : (kycStatus ?? 'Pending')] ?? colors['Pending'];
    return (
      <span className={`text-xs font-dl-mono uppercase px-2 py-0.5 border ${cls}`}>{label}</span>
    );
  }

  return (
    <DesignLawLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-dl-serif text-dl-navy">Banking Infrastructure</h1>
          {status && <KycStatusBadge />}
        </div>
        <p className="text-sm font-dl-mono text-dl-muted">
          FDIC-insured banking rails (Unit) + institutional crypto custody (BitGo). Wallet:{' '}
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
        </p>
      </div>

      {!isConnected && (
        <BankingLanding onConnect={() => openAppKit()} />
      )}

      {isConnected && (
        <>
          {actionMsg && (
            <div className="border border-dl-forest bg-green-50 p-3 mb-4">
              <p className="text-sm font-dl-mono text-dl-forest">{actionMsg}</p>
              <button onClick={() => setActionMsg(null)} className="text-xs font-dl-mono text-dl-muted underline mt-1">Dismiss</button>
            </div>
          )}
          {actionErr && (
            <div className="border border-red-300 bg-red-50 p-3 mb-4">
              <p className="text-sm font-dl-mono text-red-600">{actionErr}</p>
              <button onClick={() => setActionErr(null)} className="text-xs font-dl-mono text-dl-muted underline mt-1">Dismiss</button>
            </div>
          )}

          <div className="flex border-b border-dl-border mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-dl-mono whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-dl-navy text-dl-navy'
                    : 'border-transparent text-dl-muted hover:text-dl-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <BankingLanding />
          )}

          {activeTab === 'identity' && (
            <div className="max-w-lg">
              {kycApproved ? (
                <div className="border border-dl-forest p-6">
                  <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Identity Verification</p>
                  <p className="text-base font-dl-serif text-dl-forest mb-1">Identity Verified</p>
                  <p className="text-sm font-dl-mono text-dl-muted">
                    Welcome back, {status?.firstName ?? 'Member'}. Your identity has been verified.
                  </p>
                </div>
              ) : status?.hasCustomer ? (
                <div className="border border-dl-border p-6">
                  <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Identity Verification</p>
                  <p className="text-base font-dl-serif text-dl-navy mb-2">Application Under Review</p>
                  <p className="text-sm font-dl-mono text-dl-muted mb-1">
                    Status: <span className="text-dl-navy">{kycStatus ?? 'Pending'}</span>
                  </p>
                  <p className="text-sm font-dl-mono text-dl-muted">
                    Our banking partner is reviewing your application. This typically takes 1–2 business days.
                  </p>
                  <button
                    onClick={fetchStatus}
                    className="mt-4 text-xs font-dl-mono text-dl-navy underline"
                  >
                    Refresh status
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-dl-mono text-dl-muted mb-6">
                    Complete identity verification to open an FDIC-insured bank account. Required by our banking partner under US regulations.
                  </p>
                  {actionMsg && <p className="text-sm font-dl-mono text-dl-forest mb-4">{actionMsg}</p>}
                  <KycForm onSubmit={handleKycSubmit} loading={kycLoading} error={kycError} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {statusLoading ? (
                <div className="border border-dl-border p-6">
                  <div className="h-8 bg-dl-border animate-pulse w-48 mb-2" />
                  <div className="h-4 bg-dl-border animate-pulse w-32" />
                </div>
              ) : primaryAccount ? (
                <>
                  <AccountCard
                    account={primaryAccount}
                    onFundAccount={() => setActionMsg('ACH funding flow — connect your external bank account through the Unit-hosted form.')}
                  />
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-dl-mono text-dl-muted uppercase tracking-widest">Recent Transactions</h3>
                      <button onClick={() => fetchTxForAccount(primaryAccount.unitAccountId)} className="text-xs font-dl-mono text-dl-navy underline">
                        Refresh
                      </button>
                    </div>
                    <TransactionList transactions={transactions as never[]} loading={txLoading} />
                  </div>
                </>
              ) : kycApproved ? (
                <div className="border border-dl-border p-6">
                  <p className="text-sm font-dl-mono text-dl-muted mb-4">
                    Your identity is verified. Open your Axiom banking account to access FDIC-insured deposits and ACH transfers.
                  </p>
                  <button
                    onClick={handleCreateAccount}
                    className="bg-dl-navy text-white text-sm font-dl-mono px-6 py-2.5 hover:opacity-90"
                  >
                    Open Banking Account
                  </button>
                </div>
              ) : (
                <div className="border border-dl-border p-6">
                  <p className="text-sm font-dl-mono text-dl-muted">
                    Complete identity verification on the Identity tab before opening a bank account.
                  </p>
                  <button onClick={() => setActiveTab('identity')} className="text-xs font-dl-mono text-dl-navy underline mt-2">
                    Go to Identity Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wealth' && (
            <div className="space-y-6">
              <WealthPoolCard
                pools={poolAccounts}
                onContribute={(accountId) => {
                  setActionMsg(`To contribute, use Send from your main account to pool account ${accountId.slice(0, 8)}...`);
                }}
                onAutoContribute={(accountId) => {
                  setActionMsg(`To set up automatic contributions, use the recurring payment feature. Pool: ${accountId.slice(0, 8)}...`);
                }}
              />
            </div>
          )}

          {activeTab === 'custody' && (
            <div className="space-y-6">
              <CustodyWalletCard
                walletId={custodyWallet?.bitgoWalletId}
                coin={custodyWallet?.coin}
                receiveAddress={custodyWallet?.receiveAddress}
                confirmedBalance={custodyWallet?.confirmedBalanceStr}
                spendableBalance={custodyWallet?.spendableBalanceStr}
                onCreateWallet={handleCreateWallet}
                onSend={handleSend}
                loading={custodyLoading}
                creating={custodyCreating}
              />
              <PendingApprovals
                approvals={pendingApprovals as never[]}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="space-y-6">
              <BridgeWidget
                unitAccountId={primaryAccount?.unitAccountId}
                bitgoWalletId={custodyWallet?.bitgoWalletId}
                onGetQuote={handleGetQuote}
                onTransfer={handleTransfer}
              />

              {bridgeHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-dl-mono text-dl-muted uppercase tracking-widest mb-3">Transfer History</h3>
                  <div className="border border-dl-border divide-y divide-dl-border">
                    {(bridgeHistory as Array<{
                      id: string;
                      direction: string;
                      status: string;
                      fiatAmountCents: number;
                      cryptoAsset: string;
                      cryptoAmountStr?: string;
                      createdAt: string;
                    }>).map((t) => (
                      <div key={t.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-dl-mono text-dl-navy">
                            {t.direction === 'fiat_to_crypto' ? 'USD → ' : '→ USD '}{t.cryptoAsset}
                          </p>
                          <p className="text-xs font-dl-mono text-dl-muted mt-0.5">
                            ${(t.fiatAmountCents / 100).toFixed(2)}
                            {t.cryptoAmountStr ? ` · ${t.cryptoAmountStr} ${t.cryptoAsset}` : ''}
                          </p>
                          <p className="text-xs font-dl-mono text-dl-muted">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs font-dl-mono uppercase px-2 py-0.5 border ${
                          t.status === 'completed' ? 'border-dl-forest text-dl-forest' :
                          t.status === 'failed' ? 'border-red-400 text-red-500' :
                          'border-yellow-500 text-yellow-600'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DesignLawLayout>
  );
}
