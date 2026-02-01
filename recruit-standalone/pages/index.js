import React, { useState } from 'react';
import Head from 'next/head';

const API_URL = 'https://axiomprotocol.app/api/stewards/interest';

const REGIONS = [
  { id: 'atlanta', name: 'Atlanta Metro', icon: '🏙️' },
  { id: 'houston', name: 'Houston Area', icon: '🤠' },
  { id: 'chicago', name: 'Chicago Region', icon: '🌆' },
  { id: 'brooklyn', name: 'Brooklyn/NYC', icon: '🗽' },
  { id: 'la', name: 'Los Angeles', icon: '🌴' },
  { id: 'miami', name: 'Miami/South FL', icon: '🌊' },
  { id: 'dallas', name: 'Dallas/DFW', icon: '⛪' },
  { id: 'detroit', name: 'Detroit', icon: '🚗' },
  { id: 'philly', name: 'Philadelphia', icon: '🔔' },
  { id: 'dc', name: 'Washington DC', icon: '🏛️' },
  { id: 'other', name: 'Other Region', icon: '🌍' }
];

const BENEFITS = [
  { icon: '🌾', title: 'First Access to Land', description: 'Priority access to activated properties and produce drops in your region' },
  { icon: '👥', title: 'Lead Your Community', description: 'Coordinate participation and build real connections with neighbors' },
  { icon: '📈', title: 'Build Your Reputation', description: 'On-chain recognition for stewardship activities and contributions' },
  { icon: '🎓', title: 'Training & Support', description: 'Full onboarding, playbooks, and ongoing guidance from the Corps' }
];

const WHAT_STEWARDS_DO = [
  'Coordinate produce drop events in your area',
  'Connect landowners with activation opportunities',
  'Organize participant groups for community activities',
  'Identify and surface land acquisition opportunities',
  'Maintain regional relationships and communication'
];

export default function RecruitPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    city: '',
    state: '',
    motivation: '',
    source: 'subdomain'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.name || !form.email || !form.region) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Thank You | Steward Corps</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            background: '#FFFFFF',
            padding: '48px',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '36px',
              color: '#FFFFFF'
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
              You're In!
            </h1>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px', lineHeight: 1.6 }}>
              We've received your interest in becoming a Steward. Our team will reach out within 48 hours to discuss next steps.
            </p>
            <a 
              href="https://axiomprotocol.app/stewards"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: '#00D4AA',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Learn More About the Corps
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Become a Steward | Axiom Land Corps</title>
        <meta name="description" content="Join 250 stewards coordinating land activation across America. Lead your community, access land first, build your reputation." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ minHeight: '100vh', background: '#FAFBFC' }}>
        <header style={{
          padding: '16px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <a href="https://axiomprotocol.app" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#1F2937',
              fontSize: '14px'
            }}>
              AX
            </div>
            <span style={{ fontWeight: 600, fontSize: '18px', color: '#1F2937' }}>Axiom</span>
          </a>
          <a 
            href="https://axiomprotocol.app/stewards"
            style={{
              padding: '10px 20px',
              background: '#1F2937',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            About Stewards
          </a>
        </header>

        <section style={{
          padding: '80px 24px 60px',
          background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
          color: '#FFFFFF',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50px',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '16px' }}>🌱</span>
              <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em' }}>
                NOW RECRUITING
              </span>
            </div>
            
            <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '20px', lineHeight: 1.1 }}>
              Lead the Land Movement
            </h1>
            
            <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              We're building a corps of 250 stewards to coordinate land activation across America. 
              Be the first to access properties, lead produce drops, and shape your community's future.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 700 }}>250</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Stewards Needed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 700 }}>10+</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Regions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 700 }}>90</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Days to Launch</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
              
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1F2937', marginBottom: '24px' }}>
                  Why Become a Steward?
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {BENEFITS.map((benefit, i) => (
                    <div key={i} style={{
                      background: '#FFFFFF',
                      padding: '20px',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(0, 212, 170, 0.1)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          flexShrink: 0
                        }}>
                          {benefit.icon}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: '0 0 4px 0' }}>
                            {benefit.title}
                          </h3>
                          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
                    What Stewards Do
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {WHAT_STEWARDS_DO.map((item, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: '#4B5563' }}>
                        <span style={{ color: '#00D4AA' }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '32px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
                    Express Your Interest
                  </h2>
                  <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                    No commitment required. We'll reach out to discuss the opportunity.
                  </p>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Your Region *
                      </label>
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          fontSize: '15px',
                          outline: 'none',
                          background: '#FFFFFF'
                        }}
                      >
                        <option value="">Select your region</option>
                        {REGIONS.map(r => (
                          <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          City
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="City"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid #E5E7EB',
                            fontSize: '15px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          State
                        </label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          placeholder="State"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid #E5E7EB',
                            fontSize: '15px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        Why do you want to be a Steward? (optional)
                      </label>
                      <textarea
                        value={form.motivation}
                        onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                        placeholder="Tell us about your interest..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          fontSize: '15px',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {error && (
                      <div style={{
                        padding: '12px 16px',
                        background: '#FEE2E2',
                        color: '#DC2626',
                        borderRadius: '10px',
                        fontSize: '14px'
                      }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1
                      }}
                    >
                      {submitting ? 'Submitting...' : 'I Want to Be a Steward'}
                    </button>

                    <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
                      We'll never share your information. See our{' '}
                      <a href="https://axiomprotocol.app/privacy-policy" style={{ color: '#00D4AA' }}>privacy policy</a>.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{
          padding: '60px 24px',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#1F2937', marginBottom: '32px' }}>
              Already know you're ready?
            </h2>
            <a
              href="https://axiomprotocol.app/stewards/apply"
              style={{
                display: 'inline-block',
                padding: '16px 40px',
                background: '#1F2937',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Apply Now (Full Application)
            </a>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '16px' }}>
              The full application requires wallet connection and detailed responses.
            </p>
          </div>
        </section>

        <footer style={{
          padding: '40px 24px',
          background: '#1F2937',
          color: '#9CA3AF',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            © 2026 Axiom Protocol. Part of the{' '}
            <a href="https://axiomprotocol.app" style={{ color: '#00D4AA' }}>Axiom Smart City</a> ecosystem.
          </p>
        </footer>
      </main>
    </>
  );
}
