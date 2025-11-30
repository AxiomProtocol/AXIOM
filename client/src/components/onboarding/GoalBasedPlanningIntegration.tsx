import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { 
  Target,
  Home,
  GraduationCap,
  Car,
  Plane,
  Building2,
  Heart,
  Gift,
  Shield,
  TrendingUp,
  Calendar,
  DollarSign,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Clock,
  BarChart3,
  Calculator,
  Lightbulb,
  Flag,
  Star,
  Award,
  Zap
} from 'lucide-react';
import { FinancialGoal, ClientInformation, RiskProfile, InvestmentPreferences } from './types';

interface GoalBasedPlanningIntegrationProps {
  goals: FinancialGoal[];
  clientInfo: ClientInformation;
  riskProfile: RiskProfile;
  investmentPreferences: InvestmentPreferences;
  onGoalsChange: (goals: FinancialGoal[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Goal categories with enhanced metadata
const GOAL_CATEGORIES = {
  retirement: {
    icon: Shield,
    title: 'Retirement',
    description: 'Build wealth for your golden years',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    defaultTimeHorizon: 30,
    typicalAmount: 1000000,
    riskAllocationRange: { min: 60, max: 90 }
  },
  education: {
    icon: GraduationCap,
    title: 'Education',
    description: 'Fund education expenses for yourself or family',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    defaultTimeHorizon: 15,
    typicalAmount: 200000,
    riskAllocationRange: { min: 40, max: 70 }
  },
  home: {
    icon: Home,
    title: 'Home Purchase',
    description: 'Save for a down payment or new home',
    color: 'bg-green-100 text-green-700 border-green-300',
    defaultTimeHorizon: 5,
    typicalAmount: 100000,
    riskAllocationRange: { min: 20, max: 60 }
  },
  business: {
    icon: Building2,
    title: 'Business Investment',
    description: 'Start or expand your business',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    defaultTimeHorizon: 10,
    typicalAmount: 250000,
    riskAllocationRange: { min: 30, max: 70 }
  },
  travel: {
    icon: Plane,
    title: 'Travel & Experiences',
    description: 'Fund memorable experiences and adventures',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    defaultTimeHorizon: 3,
    typicalAmount: 25000,
    riskAllocationRange: { min: 10, max: 50 }
  },
  legacy: {
    icon: Gift,
    title: 'Legacy Planning',
    description: 'Leave a financial legacy for loved ones',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    defaultTimeHorizon: 25,
    typicalAmount: 500000,
    riskAllocationRange: { min: 50, max: 80 }
  },
  emergency: {
    icon: Heart,
    title: 'Emergency Fund',
    description: 'Build a financial safety net',
    color: 'bg-red-100 text-red-700 border-red-300',
    defaultTimeHorizon: 1,
    typicalAmount: 30000,
    riskAllocationRange: { min: 0, max: 20 }
  },
  other: {
    icon: Target,
    title: 'Other Goal',
    description: 'Custom financial objective',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    defaultTimeHorizon: 5,
    typicalAmount: 50000,
    riskAllocationRange: { min: 20, max: 80 }
  }
};

// Goal planning sections
type PlanningSection = 'overview' | 'create' | 'prioritize' | 'optimize' | 'review';

const PLANNING_SECTIONS = {
  overview: { title: 'Goals Overview', icon: Target, description: 'See your financial goals landscape' },
  create: { title: 'Create Goals', icon: PlusCircle, description: 'Define your financial objectives' },
  prioritize: { title: 'Prioritize Goals', icon: Flag, description: 'Rank your goals by importance' },
  optimize: { title: 'Optimize Strategy', icon: Calculator, description: 'Fine-tune allocations and timelines' },
  review: { title: 'Review Plan', icon: CheckCircle, description: 'Finalize your goal-based strategy' }
};

export const GoalBasedPlanningIntegration: React.FC<GoalBasedPlanningIntegrationProps> = ({
  goals,
  clientInfo,
  riskProfile,
  investmentPreferences,
  onGoalsChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<PlanningSection>('overview');
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<PlanningSection>>(new Set());
  const [activeGoal, setActiveGoal] = useState<FinancialGoal | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Initialize with sample goals if empty
  useEffect(() => {
    if (goals.length === 0) {
      const sampleGoals: FinancialGoal[] = [
        {
          id: 'retirement-1',
          category: 'retirement',
          title: 'Retirement Savings',
          description: 'Build wealth for comfortable retirement',
          targetAmount: 1000000,
          currentAmount: clientInfo?.financial?.totalAssets?.retirement || 0,
          targetDate: new Date(Date.now() + 30 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
          timeHorizon: 30,
          importance: 9,
          flexibility: { amount: 'some', timeline: 'some' },
          riskAllocation: 80,
          monthlyContribution: 1000,
          inflationAdjusted: true,
          linkedAccounts: [],
          milestones: [],
          constraints: []
        }
      ];

      if (clientInfo?.personal?.age && clientInfo.personal.age < 35) {
        sampleGoals.push({
          id: 'home-1',
          category: 'home',
          title: 'Home Down Payment',
          description: 'Save for first home purchase',
          targetAmount: 80000,
          currentAmount: 0,
          targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
          timeHorizon: 5,
          importance: 8,
          flexibility: { amount: 'some', timeline: 'none' },
          riskAllocation: 40,
          monthlyContribution: 1200,
          inflationAdjusted: true,
          linkedAccounts: [],
          milestones: [],
          constraints: []
        });
      }

      onGoalsChange(sampleGoals);
    }
  }, [goals.length, clientInfo, onGoalsChange]);

  // Update progress
  useEffect(() => {
    const totalSections = Object.keys(PLANNING_SECTIONS).length - 1; // Exclude review
    const progress = (completedSections.size / totalSections) * 100;
    setProgress(progress);
  }, [completedSections]);

  const markSectionComplete = (section: PlanningSection) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  // Calculate optimal risk allocation based on time horizon and goal type
  const calculateOptimalRiskAllocation = (goal: FinancialGoal): number => {
    const category = GOAL_CATEGORIES[goal.category];
    const timeHorizonFactor = Math.min(goal.timeHorizon / 20, 1); // Max factor at 20 years
    const riskProfileFactor = riskProfile.overallRiskScore / 10;
    const importanceFactor = (11 - goal.importance) / 10; // Higher importance = lower risk
    
    const baseAllocation = category.riskAllocationRange.min + 
      (category.riskAllocationRange.max - category.riskAllocationRange.min) * 
      (timeHorizonFactor * 0.6 + riskProfileFactor * 0.3 + importanceFactor * 0.1);
    
    return Math.round(Math.max(category.riskAllocationRange.min, 
                              Math.min(category.riskAllocationRange.max, baseAllocation)));
  };

  // Calculate required monthly contribution
  const calculateRequiredContribution = (goal: FinancialGoal, expectedReturn: number = 0.07): number => {
    const monthsToGoal = goal.timeHorizon * 12;
    const monthlyReturn = expectedReturn / 12;
    const futureValue = goal.targetAmount - goal.currentAmount;
    
    if (monthlyReturn === 0) {
      return futureValue / monthsToGoal;
    }
    
    const contribution = futureValue * monthlyReturn / (Math.pow(1 + monthlyReturn, monthsToGoal) - 1);
    return Math.max(0, contribution);
  };

  // Add new goal
  const addGoal = (goalData: Partial<FinancialGoal>) => {
    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      category: 'other',
      title: '',
      description: '',
      targetAmount: 50000,
      currentAmount: 0,
      targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      timeHorizon: 5,
      importance: 5,
      flexibility: { amount: 'some', timeline: 'some' },
      riskAllocation: 50,
      monthlyContribution: 500,
      inflationAdjusted: true,
      linkedAccounts: [],
      milestones: [],
      constraints: [],
      ...goalData
    };

    // Calculate optimal risk allocation and contribution
    newGoal.riskAllocation = calculateOptimalRiskAllocation(newGoal);
    newGoal.monthlyContribution = calculateRequiredContribution(newGoal);

    onGoalsChange([...goals, newGoal]);
  };

  // Update goal
  const updateGoal = (goalId: string, updates: Partial<FinancialGoal>) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedGoal = { ...goal, ...updates };
        
        // Recalculate time horizon if target date changed
        if (updates.targetDate) {
          const timeHorizon = Math.max(1, Math.round(
            (new Date(updates.targetDate).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)
          ));
          updatedGoal.timeHorizon = timeHorizon;
        }
        
        // Auto-update risk allocation if relevant fields changed
        if (updates.category || updates.timeHorizon || updates.importance) {
          updatedGoal.riskAllocation = calculateOptimalRiskAllocation(updatedGoal);
        }
        
        // Auto-update monthly contribution if target or timeline changed
        if (updates.targetAmount || updates.targetDate || updates.currentAmount) {
          updatedGoal.monthlyContribution = calculateRequiredContribution(updatedGoal);
        }
        
        return updatedGoal;
      }
      return goal;
    });
    
    onGoalsChange(updatedGoals);
  };

