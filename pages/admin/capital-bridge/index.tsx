import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface PropertyPacket {
  packetId: number;
  submitter: string;
  maxApprovedCapital: string;
  state: string;
  submittedAt: string;
}

interface PacketsData {
  success: boolean;
  totalCount: number;
  packets: PropertyPacket[];
}

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-800',
  Attested: 'bg-purple-100 text-purple-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Archived: 'bg-gray-100 text-gray-800',
  Expired: 'bg-amber-100 text-amber-800',
};

export default function CapitalBridgeAdmin() {
  const [packets, setPackets] = useState<PropertyPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'packets' | 'submit' | 'research'>('packets');
  const [submitForm, setSubmitForm] = useState({
    propertyAddress: '',
    city: '',
    state: '',
    zipCode: '',
    acreage: '',
    estimatedValue: '',
    propertyType: 'Residential',
    dueDiligenceNotes: '',
    riskScore: '50',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchPackets();
  }, []);

  async function fetchPackets() {
    try {
      const res = await fetch('/api/observer/packets');
      if (res.ok) {
        const data: PacketsData = await res.json();
        setPackets(data.packets || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch packets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitPacket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/admin/capital-bridge/submit-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: `Property packet created successfully. Packet ID: ${data.packetId || 'pending'}` });
        setSubmitForm({
          propertyAddress: '',
          city: '',
          state: '',
          zipCode: '',
          acreage: '',
          estimatedValue: '',
          propertyType: 'Residential',
          dueDiligenceNotes: '',
          riskScore: '50',
        });
        fetchPackets();
      } else {
        setSubmitResult({ success: false, message: data.error || 'Failed to submit packet' });
      }
    } catch (err) {
      setSubmitResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Capital Bridge Admin | Axiom</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Capital Bridge Admin</h1>
              <p className="text-gray-600 mt-1">Manage property packets, research attestations, and capital authorizations</p>
            </div>
            <Link href="/observer/capital-bridge" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
              View Observer Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('packets')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'packets' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Property Packets ({totalCount})
                </button>
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'submit' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Submit Property
                </button>
                <button
                  onClick={() => setActiveTab('research')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'research' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Research & Attestation
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'packets' && (
                <div>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading packets...</p>
                    </div>
                  ) : packets.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Property Packets Yet</h3>
                      <p className="text-gray-500 mb-4">Submit your first property to begin the Capital Bridge workflow.</p>
                      <button onClick={() => setActiveTab('submit')} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                        Submit Property
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Capital</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {packets.map((packet) => (
                            <tr key={packet.packetId} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">#{packet.packetId}</td>
                              <td className="px-4 py-4 text-sm text-gray-500 font-mono">{packet.submitter.slice(0, 8)}...{packet.submitter.slice(-6)}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">{packet.maxApprovedCapital} ETH</td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[packet.state] || 'bg-gray-100 text-gray-800'}`}>
                                  {packet.state}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">{new Date(packet.submittedAt).toLocaleDateString()}</td>
                              <td className="px-4 py-4">
                                <Link href={`/api/observer/packets?id=${packet.packetId}`} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'submit' && (
                <form onSubmit={handleSubmitPacket} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                      <input
                        type="text"
                        value={submitForm.propertyAddress}
                        onChange={(e) => setSubmitForm({ ...submitForm, propertyAddress: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="123 Main Street"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={submitForm.city}
                        onChange={(e) => setSubmitForm({ ...submitForm, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <select
                        value={submitForm.state}
                        onChange={(e) => setSubmitForm({ ...submitForm, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select State</option>
                        <option value="AL">Alabama</option>
                        <option value="AK">Alaska</option>
                        <option value="AZ">Arizona</option>
                        <option value="FL">Florida</option>
                        <option value="GA">Georgia</option>
                        <option value="NC">North Carolina</option>
                        <option value="SC">South Carolina</option>
                        <option value="TN">Tennessee</option>
                        <option value="TX">Texas</option>
                        <option value="VA">Virginia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={submitForm.zipCode}
                        onChange={(e) => setSubmitForm({ ...submitForm, zipCode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        pattern="[0-9]{5}"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acreage</label>
                      <input
                        type="number"
                        step="0.01"
                        value={submitForm.acreage}
                        onChange={(e) => setSubmitForm({ ...submitForm, acreage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value (USD)</label>
                      <input
                        type="number"
                        value={submitForm.estimatedValue}
                        onChange={(e) => setSubmitForm({ ...submitForm, estimatedValue: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                      <select
                        value={submitForm.propertyType}
                        onChange={(e) => setSubmitForm({ ...submitForm, propertyType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Mixed Use">Mixed Use</option>
                        <option value="Raw Land">Raw Land</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Risk Score (1-100)</label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={submitForm.riskScore}
                        onChange={(e) => setSubmitForm({ ...submitForm, riskScore: e.target.value })}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-500">{submitForm.riskScore}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Diligence Notes</label>
                    <textarea
                      value={submitForm.dueDiligenceNotes}
                      onChange={(e) => setSubmitForm({ ...submitForm, dueDiligenceNotes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Enter any relevant research notes, title information, or property details..."
                    />
                  </div>

                  {submitResult && (
                    <div className={`p-4 rounded-lg ${submitResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {submitResult.message}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {submitting ? 'Submitting...' : 'Submit Property Packet'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'research' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-medium text-amber-800 mb-2">Research Attestation Workflow</h3>
                    <p className="text-sm text-amber-700">
                      Property packets require dual attestation from two different research attestors (A and B) before they can be approved. 
                      This ensures independent verification of property data and due diligence.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attestor A Actions</h3>
                      <p className="text-sm text-gray-600 mb-4">First attestation signer. Reviews property data and research package.</p>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                          Verify property ownership records
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                          Review title search results
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                          Confirm environmental assessments
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                          Validate underwriting model inputs
                        </li>
                      </ul>
                      <button className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                        Sign as Attestor A (Wallet Required)
                      </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attestor B Actions</h3>
                      <p className="text-sm text-gray-600 mb-4">Second attestation signer. Independent verification of Attestor A's work.</p>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Cross-verify ownership claims
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Independent title confirmation
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Market value assessment
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Risk score validation
                        </li>
                      </ul>
                      <button className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                        Sign as Attestor B (Wallet Required)
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Research Documents</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 mb-2">Drag and drop research documents here</p>
                      <p className="text-sm text-gray-500 mb-4">PDF, DOC, or images up to 10MB each</p>
                      <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
                        Browse Files
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/observer/capital-bridge" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-700">Capital Bridge Dashboard</div>
              </Link>
              <Link href="/observer/node-economy" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center">
                <div className="text-2xl mb-2">🔗</div>
                <div className="text-sm font-medium text-gray-700">Node Economy</div>
              </Link>
              <Link href="/landowners/submit" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center">
                <div className="text-2xl mb-2">🏠</div>
                <div className="text-sm font-medium text-gray-700">Landowner Submit</div>
              </Link>
              <Link href="/land-acquisition/portfolio" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center">
                <div className="text-2xl mb-2">📁</div>
                <div className="text-sm font-medium text-gray-700">Land Portfolio</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
