import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface CaseContext {
  caseTitle: string;
  ancestorName: string;
  jurisdiction: string;
  personsCount: number;
  recordsCount: number;
  notesCount: number;
}

const SUGGESTED_QUESTIONS = [
  "How do I find my ancestor's original land deed?",
  "What records exist for freed slaves after 1865?",
  "How do I prove I'm an heir to family property?",
  "What is the Dawes Roll and how do I search it?",
  "How do I calculate fractional ownership shares?",
  "What's an Affidavit of Heirship and do I need one?",
  "How do I prevent a partition sale of family land?",
  "Where can I find Freedmen's Bureau records?",
];

export default function AIAssistantPage() {
  const router = useRouter();
  const { id } = router.query;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchContext = async () => {
      try {
        const [caseRes, treeRes, recordsRes, notesRes] = await Promise.all([
          fetch(`/api/workbook/cases/${id}`),
          fetch(`/api/workbook/family-tree/persons?caseId=${id}`),
          fetch(`/api/workbook/saved-records?caseId=${id}`),
          fetch(`/api/workbook/notes?caseId=${id}`),
        ]);

        const [caseData, treeData, recordsData, notesData] = await Promise.all([
          caseRes.json(),
          treeRes.json(),
          recordsRes.json(),
          notesRes.json(),
        ]);

        setCaseContext({
          caseTitle: caseData.data?.case_title || '',
          ancestorName: caseData.data?.ancestor_primary_name || '',
          jurisdiction: caseData.data?.jurisdiction_code || '',
          personsCount: treeData.persons?.length || 0,
          recordsCount: recordsData.records?.length || 0,
          notesCount: notesData.notes?.length || 0,
        });
      } catch (err) {
        console.error('Failed to load context:', err);
      } finally {
        setContextLoading(false);
      }
    };

    fetchContext();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/workbook/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          caseContext,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'model',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <Head>
        <title>AI Research Assistant | Land Reclamation Workbook</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href={`/workbook/case/${id}`} className="text-purple-200 hover:text-white text-sm mb-2 inline-block">
              ← Back to Case
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">🤖</span>
              AI Research Assistant
            </h1>
            <p className="text-purple-200 mt-1">Get expert guidance on heir property research</p>
          </div>
        </header>

        {caseContext && (
          <div className="bg-purple-50 border-b">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-purple-700">
                  <strong>Case:</strong> {caseContext.caseTitle}
                </span>
                <span className="text-purple-600">
                  <strong>Ancestor:</strong> {caseContext.ancestorName}
                </span>
                <span className="text-purple-600">
                  <strong>Location:</strong> {caseContext.jurisdiction || 'Not set'}
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
          <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '300px' }}>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How can I help with your research?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Ask me anything about heir property, genealogy records, or land research.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                    {SUGGESTED_QUESTIONS.map((question, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(question)}
                        className="text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm text-purple-700 transition"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, i) => (
                  <div
                    key={i}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about heir property, records, or research strategies..."
                  className="flex-1 px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="px-6 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
