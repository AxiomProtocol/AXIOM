import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

const INQUIRY_TYPES = [
  'Capital Allocation',
  'Partnership',
  'Regulatory',
  'Media',
  'Community',
  'General'
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    inquiryType: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('sent');
        setForm({ name: '', email: '', organization: '', inquiryType: '', message: '' });
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to send message.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Contact | Axiom Protocol</title>
        <meta name="description" content="Contact Axiom Protocol - Institutional inquiries, partnerships, and community channels." />
      </Head>

      <div className="mb-8">
        <h1 className="font-dl-serif text-dl-navy text-3xl mb-2">Contact</h1>
        <p className="text-dl-gray text-sm">Axiom Nexus LLC | Arbitrum One (Chain ID 42161)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2">
          <SectionHeading>Inquiry Form</SectionHeading>
          <p className="text-sm text-dl-gray mb-6">
            For institutional inquiries, partnership proposals, regulatory questions, media requests, or community engagement.
            All submissions are reviewed and responded to within 48 hours.
          </p>

          {status === 'sent' ? (
            <div className="border border-dl-border bg-dl-bg p-8 text-center">
              <p className="font-dl-serif text-dl-navy text-xl mb-2">Message Received</p>
              <p className="text-sm text-dl-gray mb-4">
                Your inquiry has been submitted. We will respond within 48 hours.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm"
              >
                SEND ANOTHER
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-dl-mono text-dl-gray mb-1">NAME *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-sm focus:outline-none focus:border-dl-navy"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-dl-mono text-dl-gray mb-1">EMAIL *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-sm focus:outline-none focus:border-dl-navy"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-dl-mono text-dl-gray mb-1">ORGANIZATION</label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={e => updateField('organization', e.target.value)}
                    className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-sm focus:outline-none focus:border-dl-navy"
                    placeholder="Company or fund name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-dl-mono text-dl-gray mb-1">INQUIRY TYPE *</label>
                  <select
                    required
                    value={form.inquiryType}
                    onChange={e => updateField('inquiryType', e.target.value)}
                    className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-sm focus:outline-none focus:border-dl-navy"
                  >
                    <option value="">Select type</option>
                    {INQUIRY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-dl-mono text-dl-gray mb-1">MESSAGE *</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={e => updateField('message', e.target.value)}
                  className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy font-dl-mono text-sm focus:outline-none focus:border-dl-navy resize-vertical"
                  placeholder="Describe your inquiry"
                />
              </div>

              {status === 'error' && (
                <div className="border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="px-8 py-3 bg-dl-navy text-white font-dl-mono text-sm disabled:bg-dl-gray"
              >
                {status === 'sending' ? 'SENDING...' : 'SUBMIT INQUIRY'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">

          <div>
            <SectionHeading>Business Entity</SectionHeading>
            <div className="border border-dl-border bg-dl-bg p-4 space-y-3">
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">LEGAL ENTITY</p>
                <p className="font-dl-serif text-dl-navy font-semibold">Axiom Nexus LLC</p>
              </div>
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">FOUNDER & LEAD ARCHITECT</p>
                <p className="font-dl-serif text-dl-navy">Clarence Fuqua</p>
              </div>
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">REGISTERED AGENT</p>
                <p className="text-sm text-dl-navy">Northwest Registered Agent, Inc.</p>
              </div>
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">ADDRESS</p>
                <p className="text-sm text-dl-navy">270 Trace Colony Park STE B</p>
                <p className="text-sm text-dl-navy">Ridgeland, MS 39157</p>
              </div>
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">EMAIL</p>
                <a href="mailto:info@axiomprotocol.app" className="text-sm text-dl-navy underline">info@axiomprotocol.app</a>
              </div>
              <div>
                <p className="text-xs font-dl-mono text-dl-gray">DOMAIN</p>
                <a href="https://axiomprotocol.app" className="text-sm text-dl-navy underline" target="_blank" rel="noopener noreferrer">axiomprotocol.app</a>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading>Community Channels</SectionHeading>
            <div className="border border-dl-border bg-dl-bg p-4 space-y-3">
              <a
                href="https://discord.gg/RPEnZ5Gfqe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-dl-border"
              >
                <div>
                  <p className="font-dl-serif text-dl-navy font-semibold text-sm">Discord</p>
                  <p className="text-xs text-dl-gray">Community discussion, support, announcements</p>
                </div>
                <span className="text-dl-gray text-sm">&rarr;</span>
              </a>
              <a
                href="https://x.com/axiaboreal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-dl-border"
              >
                <div>
                  <p className="font-dl-serif text-dl-navy font-semibold text-sm">X / Twitter</p>
                  <p className="text-xs text-dl-gray">Protocol updates and public communications</p>
                </div>
                <span className="text-dl-gray text-sm">&rarr;</span>
              </a>
              <a
                href="https://www.linkedin.com/in/akiligroup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-dl-border"
              >
                <div>
                  <p className="font-dl-serif text-dl-navy font-semibold text-sm">LinkedIn</p>
                  <p className="text-xs text-dl-gray">Professional inquiries and networking</p>
                </div>
                <span className="text-dl-gray text-sm">&rarr;</span>
              </a>
            </div>
          </div>

          <div>
            <SectionHeading>Resources</SectionHeading>
            <div className="border border-dl-border bg-dl-bg p-4 space-y-2">
              <Link href="/disclosure" className="block text-sm text-dl-navy underline">
                Institutional Disclosure
              </Link>
              <Link href="/solvency" className="block text-sm text-dl-navy underline">
                Solvency Console
              </Link>
              <Link href="/about-us" className="block text-sm text-dl-navy underline">
                About Axiom Protocol
              </Link>
              <a href="/axiom-capital-framework.txt" className="block text-sm text-dl-navy underline" target="_blank" rel="noopener noreferrer">
                Capital Framework (Download)
              </a>
              <a href="/axiom-susu-wealth-practice.txt" className="block text-sm text-dl-navy underline" target="_blank" rel="noopener noreferrer">
                The Wealth Practice (Download)
              </a>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-12 border-t border-dl-border pt-6">
        <p className="text-xs text-dl-gray text-center">
          Axiom Nexus LLC | 270 Trace Colony Park STE B, Ridgeland, MS 39157 | info@axiomprotocol.app
        </p>
        <p className="text-xs text-dl-gray text-center mt-1">
          Axiom Protocol provides coordination infrastructure. Nothing on this platform constitutes legal, financial, or investment advice.
        </p>
      </div>
    </DesignLawLayout>
  );
}
