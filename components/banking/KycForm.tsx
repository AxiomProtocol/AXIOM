import React, { useState } from 'react';

interface KycFormProps {
  onSubmit: (data: KycFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface KycFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export function KycForm({ onSubmit, loading, error }: KycFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<KycFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'US' },
  });

  const set = (field: keyof Omit<KycFormData, 'address'>, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));
  const setAddr = (field: keyof KycFormData['address'], value: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }));

  const inputCls = 'w-full border border-dl-border bg-white text-sm font-dl-mono text-dl-navy px-3 py-2 focus:outline-none focus:border-dl-navy';
  const labelCls = 'block text-xs font-dl-mono text-dl-muted uppercase tracking-wide mb-1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2 mb-6">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className={`flex-1 h-1 ${step >= s ? 'bg-dl-navy' : 'bg-dl-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-base font-dl-serif text-dl-navy">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input type="tel" className={inputCls} placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required />
          </div>
          <button type="button" onClick={() => setStep(2)} className="w-full bg-dl-navy text-white text-sm font-dl-mono py-2.5 hover:opacity-90 transition-opacity">
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-base font-dl-serif text-dl-navy">Identity Verification</h3>
          <div>
            <label className={labelCls}>Social Security Number</label>
            <input
              type="password"
              className={inputCls}
              placeholder="XXX-XX-XXXX"
              value={form.ssn}
              onChange={(e) => set('ssn', e.target.value)}
              autoComplete="off"
              required
            />
            <p className="text-xs font-dl-mono text-dl-muted mt-1">
              Your SSN is transmitted directly to our banking partner and never stored on Axiom servers.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 border border-dl-border text-dl-navy text-sm font-dl-mono py-2.5">
              Back
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 bg-dl-navy text-white text-sm font-dl-mono py-2.5 hover:opacity-90">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-base font-dl-serif text-dl-navy">Address</h3>
          <div>
            <label className={labelCls}>Street Address</label>
            <input className={inputCls} value={form.address.street} onChange={(e) => setAddr('street', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <select className={inputCls} value={form.address.state} onChange={(e) => setAddr('state', e.target.value)} required>
                <option value="">Select</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Postal Code</label>
            <input className={inputCls} value={form.address.postalCode} onChange={(e) => setAddr('postalCode', e.target.value)} required />
          </div>
          {error && <p className="text-sm font-dl-mono text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 border border-dl-border text-dl-navy text-sm font-dl-mono py-2.5">
              Back
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-dl-navy text-white text-sm font-dl-mono py-2.5 hover:opacity-90 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
