import { useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  name: string;
  interests: string[];
  experienceLevel: string;
  goals: string[];
  onboardingComplete: boolean;
}

export interface InterestConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  features: string[];
}

export const INTEREST_CONFIGS: Record<string, InterestConfig> = {
  land: {
    id: 'land',
    label: 'Land Stewardship',
    description: 'Acquire and develop land as a community',
    icon: '🌍',
    path: '/land',
    color: '#059669',
    features: ['land-campaigns', 'property-search', 'community-pooling']
  },
  keygrow: {
    id: 'keygrow',
    label: 'KeyGrow (Rent-to-Own)',
    description: 'Build ownership through monthly contributions',
    icon: '🏠',
    path: '/keygrow',
    color: '#7C3AED',
    features: ['rent-tracking', 'ownership-progress', 'property-matching']
  },
  susu: {
    id: 'susu',
    label: 'The Wealth Practice',
    description: 'Join Group Economics savings circles',
    icon: '💰',
    path: '/susu',
    color: '#D97706',
    features: ['circle-management', 'contribution-tracking', 'payout-calendar']
  },
  governance: {
    id: 'governance',
    label: 'Community Governance',
    description: 'Vote on proposals and shape the future',
    icon: '🗳️',
    path: '/governance',
    color: '#2563EB',
    features: ['proposal-voting', 'delegate-power', 'treasury-oversight']
  },
  training: {
    id: 'training',
    label: 'Steward Corps Training',
    description: '12-month leadership development program',
    icon: '📚',
    path: '/steward-corps',
    color: '#DC2626',
    features: ['course-progress', 'certifications', 'mentorship']
  },
  staking: {
    id: 'staking',
    label: 'Staking & Rewards',
    description: 'Earn yields by participating in the protocol',
    icon: '🌾',
    path: '/staking',
    color: '#0891B2',
    features: ['stake-management', 'rewards-tracking', 'yield-optimization']
  },
  transparency: {
    id: 'transparency',
    label: 'Transparency Reports',
    description: 'Track treasury and protocol activity',
    icon: '📊',
    path: '/transparency',
    color: '#4F46E5',
    features: ['treasury-metrics', 'activity-logs', 'financial-reports']
  },
  nodes: {
    id: 'nodes',
    label: 'Axiom Nodes',
    description: 'Run infrastructure and earn rewards',
    icon: '🖥️',
    path: '/nodes',
    color: '#059669',
    features: ['node-management', 'network-stats', 'earnings-dashboard']
  }
};

export const EXPERIENCE_LEVELS = {
  new: { label: 'New to Web3', showTutorials: true, simplifiedUI: true },
  learning: { label: 'Learning', showTutorials: true, simplifiedUI: false },
  experienced: { label: 'Experienced', showTutorials: false, simplifiedUI: false },
  expert: { label: 'Expert', showTutorials: false, simplifiedUI: false }
};

export const GOAL_CONFIGS: Record<string, { label: string; relatedInterests: string[] }> = {
  ownership: { label: 'Build Wealth & Ownership', relatedInterests: ['land', 'keygrow', 'staking'] },
  community: { label: 'Join a Community', relatedInterests: ['susu', 'governance', 'training'] },
  learn: { label: 'Learn About Web3', relatedInterests: ['training', 'transparency', 'governance'] },
  invest: { label: 'Invest in Real Assets', relatedInterests: ['land', 'keygrow', 'nodes'] },
  leadership: { label: 'Develop Leadership Skills', relatedInterests: ['training', 'governance'] },
  impact: { label: 'Create Social Impact', relatedInterests: ['land', 'susu', 'governance'] }
};

export function usePersonalization() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    name: '',
    interests: [],
    experienceLevel: '',
    goals: [],
    onboardingComplete: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const onboardingComplete = localStorage.getItem('axiom_onboarding_complete') === 'true';
      const name = localStorage.getItem('axiom_user_name') || '';
      const interestsStr = localStorage.getItem('axiom_user_interests');
      const interests = interestsStr ? JSON.parse(interestsStr) : [];
      const experienceLevel = localStorage.getItem('axiom_experience_level') || '';
      const goalsStr = localStorage.getItem('axiom_user_goals');
      const goals = goalsStr ? JSON.parse(goalsStr) : [];

      setPreferences({
        name,
        interests,
        experienceLevel,
        goals,
        onboardingComplete
      });
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      
      if (typeof window !== 'undefined') {
        if (updates.name !== undefined) {
          localStorage.setItem('axiom_user_name', updates.name);
        }
        if (updates.interests !== undefined) {
          localStorage.setItem('axiom_user_interests', JSON.stringify(updates.interests));
        }
        if (updates.experienceLevel !== undefined) {
          localStorage.setItem('axiom_experience_level', updates.experienceLevel);
        }
        if (updates.goals !== undefined) {
          localStorage.setItem('axiom_user_goals', JSON.stringify(updates.goals));
        }
      }
      
      return updated;
    });
  }, []);

  const getRecommendedFeatures = useCallback(() => {
    const { interests, goals } = preferences;
    const allInterestConfigs = interests.map(id => INTEREST_CONFIGS[id]).filter(Boolean);
    
    const goalRelatedInterests = goals
      .flatMap(goalId => GOAL_CONFIGS[goalId]?.relatedInterests || [])
      .filter(id => !interests.includes(id));
    
    const additionalRecommendations = [...new Set(goalRelatedInterests)]
      .map(id => INTEREST_CONFIGS[id])
      .filter(Boolean)
      .slice(0, 2);

    return {
      primary: allInterestConfigs,
      suggested: additionalRecommendations
    };
  }, [preferences]);

  const shouldShowTutorials = useCallback(() => {
    const level = EXPERIENCE_LEVELS[preferences.experienceLevel as keyof typeof EXPERIENCE_LEVELS];
    return level?.showTutorials ?? true;
  }, [preferences.experienceLevel]);

  const shouldShowSimplifiedUI = useCallback(() => {
    const level = EXPERIENCE_LEVELS[preferences.experienceLevel as keyof typeof EXPERIENCE_LEVELS];
    return level?.simplifiedUI ?? false;
  }, [preferences.experienceLevel]);

  const getQuickActions = useCallback(() => {
    const actions: { label: string; path: string; icon: string; priority: number }[] = [];
    
    preferences.interests.forEach((interest, index) => {
      const config = INTEREST_CONFIGS[interest];
      if (config) {
        actions.push({
          label: config.label,
          path: config.path,
          icon: config.icon,
          priority: index + 1
        });
      }
    });

    return actions.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [preferences.interests]);

  const getPersonalizedGreeting = useCallback(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Hello';
    
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const name = preferences.name || 'there';
    return `${timeGreeting}, ${name}!`;
  }, [preferences.name]);

  const hasInterest = useCallback((interestId: string) => {
    return preferences.interests.includes(interestId);
  }, [preferences.interests]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    loadPreferences,
    getRecommendedFeatures,
    shouldShowTutorials,
    shouldShowSimplifiedUI,
    getQuickActions,
    getPersonalizedGreeting,
    hasInterest,
    INTEREST_CONFIGS,
    EXPERIENCE_LEVELS,
    GOAL_CONFIGS
  };
}

export default usePersonalization;
