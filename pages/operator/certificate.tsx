import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

type OperatorRole = 'OBSERVER' | 'VALIDATOR' | 'ATTESTOR';

interface OperatorData {
  operatorId: string;
  displayName?: string;
  role: OperatorRole;
  status: string;
}

const ROLE_TITLES: Record<OperatorRole, string> = {
  OBSERVER: 'Observer',
  VALIDATOR: 'Validator',
  ATTESTOR: 'Attestor',
};

export default function CertificatePage() {
  const router = useRouter();
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOperator() {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setLoading(false);
        return;
      }

      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          setLoading(false);
          return;
        }

        const wallet = accounts[0].toLowerCase();
        const res = await fetch(`/api/operator/status?wallet=${wallet}`);
        const data = await res.json();

        if (data.operator && (data.operator.status === 'CERTIFIED' || data.operator.status === 'ACTIVE')) {
          setOperator(data.operator);
        }
      } catch (error) {
        console.error('Failed to fetch operator:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOperator();
  }, []);

  useEffect(() => {
    if (!loading && operator) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, operator]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading certificate...</div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Available</h1>
          <p className="text-gray-600 mb-4">Please connect your wallet with a certified operator account.</p>
          <button
            onClick={() => router.push('/operator')}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Operator Portal
          </button>
        </div>
      </div>
    );
  }

  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <Head>
        <title>Node Operator Certificate - AXIOM Protocol</title>
        <style>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center">
        <div className="no-print mb-6 flex gap-4">
          <button
            onClick={() => window.print()}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save as PDF
          </button>
          <button
            onClick={() => router.push('/operator')}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Back to Portal
          </button>
        </div>

        <div className="w-full max-w-2xl border-8 border-teal-700 rounded-lg overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white text-center relative">
            <div className="absolute top-4 left-4 w-16 h-16 opacity-20">
              <svg viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z"/>
              </svg>
            </div>
            <div className="absolute top-4 right-4 w-16 h-16 opacity-20">
              <svg viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 5 L61 35 L95 35 L68 57 L79 90 L50 70 L21 90 L32 57 L5 35 L39 35 Z"/>
              </svg>
            </div>
            <div className="text-teal-200 text-sm font-medium mb-2 tracking-widest">AXIOM PROTOCOL</div>
            <h1 className="text-3xl font-bold mb-1">Node Operator Certificate</h1>
          </div>

          <div className="bg-white p-8 text-center">
            <p className="text-gray-500 text-lg mb-2">This certifies that</p>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {operator.displayName || 'Node Operator'}
            </h2>
            <p className="text-gray-400 font-mono text-sm mb-6">{operator.operatorId}</p>
            
            <p className="text-gray-600 text-lg mb-8">
              has successfully completed all certification requirements and is authorized to operate as a{' '}
              <span className="font-bold text-teal-600">{ROLE_TITLES[operator.role]}</span> on the AXIOM network.
            </p>

            <div className="border-t border-b border-gray-200 py-6 my-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-teal-600 text-xs font-medium mb-1">NODE CHARTER</div>
                  <div className="text-gray-900 font-semibold">Acknowledged</div>
                </div>
                <div>
                  <div className="text-teal-600 text-xs font-medium mb-1">DRY-RUN</div>
                  <div className="text-gray-900 font-semibold">Completed</div>
                </div>
                <div>
                  <div className="text-teal-600 text-xs font-medium mb-1">KEY SECURITY</div>
                  <div className="text-gray-900 font-semibold">Confirmed</div>
                </div>
                <div>
                  <div className="text-teal-600 text-xs font-medium mb-1">COMMUNICATION</div>
                  <div className="text-gray-900 font-semibold">Committed</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-8">
              <div className="text-left">
                <div className="text-gray-400 text-sm">Issued</div>
                <div className="text-gray-700 font-medium">{issueDate}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-sm">Status</div>
                <div className={`font-bold ${operator.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {operator.status === 'ACTIVE' ? 'ACTIVE' : 'CERTIFIED'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 text-center text-gray-400 text-xs">
            AXIOM Protocol - Decentralized Land Settlement Network
          </div>
        </div>
      </div>
    </>
  );
}
