import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type FlowPhase =
  | 'loading'
  | 'already_verified'
  | 'intro'
  | 'persona_flow'
  | 'submitting'
  | 'complete'
  | 'declined'
  | 'needs_review'
  | 'error'
  | 'unconfigured';

interface PersonaConfig {
  templateId: string;
  environment: string;
}

interface KYCVerificationPageProps {
  userId?: number;
  onComplete?: (inquiryId: string) => void;
}

export const KYCVerificationPage: React.FC<KYCVerificationPageProps> = ({
  userId,
  onComplete,
}) => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [phase, setPhase] = useState<FlowPhase>('loading');
  const [personaConfig, setPersonaConfig] = useState<PersonaConfig | null>(null);
  const [inquiryId, setInquiryId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const authToken = localStorage.getItem('auth-token');

  useEffect(() => {
    const init = async () => {
      try {
        const [statusRes, configRes] = await Promise.all([
          fetch('/api/kyc/verification', {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }),
          fetch('/api/persona/config'),
        ]);

        if (configRes.status === 503) {
          setPhase('unconfigured');
          return;
        }

        if (configRes.ok) {
          const cfg = await configRes.json();
          setPersonaConfig(cfg);
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const kycVerification = statusData?.kycVerification;
          if (kycVerification) {
            const s = kycVerification.verificationStatus;
            setExistingStatus(s);
            if (s === 'approved') { setPhase('already_verified'); return; }
            if (s === 'under_review') { setPhase('needs_review'); return; }
            if (s === 'rejected') { setPhase('declined'); return; }
          }
        }

        setPhase(personaConfig || configRes.ok ? 'intro' : 'unconfigured');
      } catch (err) {
        console.error('[KYCVerificationPage] init error', err);
        setPhase('intro');
      }
    };

    init();
  }, [authToken]);

  const buildPersonaUrl = useCallback((cfg: PersonaConfig): string => {
    const params = new URLSearchParams({
      'inquiry-template-id': cfg.templateId,
      environment: cfg.environment,
    });
    if (userId) params.set('reference-id', String(userId));
    return `https://withpersona.com/verify?${params.toString()}`;
  }, [userId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('withpersona.com') && !event.origin.includes('persona.com')) return;

      const { name, inquiryId: id, status } = event.data ?? {};

      if (name === 'persona:complete' || name === 'inquiry:complete') {
        const resolvedId = id ?? inquiryId;
        setInquiryId(resolvedId);
        handlePersonaComplete(resolvedId, status);
      } else if (name === 'persona:cancel' || name === 'inquiry:cancel') {
        setPhase('intro');
      } else if (name === 'persona:error' || name === 'inquiry:error') {
        setErrorMessage('Identity verification encountered an error. Please try again.');
        setPhase('error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [inquiryId]);

  const handlePersonaComplete = async (resolvedInquiryId: string, personaStatus?: string) => {
    setPhase('submitting');

    const token = localStorage.getItem('auth-token');

    try {
      const res = await fetch('/api/persona/submit-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ personaInquiryId: resolvedInquiryId }),
      });

      if (!res.ok) throw new Error('Submission failed');

      // Signal KYCVerificationGate instances on other pages to re-check status
      try {
        localStorage.setItem('kyc_status_dirty', String(Date.now()));
      } catch { /* storage may be blocked */ }

      if (onComplete) onComplete(resolvedInquiryId);

      if (personaStatus === 'declined') {
        setPhase('declined');
      } else if (personaStatus === 'needs_review') {
        setPhase('needs_review');
      } else {
        setPhase('complete');
      }
    } catch (err) {
      console.error('[KYCVerificationPage] submission error', err);
      setErrorMessage('Your verification was received but we could not save the record. Please contact support.');
      setPhase('error');
    }
  };

  const startPersonaFlow = () => {
    setPhase('persona_flow');
  };

  if (phase === 'loading') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Loading verification status…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === 'unconfigured') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>Verification Unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>
                Identity verification has not been configured yet. Please check back later or
                contact support.
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === 'already_verified') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Identity Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <p>Your identity has been verified. All platform features are available to you.</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === 'intro') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
          <div className="max-w-lg w-full mx-4 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Identity Verification</h1>
              <p className="text-gray-600">
                To access capital features you must complete a one-time identity verification.
                The process takes approximately 3–5 minutes.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">1</span>
                    <span>
                      <strong>Government-issued photo ID</strong> — passport, driver's license, or
                      national ID card.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">2</span>
                    <span>
                      <strong>Liveness check</strong> — a short selfie video to confirm you are
                      the document holder.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">3</span>
                    <span>
                      <strong>Review outcome</strong> — most verifications are processed instantly.
                      Some may take up to one business day.
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
                  <p>
                    Verification is handled by Persona, a third-party identity verification
                    provider. Your documents are processed securely and are not stored on
                    Axiom Protocol servers.
                  </p>
                  <p>
                    Axiom Protocol only receives the verification outcome (approved / declined /
                    needs review) and a reference ID.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Not Now
              </Button>
              <Button
                onClick={startPersonaFlow}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!personaConfig}
              >
                {personaConfig ? 'Begin Verification' : 'Loading…'}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === 'persona_flow' && personaConfig) {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Identity Verification</h2>
              <button
                onClick={() => setPhase('intro')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            </div>

            <div className="bg-white border border-gray-200 overflow-hidden" style={{ height: 640 }}>
              <iframe
                ref={iframeRef}
                src={buildPersonaUrl(personaConfig)}
                allow="camera; microphone"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Identity Verification"
              />
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              Powered by Persona · Your data is encrypted and processed securely
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === 'submitting') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 font-medium">Recording your verification…</p>
            <p className="text-gray-400 text-sm">This will only take a moment.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === 'complete') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Verification Submitted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Your identity verification has been submitted. If your documents were approved
                automatically, platform features are now available.
              </p>
              {inquiryId && (
                <p className="text-xs text-gray-400 font-mono">Reference: {inquiryId}</p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === 'needs_review') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-yellow-500">⏳</span> Verification Under Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <p>
                Your verification has been submitted and is under compliance review. You will
                receive an email once the review is complete (typically 1 business day).
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === 'declined') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-500">✕</span> Verification Declined
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <p>
                Your verification could not be completed. Please ensure your documents are
                clear and not expired, then try again. If you believe this is an error, contact
                support.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setPhase('intro'); setInquiryId(''); }}
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (phase === 'error') {
    return (
      <Layout title="Identity Verification" showWalletConnect={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>Something Went Wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <p>{errorMessage || 'An unexpected error occurred. Please try again.'}</p>
              <div className="flex gap-3">
                <Button onClick={() => setPhase('intro')} className="flex-1">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return null;
};
