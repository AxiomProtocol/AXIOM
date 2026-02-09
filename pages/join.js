import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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
      
      localStorage.setItem('axiom_onboarding_completed', 'true');
      localStorage.setItem('axiom_onboarding_complete', 'true');
      localStorage.setItem('axiom_user_name', formData.name);
      
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
            <div className="text-4xl mb-4">✨</div>
            
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">Welcome to The Wealth Practice</h2>
            <p className="text-sm text-dl-gray mb-6 max-w-xl mx-auto">
              You're about to discover a proven system for building wealth together through Group Economics.
            </p>

            <div className="max-w-2xl mx-auto mb-6 border border-dl-border bg-dl-bg-alt p-6">
              <div className="text-3xl mb-3">🌱</div>
              <h3 className="font-dl-serif text-lg text-dl-navy mb-2">Join 5,000+ Builders</h3>
              <p className="text-sm text-dl-gray mb-4">
                Connect with a community of people committed to building generational wealth through collective land ownership.
              </p>
              <a 
                href="https://discord.gg/mKYFjSeR4" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-dl-navy text-white text-sm font-medium py-2 px-4"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Our Discord Community
              </a>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="border border-dl-border p-4">
                <div className="text-2xl mb-2">🤝</div>
                <h3 className="text-sm font-medium text-dl-navy mb-1">Step 1: Join Discord</h3>
                <p className="text-xs text-dl-gray">Connect with the community and learn the basics</p>
              </div>
              <div className="border border-dl-border p-4">
                <div className="text-2xl mb-2">📚</div>
                <h3 className="text-sm font-medium text-dl-navy mb-1">Step 2: Get Educated</h3>
                <p className="text-xs text-dl-gray">Learn about land ownership and wealth building</p>
              </div>
              <div className="border border-dl-border p-4">
                <div className="text-2xl mb-2">🏡</div>
                <h3 className="text-sm font-medium text-dl-navy mb-1">Step 3: Own Land</h3>
                <p className="text-xs text-dl-gray">Pool resources to acquire land together</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="font-dl-serif text-xl text-dl-navy mb-1 text-center">Where are you located?</h2>
            <p className="text-sm text-dl-gray mb-6 text-center">Join members in your region for local connections and meetups</p>
            
            <div className="grid md:grid-cols-2 gap-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setFormData({ ...formData, region: region.id })}
                  className={`p-3 border text-left ${
                    formData.region === region.id
                      ? 'border-dl-navy bg-dl-bg-alt'
                      : 'border-dl-border bg-dl-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{region.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-dl-navy">{region.name}</div>
                      {region.members > 0 && (
                        <div className="text-xs text-dl-gray font-dl-mono">{region.members} members</div>
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
            <h2 className="font-dl-serif text-xl text-dl-navy mb-1 text-center">What's your purpose?</h2>
            <p className="text-sm text-dl-gray mb-6 text-center">Choose a goal that matches your wealth-building journey</p>
            
            <div className="grid md:grid-cols-2 gap-3">
              {purposes.map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => setFormData({ ...formData, purpose: purpose.id })}
                  className={`p-3 border text-left ${
                    formData.purpose === purpose.id
                      ? 'border-dl-navy bg-dl-bg-alt'
                      : 'border-dl-border bg-dl-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{purpose.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-dl-navy">{purpose.name}</div>
                      <div className="text-xs text-dl-gray">{purpose.description}</div>
                      <div className="text-xs text-dl-navy font-dl-mono mt-1">From ${purpose.monthlyMin}/month</div>
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
            <h2 className="font-dl-serif text-xl text-dl-navy mb-1 text-center">Set your commitment</h2>
            <p className="text-sm text-dl-gray mb-6 text-center">How much can you consistently contribute each month?</p>
            
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {commitmentLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setFormData({ 
                    ...formData, 
                    commitmentAmount: level.amount || formData.commitmentAmount 
                  })}
                  className={`p-3 border text-left ${
                    formData.commitmentAmount === level.amount
                      ? 'border-dl-navy bg-dl-bg-alt'
                      : 'border-dl-border bg-dl-bg'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-dl-navy">{level.label}</div>
                      <div className="text-xs text-dl-gray">{level.description}</div>
                    </div>
                    {level.amount > 0 && (
                      <div className="text-lg font-dl-mono font-semibold text-dl-navy">${level.amount}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {formData.commitmentAmount === 0 && (
              <div className="mb-6">
                <label className="block text-xs text-dl-gray mb-1">Custom amount</label>
                <input
                  type="number"
                  min="25"
                  placeholder="Enter amount"
                  onChange={(e) => setFormData({ ...formData, commitmentAmount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                />
              </div>
            )}

            <div className="border border-dl-border p-4 mb-6">
              <h3 className="text-sm font-medium text-dl-navy mb-3">Your 6-Month Projection</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dl-gray">Monthly contribution</div>
                  <div className="text-lg font-dl-mono font-semibold text-dl-navy">${formData.commitmentAmount}</div>
                </div>
                <div>
                  <div className="text-xs text-dl-gray">6-month savings</div>
                  <div className="text-lg font-dl-mono font-semibold text-dl-navy">${formData.commitmentAmount * 6}</div>
                </div>
              </div>
            </div>

            {aiInsights && (
              <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                <h3 className="text-sm font-medium text-dl-navy mb-2">AI Insights for Your Journey</h3>
                <p className="text-xs text-dl-gray whitespace-pre-wrap">{cleanAIContent(aiInsights).slice(0, 500)}...</p>
              </div>
            )}

            {(matchedGroups.length > 0 || matchLoading) && (
              <div className="border border-dl-border bg-dl-bg-alt p-4">
                <h3 className="text-sm font-medium text-dl-navy mb-3">
                  Top Matched Groups for You
                </h3>
                
                {matchLoading ? (
                  <p className="text-sm text-dl-gray font-dl-mono">Finding matches...</p>
                ) : (
                  <div className="space-y-2">
                    {matchedGroups.map((group, idx) => {
                      const spotsLeft = (group.maxMembers || 12) - (group.memberCount || 0);
                      
                      return (
                        <div 
                          key={group.groupId || idx}
                          className={`border p-3 ${
                            idx === 0 ? 'border-dl-navy bg-dl-bg' : 'border-dl-border bg-dl-bg'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <span className="text-xs bg-dl-navy text-white px-2 py-0.5 font-medium">
                                  Best Match
                                </span>
                              )}
                              <span className="text-sm font-medium text-dl-navy">{group.groupName}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-dl-mono text-dl-navy">{group.matchScore}% Match</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-dl-gray mb-2">
                            <span>📍 {group.region || 'National'}</span>
                            <span>💰 ${group.avgContribution || 100}/mo</span>
                            <span>⭐ {group.trustScore || 70} trust</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs border px-2 py-0.5 ${
                                spotsLeft <= 3 
                                  ? 'border-dl-error text-dl-error' 
                                  : 'border-dl-border text-dl-gray'
                              }`}>
                                {spotsLeft} spots left
                              </span>
                            </div>
                            {group.matchReasons && group.matchReasons.length > 0 && (
                              <div className="text-xs text-dl-gray">
                                {group.matchReasons.slice(0, 2).join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {matchedGroups.length > 0 && (
                  <p className="text-center text-xs text-dl-gray mt-3">
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
            <h2 className="font-dl-serif text-xl text-dl-navy mb-1 text-center">Let's connect</h2>
            <p className="text-sm text-dl-gray mb-6 text-center">Enter your details to join the Purpose Group</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-xs text-dl-gray mb-1">Your name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  placeholder="Enter your full name"
                  className={`w-full px-3 py-2 border bg-dl-bg text-dl-navy text-sm font-dl-mono ${
                    errors.name ? 'border-dl-error' : 'border-dl-border'
                  }`}
                />
                {errors.name && <p className="text-dl-error text-xs mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-xs text-dl-gray mb-1">Email address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  placeholder="your@email.com"
                  className={`w-full px-3 py-2 border bg-dl-bg text-dl-navy text-sm font-dl-mono ${
                    errors.email ? 'border-dl-error' : 'border-dl-border'
                  }`}
                />
                {errors.email && <p className="text-dl-error text-xs mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-xs text-dl-gray mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                />
              </div>
              
              {submitError && (
                <div className="border border-dl-error bg-dl-bg p-3">
                  <p className="text-dl-error text-xs">{submitError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 border border-dl-border p-4 max-w-md mx-auto">
              <h3 className="text-sm font-medium text-dl-navy mb-3">Your Journey Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dl-gray">Region:</span>
                  <span className="text-dl-navy">{regions.find(r => r.id === formData.region)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-gray">Purpose:</span>
                  <span className="text-dl-navy">{purposes.find(p => p.id === formData.purpose)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-gray">Monthly commitment:</span>
                  <span className="text-dl-navy font-dl-mono font-semibold">${formData.commitmentAmount}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">Welcome to the Family!</h2>
            <p className="text-sm text-dl-gray mb-6 max-w-xl mx-auto">
              You've successfully joined a Purpose Group. Your journey toward building wealth 
              together starts now.
            </p>
            
            <div className="border border-dl-border p-4 max-w-md mx-auto mb-6">
              <h3 className="text-sm font-medium text-dl-navy mb-3">What's Next?</h3>
              <ul className="text-left space-y-2 text-sm text-dl-navy">
                <li className="flex gap-2">
                  <span className="text-dl-forest">✓</span>
                  Check your email for welcome instructions
                </li>
                <li className="flex gap-2">
                  <span className="text-dl-forest">✓</span>
                  Join your regional Interest Hub
                </li>
                <li className="flex gap-2">
                  <span className="text-dl-forest">✓</span>
                  Meet your fellow Purpose Group members
                </li>
                <li className="flex gap-2">
                  <span className="text-dl-forest">✓</span>
                  Make your first contribution
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/dashboard" className="px-4 py-2 bg-dl-navy text-white text-sm font-medium">
                Go to Your Dashboard
              </Link>
              <Link href="/" className="px-4 py-2 border border-dl-border text-dl-navy bg-dl-bg text-sm">
                Explore Homepage
              </Link>
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
      <DesignLawLayout>
        <Head>
          <title>Join Axiom | Purpose Group Onboarding</title>
        </Head>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">🌱</div>
            <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">
              Reclaim What Was Taken. Build What Was Denied.
            </h1>
            <p className="text-sm text-dl-gray max-w-2xl mx-auto leading-relaxed mt-3">
              For generations, land was taken quietly. Not through force, but through paperwork. Through missing wills. Through laws that families were never taught to navigate.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-6">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full border border-dl-border"
                src="https://www.youtube.com/embed/SeU1i0h9o_Y?rel=0"
                title="Axiom - Reclaim What Was Taken"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
            <h2 className="font-dl-serif text-xl text-dl-navy mb-3 text-center">Axiom exists to change that.</h2>
            <p className="text-sm text-dl-gray text-center mb-4">
              Axiom is infrastructure — for truth, for record-keeping, and for reclamation.
            </p>
            
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div className="border border-dl-border p-3 text-center">
                <div className="text-2xl mb-1">📜</div>
                <h3 className="text-xs font-medium text-dl-navy">Land Reclamation Workbook</h3>
                <p className="text-xs text-dl-gray mt-1">Trace ancestry, identify records, rebuild chains of title</p>
              </div>
              <div className="border border-dl-border p-3 text-center">
                <div className="text-2xl mb-1">🏡</div>
                <h3 className="text-xs font-medium text-dl-navy">Community Land Fund</h3>
                <p className="text-xs text-dl-gray mt-1">Hold, protect, and steward land collectively</p>
              </div>
              <div className="border border-dl-border p-3 text-center">
                <div className="text-2xl mb-1">🚛</div>
                <h3 className="text-xs font-medium text-dl-navy">Sovran Logistics</h3>
                <p className="text-xs text-dl-gray mt-1">From land, to harvest, to movement</p>
              </div>
            </div>

            <div className="border border-dl-border bg-dl-bg p-4 text-center">
              <h3 className="font-dl-serif text-lg text-dl-navy mb-2">The Journey Begins in Discord</h3>
              <p className="text-sm text-dl-gray mb-3">
                Join as a participant, not a customer. Get a free research checklist that shows exactly how heir property research works.
              </p>
              <p className="text-xs text-dl-gray mb-4">No pressure. No cost. Just clarity.</p>
              
              <a 
                href="https://discord.gg/mKYFjSeR4" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-dl-navy text-white text-sm font-medium py-2 px-4"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join the Axiom Community
              </a>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-dl-gray mb-3">Already a member? Continue to explore:</p>
            <button
              onClick={skipVideo}
              className="px-4 py-2 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium"
            >
              Continue to Purpose Groups
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-dl-gray italic max-w-xl mx-auto">
              "Axiom is not asking people to believe. It is giving them tools. And for the first time in a long time — the record can speak for itself."
            </p>
          </div>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Join Axiom | Purpose Group Onboarding</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        {currentStep < steps.length && currentStep > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {steps.slice(1).map((step, idx) => (
                <div 
                  key={step.id}
                  className={`flex items-center ${idx < steps.length - 2 ? 'flex-1' : ''}`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center text-sm ${
                    idx + 1 <= currentStep 
                      ? 'bg-dl-navy text-white' 
                      : 'bg-dl-bg-alt border border-dl-border text-dl-gray'
                  }`}>
                    {step.icon}
                  </div>
                  {idx < steps.length - 2 && (
                    <div className={`flex-1 h-px mx-2 ${
                      idx + 1 < currentStep ? 'bg-dl-navy' : 'bg-dl-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-xs text-dl-gray font-dl-mono">
                Step {currentStep} of {steps.length - 1}: {steps[currentStep].title}
              </span>
            </div>
          </div>
        )}

        <div className="border border-dl-border bg-dl-bg p-6">
          {renderStep()}
        </div>

        {currentStep < steps.length && currentStep > 0 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBackWithVideo}
              className="px-4 py-2 border border-dl-border text-dl-navy bg-dl-bg text-sm font-medium"
            >
              Back
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-4 py-2 text-sm font-medium ${
                  canProceed()
                    ? 'bg-dl-navy text-white'
                    : 'bg-dl-bg-alt border border-dl-border text-dl-gray cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className={`px-4 py-2 text-sm font-medium ${
                  canProceed() && !loading
                    ? 'bg-dl-navy text-white'
                    : 'bg-dl-bg-alt border border-dl-border text-dl-gray cursor-not-allowed'
                }`}
              >
                {loading ? 'Joining...' : 'Join Purpose Group'}
              </button>
            )}
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
