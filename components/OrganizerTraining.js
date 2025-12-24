import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect/WalletContext';

const CERTIFICATION_INFO = {
  foundation: { name: 'Foundation Organizer', badge: '🎓', color: '#10b981' },
  certified: { name: 'Certified Organizer', badge: '⭐', color: '#eab308' },
  master: { name: 'Master Organizer', badge: '👑', color: '#f59e0b' }
};

export default function OrganizerTraining() {
  const { walletState } = useWallet();
  const address = walletState?.address;
  
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [moduleContent, setModuleContent] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (address) {
      fetchProgress();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/training/progress?wallet=${address}`);
      const data = await res.json();
      if (data.success) {
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModule = async (moduleId) => {
    try {
      const res = await fetch(`/api/training/module/${moduleId}`);
      const data = await res.json();
      if (data.success) {
        setActiveModule(moduleId);
        setModuleContent(data.module);
        setQuizMode(false);
        setAnswers({});
        setQuizResult(null);
      }
    } catch (error) {
      console.error('Failed to load module:', error);
    }
  };

  const startQuiz = () => {
    setQuizMode(true);
    setAnswers({});
    setQuizResult(null);
  };

  const selectAnswer = (questionIdx, answerIdx) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }));
  };

  const submitQuiz = async () => {
    if (!moduleContent || Object.keys(answers).length < moduleContent.questionCount) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/training/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address,
          moduleId: activeModule,
          answers
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuizResult(data.result);
        if (data.result.passed) {
          fetchProgress();
        }
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModule = () => {
    setActiveModule(null);
    setModuleContent(null);
    setQuizMode(false);
    setAnswers({});
    setQuizResult(null);
  };

  if (!address) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Connect your wallet to access organizer training and earn certifications.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Loading training progress...</p>
      </div>
    );
  }

  if (activeModule && moduleContent) {
    return (
      <div className="space-y-6">
        <button
          onClick={closeModule}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span> Back to Modules
        </button>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{moduleContent.title}</h2>
              <p className="text-gray-400">{moduleContent.duration} minutes</p>
            </div>
            {!quizMode && !quizResult && (
              <button
                onClick={startQuiz}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
              >
                Take Quiz
              </button>
            )}
          </div>

          {!quizMode ? (
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {moduleContent.content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4">{line.slice(2)}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold text-yellow-400 mt-5 mb-3">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-lg font-semibold text-white mt-4 mb-2">{line.slice(4)}</h3>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 text-gray-300">{line.slice(2)}</li>;
                  }
                  if (line.match(/^\d+\. /)) {
                    return <li key={i} className="ml-4 text-gray-300 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
                  }
                  if (line.startsWith('> ')) {
                    return <blockquote key={i} className="border-l-4 border-yellow-500 pl-4 italic text-gray-400 my-4">{line.slice(2)}</blockquote>;
                  }
                  if (line.trim() === '') {
                    return <br key={i} />;
                  }
                  return <p key={i} className="mb-2">{line}</p>;
                })}
              </div>
            </div>
          ) : quizResult ? (
            <div className="text-center py-8">
              <div className={`text-6xl mb-4 ${quizResult.passed ? 'animate-bounce' : ''}`}>
                {quizResult.passed ? '🎉' : '📚'}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${quizResult.passed ? 'text-green-400' : 'text-orange-400'}`}>
                {quizResult.passed ? 'Congratulations!' : 'Keep Learning'}
              </h3>
              <p className="text-gray-400 mb-4">
                You scored {quizResult.score}% ({quizResult.correctAnswers}/{quizResult.totalQuestions} correct)
              </p>
              <p className="text-gray-500 mb-6">
                Passing score: {quizResult.passingScore}%
              </p>
              {quizResult.passed ? (
                <button
                  onClick={closeModule}
                  className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors"
                >
                  Continue Training
                </button>
              ) : (
                <div className="space-x-4">
                  <button
                    onClick={() => { setQuizMode(false); setQuizResult(null); }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                  >
                    Review Content
                  </button>
                  <button
                    onClick={() => { setAnswers({}); setQuizResult(null); }}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
                  >
                    Retry Quiz
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Quiz - {moduleContent.questionCount} Questions</h3>
              <p className="text-gray-400">Passing score: {moduleContent.passingScore}%</p>
              
              {moduleContent.quiz.map((q, qIdx) => (
                <div key={q.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-white font-medium mb-3">{qIdx + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => selectAnswer(qIdx, oIdx)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          answers[qIdx] === oIdx
                            ? 'border-yellow-500 bg-yellow-500/20 text-white'
                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4">
                <p className="text-gray-400">
                  {Object.keys(answers).length} of {moduleContent.questionCount} answered
                </p>
                <button
                  onClick={submitQuiz}
                  disabled={submitting || Object.keys(answers).length < moduleContent.questionCount}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentCert = progress?.currentCertification;
  const nextCert = progress?.nextCertification;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400">Progress</div>
          <div className="text-2xl font-bold text-white">{progress?.percentage || 0}%</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${progress?.percentage || 0}%` }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400">Current Level</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{currentCert ? CERTIFICATION_INFO[currentCert.id]?.badge : '📖'}</span>
            <span className="text-lg font-bold text-white">
              {currentCert ? CERTIFICATION_INFO[currentCert.id]?.name : 'Beginner'}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400">Next Milestone</div>
          {nextCert ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{CERTIFICATION_INFO[nextCert.id]?.badge}</span>
              <span className="text-lg font-bold text-yellow-400">
                {CERTIFICATION_INFO[nextCert.id]?.name}
              </span>
            </div>
          ) : (
            <div className="text-lg font-bold text-green-400 mt-1">All Complete!</div>
          )}
        </div>
      </div>

      {currentCert && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{CERTIFICATION_INFO[currentCert.id]?.badge}</div>
            <div>
              <h3 className="text-xl font-bold text-white">{CERTIFICATION_INFO[currentCert.id]?.name}</h3>
              <p className="text-gray-400">You've earned this certification!</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentCert.benefits?.map((benefit, i) => (
                  <span key={i} className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Training Modules</h2>
        
        <div className="space-y-3">
          {progress?.modules?.map((module) => (
            <div
              key={module.id}
              className={`border rounded-lg p-4 transition-all ${
                module.passed
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${module.passed ? 'text-green-400' : 'text-gray-500'}`}>
                    {module.passed ? '✓' : '○'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{module.title}</h3>
                    <p className="text-sm text-gray-400">{module.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{module.duration} min</span>
                      {module.attempts > 0 && (
                        <span>Attempts: {module.attempts}</span>
                      )}
                      {module.quizScore !== null && (
                        <span>Best Score: {module.quizScore}%</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openModule(module.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    module.passed
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
                >
                  {module.passed ? 'Review' : 'Start'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Certification Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(CERTIFICATION_INFO).map(([id, info]) => {
            const isEarned = progress?.earnedCertifications?.some(c => c.certification_level === id);
            return (
              <div
                key={id}
                className={`border rounded-lg p-4 ${
                  isEarned
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-gray-700 bg-gray-900/50'
                }`}
              >
                <div className="text-3xl mb-2">{info.badge}</div>
                <h3 className="font-bold text-white">{info.name}</h3>
                {isEarned && (
                  <span className="inline-block mt-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded font-medium">
                    Earned
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
