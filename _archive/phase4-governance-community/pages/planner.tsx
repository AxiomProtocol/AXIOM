import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { usePersonalization, INTEREST_CONFIGS } from '../lib/usePersonalization';
import { useWallet } from '../components/WalletConnect/WalletContext';

interface ProgramContribution {
  programId: string;
  name: string;
  icon: string;
  currentMonthly: number;
  suggestedMonthly: number;
  totalContributed: number;
  progress: number;
  goal?: number;
  nextMilestone?: string;
}

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  linkedPrograms: string[];
}

interface ProjectedOutcome {
  timeframe: string;
  totalSaved: number;
  estimatedReturns: number;
  milestones: string[];
}

export default function CrossProgramPlanner() {
  const { preferences } = usePersonalization();
  const { walletState } = useWallet();
  
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000);
  const [savingsRate, setSavingsRate] = useState<number>(20);
  const [contributions, setContributions] = useState<ProgramContribution[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [projections, setProjections] = useState<ProjectedOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'goals' | 'projections'>('overview');

  useEffect(() => {
    loadUserData();
  }, [walletState?.address]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const defaultContributions: ProgramContribution[] = [];
      
      if (preferences.interests.includes('susu')) {
        defaultContributions.push({
          programId: 'susu',
          name: 'Savings Circles (SUSU)',
          icon: '💰',
          currentMonthly: 0,
          suggestedMonthly: 200,
          totalContributed: 0,
          progress: 0,
          goal: 2400,
          nextMilestone: 'Join your first circle'
        });
      }
      
      if (preferences.interests.includes('land')) {
        defaultContributions.push({
          programId: 'land',
          name: 'Land Stewardship',
          icon: '🌍',
          currentMonthly: 0,
          suggestedMonthly: 150,
          totalContributed: 0,
          progress: 0,
          goal: 5000,
          nextMilestone: 'Make first land contribution'
        });
      }
      
      if (preferences.interests.includes('staking')) {
        defaultContributions.push({
          programId: 'staking',
          name: 'Staking & Rewards',
          icon: '🌾',
          currentMonthly: 0,
          suggestedMonthly: 100,
          totalContributed: 0,
          progress: 0,
          goal: 1000,
          nextMilestone: 'Stake first 100 AXM'
        });
      }
      
      if (preferences.interests.includes('training')) {
        defaultContributions.push({
          programId: 'training',
          name: 'Steward Corps Training',
          icon: '📚',
          currentMonthly: 0,
          suggestedMonthly: 50,
          totalContributed: 0,
          progress: 0,
          goal: 600,
          nextMilestone: 'Enroll in training program'
        });
      }

      if (defaultContributions.length === 0) {
        defaultContributions.push({
          programId: 'general',
          name: 'General Savings',
          icon: '💵',
          currentMonthly: 0,
          suggestedMonthly: 300,
          totalContributed: 0,
          progress: 0,
          goal: 3600,
          nextMilestone: 'Set up automated savings'
        });
      }

      setContributions(defaultContributions);
      
      setGoals([
        {
          id: '1',
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 0,
          deadline: '2026-12-31',
          linkedPrograms: ['susu']
        },
        {
          id: '2',
          name: 'Land Ownership Stake',
          targetAmount: 5000,
          currentAmount: 0,
          deadline: '2027-06-30',
          linkedPrograms: ['land']
        }
      ]);
      
      calculateProjections(defaultContributions);
    } catch (error) {
      console.error('Error loading planner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = (contribs: ProgramContribution[]) => {
    const monthlyTotal = contribs.reduce((sum, c) => sum + c.suggestedMonthly, 0);
    const estimatedAPY = 0.08;
    
    const projectionData: ProjectedOutcome[] = [
      {
        timeframe: '6 Months',
        totalSaved: monthlyTotal * 6,
        estimatedReturns: monthlyTotal * 6 * (estimatedAPY / 2),
        milestones: ['Complete 2 SUSU cycles', 'First land contribution milestone']
      },
      {
        timeframe: '1 Year',
        totalSaved: monthlyTotal * 12,
        estimatedReturns: monthlyTotal * 12 * estimatedAPY,
        milestones: ['SUSU payout received', 'Land ownership stake acquired', 'Steward Corps foundation complete']
      },
      {
        timeframe: '3 Years',
        totalSaved: monthlyTotal * 36,
        estimatedReturns: monthlyTotal * 36 * (estimatedAPY * 2.5),
        milestones: ['Full land ownership', 'Multiple income streams active', 'Community leadership role']
      }
    ];
    
    setProjections(projectionData);
  };

  const updateContribution = (programId: string, newAmount: number) => {
    setContributions(prev => 
      prev.map(c => c.programId === programId ? { ...c, suggestedMonthly: newAmount } : c)
    );
  };

  const totalMonthlyContribution = contributions.reduce((sum, c) => sum + c.suggestedMonthly, 0);
  const availableBudget = monthlyIncome * (savingsRate / 100);

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <p style={{ color: '#6B7280' }}>Loading your planner...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Contribution Planner | Axiom</title>
        <meta name="description" content="Plan your contributions across Axiom programs" />
      </Head>
      <Layout>
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
            color: 'white',
            padding: '48px 24px'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
                Cross-Program Planner
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9 }}>
                Plan and optimize your contributions across all Axiom programs.
              </p>
            </div>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
              {['overview', 'programs', 'goals', 'projections'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === tab ? '#1F2937' : 'white',
                    color: activeTab === tab ? 'white' : '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E5E7EB'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                    Your Financial Profile
                  </h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Monthly Income
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>$</span>
                      <input
                        type="number"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '2px solid #E5E7EB',
                          borderRadius: '10px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Savings Rate: {savingsRate}%
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={savingsRate}
                      onChange={(e) => setSavingsRate(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                      <span>5%</span>
                      <span>50%</span>
                    </div>
                  </div>
                  
                  <div style={{
                    background: '#F0FDF4',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>
                      Available for Savings
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>
                      ${availableBudget.toLocaleString()}/mo
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E5E7EB'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                    Contribution Summary
                  </h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>Planned Monthly</span>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>${totalMonthlyContribution}</span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: '#E5E7EB',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((totalMonthlyContribution / availableBudget) * 100, 100)}%`,
                        background: totalMonthlyContribution > availableBudget ? '#EF4444' : '#10B981',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: totalMonthlyContribution > availableBudget ? '#EF4444' : '#6B7280',
                      marginTop: '4px'
                    }}>
                      {totalMonthlyContribution > availableBudget 
                        ? `$${(totalMonthlyContribution - availableBudget).toFixed(0)} over budget`
                        : `$${(availableBudget - totalMonthlyContribution).toFixed(0)} remaining`
                      }
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {contributions.slice(0, 3).map(contrib => (
                      <div 
                        key={contrib.programId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: '#F9FAFB',
                          borderRadius: '10px'
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{contrib.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>{contrib.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>${contrib.suggestedMonthly}/mo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  gridColumn: 'span 2'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#3730A3', marginBottom: '16px' }}>
                    📈 1-Year Projection
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#4338CA', marginBottom: '4px' }}>Total Saved</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#3730A3' }}>
                        ${(totalMonthlyContribution * 12).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#4338CA', marginBottom: '4px' }}>Est. Returns</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#3730A3' }}>
                        ${(totalMonthlyContribution * 12 * 0.08).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#4338CA', marginBottom: '4px' }}>Total Value</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#3730A3' }}>
                        ${(totalMonthlyContribution * 12 * 1.08).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'programs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {contributions.map(contrib => (
                  <div
                    key={contrib.programId}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: '#F0FDF4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px'
                      }}>
                        {contrib.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{contrib.name}</h4>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>{contrib.nextMilestone}</p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                        Monthly Contribution: ${contrib.suggestedMonthly}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="25"
                        value={contrib.suggestedMonthly}
                        onChange={(e) => updateContribution(contrib.programId, Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                        <span>$0</span>
                        <span>$500</span>
                      </div>
                    </div>
                    
                    {contrib.goal && (
                      <div style={{
                        background: '#F9FAFB',
                        borderRadius: '10px',
                        padding: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span style={{ color: '#6B7280' }}>Goal Progress</span>
                          <span style={{ fontWeight: 500 }}>{contrib.progress}%</span>
                        </div>
                        <div style={{
                          height: '6px',
                          background: '#E5E7EB',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${contrib.progress}%`,
                            background: '#10B981',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
                          ${contrib.totalContributed.toLocaleString()} of ${contrib.goal.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'goals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {goals.map(goal => (
                  <div
                    key={goal.id}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 600 }}>{goal.name}</h4>
                      {goal.deadline && (
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                          Due: {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ color: '#6B7280' }}>${goal.currentAmount.toLocaleString()}</span>
                        <span style={{ fontWeight: 500 }}>${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: '#E5E7EB',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(goal.currentAmount / goal.targetAmount) * 100}%`,
                          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {goal.linkedPrograms.map(prog => {
                        const contrib = contributions.find(c => c.programId === prog);
                        return contrib ? (
                          <span 
                            key={prog}
                            style={{
                              padding: '6px 12px',
                              background: '#F0FDF4',
                              borderRadius: '16px',
                              fontSize: '12px',
                              color: '#059669'
                            }}
                          >
                            {contrib.icon} {contrib.name.split(' ')[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
                
                <button
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px dashed #E5E7EB',
                    borderRadius: '16px',
                    fontSize: '16px',
                    color: '#6B7280',
                    cursor: 'pointer'
                  }}
                >
                  + Add New Goal
                </button>
              </div>
            )}

            {activeTab === 'projections' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {projections.map(projection => (
                  <div
                    key={projection.timeframe}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <h4 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>
                      {projection.timeframe}
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>Total Saved</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
                          ${projection.totalSaved.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: '#EEF2FF', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#3730A3', marginBottom: '4px' }}>Est. Returns</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#4F46E5' }}>
                          +${projection.estimatedReturns.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#92400E', marginBottom: '4px' }}>Total Value</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>
                          ${(projection.totalSaved + projection.estimatedReturns).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                        Expected Milestones
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {projection.milestones.map((milestone, idx) => (
                          <div 
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 14px',
                              background: '#F9FAFB',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          >
                            <span style={{ color: '#10B981' }}>✓</span>
                            {milestone}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
