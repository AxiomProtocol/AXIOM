import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

interface Props {
  dealId: string;
  scenarioId?: string | null;
  dealName?: string;
}

const STARTER_QUESTIONS = [
  'What is the cash-on-cash return on this deal?',
  'What are the biggest risk flags I should know about?',
  'How does the rehab budget compare to the ARV?',
  'Is the DSCR above 1.25?',
  'What is the recommended exit strategy and why?',
];

export default function DealAssistantPanel({ dealId, scenarioId, dealName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text: q, ts: Date.now() }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/deal-intelligence/${dealId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, scenarioId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to get answer'); return; }
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, ts: Date.now() }]);
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="border border-dl-border">
      <div className="border-b border-dl-border px-6 py-4">
        <h2 className="font-dl-serif text-lg text-dl-navy">Deal Assistant</h2>
        <p className="font-dl-mono text-xs text-dl-muted mt-0.5">
          Ask anything about {dealName || 'this deal'} — synthesized from assumptions, metrics, risks, scope, and inspection data.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="px-6 py-5 border-b border-dl-border">
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Suggested Questions</p>
          <div className="flex flex-col gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={loading}
                className="text-left font-dl-mono text-xs border border-dl-border px-3 py-2 text-dl-navy hover:border-dl-navy disabled:opacity-40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="px-6 py-5 space-y-4 max-h-96 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.ts} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="font-dl-mono text-xs text-dl-muted uppercase">
                {msg.role === 'user' ? 'You' : 'Deal Assistant'}
              </span>
              <div
                className={`max-w-xl px-4 py-3 font-dl-mono text-sm border ${
                  msg.role === 'user'
                    ? 'border-dl-navy text-dl-navy'
                    : 'border-dl-border text-dl-text bg-gray-50'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col items-start gap-1">
              <span className="font-dl-mono text-xs text-dl-muted uppercase">Deal Assistant</span>
              <div className="border border-dl-border px-4 py-3 font-dl-mono text-sm text-dl-muted">
                Analyzing deal data...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <div className="px-6 py-3 border-t border-dl-border">
          <p className="font-dl-mono text-xs text-dl-error">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-dl-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this deal..."
          disabled={loading}
          className="flex-1 border border-dl-border px-3 py-2 font-dl-mono text-sm focus:outline-none focus:border-dl-navy disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-dl-navy text-white px-5 py-2 font-dl-mono text-sm disabled:opacity-50 min-h-[44px]"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </form>

      <div className="px-6 py-2 border-t border-dl-border">
        <p className="font-dl-mono text-xs text-dl-muted">
          Answers are synthesized from deal data. Verify all figures before making capital decisions.
        </p>
      </div>
    </div>
  );
}
