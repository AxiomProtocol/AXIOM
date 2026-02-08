import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

function FormattedMessage({ content }: { content: string }) {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let inCodeBlock = false;
    let codeContent = '';

    const flushList = () => {
      if (listItems.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag key={elements.length} className={`my-3 ml-4 space-y-1 ${listType === 'ol' ? 'list-decimal' : 'list-none'}`}>
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                {listType === 'ul' && <span className="text-purple-500 mt-0.5">•</span>}
                <span>{formatInlineText(item)}</span>
              </li>
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    const formatInlineText = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const codeMatch = remaining.match(/`([^`]+)`/);

        const matches = [
          boldMatch ? { type: 'bold', index: boldMatch.index!, match: boldMatch } : null,
          linkMatch ? { type: 'link', index: linkMatch.index!, match: linkMatch } : null,
          codeMatch ? { type: 'code', index: codeMatch.index!, match: codeMatch } : null,
        ].filter(Boolean).sort((a, b) => a!.index - b!.index);

        if (matches.length === 0) {
          parts.push(remaining);
          break;
        }

        const first = matches[0]!;
        if (first.index > 0) {
          parts.push(remaining.slice(0, first.index));
        }

        if (first.type === 'bold') {
          parts.push(<strong key={key++} className="font-semibold text-gray-900">{first.match[1]}</strong>);
          remaining = remaining.slice(first.index + first.match[0].length);
        } else if (first.type === 'link') {
          parts.push(
            <a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer" 
               className="text-purple-600 hover:text-purple-800 underline inline-flex items-center gap-1">
              {first.match[1]}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          );
          remaining = remaining.slice(first.index + first.match[0].length);
        } else if (first.type === 'code') {
          parts.push(<code key={key++} className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-sm font-mono">{first.match[1]}</code>);
          remaining = remaining.slice(first.index + first.match[0].length);
        }
      }

      return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={elements.length} className="bg-gray-800 text-gray-100 p-3 rounded-lg my-3 overflow-x-auto text-sm font-mono">
              {codeContent.trim()}
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }

      if (line.match(/^#{1,3}\s/)) {
        flushList();
        const level = line.match(/^(#{1,3})/)?.[0].length || 1;
        const text = line.replace(/^#{1,3}\s+/, '');
        const icon = level === 1 ? '📋' : level === 2 ? '📌' : '📎';
        
        if (level === 1) {
          elements.push(
            <h3 key={elements.length} className="text-lg font-bold text-gray-900 mt-4 mb-2 flex items-center gap-2 border-b pb-2">
              <span>{icon}</span> {text}
            </h3>
          );
        } else if (level === 2) {
          elements.push(
            <h4 key={elements.length} className="text-base font-semibold text-gray-800 mt-3 mb-1.5 flex items-center gap-2">
              <span>{icon}</span> {text}
            </h4>
          );
        } else {
          elements.push(
            <h5 key={elements.length} className="text-sm font-medium text-gray-700 mt-2 mb-1 flex items-center gap-1.5">
              <span>{icon}</span> {text}
            </h5>
          );
        }
        continue;
      }

      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      const numberedMatch = line.match(/^\d+\.\s+(.+)/);

      if (bulletMatch) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(bulletMatch[1]);
        continue;
      }

      if (numberedMatch) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(numberedMatch[1]);
        continue;
      }

      flushList();

      if (line.trim() === '') {
        elements.push(<div key={elements.length} className="h-2" />);
        continue;
      }

      elements.push(
        <p key={elements.length} className="text-gray-700 leading-relaxed my-1.5">
          {formatInlineText(line)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  return <div className="formatted-message">{formatContent(content)}</div>;
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
                    {message.role === 'model' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-2 mt-1">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-200 shadow-sm text-gray-900'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <FormattedMessage content={message.content} />
                      )}
                      <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
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
