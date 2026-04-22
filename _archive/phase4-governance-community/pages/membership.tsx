import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface MembershipPlan {
  id: string;
  tier: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  tier: string;
  status: string;
  currentPeriodEnd: string;
}

interface ReferralCode {
  id: string;
  code: string;
  discount: number;
  commission: number;
  uses: number;
  active: boolean;
}

export default function MembershipPage() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'plans' | 'subscription' | 'referral'>('plans');

  useEffect(() => {
    loadData();
  }, [walletState.address]);

  const loadData = async () => {
    setLoading(true);
    try {
      const plansRes = await fetch('/api/membership/plans');
      if (plansRes.ok) {
        const data = await plansRes.json();
        if (data.success) setPlans(data.plans || []);
      }

      if (walletState.address) {
        const [subRes, refRes] = await Promise.all([
          fetch(`/api/membership/subscription?userId=${walletState.address}`),
          fetch(`/api/membership/referral?creatorId=${walletState.address}`)
        ]);

        if (subRes.ok) {
          const data = await subRes.json();
          if (data.success) setSubscription(data.subscription);
        }

        if (refRes.ok) {
          const data = await refRes.json();
          if (data.success) setReferralCodes(data.codes || []);
        }
      }
    } catch (err) {
      console.error('Error loading membership data:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPlan = async (planId: string) => {
    if (!walletState.address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const res = await fetch('/api/membership/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', userId: walletState.address, planId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubscription(data.subscription);
          alert('Subscription successful!');
        }
      }
    } catch (err) {
      console.error('Error subscribing:', err);
    }
  };

  const createReferralCode = async () => {
    if (!walletState.address) return;

    try {
      const res = await fetch('/api/membership/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', creatorId: walletState.address, creatorName: 'Member' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReferralCodes(prev => [...prev, data.referralCode]);
        }
      }
    } catch (err) {
      console.error('Error creating referral code:', err);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: '#6B7280',
      basic: '#3B82F6',
      premium: '#8B5CF6',
      enterprise: '#1F2937'
    };
    return colors[tier] || '#6B7280';
  };

  return (
    <>
      <Head>
        <title>Membership | Axiom</title>
        <meta name="description" content="Axiom membership plans and subscriptions" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px' }}>
                Axiom Membership
              </h1>
              <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '32px' }}>
                Unlock the full potential of the Axiom ecosystem
              </p>
              
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px' }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: billingCycle === 'monthly' ? 'white' : 'transparent',
                    color: billingCycle === 'monthly' ? '#1F2937' : 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: billingCycle === 'yearly' ? 'white' : 'transparent',
                    color: billingCycle === 'yearly' ? '#1F2937' : 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Yearly <span style={{ color: '#10B981', fontSize: '12px' }}>Save 17%</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
              {(['plans', 'subscription', 'referral'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab ? '#1F2937' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'plans' ? 'Plans' : tab === 'subscription' ? 'My Subscription' : 'Referrals'}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
            ) : (
              <>
                {activeTab === 'plans' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    {plans.map(plan => (
                      <div
                        key={plan.id}
                        style={{
                          background: 'white',
                          borderRadius: '20px',
                          padding: '32px',
                          boxShadow: plan.popular ? '0 8px 30px rgba(139, 92, 246, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
                          border: plan.popular ? '2px solid #8B5CF6' : '2px solid transparent',
                          position: 'relative'
                        }}
                      >
                        {plan.popular && (
                          <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#8B5CF6',
                            color: 'white',
                            padding: '4px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            Most Popular
                          </div>
                        )}
                        
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: getTierColor(plan.tier) }}>
                            {plan.name}
                          </h3>
                          <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>{plan.description}</p>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                          <span style={{ fontSize: '48px', fontWeight: 700 }}>
                            ${billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12)}
                          </span>
                          <span style={{ color: '#6B7280' }}>/mo</span>
                          {billingCycle === 'yearly' && plan.yearlyPrice > 0 && (
                            <div style={{ fontSize: '14px', color: '#6B7280' }}>
                              ${plan.yearlyPrice} billed annually
                            </div>
                          )}
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                          {plan.features.map((feature, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                              <span style={{ color: '#10B981' }}>✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => subscribeToPlan(plan.id)}
                          disabled={subscription?.planId === plan.id}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: subscription?.planId === plan.id ? '#D1D5DB' : getTierColor(plan.tier),
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '16px',
                            cursor: subscription?.planId === plan.id ? 'default' : 'pointer'
                          }}
                        >
                          {subscription?.planId === plan.id ? 'Current Plan' : plan.monthlyPrice === 0 ? 'Get Started' : 'Subscribe'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {subscription ? (
                      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Your Subscription</h3>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ color: '#6B7280' }}>Plan</span>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{subscription.tier}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
                            <span style={{ color: '#6B7280' }}>Status</span>
                            <span style={{ fontWeight: 600, color: '#10B981', textTransform: 'capitalize' }}>{subscription.status}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                            <span style={{ color: '#6B7280' }}>Renews</span>
                            <span style={{ fontWeight: 600 }}>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Active Subscription</h3>
                        <p style={{ color: '#6B7280', marginBottom: '24px' }}>Choose a plan to get started</p>
                        <button
                          onClick={() => setActiveTab('plans')}
                          style={{ padding: '12px 24px', background: '#1F2937', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          View Plans
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'referral' && (
                  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Referral Program</h3>
                      <p style={{ color: '#6B7280', marginBottom: '24px' }}>Earn 15% commission for each referral</p>
                      
                      {referralCodes.length > 0 ? (
                        <div style={{ marginBottom: '24px' }}>
                          {referralCodes.map(code => (
                            <div key={code.id} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 600 }}>{code.code}</div>
                                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{code.uses} uses | {code.discount}% discount</div>
                                </div>
                                <button
                                  onClick={() => navigator.clipboard.writeText(code.code)}
                                  style={{ padding: '8px 16px', background: '#E5E7EB', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>No referral codes yet</p>
                      )}

                      <button
                        onClick={createReferralCode}
                        disabled={!walletState.address}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: walletState.address ? '#1F2937' : '#D1D5DB',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          cursor: walletState.address ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Generate Referral Code
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