  // Delete goal
  const deleteGoal = (goalId: string) => {
    onGoalsChange(goals.filter(goal => goal.id !== goalId));
  };

  // Render Goals Overview Section
  const renderGoalsOverview = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Financial Goals Overview</h3>
        <p className="text-gray-600">
          Based on your profile, we've suggested some initial financial goals. Review and customize them to match your aspirations.
        </p>
      </div>

      {/* Goal Summary Cards */}
      {goals.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const category = GOAL_CATEGORIES[goal.category];
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            
            return (
              <Card key={goal.id} className={`border-l-4 ${category.color.split(' ')[2]} hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${category.color.split(' ')[0]}`}>
                        <category.icon className={`w-5 h-5 ${category.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <p className="text-gray-600 text-sm">{goal.description}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                      goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {goal.priority}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Target Amount</div>
                      <div className="text-lg font-semibold">${goal.targetAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Time Horizon</div>
                      <div className="text-lg font-semibold">{goal.timeHorizon} years</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Monthly Contribution</div>
                      <div className="text-lg font-semibold">${Math.round(goal.monthlyContribution).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Target Date</div>
                      <div className="text-lg font-semibold">{new Date(goal.targetDate).getFullYear()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{(Number(progress) || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${category.color.split(' ')[0].replace('100', '500')}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveGoal(goal)}
                    className="w-full"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Customize Goal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals Yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first financial goal.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex justify-center space-x-4">
        <Button 
          onClick={() => setShowCreateForm(true)}
          variant="outline"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Goal
        </Button>
        
        {goals.length > 0 && (
          <Button 
            onClick={() => { markSectionComplete('overview'); setCurrentSection('prioritize'); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Prioritization
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Goal Creation/Edit Modal */}
      {(showCreateForm || activeGoal) && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {activeGoal ? 'Edit Goal' : 'Create New Goal'}
              </h3>
              
              <GoalForm
                goal={activeGoal}
                onSave={(goalData) => {
                  if (activeGoal) {
                    updateGoal(activeGoal.id, goalData);
                  } else {
                    addGoal(goalData);
                  }
                  setActiveGoal(null);
                  setShowCreateForm(false);
                }}
                onCancel={() => {
                  setActiveGoal(null);
                  setShowCreateForm(false);
                }}
                onDelete={activeGoal ? () => {
                  deleteGoal(activeGoal.id);
                  setActiveGoal(null);
                } : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Goal Prioritization Section
  const renderGoalPrioritization = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Prioritize Your Goals</h3>
        <p className="text-gray-600">
          Rank your goals by importance to optimize your investment strategy and resource allocation.
        </p>
      </div>

      <div className="grid gap-4">
        {goals
          .sort((a, b) => b.importance - a.importance)
          .map((goal, index) => {
            const category = GOAL_CATEGORIES[goal.category];
            
            return (
              <Card key={goal.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold">
                        {index + 1}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <category.icon className="w-5 h-5 text-gray-600" />
                        <div>
                          <h4 className="font-semibold">{goal.title}</h4>
                          <p className="text-sm text-gray-600">${goal.targetAmount.toLocaleString()} by {new Date(goal.targetDate).getFullYear()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <Label className="text-xs text-gray-500">Importance (1-10)</Label>
                        <div className="w-24">
                          <Slider
                            value={[goal.importance]}
                            onValueChange={(value) => updateGoal(goal.id, { importance: value[0] })}
                            max={10}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div className="text-sm font-medium">{goal.importance}/10</div>
                      </div>
                      
                      <div className="text-center">
                        <Label className="text-xs text-gray-500">Priority</Label>
                        <Select
                          value={goal.priority}
                          onValueChange={(value: any) => updateGoal(goal.id, { priority: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Priority Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Lightbulb className="w-5 h-5 mr-2" />
            Priority Optimization Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-700">
            <p>• Higher priority goals receive more conservative allocations for better certainty</p>
            <p>• Lower priority goals can accept higher risk for potentially better returns</p>
            <p>• Consider your life stage and upcoming major events when setting priorities</p>
            <p>• Goals with flexible timelines can accommodate market volatility better</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('prioritize'); setCurrentSection('optimize'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Optimization
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Strategy Optimization Section
  const renderStrategyOptimization = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Optimize Your Strategy</h3>
        <p className="text-gray-600">
          Fine-tune the risk allocation and contribution strategy for each goal based on your preferences and constraints.
        </p>
      </div>

      <div className="space-y-6">
        {goals.map((goal) => {
          const category = GOAL_CATEGORIES[goal.category];
          const requiredContribution = calculateRequiredContribution(goal);
          const optimalRisk = calculateOptimalRiskAllocation(goal);
          
          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle>{goal.title}</CardTitle>
                      <p className="text-gray-600">${goal.targetAmount.toLocaleString()} by {new Date(goal.targetDate).getFullYear()}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                    goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    Priority: {goal.priority}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk Allocation */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Risk Allocation</Label>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Conservative</span>
                        <span className="font-medium">{goal.riskAllocation}% Stocks</span>
                        <span>Aggressive</span>
                      </div>
                      <Slider
                        value={[goal.riskAllocation]}
                        onValueChange={(value) => updateGoal(goal.id, { riskAllocation: value[0] })}
                        max={category.riskAllocationRange.max}
                        min={category.riskAllocationRange.min}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{category.riskAllocationRange.min}% min</span>
                        <span>Recommended: {optimalRisk}%</span>
                        <span>{category.riskAllocationRange.max}% max</span>
                      </div>
                    </div>
                    
                    {Math.abs(goal.riskAllocation - optimalRisk) > 10 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          💡 Consider adjusting to {optimalRisk}% based on your time horizon and risk profile
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-lg font-medium">Monthly Contribution</Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          min="0"
                          value={Math.round(goal.monthlyContribution)}
                          onChange={(e) => updateGoal(goal.id, { monthlyContribution: parseFloat(e.target.value) || 0 })}
                          className="pl-10"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Required: ${Math.round(requiredContribution).toLocaleString()}/month
                      </div>
                      
                      {Math.abs(goal.monthlyContribution - requiredContribution) > requiredContribution * 0.1 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 text-sm">
                            {goal.monthlyContribution < requiredContribution ? '⚠️ ' : '✨ '}
                            {goal.monthlyContribution < requiredContribution 
                              ? 'May not reach goal on time with current contribution'
                              : 'Exceeds requirement - may reach goal early!'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Flexibility Settings */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Amount Flexibility</Label>
                    <Select
                      value={goal.flexibility.amount}
                      onValueChange={(value: any) => updateGoal(goal.id, { 
                        flexibility: { ...goal.flexibility, amount: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Flexibility - Exact amount needed</SelectItem>
                        <SelectItem value="some">Some Flexibility - ±20% acceptable</SelectItem>
                        <SelectItem value="high">High Flexibility - Amount can vary significantly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timeline Flexibility</Label>
                    <Select
                      value={goal.flexibility.timeline}
                      onValueChange={(value: any) => updateGoal(goal.id, { 
                        flexibility: { ...goal.flexibility, timeline: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Flexibility - Fixed deadline</SelectItem>
                        <SelectItem value="some">Some Flexibility - Can delay 1-2 years</SelectItem>
                        <SelectItem value="high">High Flexibility - Timeline very flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Expected Outcomes */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-lg font-medium mb-3 block">Expected Outcomes</Label>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-600 font-semibold">Conservative (25%)</div>
                      <div className="text-gray-700">
                        ${Math.round(goal.targetAmount * 0.8).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Lower bound</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-semibold">Expected (50%)</div>
                      <div className="text-gray-700">
                        ${goal.targetAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Target amount</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-600 font-semibold">Optimistic (25%)</div>
                      <div className="text-gray-700">
                        ${Math.round(goal.targetAmount * 1.3).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Upper potential</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('optimize'); setCurrentSection('review'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Optimization
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Review Section
  const renderReview = () => {
    const totalMonthlyContribution = goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
    const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const averageTimeHorizon = goals.length > 0 ? 
      goals.reduce((sum, goal) => sum + goal.timeHorizon, 0) / goals.length : 0;
    
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Goal-Based Financial Plan</h3>
          <p className="text-gray-600">
            Review your comprehensive goal-based investment strategy before proceeding to account setup.
          </p>
        </div>

        {/* Plan Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{goals.length}</div>
                <div className="text-sm text-blue-700">Financial Goals</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">${totalTargetAmount.toLocaleString()}</div>
                <div className="text-sm text-green-700">Total Target</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">${Math.round(totalMonthlyContribution).toLocaleString()}</div>
                <div className="text-sm text-purple-700">Monthly Investment</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600">{Math.round(averageTimeHorizon)}</div>
                <div className="text-sm text-orange-700">Avg Time Horizon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Breakdown */}
        <div className="grid gap-4">
          {goals
            .sort((a, b) => b.importance - a.importance)
            .map((goal, index) => {
              const category = GOAL_CATEGORIES[goal.category];
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              
              return (
                <Card key={goal.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-6 gap-4 items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category.color.split(' ')[0]}`}>
                          <category.icon className={`w-4 h-4 ${category.color.split(' ')[1]}`} />
                        </div>
                        <div>
                          <div className="font-semibold">{goal.title}</div>
                          <div className="text-xs text-gray-500">#{index + 1} Priority</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-semibold">${goal.targetAmount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Target</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-semibold">${Math.round(goal.monthlyContribution).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Monthly</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-semibold">{goal.riskAllocation}%</div>
                        <div className="text-xs text-gray-500">Risk</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-semibold">{goal.timeHorizon}y</div>
                        <div className="text-xs text-gray-500">Horizon</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{(Number(progress) || 0).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${category.color.split(' ')[0].replace('100', '500')}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Key Plan Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <div className="font-medium text-green-900">Diversified Timeline</div>
                    <p className="text-green-700 text-sm">
                      Your goals span {Math.min(...goals.map(g => g.timeHorizon))} to {Math.max(...goals.map(g => g.timeHorizon))} years, allowing for different risk strategies.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <div className="font-medium text-blue-900">Balanced Risk Allocation</div>
                    <p className="text-blue-700 text-sm">
                      Average risk allocation of {Math.round(goals.reduce((sum, g) => sum + g.riskAllocation, 0) / goals.length)}% aligns well with your risk profile.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Target className="w-5 h-5 text-purple-500 mt-1" />
                  <div>
                    <div className="font-medium text-purple-900">Achievable Targets</div>
                    <p className="text-purple-700 text-sm">
                      Monthly contribution of ${Math.round(totalMonthlyContribution).toLocaleString()} represents {(Number((totalMonthlyContribution * 12) / (clientInfo?.financial?.annualIncome || 1) * 100) || 0).toFixed(0)}% of your income.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500 mt-1" />
                  <div>
                    <div className="font-medium text-yellow-900">Strategic Timing</div>
                    <p className="text-yellow-700 text-sm">
                      Higher priority goals have appropriate timeline buffers and conservative risk allocations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {completedSections.size < 3 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800">Please complete goal prioritization and optimization before proceeding.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Goal Form Component
  const GoalForm: React.FC<{
    goal?: FinancialGoal | null;
    onSave: (goal: Partial<FinancialGoal>) => void;
    onCancel: () => void;
    onDelete?: () => void;
  }> = ({ goal, onSave, onCancel, onDelete }) => {
    const [formData, setFormData] = useState<Partial<FinancialGoal>>(goal || {
      category: 'other',
      title: '',
      description: '',
      targetAmount: 50000,
      currentAmount: 0,
      targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'medium',
      importance: 5,
      flexibility: { amount: 'some', timeline: 'some' },
      monthlyContribution: 500,
      inflationAdjusted: true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Goal Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_CATEGORIES).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <category.icon className="w-4 h-4" />
                      <span>{category.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Goal Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Down payment for home"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your goal and what it means to you"
            rows={3}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="targetAmount"
                type="number"
                min="0"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAmount">Current Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="currentAmount"
                type="number"
                min="0"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importance">Importance (1-10)</Label>
            <Input
              id="importance"
              type="number"
              min="1"
              max="10"
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: parseInt(e.target.value) || 5 })}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <div className="space-x-2">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          
          <div className="space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {goal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'overview':
        return renderGoalsOverview();
      case 'prioritize':
        return renderGoalPrioritization();
      case 'optimize':
        return renderStrategyOptimization();
      case 'review':
        return renderReview();
      default:
        return renderGoalsOverview();
    }
  };

  const canProceedToNext = () => {
    return completedSections.size >= 3 && currentSection === 'review' && goals.length > 0;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Goal-Based Financial Planning
        </h1>
        <p className="text-lg text-gray-600">
          Define and prioritize your financial goals to create a personalized investment strategy that grows with your life.
        </p>
        
        <div className="max-w-md mx-auto">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
        </div>
      </div>

      {/* Section Navigation */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b">
            {Object.entries(PLANNING_SECTIONS).map(([key, { title, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key as PlanningSection)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentSection === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : completedSections.has(key as PlanningSection)
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
                {completedSections.has(key as PlanningSection) && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="min-h-[600px]">
        {renderCurrentSection()}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          onClick={currentSection === 'overview' ? onPrevious : () => {
            const sections: PlanningSection[] = ['overview', 'prioritize', 'optimize', 'review'];
            const currentIndex = sections.indexOf(currentSection);
            if (currentIndex > 0) {
              setCurrentSection(sections[currentIndex - 1]);
            }
          }}
          variant="outline"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentSection === 'overview' ? 'Previous Step' : 'Previous Section'}
        </Button>

        <div className="text-sm text-gray-500">
          {currentSection === 'review' ? 'Goal Planning Complete' : 'Complete all sections to review'}
        </div>

        {currentSection === 'review' ? (
          <Button
            onClick={onNext}
            disabled={!canProceedToNext() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Continue to Account Setup</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => {
              const sections: PlanningSection[] = ['overview', 'prioritize', 'optimize', 'review'];
              const currentIndex = sections.indexOf(currentSection);
              if (currentIndex < sections.length - 1) {
                setCurrentSection(sections[currentIndex + 1]);
              }
            }}
            disabled={isLoading}
          >
            Next Section
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default GoalBasedPlanningIntegration;
