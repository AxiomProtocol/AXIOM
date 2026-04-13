import { useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

const DL = {
  navy:    '#1B2A4A',
  forest:  '#1D3D2A',
  gold:    '#B8973A',
  muted:   'rgba(27,42,74,0.50)',
  border:  'rgba(27,42,74,0.18)',
  surface: '#F8F6F0',
  error:   '#991B1B',
};

const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11, color: 'rgba(27,42,74,0.60)', letterSpacing: '0.04em' };
const monoLabel: React.CSSProperties = { ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: 10 };
const serif = (size = 16, color = DL.navy): React.CSSProperties => ({ fontFamily: 'Georgia, serif', fontSize: size, color, fontWeight: 400 });

type Step = 'landing' | 'entity' | 'signer' | 'submitted';

const VALID_ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
  { value: 'state_id', label: 'State ID' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>{children}</label>;
}

function Input({ value, onChange, placeholder, type = 'text', required }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${DL.border}`, background: '#fff', fontFamily: 'monospace', fontSize: 13, color: DL.navy, outline: 'none', boxSizing: 'border-box' }}
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', border: `1px solid ${DL.border}`, background: '#fff', fontFamily: 'monospace', fontSize: 13, color: DL.navy, outline: 'none', boxSizing: 'border-box' }}
    >
      {children}
    </select>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export default function DaoAccountPage() {
  const [step, setStep] = useState<Step>('landing');

  const [entityName, setEntityName] = useState('');
  const [entityEin, setEntityEin] = useState('');
  const [entityAddress, setEntityAddress] = useState('');

  const [signerName, setSignerName] = useState('');
  const [signerDob, setSignerDob] = useState('');
  const [signerCountry, setSignerCountry] = useState('USA');
  const [signerIdType, setSignerIdType] = useState('passport');
  const [signerIdNumber, setSignerIdNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/banking/dao-account/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityName,
          entityEin,
          entityAddress,
          signerName,
          signerDob,
          signerCountry,
          signerIdType,
          signerIdNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Submission failed. Please try again.');
        return;
      }
      setSubmittedId(data.data.id);
      setStep('submitted');
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const entityValid = entityName.trim() && entityEin.replace(/\D/g, '').length === 9 && entityAddress.trim();
  const signerValid = signerName.trim() && signerDob && signerCountry.length === 3 && signerIdType && signerIdNumber.trim();

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ ...monoLabel, marginBottom: 8 }}>Axiom Banking / DAO Operating Accounts</p>
          <h1 style={{ ...serif(30), margin: '0 0 12px', fontWeight: 600 }}>DAO Operating Account</h1>
          <p style={{ ...mono, fontSize: 13, lineHeight: 1.7, maxWidth: 600, color: 'rgba(27,42,74,0.72)' }}>
            FDIC-insured USD operating accounts for DAOs and protocol contributors — powered by Increase and held at First Internet Bank.
            Receive payroll via Axiom Rail. Hold, manage, and spend operating capital in the same ecosystem.
          </p>
        </div>

        {step === 'landing' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: DL.border, border: `1px solid ${DL.border}`, marginBottom: 36 }}>
              {[
                { icon: '🏛', label: 'FDIC Insured', value: 'Up to $250,000' },
                { icon: '⚡', label: 'Powered By', value: 'Increase / First Internet Bank' },
                { icon: '🔗', label: 'Integrated With', value: 'Axiom Rail Payroll' },
              ].map(item => (
                <div key={item.label} style={{ background: DL.surface, padding: '20px 18px' }}>
                  <p style={{ ...monoLabel, marginBottom: 8 }}>{item.label}</p>
                  <p style={{ ...serif(14), fontWeight: 600 }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${DL.border}`, marginBottom: 32 }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${DL.border}`, background: DL.surface }}>
                <span style={{ ...monoLabel, color: DL.navy }}>What You Get</span>
              </div>
              {[
                ['Dedicated USD account', 'A dedicated FDIC-insured account in your DAO\'s name, separate from personal finances.'],
                ['Routing & account numbers', 'Standard ACH routing and account numbers for inbound wires and direct deposits.'],
                ['Axiom Rail integration', 'Send and receive funds through the same corridors that power DAO payroll.'],
                ['Transaction history', 'Live transaction history fetched directly from Increase.'],
              ].map(([title, desc]) => (
                <div key={title as string} style={{ padding: '14px 20px', borderBottom: `1px solid ${DL.border}`, display: 'flex', gap: 16 }}>
                  <div style={{ width: 18, height: 18, background: DL.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <p style={{ ...serif(14), fontWeight: 600, marginBottom: 3 }}>{title}</p>
                    <p style={{ ...mono, fontSize: 12, lineHeight: 1.6, color: 'rgba(27,42,74,0.65)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${DL.border}`, padding: 24, marginBottom: 32, background: '#FEF9E7', borderColor: DL.gold }}>
              <p style={{ ...monoLabel, color: DL.gold, marginBottom: 8 }}>Eligibility Requirements</p>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, color: 'rgba(27,42,74,0.72)' }}>
                Applicants must be a registered legal entity (LLC, DAO LLC, corporation, or equivalent) with a valid EIN.
                A designated signer with government-issued ID is required for BSA compliance.
                Applications are reviewed by Axiom Ops within 2–3 business days.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <button
                onClick={() => setStep('entity')}
                style={{ background: DL.navy, color: '#fff', border: `1px solid ${DL.navy}`, padding: '12px 28px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Apply for DAO Account →
              </button>
              <a
                href="/banking/dao-account/dashboard"
                style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}
              >
                Account Dashboard
              </a>
            </div>
            <p style={{ ...mono, fontSize: 11, color: DL.muted }}>
              Already have an account? Use your account token to access the dashboard.
            </p>
          </>
        )}

        {step === 'entity' && (
          <>
            <div style={{ display: 'flex', gap: 0, marginBottom: 32, border: `1px solid ${DL.border}` }}>
              {[
                { n: 1, label: 'Entity Information', active: true },
                { n: 2, label: 'Signer Identity (BSA)', active: false },
              ].map(s => (
                <div key={s.n} style={{ flex: 1, padding: '14px 20px', background: s.active ? DL.navy : DL.surface, borderRight: `1px solid ${DL.border}` }}>
                  <p style={{ ...monoLabel, color: s.active ? '#fff' : DL.muted }}>Step {s.n} of 2</p>
                  <p style={{ ...serif(14, s.active ? '#fff' : DL.navy), fontWeight: 600, marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${DL.border}`, padding: 28, marginBottom: 24 }}>
              <h2 style={{ ...serif(20), marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${DL.border}` }}>Entity Information</h2>

              <FieldGroup label="Legal Entity Name *">
                <Input value={entityName} onChange={setEntityName} placeholder="Acme DAO LLC" required />
                <p style={{ ...mono, fontSize: 10, marginTop: 4, color: DL.muted }}>Legal name as registered with your state.</p>
              </FieldGroup>

              <FieldGroup label="EIN (Employer Identification Number) *">
                <Input value={entityEin} onChange={setEntityEin} placeholder="12-3456789" required />
                <p style={{ ...mono, fontSize: 10, marginTop: 4, color: DL.muted }}>9-digit Federal Tax ID. Format: XX-XXXXXXX</p>
              </FieldGroup>

              <FieldGroup label="Registered Business Address *">
                <textarea
                  value={entityAddress}
                  onChange={e => setEntityAddress(e.target.value)}
                  placeholder="123 Main St, Suite 100, Austin, TX 78701"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${DL.border}`, background: '#fff', fontFamily: 'monospace', fontSize: 13, color: DL.navy, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
                <p style={{ ...mono, fontSize: 10, marginTop: 4, color: DL.muted }}>Street address, city, state, ZIP. Must match registration documents.</p>
              </FieldGroup>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep('landing')}
                style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent' }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('signer')}
                disabled={!entityValid}
                style={{ background: entityValid ? DL.navy : DL.muted, color: '#fff', border: 'none', padding: '12px 28px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: entityValid ? 'pointer' : 'not-allowed' }}
              >
                Next: Signer Identity →
              </button>
            </div>
          </>
        )}

        {step === 'signer' && (
          <>
            <div style={{ display: 'flex', gap: 0, marginBottom: 32, border: `1px solid ${DL.border}` }}>
              {[
                { n: 1, label: 'Entity Information', active: false },
                { n: 2, label: 'Signer Identity (BSA)', active: true },
              ].map(s => (
                <div key={s.n} style={{ flex: 1, padding: '14px 20px', background: s.active ? DL.navy : DL.surface, borderRight: `1px solid ${DL.border}` }}>
                  <p style={{ ...monoLabel, color: s.active ? '#fff' : DL.muted }}>Step {s.n} of 2</p>
                  <p style={{ ...serif(14, s.active ? '#fff' : DL.navy), fontWeight: 600, marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${DL.border}`, padding: 28, marginBottom: 24 }}>
              <h2 style={{ ...serif(20), marginBottom: 8 }}>Designated Signer — BSA Identity</h2>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.6, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${DL.border}`, color: 'rgba(27,42,74,0.65)' }}>
                Federal banking law (Bank Secrecy Act) requires identity verification for all account signers.
                This information is stored securely and never shared or displayed in API responses.
              </p>

              <FieldGroup label="Full Legal Name *">
                <Input value={signerName} onChange={setSignerName} placeholder="Jane Smith" required />
              </FieldGroup>

              <FieldGroup label="Date of Birth *">
                <Input value={signerDob} onChange={setSignerDob} type="date" required />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <FieldGroup label="Country of Citizenship *">
                  <Input value={signerCountry} onChange={v => setSignerCountry(v.toUpperCase().slice(0, 3))} placeholder="USA" required />
                  <p style={{ ...mono, fontSize: 10, marginTop: 4, color: DL.muted }}>3-letter ISO code (e.g. USA, GBR, CAN)</p>
                </FieldGroup>
                <FieldGroup label="ID Type *">
                  <Select value={signerIdType} onChange={setSignerIdType}>
                    {VALID_ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </FieldGroup>
              </div>

              <FieldGroup label="ID Number *">
                <Input value={signerIdNumber} onChange={setSignerIdNumber} placeholder="Passport or document number" required />
                <p style={{ ...mono, fontSize: 10, marginTop: 4, color: DL.muted }}>Number as printed on the document. Stored encrypted, never returned in API responses.</p>
              </FieldGroup>
            </div>

            {submitError && (
              <div style={{ border: `1px solid ${DL.error}`, padding: '12px 16px', marginBottom: 20, background: '#FEF2F2' }}>
                <p style={{ ...mono, fontSize: 12, color: DL.error }}>{submitError}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setStep('entity')}
                style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent' }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!signerValid || submitting}
                style={{ background: signerValid && !submitting ? DL.forest : DL.muted, color: '#fff', border: 'none', padding: '12px 28px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: signerValid && !submitting ? 'pointer' : 'not-allowed' }}
              >
                {submitting ? 'Submitting…' : 'Submit Application →'}
              </button>
            </div>
          </>
        )}

        {step === 'submitted' && (
          <div style={{ border: `1px solid ${DL.forest}`, padding: 32, background: 'rgba(29,61,42,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, background: DL.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p style={{ ...monoLabel, color: DL.forest }}>Application Received</p>
                <h2 style={{ ...serif(22, DL.forest), marginTop: 4 }}>Your application has been submitted</h2>
              </div>
            </div>

            <div style={{ border: `1px solid ${DL.border}`, padding: 20, marginBottom: 24, background: '#fff' }}>
              <p style={{ ...monoLabel, marginBottom: 12 }}>Application Details</p>
              {[
                ['Application ID', submittedId || '—'],
                ['Entity', entityName],
                ['Status', 'Pending Review'],
                ['Next Step', 'Axiom Ops will review within 2–3 business days'],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${DL.border}` }}>
                  <span style={monoLabel}>{label}</span>
                  <span style={{ ...mono, fontSize: 12, color: DL.navy }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, color: 'rgba(27,42,74,0.72)', marginBottom: 20 }}>
              Once your application is approved, Axiom Ops will provision your account via Increase and send you an account token.
              Use this token to access your account dashboard at{' '}
              <a href="/banking/dao-account/dashboard" style={{ color: DL.navy }}>
                /banking/dao-account/dashboard
              </a>.
            </p>

            <button
              onClick={() => {
                setStep('landing');
                setEntityName(''); setEntityEin(''); setEntityAddress('');
                setSignerName(''); setSignerDob(''); setSignerCountry('USA');
                setSignerIdType('passport'); setSignerIdNumber('');
                setSubmittedId(null);
              }}
              style={{ border: `1px solid ${DL.border}`, color: DL.navy, padding: '10px 20px', fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent' }}
            >
              ← Back to Overview
            </button>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
