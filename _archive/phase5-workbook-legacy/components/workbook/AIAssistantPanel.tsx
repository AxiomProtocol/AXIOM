import React, { useState } from 'react';

type AssistantMode = 'getting_started' | 'research_planner' | 'evidence_clerk' | 'dossier_drafter' | 'resource_finder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hypothesisMode?: boolean;
}

interface AIAssistantPanelProps {
  caseId: number;
  onSend: (mode: AssistantMode, message: string, history: { role: string; content: string }[]) => Promise<{ response: string; hypothesisMode?: boolean }>;
  disabled?: boolean;
  usageRemaining?: number;
  evidenceCount?: number;
}

const MODE_INFO: Record<AssistantMode, { label: string; description: string; icon: string }> = {
  getting_started: {
    label: 'Getting Started',
    description: 'Help for beginners with only basic info like grandparent names',
    icon: '🚀',
  },
  resource_finder: {
    label: 'Resource Finder',
    description: 'Search census, FamilySearch, court records, and more databases',
    icon: '🔍',
  },
  research_planner: {
    label: 'Research Planner',
    description: 'Get task lists, record suggestions, and courthouse visit sequences',
    icon: '📋',
  },
  evidence_clerk: {
    label: 'Evidence Clerk',
    description: 'Organize evidence, assess quality, and link claims to sources',
    icon: '📁',
  },
  dossier_drafter: {
    label: 'Dossier Drafter',
    description: 'Draft summaries using verified facts with citations',
    icon: '📝',
  },
};

export default function AIAssistantPanel({ caseId, onSend, disabled, usageRemaining, evidenceCount = 0 }: AIAssistantPanelProps) {
  const isNewResearcher = evidenceCount <= 3;
  const [mode, setMode] = useState<AssistantMode>(isNewResearcher ? 'getting_started' : 'research_planner');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      const result = await onSend(mode, userMessage, history);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response,
        hypothesisMode: result.hypothesisMode,
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, an error occurred. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">AI Research Assistant</h3>
          {usageRemaining !== undefined && (
            <span className="text-xs text-gray-500">
              {usageRemaining} calls remaining
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {(Object.keys(MODE_INFO) as AssistantMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 text-xs rounded-lg transition ${
                mode === m
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <span className="mr-1">{MODE_INFO[m].icon}</span>
              {MODE_INFO[m].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{MODE_INFO[mode].description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-6">
            {isNewResearcher ? (
              <>
                <p className="text-sm font-medium text-amber-700 mb-2">Welcome to your research journey!</p>
                <p className="text-sm mb-3">It looks like you're just getting started. That's okay - most researchers begin with only a name or two.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left text-xs space-y-1">
                  <p className="font-medium text-amber-800">Try asking:</p>
                  <p className="text-gray-700">"I only know my grandmother's name was Mary Johnson. Where do I start?"</p>
                  <p className="text-gray-700">"My grandfather was born in Alabama around 1920. What records should I look for?"</p>
                  <p className="text-gray-700">"How do I find census records for my family?"</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">Start a conversation with your research assistant</p>
                <p className="text-xs mt-2">The assistant will never provide legal advice</p>
              </>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-amber-600 text-white'
                  : msg.hypothesisMode
                    ? 'bg-yellow-50 border border-yellow-200 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.hypothesisMode && (
                <div className="text-xs text-yellow-700 mb-1 font-medium">
                  Contains hypothetical content
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your research..."
            disabled={disabled || isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !input.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-gray-500 hover:text-gray-700 mt-2"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
