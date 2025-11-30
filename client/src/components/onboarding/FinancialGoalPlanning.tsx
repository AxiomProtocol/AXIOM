import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { 
  Target,
  Plus,
  Minus,
  Calendar,
  DollarSign,
  TrendingUp,
  Home,
  GraduationCap,
  Briefcase,
  Plane,
  Users,
  Building,
  Heart,
  ArrowLeft,
  ArrowRight,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Calculator,
  Star,
  Clock,
  Zap
} from 'lucide-react';
import { FinancialGoal, GoalMilestone } from './types';
import { LoadingOverlay } from '../ui/loading-states';

interface FinancialGoalPlanningProps {
  data: FinancialGoal[];
  riskProfile: {
    riskCategory: string;
    overallRiskScore: number;
  };
  clientInfo: {
    age: number;
    annualIncome: number;
    retirementAge?: number;
  };
  onDataChange: (goals: FinancialGoal[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Goal categories with icons and default configurations
const GOAL_CATEGORIES = {
  retirement: {
    icon: Clock,
    title: 'Retirement Planning',
    description: 'Build wealth for your retirement years',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    defaultTimeHorizon: 30,
    riskAllocation: 0.7
  },
  education: {
    icon: GraduationCap,
    title: 'Education Funding',
    description: 'Save for your or your children\'s education',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    defaultTimeHorizon: 15,
    riskAllocation: 0.6
  },
  home: {
    icon: Home,
    title: 'Home Purchase',
    description: 'Save for a down payment or dream home',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    defaultTimeHorizon: 5,
    riskAllocation: 0.4
  },
  business: {
    icon: Briefcase,
    title: 'Business Investment',
    description: 'Fund your entrepreneurial ventures',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    defaultTimeHorizon: 7,
    riskAllocation: 0.8
  },
  travel: {
    icon: Plane,
    title: 'Travel & Experiences',
    description: 'Fund your travel and lifestyle goals',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    defaultTimeHorizon: 3,
    riskAllocation: 0.3
  },
  legacy: {
    icon: Users,
    title: 'Legacy & Inheritance',
    description: 'Build wealth to leave for future generations',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    defaultTimeHorizon: 25,
    riskAllocation: 0.7
  },
  emergency: {
    icon: Building,
    title: 'Emergency Fund',
    description: 'Build a financial safety net',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    defaultTimeHorizon: 1,
    riskAllocation: 0.1
  },
  other: {
    icon: Star,
    title: 'Other Goals',
    description: 'Custom financial objectives',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    defaultTimeHorizon: 5,
    riskAllocation: 0.5
  }
};

// Planning sections
type PlanningSection = 'overview' | 'goals' | 'prioritization' | 'optimization' | 'review';

const PLANNING_SECTIONS = {
  'overview': { title: 'Goal Overview', description: 'Review your financial objectives' },
  'goals': { title: 'Set Goals', description: 'Define your specific financial goals' },
  'prioritization': { title: 'Prioritize', description: 'Rank goals by importance' },
  'optimization': { title: 'Optimize', description: 'Optimize allocation and timeline' },
  'review': { title: 'Review Plan', description: 'Review your complete financial plan' }
};

// Goal templates for quick setup
const GOAL_TEMPLATES = {
  retirement_65: {
    category: 'retirement' as const,
    title: 'Comfortable Retirement at 65',
    description: 'Accumulate enough wealth to maintain lifestyle in retirement',
    targetMultiplier: 12, // 12x annual income
  },
  emergency_fund: {
    category: 'emergency' as const,
    title: '6-Month Emergency Fund',
    description: 'Build emergency fund covering 6 months of expenses',
    targetMonths: 6
  },
  home_20_percent: {
    category: 'home' as const,
    title: '20% Home Down Payment',
    description: 'Save 20% down payment for home purchase',
    targetPercentage: 0.20
  },
  college_fund: {
    category: 'education' as const,
    title: 'College Education Fund',
    description: 'Save for college education costs',
    estimatedCost: 150000 // Average private college 4-year cost
  }
};

export const FinancialGoalPlanning: React.FC<FinancialGoalPlanningProps> = ({
  data,
  riskProfile,
  clientInfo,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<PlanningSection>('overview');
  const [goals, setGoals] = useState<FinancialGoal[]>(data || []);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [progress, setProgress] = useState(0);

  // Initialize default goals if none exist
  useEffect(() => {
    if (goals.length === 0) {
      const defaultGoals = createDefaultGoals();
      setGoals(defaultGoals);
      onDataChange(defaultGoals);
    }
  }, []);

  // Update progress
  useEffect(() => {
    const sections = Object.keys(PLANNING_SECTIONS);
    const currentIndex = sections.indexOf(currentSection);
    setProgress((currentIndex / (sections.length - 1)) * 100);
  }, [currentSection]);

  // Create default goals based on client profile
  const createDefaultGoals = (): FinancialGoal[] => {
    const defaultGoals: FinancialGoal[] = [];
    const currentYear = new Date().getFullYear();

    // Retirement goal
    if (clientInfo.retirementAge) {
      const yearsToRetirement = clientInfo.retirementAge - clientInfo.age;
      const targetAmount = clientInfo.annualIncome * 12; // 12x income rule
      
      defaultGoals.push({
        id: generateId(),
        category: 'retirement',
        title: `Retirement at ${clientInfo.retirementAge}`,
        description: 'Accumulate wealth for comfortable retirement',
        targetAmount,
        currentAmount: 0,
        targetDate: `${currentYear + yearsToRetirement}-01-01`,
        priority: 'high',
        timeHorizon: yearsToRetirement,
        importance: 10,
        flexibility: { amount: 'some', timeline: 'some' },
        riskAllocation: Math.min(0.8, riskProfile.overallRiskScore / 100),
        monthlyContribution: Math.round(targetAmount / (yearsToRetirement * 12) * 0.7), // Assuming 7% returns
        inflationAdjusted: true,
        linkedAccounts: [],
        milestones: createMilestones('retirement', targetAmount, yearsToRetirement),
        constraints: []
      });
    }

    // Emergency fund
    const emergencyTarget = clientInfo.annualIncome * 0.5; // 6 months expenses (assume 50% of income)
    defaultGoals.push({
      id: generateId(),
      category: 'emergency',
      title: 'Emergency Fund',
      description: '6-month emergency fund for financial security',
      targetAmount: emergencyTarget,
      currentAmount: 0,
      targetDate: `${currentYear + 1}-12-31`,
      priority: 'high',
      timeHorizon: 1,
      importance: 9,
      flexibility: { amount: 'none', timeline: 'none' },
      riskAllocation: 0.1,
      monthlyContribution: Math.round(emergencyTarget / 12),
      inflationAdjusted: false,
      linkedAccounts: [],
      milestones: [],
      constraints: ['Must be liquid and accessible']
    });

    return defaultGoals;
  };

  // Create milestones for a goal
  const createMilestones = (category: string, targetAmount: number, timeHorizon: number): GoalMilestone[] => {
    const milestones: GoalMilestone[] = [];
    const currentYear = new Date().getFullYear();
    
    if (timeHorizon > 5) {
      const milestoneIntervals = Math.min(4, Math.floor(timeHorizon / 5));
      for (let i = 1; i <= milestoneIntervals; i++) {
        const yearOffset = Math.round((timeHorizon / milestoneIntervals) * i);
        const milestoneAmount = Math.round((targetAmount / milestoneIntervals) * i);
        
        milestones.push({
          id: generateId(),
          title: `${Math.round(100 * i / milestoneIntervals)}% Target`,
          targetAmount: milestoneAmount,
          targetDate: `${currentYear + yearOffset}-01-01`,
          completed: false
        });
      }
    }
    
    return milestones;
  };

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Calculate monthly contribution needed
  const calculateMonthlyContribution = (goal: FinancialGoal): number => {
    const monthsToGoal = goal.timeHorizon * 12;
    const futureValue = goal.targetAmount;
    const presentValue = goal.currentAmount;
    const monthlyRate = (goal.riskAllocation * 0.08 + 0.02) / 12; // Estimated returns based on risk allocation
    
    if (monthsToGoal <= 0) return 0;
    if (monthlyRate === 0) return (futureValue - presentValue) / monthsToGoal;
    
    // Future value of annuity formula
    const numerator = futureValue - presentValue * Math.pow(1 + monthlyRate, monthsToGoal);
    const denominator = ((Math.pow(1 + monthlyRate, monthsToGoal) - 1) / monthlyRate);
    
    return Math.max(0, numerator / denominator);
  };

  // Add new goal
  const addGoal = (goalData: Partial<FinancialGoal>) => {
    const newGoal: FinancialGoal = {
      id: generateId(),
      category: 'other',
      title: '',
      description: '',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      timeHorizon: 5,
      importance: 5,
      flexibility: { amount: 'some', timeline: 'some' },
      riskAllocation: 0.5,
      monthlyContribution: 0,
      inflationAdjusted: true,
      linkedAccounts: [],
      milestones: [],
      constraints: [],
      ...goalData
    };

    // Auto-calculate monthly contribution
    newGoal.monthlyContribution = calculateMonthlyContribution(newGoal);
    
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    onDataChange(updatedGoals);
    setShowNewGoalForm(false);
  };

  // Update goal
  const updateGoal = (goalId: string, updates: Partial<FinancialGoal>) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedGoal = { ...goal, ...updates };
        // Recalculate monthly contribution if relevant fields changed
        if ('targetAmount' in updates || 'timeHorizon' in updates || 'currentAmount' in updates) {
          updatedGoal.monthlyContribution = calculateMonthlyContribution(updatedGoal);
        }
        return updatedGoal;
      }
      return goal;
    });
    setGoals(updatedGoals);
    onDataChange(updatedGoals);
  };

