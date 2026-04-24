import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Logo3D from '../../components/Logo3D';

interface FormData {
  fullName: string;
  email: string;
  walletAddress: string;
  membershipType: 'founding' | 'standard' | 'associate';
  country: string;
  isOver18: boolean;
  acceptDeclaration: boolean;
  acceptBylaws: boolean;
  acceptMembership: boolean;
  acceptRisks: boolean;
  acceptPrivate: boolean;
}

export default function JoinPMA() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    walletAddress: '',
    membershipType: 'standard',
    country: '',
    isOver18: false,
    acceptDeclaration: false,
    acceptBylaws: false,
    acceptMembership: false,
    acceptRisks: false,
    acceptPrivate: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const canProceedStep1 = formData.fullName && formData.email && formData.walletAddress && formData.country && formData.isOver18;
  const canProceedStep2 = formData.acceptDeclaration && formData.acceptBylaws && formData.acceptMembership;
  const canSubmit = canProceedStep2 && formData.acceptRisks && formData.acceptPrivate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/pma/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
          <div className="max-w-lg text-center">
            <div className="mb-6">
              <Logo3D size={100} />
            </div>
            <div className="bg-green-100 text-green-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-gray-600 mb-8">
              Thank you for applying to join the Axiom PMA Trust. Your application is being reviewed. 
              You will receive an email at <strong>{formData.email}</strong> within 14 business days 
              with the status of your application.
            </p>
            <div className="space-y-4">
              <Link
                href="/pma"
                className="block bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Return to PMA Information
              </Link>
              <Link
                href="/"
                className="block text-amber-600 hover:text-amber-700 font-medium"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <Link href="/pma" className="text-amber-200 hover:text-white text-sm mb-4 inline-block">
              ← Back to PMA Information
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold">Membership Application</h1>
            <p className="text-amber-100 mt-2">Join the Axiom Protocol Private Membership Association Trust</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step >= s ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {s === 1 ? 'Information' : s === 2 ? 'Acknowledgments' : 'Confirm'}
                </span>
                {s < 3 && <div className={`w-16 md:w-32 h-1 ml-4 ${step > s ? 'bg-amber-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Legal Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Enter your full legal name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blockchain Wallet Address *</label>
                  <input
                    type="text"
                    name="walletAddress"
                    value={formData.walletAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
                    placeholder="0x..."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">Your Ethereum/Arbitrum wallet address for receiving membership tokens</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country of Residence *</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    >
                      <option value="">Select your country</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                      <option value="SG">Singapore</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Membership Type *</label>
                    <select
                      name="membershipType"
                      value={formData.membershipType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="founding">Founding Member (1,000 AXM)</option>
                      <option value="standard">Standard Member (100 AXM)</option>
                      <option value="associate">Associate Member (Custom)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isOver18"
                      checked={formData.isOver18}
                      onChange={handleChange}
                      className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span className="text-gray-700">
                      I confirm that I am at least 18 years of age and legally capable of entering into binding agreements. *
                    </span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Continue to Acknowledgments
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Acknowledgments</h2>
                  <p className="text-gray-600 mb-6">Please review and acknowledge the following documents to proceed with your membership application.</p>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        name="acceptDeclaration"
                        checked={formData.acceptDeclaration}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">Declaration of Trust</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          I have read and understand the Declaration of Trust, including the purpose, structure, and governance of the Axiom PMA Trust.
                        </p>
                        <Link href="/pma/declaration" className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 inline-block">
                          Read Document →
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        name="acceptBylaws"
                        checked={formData.acceptBylaws}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">Bylaws</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          I have read and agree to abide by the Bylaws of the Axiom PMA Trust, including membership rules, governance procedures, and obligations.
                        </p>
                        <Link href="/pma/bylaws" className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 inline-block">
                          Read Document →
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        name="acceptMembership"
                        checked={formData.acceptMembership}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">Membership Agreement</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          I have read and agree to the terms of the Membership Agreement, including my rights, responsibilities, and the binding nature of this agreement.
                        </p>
                        <Link href="/pma/membership-agreement" className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 inline-block">
                          Read Document →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm & Submit</h2>
                  <p className="text-gray-600 mb-6">Review your information and acknowledge the final disclosures to complete your application.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Application Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Full Name:</span>
                      <span className="ml-2 text-gray-900 font-medium">{formData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 text-gray-900 font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wallet:</span>
                      <span className="ml-2 text-gray-900 font-mono text-xs">{formData.walletAddress.slice(0,10)}...{formData.walletAddress.slice(-8)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Membership Type:</span>
                      <span className="ml-2 text-gray-900 font-medium capitalize">{formData.membershipType}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        name="acceptRisks"
                        checked={formData.acceptRisks}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">Risk Acknowledgment</h4>
                        <p className="text-gray-700 text-sm mt-1">
                          I understand and accept the risks associated with blockchain technology, cryptocurrency, and participation in the Axiom ecosystem. 
                          I acknowledge that digital assets may lose value and that the Association does not guarantee any returns or profits.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        name="acceptPrivate"
                        checked={formData.acceptPrivate}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">Private Association Acknowledgment</h4>
                        <p className="text-gray-700 text-sm mt-1">
                          I understand that by joining the Axiom PMA Trust, I am voluntarily entering into a private contractual relationship 
                          outside of public commerce. I acknowledge that consumer protection regulations applicable to public transactions 
                          may not apply to private Association activities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-6 text-center">
                  <p className="text-gray-600 text-sm mb-4">
                    By submitting this application, I confirm that all information provided is true and accurate, 
                    and I agree to be bound by the terms of the Declaration of Trust, Bylaws, and Membership Agreement.
                  </p>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}
