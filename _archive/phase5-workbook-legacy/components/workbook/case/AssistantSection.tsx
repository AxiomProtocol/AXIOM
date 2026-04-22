import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface AssistantSectionProps {
  caseId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistantSection({ caseId }: AssistantSectionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your land reclamation assistant. I can help you understand legal processes, research requirements, and guide you through the reclamation workflow. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Thank you for your question. I\'m analyzing the relevant legal frameworks and historical records to provide you with accurate guidance. This feature will be fully connected to AI capabilities soon. For now, please consult the documentation and legal templates sections for detailed information.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const suggestedQuestions = [
    'What documents do I need for a land patent application?',
    'How do I trace property ownership history?',
    'What are the requirements for heir verification?',
    'How does the Dawes Roll relate to land claims?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'assistant'
                ? 'bg-gradient-to-br from-[#f97316] to-[#fb923c]'
                : 'bg-[#3b82f6]'
            }`}>
              {message.role === 'assistant' ? (
                <Bot className="w-5 h-5 text-white" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
              message.role === 'assistant'
                ? 'bg-[#1a2942] text-white'
                : 'bg-[#3b82f6] text-white'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-50 mt-2 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#f97316] to-[#fb923c]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-[#1a2942] rounded-xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-[#f97316] animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-[#64748b] text-sm mb-3">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="text-sm px-3 py-2 bg-[#1a2942] hover:bg-[#243656] text-[#94a3b8] rounded-lg transition-colors border border-[#2a3f5f]"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about land reclamation, legal processes, or research..."
          className="flex-1 bg-[#1a2942] border border-[#2a3f5f] rounded-xl px-4 py-3 text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#f97316] transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#ea580c] hover:to-[#f97316] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
