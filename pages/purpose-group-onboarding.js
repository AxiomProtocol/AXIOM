import { useState, useEffect } from 'react';
import Link from 'next/link';

function cleanAIContent(text) {
  if (!text) return '';
  return String(text)
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .trim();
}

const steps = [
  { id: 'welcome', title: 'Welcome', icon: '👋' },
  { id: 'region', title: 'Your Region', icon: '📍' },
  { id: 'purpose', title: 'Your Purpose', icon: '🎯' },
  { id: 'commitment', title: 'Commitment', icon: '💪' },
  { id: 'connect', title: 'Connect', icon: '🤝' }
];

const regions = [
  { id: 'atlanta', name: 'Atlanta Metro', members: 0, icon: '🏙️' },
  { id: 'houston', name: 'Houston Area', members: 0, icon: '🤠' },
  { id: 'chicago', name: 'Chicago Region', members: 0, icon: '🌆' },
  { id: 'brooklyn', name: 'Brooklyn/NYC', members: 0, icon: '🗽' },
  { id: 'la', name: 'Los Angeles', members: 0, icon: '🌴' },
  { id: 'miami', name: 'Miami/South FL', members: 0, icon: '🌊' },
  { id: 'dallas', name: 'Dallas/DFW', members: 0, icon: '⛪' },
  { id: 'other', name: 'Other Region', members: 0, icon: '🌍' }
];

const purposes = [
  { id: 'emergency', name: 'Emergency Fund', description: 'Build a safety net together', icon: '🛡️', monthlyMin: 50 },
  { id: 'homeownership', name: 'Home Ownership', description: 'Save toward your first home', icon: '🏠', monthlyMin: 200 },
  { id: 'business', name: 'Business Launch', description: 'Fund your entrepreneurial dreams', icon: '💼', monthlyMin: 150 },
  { id: 'education', name: 'Education', description: 'Invest in learning and growth', icon: '📚', monthlyMin: 100 },
  { id: 'investment', name: 'Investment Capital', description: 'Build wealth through investing', icon: '📈', monthlyMin: 250 },
  { id: 'travel', name: 'Travel & Experience', description: 'Save for meaningful experiences', icon: '✈️', monthlyMin: 75 },
  { id: 'family', name: 'Family Goals', description: 'Plan for your family\'s future', icon: '👨‍👩‍👧‍👦', monthlyMin: 100 },
  { id: 'custom', name: 'Custom Purpose', description: 'Define your own goal', icon: '⭐', monthlyMin: 50 }
];

const commitmentLevels = [
  { id: 'starter', amount: 50, label: 'Starter', description: 'Great for beginners', duration: 6 },
  { id: 'builder', amount: 100, label: 'Builder', description: 'Steady progress', duration: 6 },
  { id: 'accelerator', amount: 200, label: 'Accelerator', description: 'Faster results', duration: 6 },
  { id: 'custom', amount: 0, label: 'Custom', description: 'Set your own amount', duration: 6 }
];

