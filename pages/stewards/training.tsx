import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SiteLayout } from '../../components/navigation';
import { 
  trainingTiers, 
  trainingPhases, 
  calculateTotalTrainingHours,
  stewardCovenant,
  TrainingTier 
} from '../../lib/stewardTraining';

const trainingHeroImage = "/images/steward_training_hero.png";

export default function StewardTrainingPage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
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
        <title>Steward Corps Training Program | Axiom Protocol</title>
        <meta name="description" content="World-class training for land stewardship. Online, classroom, and field training with lifetime covenant commitment." />
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
                    WORLD-CLASS TRAINING
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
                  Become a certified Axiom Steward through our comprehensive training program. 
                  Complete online, classroom, and field training to earn land access and AXUSD allocation.
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#00A389' }}>{hours.total}+</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Training Hours</div>
                  </div>
                  <div style={{
                    padding: '16px 24px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#7B68EE' }}>3</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Training Phases</div>
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

        <section style={{ padding: '80px 24px', background: '#FFFFFF' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                Three Phases of Training
              </h2>
              <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '600px', margin: '0 auto' }}>
                Our comprehensive curriculum prepares you for every aspect of land stewardship
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
              {trainingPhases.map((phase, index) => (
                <div 
                  key={phase.id}
                  style={{
                    padding: '32px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '4px',
                    background: index === 0 ? '#00A389' : index === 1 ? '#7B68EE' : '#D4AF37'
                  }} />
                  
                  <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '16px'
                  }}>
                    {phase.icon}
                  </div>
                  
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: 'rgba(0, 163, 137, 0.1)',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#00A389',
                    marginBottom: '12px'
                  }}>
                    Phase {index + 1} - {phase.duration}
                  </div>
                  
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '12px' }}>
                    {phase.name}
                  </h3>
                  
                  <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.6 }}>
                    {phase.description}
                  </p>
                  
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {phase.requirements.map((req, i) => (
                      <li 
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#4B5563',
                          marginBottom: '8px'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                          <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#00A389" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tiers" style={{ padding: '80px 24px', background: '#F9FAFB' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                Choose Your Training Tier
              </h2>
              <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '600px', margin: '0 auto' }}>
                Select the tier that matches your commitment level. All tiers receive full training access.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {trainingTiers.map((tier) => (
                <div 
                  key={tier.id}
                  style={{
                    padding: '32px',
                    background: 'white',
                    borderRadius: '16px',
                    border: selectedTier === tier.id ? `2px solid ${tier.color}` : '1px solid #E5E7EB',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: selectedTier === tier.id ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.id === 'premium' && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 16px',
                      background: tier.color,
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      RECOMMENDED
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>{tier.badge}</div>
                    <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
                      {tier.name}
                    </h3>
                    <div style={{ fontSize: '36px', fontWeight: 700, color: tier.color }}>
                      {tier.displayPrice}
                    </div>
                  </div>

                  <p style={{ 
                    fontSize: '14px', 
                    color: '#6B7280', 
                    textAlign: 'center',
                    marginBottom: '24px',
                    lineHeight: 1.6
                  }}>
                    {tier.description}
                  </p>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                    {tier.benefits.map((benefit, i) => (
                      <li 
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          fontSize: '14px',
                          color: '#4B5563',
                          marginBottom: '12px'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                          <circle cx="8" cy="8" r="8" fill={tier.color} fillOpacity="0.1"/>
                          <path d="M11 6L7 10L5 8" stroke={tier.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnroll(tier.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: tier.id === 'premium' 
                        ? `linear-gradient(135deg, ${tier.color} 0%, #B8860B 100%)`
                        : tier.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                  >
                    {tier.id === 'scholarship' ? 'Apply for Scholarship' : 'Enroll Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 24px', background: '#FFFFFF' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                The Steward Covenant
              </h2>
              <p style={{ fontSize: '18px', color: '#6B7280', lineHeight: 1.6 }}>
                {stewardCovenant.preamble}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 163, 137, 0.05) 0%, rgba(123, 104, 238, 0.05) 100%)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(0, 163, 137, 0.2)'
            }}>
              {stewardCovenant.commitments.map((commitment, index) => (
                <div 
                  key={commitment.id}
                  style={{
                    padding: '20px 0',
                    borderBottom: index < stewardCovenant.commitments.length - 1 ? '1px solid rgba(0, 163, 137, 0.1)' : 'none'
                  }}
                >
                  <h4 style={{ 
                    fontSize: '18px', 
                    fontWeight: 600, 
                    color: '#1F2937',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#00A389',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      {index + 1}
                    </span>
                    {commitment.title}
                  </h4>
                  <p style={{ fontSize: '15px', color: '#6B7280', marginLeft: '40px', lineHeight: 1.6 }}>
                    {commitment.text}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '32px',
              padding: '24px',
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(212, 175, 55, 0.3)'
            }}>
              <p style={{ fontSize: '16px', color: '#1F2937', fontWeight: 500 }}>
                Upon successful completion of all training phases, you will sign this Covenant 
                as part of your graduation ceremony.
              </p>
            </div>
          </div>
        </section>

        <section style={{ 
          padding: '80px 24px', 
          background: 'linear-gradient(135deg, #00A389 0%, #00897B 100%)',
          color: 'white'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>
              Ready to Begin Your Journey?
            </h2>
            <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '32px' }}>
              Join the next cohort of Axiom Stewards and make a lifetime commitment to land stewardship.
            </p>
            <a 
              href="#tiers"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                background: 'white',
                color: '#00A389',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            >
              Choose Your Tier
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L17 10L10 17M17 10H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
