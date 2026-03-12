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
  occupation: string;
  annualIncome: string;
  sourceOfIncome: string;
}

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const OCCUPATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'ArchitectOrEngineer', label: 'Architect / Engineer' },
  { value: 'BusinessAnalystAccountantOrFinancialAdvisor', label: 'Business / Finance Professional' },
  { value: 'CommunityAndSocialServicesWorker', label: 'Community & Social Services' },
  { value: 'ConstructionMechanicOrMaintenanceWorker', label: 'Construction / Mechanic / Maintenance' },
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Educator', label: 'Educator' },
  { value: 'EntertainmentSportsArtsOrMedia', label: 'Entertainment / Sports / Arts / Media' },
  { value: 'ExecutiveOrManager', label: 'Executive / Manager' },
  { value: 'FarmerFishermanForester', label: 'Farmer / Fisherman / Forester' },
  { value: 'FoodServiceWorker', label: 'Food Service Worker' },
  { value: 'GigWorker', label: 'Gig Worker' },
  { value: 'HospitalityOfficeOrAdministrativeSupportWorker', label: 'Hospitality / Administrative Support' },
  { value: 'HouseholdManager', label: 'Household Manager' },
  { value: 'JanitorHousekeeperLandscaper', label: 'Janitor / Housekeeper / Landscaper' },
  { value: 'Lawyer', label: 'Lawyer' },
  { value: 'ManufacturingOrProductionWorker', label: 'Manufacturing / Production Worker' },
  { value: 'MilitaryOrPublicSafety', label: 'Military / Public Safety' },
  { value: 'NurseHealthcareTechnicianOrHealthcareSupport', label: 'Nurse / Healthcare' },
  { value: 'PersonalCareOrServiceWorker', label: 'Personal Care / Service Worker' },
  { value: 'PilotDriverOperator', label: 'Pilot / Driver / Operator' },
  { value: 'SalesRepresentativeBrokerAgent', label: 'Sales / Broker / Agent' },
  { value: 'ScientistOrTechnologist', label: 'Scientist / Technologist' },
  { value: 'Student', label: 'Student' },
];

const ANNUAL_INCOME_OPTIONS: { value: string; label: string }[] = [
  { value: 'UpTo10k', label: 'Under $10,000' },
  { value: 'Between10kAnd25k', label: '$10,000 – $25,000' },
  { value: 'Between25kAnd50k', label: '$25,000 – $50,000' },
  { value: 'Between50kAnd100k', label: '$50,000 – $100,000' },
  { value: 'Between100kAnd250k', label: '$100,000 – $250,000' },
  { value: 'Over250k', label: 'Over $250,000' },
];

const SOURCE_OF_INCOME_OPTIONS: { value: string; label: string }[] = [
  { value: 'EmploymentOrPayrollIncome', label: 'Employment / Payroll' },
  { value: 'PartTimeOrContractorIncome', label: 'Part-Time / Contractor' },
  { value: 'InheritancesAndGifts', label: 'Inheritances & Gifts' },
  { value: 'PersonalInvestments', label: 'Personal Investments' },
  { value: 'BusinessOwnershipInterests', label: 'Business Ownership' },
  { value: 'GovernmentBenefits', label: 'Government Benefits' },
];

export function KycForm({ onSubmit, loading, error }: KycFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<KycFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'US' },
    occupation: '',
    annualIncome: '',
    sourceOfIncome: '',
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

  const totalSteps = 4;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2 mb-6">
        {([1, 2, 3, 4] as const).map((s) => (
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
            <input type="tel" className={inputCls} placeholder="(555) 000-0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
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
          <h3 className="text-base font-dl-serif text-dl-navy">Home Address</h3>
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
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 border border-dl-border text-dl-navy text-sm font-dl-mono py-2.5">
              Back
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 bg-dl-navy text-white text-sm font-dl-mono py-2.5 hover:opacity-90">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-base font-dl-serif text-dl-navy">Employment & Income</h3>
          <div>
            <label className={labelCls}>Occupation</label>
            <select className={inputCls} value={form.occupation} onChange={(e) => set('occupation', e.target.value)} required>
              <option value="">Select occupation</option>
              {OCCUPATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Annual Income</label>
            <select className={inputCls} value={form.annualIncome} onChange={(e) => set('annualIncome', e.target.value)} required>
              <option value="">Select range</option>
              {ANNUAL_INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Primary Source of Income</label>
            <select className={inputCls} value={form.sourceOfIncome} onChange={(e) => set('sourceOfIncome', e.target.value)} required>
              <option value="">Select source</option>
              {SOURCE_OF_INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {error && <p className="text-sm font-dl-mono text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 border border-dl-border text-dl-navy text-sm font-dl-mono py-2.5">
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
