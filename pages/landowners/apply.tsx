import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';
import { trackActivatedLand, ActivatedLandEvents } from '../../lib/stewards/activatedLandAnalytics';

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  county: '',
  state: '',
  parcelAddress: '',
  acreage: '',
  currentUse: '',
  desiredUse: '',
  willingnessForProduce: '',
  utilitiesNotes: '',
  accessNotes: '',
  additionalNotes: ''
};

export default function LandownersApplyPage() {
  const [form, setForm] = useState(initialFormState);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.LANDOWNER_PAGE_VIEW, { page: 'apply' });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files).slice(0, 5));
    }
  };

  const handleFocus = () => {
    trackActivatedLand(ActivatedLandEvents.LANDOWNER_APPLY_START);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      photos.forEach((photo, idx) => {
        formData.append(`photo_${idx}`, photo);
      });

      const res = await fetch('/api/landowners/apply', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      trackActivatedLand(ActivatedLandEvents.LANDOWNER_APPLY_SUBMIT);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Application Submitted | Landowners | Axiom Protocol</title>
        </Head>
        <RebuildNav />
        <main className="min-h-screen bg-white pt-20">
          <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Thank you for your interest in the Steward-Activated Land Program. A steward will contact you 
              within 48 hours to discuss your property and answer any questions.
            </p>
            <Link href="/landowners" className="text-amber-600 font-medium hover:underline">
              ← Return to Landowners
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Apply | Landowners | Axiom Protocol</title>
        <meta name="description" content="Apply to activate your land through the Steward-Activated Land Program." />
      </Head>
      <RebuildNav />
      
      <main className="min-h-screen bg-gray-50 pt-20">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/landowners" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Landowners
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apply to Activate Your Land</h1>
          <p className="text-gray-600 mb-8">
            Complete this form to start the activation process. A steward will contact you within 48 hours.
          </p>

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Property Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County *</label>
                    <input
                      type="text"
                      name="county"
                      value={form.county}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input
                      type="text"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Address or General Location *</label>
                    <input
                      type="text"
                      name="parcelAddress"
                      value={form.parcelAddress}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 123 Main St or 'Near intersection of Hwy 12 and Oak Rd'"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acreage *</label>
                    <input
                      type="text"
                      name="acreage"
                      value={form.acreage}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 5 acres"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Land Use *</label>
                    <select
                      name="currentUse"
                      value={form.currentUse}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select...</option>
                      <option value="vacant">Vacant / Unused</option>
                      <option value="pasture">Pasture / Grazing</option>
                      <option value="forest">Forested</option>
                      <option value="agriculture">Active Agriculture</option>
                      <option value="residential">Residential with Excess Land</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desired Highest and Best Use Goals</label>
                    <textarea
                      name="desiredUse"
                      value={form.desiredUse}
                      onChange={handleChange}
                      rows={3}
                      placeholder="What would you like to see happen on this land?"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Activation Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activation Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Willingness for Produce or Stewardship Cycles *
                    </label>
                    <select
                      name="willingnessForProduce"
                      value={form.willingnessForProduce}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select...</option>
                      <option value="very_interested">Very Interested</option>
                      <option value="interested">Interested - Want to Learn More</option>
                      <option value="curious">Curious - Have Questions</option>
                      <option value="not_sure">Not Sure Yet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utilities and Access Notes</label>
                    <textarea
                      name="utilitiesNotes"
                      value={form.utilitiesNotes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Water, electricity, road access, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Notes</label>
                    <textarea
                      name="accessNotes"
                      value={form.accessNotes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Any access restrictions, gates, easements, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photos (optional, up to 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {photos.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">{photos.length} file(s) selected</p>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="additionalNotes"
                  value={form.additionalNotes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Anything else you'd like us to know?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Consent */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  By submitting this form, you agree to be contacted by an Axiom steward regarding the 
                  Steward-Activated Land Program. Submitting this form does not create any obligation 
                  or transfer any property rights.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