export default function PurposeGroupOnboarding() {
  const [showVideo, setShowVideo] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    region: '',
    purpose: '',
    commitmentAmount: 100,
    commitmentDuration: 6,
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [matchedGroups, setMatchedGroups] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const handleVideoEnd = () => {
    setShowVideo(false);
    setCurrentStep(1);
  };

  const skipVideo = () => {
    setShowVideo(false);
    setCurrentStep(1);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.region) {
      newErrors.region = 'Please select a region';
    }
    if (!formData.purpose) {
      newErrors.purpose = 'Please select a purpose';
    }
    if (!formData.commitmentAmount || formData.commitmentAmount < 25) {
      newErrors.commitment = 'Minimum contribution is $25/month';
    }
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your name';
    }
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (currentStep === 3 && formData.purpose && formData.region) {
      fetchAIInsights();
    }
  }, [currentStep, formData.purpose, formData.region]);

  useEffect(() => {
    if (formData.region && formData.purpose && currentStep >= 2) {
      fetchMatchedGroups();
    }
  }, [formData.region, formData.purpose, currentStep]);

  const fetchMatchedGroups = async () => {
    setMatchLoading(true);
    try {
      const response = await fetch('/api/ai/smart-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: formData.region,
          purpose: formData.purpose,
          commitmentLevel: 'medium',
          contributionAmount: formData.commitmentAmount || 100
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatchedGroups(data.matches?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Matching error:', error);
    } finally {
      setMatchLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      const response = await fetch('/api/ai/member-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I'm joining a Purpose Group in ${formData.region} focused on ${formData.purpose}. What tips do you have for success and what should I expect from my first 3 months?`,
          history: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.response);
      }
    } catch (error) {
      console.error('AI insights error:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/susu/join-purpose-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: formData.region,
          purpose: formData.purpose,
          commitmentAmount: formData.commitmentAmount,
          commitmentDuration: formData.commitmentDuration,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join Purpose Group');
      }
      
      // Save onboarding completion flags
      localStorage.setItem('axiom_onboarding_completed', 'true');
      localStorage.setItem('axiom_onboarding_complete', 'true');
      
      // Save user preferences for personalized dashboard
      localStorage.setItem('axiom_user_name', formData.name);
      
      // Map purpose to interests for personalized dashboard
      const purposeToInterests = {
        'emergency_fund': ['susu'],
        'land_acquisition': ['land', 'susu'],
        'business_capital': ['susu', 'staking'],
        'education': ['training', 'susu'],
        'family_wealth': ['susu', 'keygrow', 'land'],
        'community_development': ['land', 'governance', 'susu']
      };
      const interests = purposeToInterests[formData.purpose] || ['susu'];
      localStorage.setItem('axiom_user_interests', JSON.stringify(interests));
      localStorage.setItem('axiom_experience_level', 'new');
      localStorage.setItem('axiom_user_goals', JSON.stringify(['community', 'ownership']));
      
      setCurrentStep(steps.length);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">✨</div>
            
            <h2 className="text-3xl font-bold text-yellow-500 mb-4">Welcome to The Wealth Practice</h2>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              You're about to discover a proven system for building wealth together through Group Economics.
            </p>

            {/* VIDEO PLACEHOLDER - Ready for new Discord-focused video */}
            <div className="max-w-2xl mx-auto mb-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-yellow-500/30">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="text-xl font-bold text-white mb-3">Join 5,000+ Builders</h3>
              <p className="text-gray-400 mb-6">
                Connect with a community of people committed to building generational wealth through collective land ownership.
              </p>
              <a 
                href="https://discord.gg/mKYFjSeR4" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Our Discord Community
              </a>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-semibold text-white mb-2">Step 1: Join Discord</h3>
                <p className="text-gray-400 text-sm">Connect with the community and learn the basics</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="text-3xl mb-3">📚</div>
                <h3 className="font-semibold text-white mb-2">Step 2: Get Educated</h3>
                <p className="text-gray-400 text-sm">Learn about land ownership and wealth building</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="text-3xl mb-3">🏡</div>
                <h3 className="font-semibold text-white mb-2">Step 3: Own Land</h3>
                <p className="text-gray-400 text-sm">Pool resources to acquire land together</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Where are you located?</h2>
            <p className="text-gray-400 mb-8 text-center">Join members in your region for local connections and meetups</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setFormData({ ...formData, region: region.id })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.region === region.id
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{region.icon}</span>
                    <div>
                      <div className="font-semibold text-white">{region.name}</div>
                      {region.members > 0 && (
                        <div className="text-sm text-gray-400">{region.members} members</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">What's your purpose?</h2>
            <p className="text-gray-400 mb-8 text-center">Choose a goal that matches your wealth-building journey</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {purposes.map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => setFormData({ ...formData, purpose: purpose.id })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.purpose === purpose.id
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{purpose.icon}</span>
                    <div>
                      <div className="font-semibold text-white">{purpose.name}</div>
                      <div className="text-sm text-gray-400">{purpose.description}</div>
                      <div className="text-xs text-yellow-500 mt-1">From ${purpose.monthlyMin}/month</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Set your commitment</h2>
            <p className="text-gray-400 mb-8 text-center">How much can you consistently contribute each month?</p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {commitmentLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setFormData({ 
                    ...formData, 
                    commitmentAmount: level.amount || formData.commitmentAmount 
                  })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.commitmentAmount === level.amount
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">{level.label}</div>
                      <div className="text-sm text-gray-400">{level.description}</div>
                    </div>
                    {level.amount > 0 && (
                      <div className="text-xl font-bold text-yellow-500">${level.amount}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {formData.commitmentAmount === 0 && (
              <div className="mb-8">
                <label className="block text-sm text-gray-400 mb-2">Custom amount</label>
                <input
                  type="number"
                  min="25"
                  placeholder="Enter amount"
                  onChange={(e) => setFormData({ ...formData, commitmentAmount: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            )}

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-500">✨</span> Your 6-Month Projection
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm">Monthly contribution</div>
                  <div className="text-xl font-bold text-white">${formData.commitmentAmount}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">6-month savings</div>
                  <div className="text-xl font-bold text-yellow-500">${formData.commitmentAmount * 6}</div>
                </div>
              </div>
            </div>

            {aiInsights && (
              <div className="mt-6 bg-purple-900/20 rounded-xl p-6 border border-purple-500/30">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span>🤖</span> AI Insights for Your Journey
                </h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{cleanAIContent(aiInsights).slice(0, 500)}...</p>
              </div>
            )}

            {(matchedGroups.length > 0 || matchLoading) && (
              <div className="mt-6 bg-green-900/20 rounded-xl p-6 border border-green-500/30">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>⚡</span> Top Matched Groups for You
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">AI-Powered</span>
                </h3>
                
                {matchLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchedGroups.map((group, idx) => {
                      const spotsLeft = (group.maxMembers || 12) - (group.memberCount || 0);
                      const urgencyHours = spotsLeft <= 3 ? Math.floor(Math.random() * 24) + 6 : Math.floor(Math.random() * 72) + 24;
                      
                      return (
                        <div 
                          key={group.groupId || idx}
                          className={`bg-gray-800/80 rounded-lg p-4 border ${
                            idx === 0 ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-semibold">
                                  Best Match
                                </span>
                              )}
                              <span className="font-semibold text-white">{group.groupName}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-400">{group.matchScore}% Match</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <span>📍</span> {group.region || 'National'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span>💰</span> ${group.avgContribution || 100}/mo
                            </span>
                            <span className="flex items-center gap-1">
                              <span>⭐</span> {group.trustScore || 70} trust
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                spotsLeft <= 3 
                                  ? 'bg-red-500/20 text-red-300' 
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {spotsLeft} spots left
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                urgencyHours <= 24 
                                  ? 'bg-orange-500/20 text-orange-300' 
                                  : 'bg-gray-700/50 text-gray-400'
                              }`}>
                                <span className={urgencyHours <= 24 ? 'animate-pulse' : ''}>⏱️</span>
                                <span>~{urgencyHours}h to fill</span>
                              </div>
                            </div>
                            {group.matchReasons && group.matchReasons.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {group.matchReasons.slice(0, 2).join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {matchedGroups.length > 0 && (
                  <p className="text-center text-gray-400 text-xs mt-4">
                    Groups matched based on your region, purpose, and contribution level
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Let's connect</h2>
            <p className="text-gray-400 mb-8 text-center">Enter your details to join the Purpose Group</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  placeholder="Enter your full name"
                  className={`w-full p-3 bg-gray-800 border rounded-lg text-white ${
                    errors.name ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  placeholder="your@email.com"
                  className={`w-full p-3 bg-gray-800 border rounded-lg text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              
              {submitError && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{submitError}</p>
                </div>
              )}
            </div>

            <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700 max-w-md mx-auto">
              <h3 className="font-semibold text-white mb-4">Your Journey Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Region:</span>
                  <span className="text-white">{regions.find(r => r.id === formData.region)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Purpose:</span>
                  <span className="text-white">{purposes.find(p => p.id === formData.purpose)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly commitment:</span>
                  <span className="text-yellow-500 font-bold">${formData.commitmentAmount}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-yellow-500 mb-4">Welcome to the Family!</h2>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              You've successfully joined a Purpose Group. Your journey toward building wealth 
              together starts now.
            </p>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 max-w-md mx-auto mb-8">
              <h3 className="font-semibold text-white mb-4">What's Next?</h3>
              <ul className="text-left space-y-3 text-gray-300">
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Check your email for welcome instructions
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Join your regional Interest Hub
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Meet your fellow Purpose Group members
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">✓</span>
                  Make your first contribution
                </li>
              </ul>
            </div>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors cursor-pointer"
              >
                Go to Your Dashboard
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Explore Homepage
              </button>
            </div>
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.region !== '';
      case 2: return formData.purpose !== '';
      case 3: return formData.commitmentAmount > 0;
      case 4: return formData.name !== '' && formData.email !== '';
      default: return true;
    }
  };

  const handleBackWithVideo = () => {
    if (currentStep === 1) {
      setShowVideo(true);
    } else {
      handleBack();
    }
  };

  if (showVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-start px-4 py-8 pt-24">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <span className="text-5xl">🌱</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Reclaim What Was Taken.<br />
              <span className="text-yellow-500">Build What Was Denied.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mt-4">
              For generations, land was taken quietly. Not through force, but through paperwork. Through missing wills. Through laws that families were never taught to navigate.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-8 border border-yellow-500/30 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Axiom exists to change that.</h2>
            <p className="text-gray-300 text-center mb-6">
              Axiom is infrastructure — for truth, for record-keeping, and for reclamation.
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">📜</div>
                <h3 className="font-semibold text-white text-sm">Land Reclamation Workbook</h3>
                <p className="text-gray-400 text-xs mt-1">Trace ancestry, identify records, rebuild chains of title</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🏡</div>
                <h3 className="font-semibold text-white text-sm">Community Land Fund</h3>
                <p className="text-gray-400 text-xs mt-1">Hold, protect, and steward land collectively</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🚛</div>
                <h3 className="font-semibold text-white text-sm">Sovran Logistics</h3>
                <p className="text-gray-400 text-xs mt-1">From land, to harvest, to movement</p>
              </div>
            </div>

            <div className="bg-green-900/30 rounded-xl p-6 border border-green-500/30 text-center">
              <h3 className="text-xl font-bold text-white mb-2">The Journey Begins in Discord</h3>
              <p className="text-gray-300 mb-4">
                Join as a participant, not a customer. Get a <span className="text-yellow-500 font-semibold">free research checklist</span> that shows exactly how heir property research works.
              </p>
              <p className="text-gray-400 text-sm mb-6">No pressure. No cost. Just clarity.</p>
              
              <a 
                href="https://discord.gg/mKYFjSeR4" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-8 rounded-xl transition-all text-lg shadow-lg hover:scale-105 transform duration-200"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join the Axiom Community
              </a>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">Already a member? Continue to explore:</p>
            <button
              onClick={skipVideo}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Continue to Purpose Groups
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm italic max-w-xl mx-auto">
              "Axiom is not asking people to believe. It is giving them tools. And for the first time in a long time — the record can speak for itself."
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12 px-4 pb-24">
        <div className="max-w-3xl mx-auto">
          {currentStep < steps.length && currentStep > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                {steps.slice(1).map((step, idx) => (
                  <div 
                    key={step.id}
                    className={`flex items-center ${idx < steps.length - 2 ? 'flex-1' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                      ${idx + 1 <= currentStep 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    {idx < steps.length - 2 && (
                      <div className={`flex-1 h-1 mx-2 rounded ${
                        idx + 1 < currentStep ? 'bg-yellow-500' : 'bg-gray-700'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <span className="text-sm text-gray-400">
                  Step {currentStep} of {steps.length - 1}: {steps[currentStep].title}
                </span>
              </div>
            </div>
          )}

          <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-8">
            {renderStep()}
          </div>

          {currentStep < steps.length && currentStep > 0 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBackWithVideo}
                className="px-6 py-3 rounded-lg font-semibold transition-colors bg-gray-700 text-white hover:bg-gray-600"
              >
                Back
              </button>
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    canProceed()
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || loading}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    canProceed() && !loading
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Joining...' : 'Join Purpose Group'}
                </button>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
