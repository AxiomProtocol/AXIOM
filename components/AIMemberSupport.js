import { useState, useRef, useEffect, useCallback } from 'react';

function cleanAIContent(text) {
  if (!text) return '';
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();
}

const SESSION_KEY = 'axiom_ai_chat_history';
const MAX_HISTORY = 20;

export default function AIMemberSupport({ isOpen, onClose }) {
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [{
      role: 'assistant',
      content: "Hello! I'm your Axiom AI Assistant. I can help you understand The Wealth Practice, savings circles, staking, and more. How can I help you today?"
    }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({ topics: [], lastTopic: null });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 1) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
      } catch (e) {}
    }
  }, [messages]);

  const extractTopics = useCallback((text) => {
    const topicKeywords = {
      susu: ['susu', 'circle', 'savings', 'rotating'],
      wealth: ['wealth', 'practice', 'stage'],
      capital: ['capital', 'mode', 'investment', 'graduate'],
      keygrow: ['keygrow', 'rent', 'property', 'home'],
      token: ['axm', 'token', 'stake', 'staking'],
      vault: ['vault', 'personal', 'custody'],
      pool: ['pool', 'community', 'pooled']
    };
    
    const lower = text.toLowerCase();
    const found = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lower.includes(k))) {
        found.push(topic);
      }
    }
    return found;
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: "Chat history cleared. How can I help you today?"
    }]);
    setContext({ topics: [], lastTopic: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedQuestions = [
    "What is a SUSU circle?",
    "How does Personal Vault work?",
    "What is The Wealth Practice?",
    "How do I graduate to Capital Mode?"
  ];

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return;
    
    const topics = extractTopics(text);
    const nextContext = topics.length > 0 
      ? { 
          topics: [...new Set([...context.topics, ...topics])], 
          lastTopic: topics[0] 
        }
      : context;
    
    if (topics.length > 0) {
      setContext(nextContext);
    }
    
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/member-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: messages.slice(-10),
          context: { discussedTopics: nextContext.topics, lastTopic: nextContext.lastTopic }
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm sorry, I couldn't process that request. Please try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection error. Please check your internet and try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h3 className="font-bold text-white">Axiom AI Assistant</h3>
              <p className="text-xs text-gray-400">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                onClick={clearHistory}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Clear chat history"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{cleanAIContent(msg.content)}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Axiom..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-yellow-500 text-black rounded-xl font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            AI responses are for informational purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AIChatButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
    >
      <span className="text-2xl">💬</span>
    </button>
  );
}
