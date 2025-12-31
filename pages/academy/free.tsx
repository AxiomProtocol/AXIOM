import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import toast, { Toaster } from 'react-hot-toast';

const FREE_COURSES = [
  {
    id: 1,
    slug: 'financial-foundations-101',
    title: 'Financial Foundations 101',
    description: 'Master essential money skills: budgeting, saving, credit management, and building a solid financial foundation.',
    icon: '💰',
    category: 'Finance',
    difficulty: 'beginner',
    durationMinutes: 45,
    lessonsCount: 6,
    lessons: [
      'Why Financial Literacy Matters',
      'The Power of Compound Interest',
      'Building an Emergency Fund',
      'Understanding Credit & Debt',
      'Creating Your First Budget',
      'Setting Financial Goals'
    ]
  },
  {
    id: 2,
    slug: 'keygrow-rent-to-own',
    title: 'KeyGrow: Path to Homeownership',
    description: 'Learn how rent-to-own works, how equity builds with each payment, and strategies to accelerate ownership.',
    icon: '🏠',
    category: 'Real Estate',
    difficulty: 'beginner',
    durationMinutes: 60,
    lessonsCount: 8,
    lessons: [
      'What is Rent-to-Own?',
      'How Equity Builds Over Time',
      'Understanding Your Contract',
      'Payment Strategies',
      'Improving Credit for Mortgage',
      'Property Inspection Tips',
      'Legal Considerations',
      'Transition to Full Ownership'
    ]
  },
  {
    id: 10,
    slug: 'cryptocurrency-basics',
    title: 'Cryptocurrency Basics',
    description: 'Your first steps into digital currencies. Learn what cryptocurrency is, how it works, and why it matters.',
    icon: '₿',
    category: 'Blockchain',
    difficulty: 'beginner',
    durationMinutes: 35,
    lessonsCount: 4,
    lessons: [
      'What is Cryptocurrency?',
      'How Blockchain Works',
      'Bitcoin vs Altcoins',
      'Safe Crypto Practices'
    ]
  },
  {
    id: 11,
    slug: 'wallet-setup-guide',
    title: 'Wallet Setup & Safety',
    description: 'Set up your first crypto wallet, understand wallet types, and keep your assets secure.',
    icon: '👛',
    category: 'Blockchain',
    difficulty: 'beginner',
    durationMinutes: 40,
    lessonsCount: 4,
    lessons: [
      'Types of Crypto Wallets',
      'Setting Up MetaMask',
      'Securing Your Wallet',
      'Backup & Recovery'
    ]
  },
  {
    id: 12,
    slug: 'blockchain-fundamentals',
    title: 'Blockchain Fundamentals',
    description: 'Understand blockchain technology from blocks and chains to consensus and smart contracts.',
    icon: '🔗',
    category: 'Blockchain',
    difficulty: 'beginner',
    durationMinutes: 45,
    lessonsCount: 4,
    lessons: [
      'What is a Blockchain?',
      'Consensus Mechanisms',
      'Smart Contracts Explained',
      'Real-World Applications'
    ]
  },
  {
    id: 13,
    slug: 'intro-to-defi',
    title: 'Introduction to DeFi',
    description: 'Discover decentralized finance and how it provides financial services without traditional banks.',
    icon: '🏦',
    category: 'Finance',
    difficulty: 'beginner',
    durationMinutes: 40,
    lessonsCount: 4,
    lessons: [
      'What is DeFi?',
      'Lending & Borrowing',
      'Liquidity Pools',
      'Yield Farming Basics'
    ]
  },
  {
    id: 14,
    slug: 'nft-essentials',
    title: 'NFT Essentials',
    description: 'Learn what NFTs are, how they work, and applications beyond art including gaming and real-world assets.',
    icon: '🖼️',
    category: 'Blockchain',
    difficulty: 'beginner',
    durationMinutes: 35,
    lessonsCount: 4,
    lessons: [
      'What are NFTs?',
      'How NFTs Work',
      'NFT Marketplaces',
      'Future of Digital Ownership'
    ]
  },
  {
    id: 15,
    slug: 'tokenomics-101',
    title: 'Tokenomics 101',
    description: 'Understand token economics from supply and distribution to utility and value drivers.',
    icon: '📊',
    category: 'Blockchain',
    difficulty: 'beginner',
    durationMinutes: 40,
    lessonsCount: 4,
    lessons: [
      'What is Tokenomics?',
      'Supply & Demand',
      'Token Utility',
      'Evaluating Projects'
    ]
  },
  {
    id: 16,
    slug: 'web3-community-guide',
    title: 'Web3 Community Guide',
    description: 'Participate in Web3 communities, join DAOs, and contribute to decentralized projects.',
    icon: '🤝',
    category: 'Community',
    difficulty: 'beginner',
    durationMinutes: 35,
    lessonsCount: 4,
    lessons: [
      'Finding Web3 Communities',
      'What are DAOs?',
      'Contributing to Projects',
      'Building Your Reputation'
    ]
  }
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function FreeLearningHub() {
  const [selectedCourse, setSelectedCourse] = useState<typeof FREE_COURSES[0] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('axiom_completed_lessons');
    if (saved) {
      setCompletedLessons(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleLesson = (courseSlug: string, lessonIndex: number) => {
    const key = `${courseSlug}-${lessonIndex}`;
    const newCompleted = new Set(completedLessons);
    if (newCompleted.has(key)) {
      newCompleted.delete(key);
    } else {
      newCompleted.add(key);
    }
    setCompletedLessons(newCompleted);
    localStorage.setItem('axiom_completed_lessons', JSON.stringify([...newCompleted]));
  };

  const getCourseProgress = (course: typeof FREE_COURSES[0]) => {
    let completed = 0;
    course.lessons.forEach((_, i) => {
      if (completedLessons.has(`${course.slug}-${i}`)) completed++;
    });
    return Math.round((completed / course.lessons.length) * 100);
  };

  const totalProgress = () => {
    const totalLessons = FREE_COURSES.reduce((acc, c) => acc + c.lessons.length, 0);
    return Math.round((completedLessons.size / totalLessons) * 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/academy/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: selectedCourse ? {
            courseName: selectedCourse.title,
            courseDescription: selectedCourse.description,
            lessons: selectedCourse.lessons
          } : null,
          history: messages.slice(-6)
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error: any) {
      toast.error('AI tutor is temporarily unavailable');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment, or feel free to explore the course materials directly!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What should I learn first as a beginner?",
    "How does blockchain technology work?",
    "What's the difference between saving and investing?",
    "How can I start building wealth with little money?",
    "What is DeFi and why does it matter?"
  ];

  return (
    <Layout>
      <Head>
        <title>Free Learning Hub | Axiom Academy</title>
        <meta name="description" content="Access 9 free courses on financial literacy, blockchain, and wealth building. Learn at your own pace with AI-powered assistance." />
      </Head>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/academy" className="text-green-200 hover:text-white text-sm">
                Academy
              </Link>
              <span className="text-green-300">/</span>
              <span className="text-sm">Free Learning Hub</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm mb-4">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                  Forever Free - No Credit Card Required
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3">Free Learning Hub</h1>
                <p className="text-green-100 text-lg max-w-xl">
                  Master financial literacy and blockchain fundamentals with 9 complete courses, 
                  40+ lessons, and your personal AI learning assistant.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 min-w-[200px]">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-1">{totalProgress()}%</div>
                  <p className="text-green-200 text-sm">Overall Progress</p>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-500"
                      style={{ width: `${totalProgress()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Free Courses</h2>
                <span className="text-sm text-gray-500">{FREE_COURSES.length} courses available</span>
              </div>

              <div className="space-y-4">
                {FREE_COURSES.map((course) => {
                  const progress = getCourseProgress(course);
                  const isExpanded = selectedCourse?.id === course.id;
                  
                  return (
                    <div 
                      key={course.id}
                      className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${
                        isExpanded ? 'border-green-500 shadow-lg' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div 
                        className="p-5 cursor-pointer"
                        onClick={() => setSelectedCourse(isExpanded ? null : course)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{course.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {course.category}
                              </span>
                              <span className="text-xs text-gray-400">{course.durationMinutes} min</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{course.title}</h3>
                            <p className="text-gray-600 text-sm">{course.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div 
                                  className="bg-green-500 rounded-full h-2 transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-600">{progress}%</span>
                            </div>
                          </div>
                          <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">Course Lessons</h4>
                            <button
                              onClick={() => { setShowTutor(true); }}
                              className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              Ask AI Tutor about this course
                            </button>
                          </div>
                          <div className="space-y-2">
                            {course.lessons.map((lesson, i) => {
                              const isCompleted = completedLessons.has(`${course.slug}-${i}`);
                              return (
                                <div 
                                  key={i}
                                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                    isCompleted ? 'bg-green-100' : 'bg-white hover:bg-gray-100'
                                  }`}
                                  onClick={() => toggleLesson(course.slug, i)}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                    isCompleted 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {isCompleted ? '✓' : i + 1}
                                  </div>
                                  <span className={isCompleted ? 'text-green-800' : 'text-gray-700'}>
                                    {lesson}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <Link
                            href={`/academy/course/${course.slug}`}
                            className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                          >
                            Start Learning
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:w-1/3">
              <div className="sticky top-4">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <div>
                          <h3 className="font-bold">AI Learning Assistant</h3>
                          <p className="text-green-100 text-xs">Ask me anything about your courses</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTutor(!showTutor)}
                        className="text-white/80 hover:text-white"
                      >
                        {showTutor ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {showTutor && (
                    <>
                      <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-3">👋</div>
                            <p className="text-gray-600 mb-4">Hi! I'm your AI learning assistant. Ask me anything about:</p>
                            <div className="space-y-2">
                              {suggestedQuestions.slice(0, 3).map((q, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setInput(q); }}
                                  className="block w-full text-left text-sm bg-white border border-gray-200 rounded-lg p-3 hover:border-green-300 transition-colors"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                                msg.role === 'user'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white border border-gray-200 text-gray-800'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isLoading}
                          />
                          <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>

                <div className="mt-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-2">Ready for More?</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Upgrade to Pro for access to all 16+ courses, live workshops, and exclusive community channels.
                  </p>
                  <Link
                    href="/academy#membership"
                    className="block text-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Explore Pro Benefits
                  </Link>
                </div>

                <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lessons Completed</span>
                      <span className="font-bold text-green-600">{completedLessons.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Lessons</span>
                      <span className="font-bold">{FREE_COURSES.reduce((a, c) => a + c.lessons.length, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Courses Started</span>
                      <span className="font-bold">{FREE_COURSES.filter(c => getCourseProgress(c) > 0).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
