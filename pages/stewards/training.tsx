import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SiteLayout } from '../../components/navigation';
import { 
  trainingTiers, 
  trainingSeasons,
  calculateTotalTrainingHours,
  stewardCovenant,
  seasonalMilestones,
  TrainingTier,
  TrainingSeason
} from '../../lib/stewardTraining';

const trainingHeroImage = "/images/steward_training_hero.png";

export default function StewardTrainingPage() {
  const router = useRouter();
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const hours = calculateTotalTrainingHours();

  useEffect(() => {
    async function loadProgram() {
      try {
        const res = await fetch('/api/stewards/training/programs');
        if (res.ok) {
          const data = await res.json();
          if (data.programs && data.programs.length > 0) {
            setActiveProgram(data.programs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load training programs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgram();
  }, []);

  const handleEnroll = (tierId: string) => {
    router.push(`/stewards/training/enroll?tier=${tierId}`);
  };

  return (
    <SiteLayout>
      <Head>
        <title>12-Month Steward Training Program | Axiom Protocol</title>
        <meta name="description" content="Comprehensive 12-month training through all four seasons. Learn to grow, manage, and steward land through spring, summer, fall, and winter." />
      </Head>

      <main style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <section style={{
          padding: '80px 24px 60px',
          background: 'linear-gradient(135deg, rgba(0, 163, 137, 0.05) 0%, rgba(123, 104, 238, 0.05) 100%)',
          position: 'relative'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(0, 163, 137, 0.1)',
                  borderRadius: '9999px',
                  marginBottom: '24px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00A389' }} />
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: '#00A389',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    COMPREHENSIVE 12-MONTH PROGRAM
                  </span>
                </div>
                
                <h1 style={{ 
                  fontSize: '48px', 
                  fontWeight: 700, 
                  color: '#1F2937',
                  marginBottom: '16px',
                  lineHeight: 1.1
                }}>
                  Steward Corps<br />Training Program
                </h1>
                
                <p style={{ 
                  fontSize: '18px', 
                  color: '#6B7280',
                  marginBottom: '32px',
                  lineHeight: 1.6
                }}>
                  Become a certified Axiom Steward through our comprehensive 12-month training program. 
                  Learn to grow and manage land through <strong>all four seasons</strong> - from spring planting 
                  to winter planning - earning land access and AXUSD rewards upon graduation.
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#00A389' }}>12</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Months</div>
                  </div>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#7B68EE' }}>4</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Seasons</div>
                  </div>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>{hours.total}+</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Hours</div>
                  </div>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>Lifetime</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Covenant</div>
                  </div>
                </div>

                <a 
                  href="#tiers"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '16px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(0, 163, 137, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                >
                  View Training Tiers
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3L17 10L10 17M17 10H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>

              <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
              }}>
                <img 
                  src={trainingHeroImage}
                  alt="Steward Corps Training"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop';
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 24px', background: '#F9FAFB' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                Learn Through All Four Seasons
              </h2>
              <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '700px', margin: '0 auto' }}>
                Our 12-month program ensures you experience the complete agricultural cycle - 
                from spring planting to winter planning - preparing you to steward land in any condition.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {trainingSeasons.map((season, index) => (
                <div 
                  key={season.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: index % 2 === 0 ? '1fr 2fr' : '2fr 1fr',
                    gap: '32px',
                    padding: '32px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: `2px solid ${season.color}20`
                  }}
                >
                  {index % 2 === 0 ? (
                    <>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px',
                        background: `${season.color}10`,
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{season.icon}</div>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, color: season.color, marginBottom: '4px' }}>
                          {season.name}
                        </h3>
                        <div style={{ fontSize: '15px', color: '#6B7280' }}>{season.months}</div>
                        <div style={{ 
                          marginTop: '16px',
                          padding: '8px 16px',
                          background: season.color,
                          color: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600
                        }}>
                          {season.totalHours} Hours
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: '15px', color: '#374151', marginBottom: '20px', lineHeight: 1.7 }}>
                          {season.description}
                        </p>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px', textTransform: 'uppercase' }}>
                          Key Focus Areas
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                          {season.focus.map((item, i) => (
                            <span 
                              key={i}
                              style={{
                                padding: '6px 12px',
                                background: '#F3F4F6',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#4B5563'
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px', textTransform: 'uppercase' }}>
                          Field Activities
                        </h4>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {season.fieldActivities.map((activity, i) => (
                            <li 
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 0',
                                fontSize: '14px',
                                color: '#6B7280'
                              }}
                            >
                              <span style={{ color: season.color }}>✓</span>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p style={{ fontSize: '15px', color: '#374151', marginBottom: '20px', lineHeight: 1.7 }}>
                          {season.description}
                        </p>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px', textTransform: 'uppercase' }}>
                          Key Focus Areas
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                          {season.focus.map((item, i) => (
                            <span 
                              key={i}
                              style={{
                                padding: '6px 12px',
                                background: '#F3F4F6',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#4B5563'
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '12px', textTransform: 'uppercase' }}>
                          Field Activities
                        </h4>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {season.fieldActivities.map((activity, i) => (
                            <li 
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 0',
                                fontSize: '14px',
                                color: '#6B7280'
                              }}
                            >
                              <span style={{ color: season.color }}>✓</span>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px',
                        background: `${season.color}10`,
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{season.icon}</div>
                        <h3 style={{ fontSize: '24px', fontWeight: 700, color: season.color, marginBottom: '4px' }}>
                          {season.name}
                        </h3>
                        <div style={{ fontSize: '15px', color: '#6B7280' }}>{season.months}</div>
                        <div style={{ 
                          marginTop: '16px',
                          padding: '8px 16px',
                          background: season.color,
                          color: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600
                        }}>
                          {season.totalHours} Hours
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 24px', background: '#1F2937' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📜</div>
            <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              The Lifetime Steward Covenant
            </h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: 1.7 }}>
              Upon completing your 12-month training journey, you will sign the Steward Covenant - 
              a lifetime commitment to land stewardship and community service. This is not a job; 
              it's a calling.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {stewardCovenant.commitments.slice(0, 6).map((commitment, i) => (
                <div 
                  key={i}
                  style={{
                    padding: '24px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#D4AF37',
                    borderRadius: '10px',
                    margin: '0 auto 16px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1F2937'
                  }}>
                    {i + 1}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
                    {commitment.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tiers" style={{ padding: '80px 24px', background: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                Choose Your Training Path
              </h2>
              <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '600px', margin: '0 auto' }}>
                All tiers include the full 12-month training program with seasonal field experiences.
                Your investment level determines your AXUSD reward and land priority.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {trainingTiers.map((tier) => (
                <div 
                  key={tier.id}
                  style={{
                    background: tier.id === 'premium' ? 'linear-gradient(135deg, #1F2937 0%, #374151 100%)' : 'white',
                    border: tier.id === 'premium' ? 'none' : '2px solid #E5E7EB',
                    borderRadius: '20px',
                    padding: '32px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {tier.id === 'premium' && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      padding: '6px 12px',
                      background: '#D4AF37',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Most Popular
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px' }}>{tier.badge}</span>
                  </div>

                  <h3 style={{ 
                    fontSize: '22px', 
                    fontWeight: 700, 
                    color: tier.id === 'premium' ? 'white' : '#1F2937',
                    marginBottom: '8px'
                  }}>
                    {tier.name}
                  </h3>

                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ 
                      fontSize: '36px', 
                      fontWeight: 700, 
                      color: tier.color 
                    }}>
                      {tier.displayPrice}
                    </span>
                    <span style={{ 
                      fontSize: '14px', 
                      color: tier.id === 'premium' ? 'rgba(255,255,255,0.6)' : '#6B7280',
                      marginLeft: '8px'
                    }}>
                      /12 months
                    </span>
                  </div>

                  <div style={{ 
                    fontSize: '14px', 
                    color: tier.id === 'premium' ? 'rgba(255,255,255,0.7)' : '#6B7280',
                    marginBottom: '24px'
                  }}>
                    Or ${tier.monthlyPrice}/month • ${tier.quarterlyPrice}/quarter
                  </div>

                  <p style={{ 
                    fontSize: '14px', 
                    color: tier.id === 'premium' ? 'rgba(255,255,255,0.8)' : '#6B7280',
                    marginBottom: '24px',
                    lineHeight: 1.6
                  }}>
                    {tier.description}
                  </p>

                  <div style={{
                    padding: '16px',
                    background: tier.id === 'premium' ? 'rgba(212,175,55,0.15)' : `${tier.color}10`,
                    borderRadius: '12px',
                    marginBottom: '24px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 700, 
                      color: tier.color 
                    }}>
                      {tier.axusdReward.toLocaleString()} AXUSD
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: tier.id === 'premium' ? 'rgba(255,255,255,0.7)' : '#6B7280' 
                    }}>
                      Graduation Reward
                    </div>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                    {tier.benefits.map((benefit, i) => (
                      <li 
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '8px 0',
                          fontSize: '14px',
                          color: tier.id === 'premium' ? 'rgba(255,255,255,0.9)' : '#374151'
                        }}
                      >
                        <span style={{ color: tier.color, flexShrink: 0 }}>✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleEnroll(tier.id)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: tier.id === 'premium' 
                        ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)'
                        : `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}DD 100%)`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                  >
                    {tier.id === 'scholarship' ? 'Apply for Scholarship' : 'Enroll Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 24px', background: '#F9FAFB' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
              Ready to Begin Your Stewardship Journey?
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '24px' }}>
              Join the next cohort and learn to steward land through all four seasons.
            </p>
            <a 
              href="#tiers"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0, 163, 137, 0.3)'
              }}
            >
              Start Your Application
            </a>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