  // Delete goal
  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    setGoals(updatedGoals);
    onDataChange(updatedGoals);
  };

  // Render goal overview
  const renderOverviewSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Your Financial Goals</h3>
        <p className="text-gray-600">
          Let's define and prioritize your financial objectives to create a personalized investment strategy
        </p>
      </div>

      {/* Goal Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(GOAL_CATEGORIES).map(([category, config]) => (
          <Card key={category} className={`hover:shadow-md transition-shadow ${config.bgColor}`}>
            <CardContent className="p-4 text-center">
              <config.icon className={`w-8 h-8 mx-auto mb-2 ${config.color}`} />
              <h4 className="font-semibold text-sm mb-1">{config.title}</h4>
              <p className="text-xs text-gray-600">{config.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Goals Summary */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Current Goals Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${goals.reduce((sum, goal) => sum + goal.targetAmount, 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Total Target</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${goals.reduce((sum, goal) => sum + goal.currentAmount, 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Current Saved</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Monthly Savings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <p className="text-gray-600">Add common financial goals with recommended targets</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(GOAL_TEMPLATES).map(([key, template]) => {
              const categoryConfig = GOAL_CATEGORIES[template.category];
              return (
                <button
                  key={key}
                  onClick={() => addGoal({
                    category: template.category,
                    title: template.title,
                    description: template.description,
                    targetAmount: 'targetMultiplier' in template ? 
                      clientInfo.annualIncome * template.targetMultiplier :
                      'estimatedCost' in template ? template.estimatedCost :
                      'targetMonths' in template ? clientInfo.annualIncome * 0.5 * (template.targetMonths / 12) : 50000
                  })}
                  className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <categoryConfig.icon className={`w-5 h-5 mr-2 ${categoryConfig.color}`} />
                    <span className="font-medium">{template.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render goals management section
  const renderGoalsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Manage Your Goals</h3>
          <p className="text-gray-600">Add, edit, and configure your financial objectives</p>
        </div>
        <Button onClick={() => setShowNewGoalForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const categoryConfig = GOAL_CATEGORIES[goal.category];
          const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;
          const monthlyNeeded = calculateMonthlyContribution(goal);
          
          return (
            <Card key={goal.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <categoryConfig.icon className={`w-5 h-5 mr-2 ${categoryConfig.color}`} />
                      <h4 className="font-semibold">{goal.title}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                        goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {goal.priority} priority
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                    
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Target Amount</p>
                        <p className="font-semibold">${goal.targetAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Amount</p>
                        <p className="font-semibold">${goal.currentAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Target Date</p>
                        <p className="font-semibold">{new Date(goal.targetDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monthly Contribution</p>
                        <p className="font-semibold text-blue-600">${Math.round(monthlyNeeded).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    {goal.milestones.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium mb-1">Milestones:</p>
                        <div className="flex flex-wrap gap-2">
                          {goal.milestones.map((milestone, index) => (
                            <span key={milestone.id} className={`px-2 py-1 rounded-full text-xs ${
                              milestone.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {milestone.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingGoal(goal)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGoal(goal.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No goals defined yet. Click "Add Goal" to get started.</p>
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <LoadingOverlay isLoading={isLoading} message="Planning your financial future...">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Target className="w-6 h-6 mr-2" />
                  Financial Goal Planning
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Define your financial objectives and create a roadmap to achieve them
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Section: {PLANNING_SECTIONS[currentSection].title}
                </p>
                <Progress value={progress} className="w-32 mt-2" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Section Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLANNING_SECTIONS) as PlanningSection[]).map((section) => {
                const isActive = section === currentSection;
                const sectionInfo = PLANNING_SECTIONS[section];
                
                return (
                  <button
                    key={section}
                    onClick={() => setCurrentSection(section)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {sectionInfo.title}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Current Section Content */}
        {currentSection === 'overview' && renderOverviewSection()}
        {currentSection === 'goals' && renderGoalsSection()}
        {/* Additional sections would be rendered here */}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={onPrevious}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Step
              </Button>
              <Button 
                onClick={onNext}
                disabled={goals.length === 0}
              >
                Complete Goal Planning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingOverlay>
  );
};
