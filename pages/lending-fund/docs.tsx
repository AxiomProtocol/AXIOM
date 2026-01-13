import Head from 'next/head';
import Link from 'next/link';

interface Document {
  title: string;
  description: string;
  filename: string;
  required: boolean;
}

const documents: Document[] = [
  {
    title: 'Private Placement Memorandum (PPM)',
    description: 'Complete disclosure document covering fund terms, risks, and investment details',
    filename: 'AXUSD_FixFlip_Fund_PPM.md',
    required: true
  },
  {
    title: 'Subscription Agreement',
    description: 'Investment commitment contract between investor and fund',
    filename: 'Subscription_Agreement.md',
    required: true
  },
  {
    title: 'Accredited Investor Questionnaire',
    description: 'Verification form to confirm accredited investor status (506(c) requirement)',
    filename: 'Accredited_Investor_Questionnaire.md',
    required: true
  },
  {
    title: 'Operating Agreement Amendment',
    description: 'Legal document establishing the fund series within Axiom Nexus LLC',
    filename: 'Operating_Agreement_Amendment.md',
    required: false
  },
  {
    title: 'Risk Disclosure Supplement',
    description: 'Detailed risk factors and investor acknowledgments',
    filename: 'Risk_Disclosure_Supplement.md',
    required: true
  },
  {
    title: 'Form D Filing Guide',
    description: 'SEC filing information and requirements',
    filename: 'Form_D_Filing_Guide.md',
    required: false
  },
  {
    title: 'Launch Checklist',
    description: 'Complete action plan for fund launch and compliance',
    filename: 'LAUNCH_CHECKLIST.md',
    required: false
  }
];

export default function LendingFundDocs() {
  const downloadDocument = async (filename: string) => {
    try {
      const response = await fetch(`/api/realestate/documents/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Fund Documents | AXUSD Lending Fund</title>
        <meta name="description" content="Access PPM, subscription agreement, and other legal documents for the AXUSD Fix & Flip Lending Fund." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }} className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lending-fund" style={{ color: "#00D4AA" }} className="hover:opacity-80 mb-4 inline-block">
              ← Back to Fund Overview
            </Link>
            <h1 className="text-3xl font-bold" style={{ color: "#1a1a2e" }}>Fund Documents</h1>
            <p className="mt-2" style={{ color: "#6b7280" }}>
              Review all legal documents before investing. Documents marked as required must be signed.
            </p>
          </div>

          <div className="rounded-xl p-6 mb-8" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
            <div className="flex items-start gap-4">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: "#00D4AA" }}>Important Notice</h3>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  This offering is available only to verified accredited investors under SEC Rule 506(c).
                  Please read all documents carefully before investing. Securities have not been registered
                  under the Securities Act of 1933 and involve substantial risk including possible loss of principal.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {documents.map((doc) => (
              <div
                key={doc.filename}
                className="rounded-xl p-6 transition-all"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold" style={{ color: "#1a1a2e" }}>{doc.title}</h3>
                      {doc.required && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "#6b7280" }}>{doc.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/api/realestate/documents/${doc.filename}?view=true`}
                      target="_blank"
                      className="px-4 py-2 rounded-lg text-sm transition-all"
                      style={{ background: "#e5e7eb", color: "#374151" }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => downloadDocument(doc.filename)}
                      className="px-4 py-2 text-white font-medium rounded-lg text-sm transition-all"
                      style={{ background: "#00D4AA" }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-6" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: "#1a1a2e" }}>Investment Process</h3>
            <div className="space-y-4">
              <ProcessStep
                number={1}
                title="Review Documents"
                description="Read the PPM and Risk Disclosure carefully"
                status="current"
              />
              <ProcessStep
                number={2}
                title="Complete Questionnaire"
                description="Fill out the Accredited Investor Questionnaire with supporting documentation"
                status="pending"
              />
              <ProcessStep
                number={3}
                title="Sign Subscription Agreement"
                description="Execute the investment commitment"
                status="pending"
              />
              <ProcessStep
                number={4}
                title="Transfer AXUSD"
                description="Send investment amount to fund wallet"
                status="pending"
              />
              <ProcessStep
                number={5}
                title="Receive Confirmation"
                description="Get unit allocation and dashboard access"
                status="pending"
              />
            </div>

            <div className="mt-6 pt-6" style={{ borderTop: "1px solid #e5e7eb" }}>
              <Link
                href="/lending-fund/onboarding"
                className="block w-full py-3 text-white font-bold rounded-lg text-center transition-all"
                style={{ background: "#00D4AA" }}
              >
                Start Investment Process
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Questions? Contact us at{' '}
              <a href="mailto:invest@axiomprotocol.app" style={{ color: "#00D4AA" }} className="hover:opacity-80">
                invest@axiomprotocol.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function ProcessStep({ number, title, description, status }: {
  number: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}) {
  const getCircleStyle = () => {
    if (status === 'completed') return { background: '#22c55e', color: '#ffffff' };
    if (status === 'current') return { background: '#00D4AA', color: '#ffffff' };
    return { background: '#e5e7eb', color: '#6b7280' };
  };

  return (
    <div className="flex items-start gap-4">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
        style={getCircleStyle()}
      >
        {status === 'completed' ? '✓' : number}
      </div>
      <div>
        <h4 
          className="font-semibold"
          style={{ color: status === 'pending' ? '#6b7280' : '#1a1a2e' }}
        >
          {title}
        </h4>
        <p className="text-sm" style={{ color: "#6b7280" }}>{description}</p>
      </div>
    </div>
  );
}
