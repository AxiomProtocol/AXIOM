import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { useNotificationHelpers } from './NotificationSystem';

// Types for Circle Creation
export interface CircleFormData {
  // Basic Information
  name: string;
  description: string;
  goalAmount: number;
  goalTitle: string;
  
  // Contribution Settings  
  monthlyContribution: number;
  contributionDay: number; // 1-28
  expectedMonths: number;
  
  // Member Settings
  memberLimit: number;
  isPublic: boolean;
  requireApproval: boolean;
  
  // Rules & Expectations
  circleRules: string[];
  latePaymentGraceDays: number;
  distributionMethod: 'rotating' | 'equal' | 'goal_based';
  
  // Optional Settings
  tags: string[];
  allowGuests: boolean;
  enableChat: boolean;
  enableLeaderboard: boolean;
}

interface CreateCircleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCircleCreated: (circle: any) => void;
  initialData?: Partial<CircleFormData>;
}

// Default form data
const DEFAULT_FORM_DATA: CircleFormData = {
  name: '',
  description: '',
  goalAmount: 10000,
  goalTitle: '',
  monthlyContribution: 200,
  contributionDay: 1,
  expectedMonths: 24,
  memberLimit: 6,
  isPublic: true,
  requireApproval: false,
  circleRules: [
    'Contribute on time every month',
    'Be respectful and supportive of all members',
    'Communicate any payment issues early',
    'Celebrate each other\'s milestones'
  ],
  latePaymentGraceDays: 3,
  distributionMethod: 'equal',
  tags: [],
  allowGuests: false,
  enableChat: true,
  enableLeaderboard: true
};

// Predefined circle templates
const CIRCLE_TEMPLATES = [
  {
    name: 'Emergency Fund Circle',
    goalAmount: 5000,
    monthlyContribution: 200,
    memberLimit: 6,
    expectedMonths: 24,
    description: 'Building emergency funds together for financial security',
    tags: ['emergency-fund', 'beginners', 'financial-security']
  },
  {
    name: 'Home Down Payment Circle',
    goalAmount: 25000,
    monthlyContribution: 500,
    memberLimit: 8,
    expectedMonths: 30,
    description: 'Saving for down payments on our first homes',
    tags: ['homeownership', 'real-estate', 'first-time-buyers']
  },
  {
    name: 'Investment Starter Circle',
    goalAmount: 15000,
    monthlyContribution: 300,
    memberLimit: 5,
    expectedMonths: 20,
    description: 'Building our first investment portfolios together',
    tags: ['investment', 'wealth-building', 'portfolio']
  },
  {
    name: 'Business Launch Circle',
    goalAmount: 20000,
    monthlyContribution: 400,
    memberLimit: 10,
    expectedMonths: 24,
    description: 'Entrepreneurs saving to launch our dreams',
    tags: ['entrepreneurship', 'small-business', 'startup-capital']
  }
];

// Step Progress Component
function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex justify-center mb-4">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
              i + 1 <= currentStep 
                ? "bg-green-500 text-white" 
                : i + 1 === currentStep + 1
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 text-gray-500"
            )}>
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={cn(
                "w-16 h-1 mx-2",
                i + 1 < currentStep ? "bg-green-500" : "bg-gray-200"
              )} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-600">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}

// Step 1: Choose Template or Start Fresh
function TemplateSelection({ formData, onUpdate, onNext }: {
  formData: CircleFormData;
  onUpdate: (data: Partial<CircleFormData>) => void;
  onNext: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const handleTemplateSelect = (templateIndex: number) => {
    const template = CIRCLE_TEMPLATES[templateIndex];
    setSelectedTemplate(templateIndex);
    
    onUpdate({
      name: template.name,
      goalAmount: template.goalAmount,
      monthlyContribution: template.monthlyContribution,
      memberLimit: template.memberLimit,
      expectedMonths: template.expectedMonths,
      description: template.description,
      tags: template.tags
    });
  };

  const handleStartFresh = () => {
    setSelectedTemplate(null);
    onUpdate(DEFAULT_FORM_DATA);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🚀 Start Your Circle</h2>
        <p className="text-lg text-gray-600">
          Choose a template to get started quickly, or create your own from scratch
        </p>
      </div>

      {/* Templates */}
      <div className="grid md:grid-cols-2 gap-4">
        {CIRCLE_TEMPLATES.map((template, index) => (
          <Card 
            key={index}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedTemplate === index 
                ? "border-green-500 bg-green-50" 
                : "border-gray-200 hover:border-green-500"
            )}
            onClick={() => handleTemplateSelect(index)}
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{template.name}</h3>
              <p className="text-gray-600 mb-4">{template.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Goal:</span>
                  <div className="font-semibold">${template.goalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Monthly:</span>
                  <div className="font-semibold">${template.monthlyContribution}</div>
                </div>
                <div>
                  <span className="text-gray-500">Members:</span>
                  <div className="font-semibold">{template.memberLimit} people</div>
                </div>
                <div>
                  <span className="text-gray-500">Timeline:</span>
                  <div className="font-semibold">{template.expectedMonths} months</div>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {template.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start Fresh Option */}
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-dashed",
          selectedTemplate === null 
            ? "border-yellow-500 bg-yellow-50" 
            : "border-gray-300 hover:border-yellow-500"
        )}
        onClick={handleStartFresh}
      >
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Start from Scratch</h3>
          <p className="text-gray-600">Create a completely custom circle with your own settings</p>
        </CardContent>
      </Card>

      {/* Next Button */}
      <div className="text-center">
        <Button 
          onClick={onNext}
          disabled={selectedTemplate === null && !formData.name}
          className="bg-green-500 hover:bg-green-600 px-8"
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}

// Step 2: Basic Circle Information
function BasicInformation({ formData, onUpdate, onNext, onBack }: {
  formData: CircleFormData;
  onUpdate: (data: Partial<CircleFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);

  const validateAndNext = () => {
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) newErrors.push('Circle name is required');
    if (!formData.description.trim()) newErrors.push('Description is required');
    if (formData.goalAmount < 1000) newErrors.push('Goal amount must be at least $1,000');
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors([]);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">📝 Circle Details</h2>
        <p className="text-lg text-gray-600">Tell us about your savings circle</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Circle Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Circle Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., Emergency Fund Squad"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose something memorable that reflects your shared goal
            </p>
          </div>

          {/* Goal Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What are you saving for? *
            </label>
            <Input
              value={formData.goalTitle}
              onChange={(e) => onUpdate({ goalTitle: e.target.value })}
              placeholder="e.g., Emergency fund, Down payment, Investment capital"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Circle Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Describe your circle's purpose, who should join, and what makes it special..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps people understand if your circle is right for them
            </p>
          </div>

          {/* Goal Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Goal Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
              <Input
                type="number"
                value={formData.goalAmount}
                onChange={(e) => onUpdate({ goalAmount: parseInt(e.target.value) || 0 })}
                className="pl-8 w-full"
                min="1000"
                step="100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This is the total amount your circle will save together
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {['emergency-fund', 'homeownership', 'investment', 'entrepreneurship', 'education', 'vacation', 'wedding', 'retirement'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const isSelected = formData.tags.includes(tag);
                    if (isSelected) {
                      onUpdate({ tags: formData.tags.filter(t => t !== tag) });
                    } else {
                      onUpdate({ tags: [...formData.tags, tag] });
                    }
                  }}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full border transition-colors",
                    formData.tags.includes(tag)
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"
                  )}
                >
                  {tag.replace('-', ' ')}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Tags help people discover your circle
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-red-800 mb-2">Please fix these issues:</h4>
            <ul className="list-disc list-inside text-sm text-red-700">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={validateAndNext} className="bg-green-500 hover:bg-green-600">
          Continue →
        </Button>
      </div>
    </div>
  );
}

// Step 3: Contribution Settings
function ContributionSettings({ formData, onUpdate, onNext, onBack }: {
  formData: CircleFormData;
  onUpdate: (data: Partial<CircleFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const totalCircleAmount = formData.monthlyContribution * formData.memberLimit * formData.expectedMonths;
  const perPersonTotal = formData.monthlyContribution * formData.expectedMonths;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">💰 Contribution Settings</h2>
        <p className="text-lg text-gray-600">Set up how and when members contribute</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Monthly Contribution */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monthly Contribution Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
              <Input
                type="number"
                value={formData.monthlyContribution}
                onChange={(e) => onUpdate({ monthlyContribution: parseInt(e.target.value) || 0 })}
                className="pl-8 w-full"
                min="25"
                step="25"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This is what each member contributes every month
            </p>
          </div>

          {/* Payment Day */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monthly Payment Day
            </label>
            <select
              value={formData.contributionDay}
              onChange={(e) => onUpdate({ contributionDay: parseInt(e.target.value) })}
              className="w-full p-3 border border-gray-300 rounded-md"
            >
              <option value={1}>1st of each month</option>
              <option value={5}>5th of each month</option>
              <option value={15}>15th of each month (mid-month)</option>
              <option value={28}>28th of each month (end of month)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose a day that works for most people
            </p>
          </div>

          {/* Expected Timeline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expected Timeline (Months)
            </label>
            <Input
              type="number"
              value={formData.expectedMonths}
              onChange={(e) => onUpdate({ expectedMonths: parseInt(e.target.value) || 1 })}
              className="w-full"
              min="6"
              max="60"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many months to reach your goal? (6-60 months)
            </p>
          </div>

          {/* Distribution Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              How should funds be distributed?
            </label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="equal"
                  name="distributionMethod"
                  value="equal"
                  checked={formData.distributionMethod === 'equal'}
                  onChange={(e) => onUpdate({ distributionMethod: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="equal" className="font-medium text-gray-900">Equal Split at End</label>
                  <p className="text-sm text-gray-600">Everyone gets their fair share when the goal is reached</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="rotating"
                  name="distributionMethod"
                  value="rotating"
                  checked={formData.distributionMethod === 'rotating'}
                  onChange={(e) => onUpdate({ distributionMethod: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="rotating" className="font-medium text-gray-900">Rotating Payout</label>
                  <p className="text-sm text-gray-600">One member gets the full amount each period (traditional SouSou)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="goal_based"
                  name="distributionMethod"
                  value="goal_based"
                  checked={formData.distributionMethod === 'goal_based'}
                  onChange={(e) => onUpdate({ distributionMethod: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="goal_based" className="font-medium text-gray-900">Individual Goals</label>
                  <p className="text-sm text-gray-600">Each member sets their own target and gets funds when reached</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">💡 Circle Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Per Person Total:</span>
              <div className="text-xl font-bold text-blue-800">${perPersonTotal.toLocaleString()}</div>
              <div className="text-xs text-blue-600">${formData.monthlyContribution}/month × {formData.expectedMonths} months</div>
            </div>
            <div>
              <span className="text-blue-600">Circle Total Savings:</span>
              <div className="text-xl font-bold text-blue-800">${totalCircleAmount.toLocaleString()}</div>
              <div className="text-xs text-blue-600">With {formData.memberLimit} members</div>
            </div>
            <div>
              <span className="text-blue-600">Goal vs Reality:</span>
              <div className={cn(
                "text-xl font-bold",
                totalCircleAmount >= formData.goalAmount ? "text-green-600" : "text-red-600"
              )}>
                {totalCircleAmount >= formData.goalAmount ? "✓ Goal Met" : "⚠ Adjust needed"}
              </div>
              <div className="text-xs text-blue-600">
                {totalCircleAmount >= formData.goalAmount 
                  ? `${((totalCircleAmount - formData.goalAmount) / formData.goalAmount * 100).toFixed(1)}% above goal`
                  : `${((formData.goalAmount - totalCircleAmount) / formData.goalAmount * 100).toFixed(1)}% short of goal`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-green-500 hover:bg-green-600">
          Continue →
        </Button>
      </div>
    </div>
  );
}

// Step 4: Member Settings
function MemberSettings({ formData, onUpdate, onNext, onBack }: {
  formData: CircleFormData;
  onUpdate: (data: Partial<CircleFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">👥 Member Settings</h2>
        <p className="text-lg text-gray-600">Configure who can join and how</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Member Limit */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maximum Members
            </label>
            <Input
              type="number"
              value={formData.memberLimit}
              onChange={(e) => onUpdate({ memberLimit: parseInt(e.target.value) || 4 })}
              className="w-full"
              min="4"
              max="20"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 4-10 members for better accountability (4-20 maximum)
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Circle Visibility
            </label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="public"
                  name="visibility"
                  checked={formData.isPublic && !formData.requireApproval}
                  onChange={() => onUpdate({ isPublic: true, requireApproval: false })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="public" className="font-medium text-gray-900">Public - Anyone can join</label>
                  <p className="text-sm text-gray-600">Your circle appears in search and anyone can join immediately</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="approval"
                  name="visibility"
                  checked={formData.isPublic && formData.requireApproval}
                  onChange={() => onUpdate({ isPublic: true, requireApproval: true })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="approval" className="font-medium text-gray-900">Public - Approval Required</label>
                  <p className="text-sm text-gray-600">Visible to everyone, but you approve new members</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="private"
                  name="visibility"
                  checked={!formData.isPublic}
                  onChange={() => onUpdate({ isPublic: false, requireApproval: true })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="private" className="font-medium text-gray-900">Private - Invite Only</label>
                  <p className="text-sm text-gray-600">Only people you invite can see and join your circle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Late Payment Grace Period */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Late Payment Grace Period
            </label>
            <select
              value={formData.latePaymentGraceDays}
              onChange={(e) => onUpdate({ latePaymentGraceDays: parseInt(e.target.value) })}
              className="w-full p-3 border border-gray-300 rounded-md"
            >
              <option value={0}>No grace period</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={10}>10 days</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many days after the due date before a payment is considered late
            </p>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Circle Chat</label>
                <p className="text-sm text-gray-600">Enable messaging between circle members</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableChat}
                  onChange={(e) => onUpdate({ enableChat: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Leaderboard</label>
                <p className="text-sm text-gray-600">Show member contribution streaks and achievements</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableLeaderboard}
                  onChange={(e) => onUpdate({ enableLeaderboard: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Guest Observers</label>
                <p className="text-sm text-gray-600">Allow non-members to view circle progress (family, friends)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowGuests}
                  onChange={(e) => onUpdate({ allowGuests: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-green-500 hover:bg-green-600">
          Continue →
        </Button>
      </div>
    </div>
  );
}

// Step 5: Circle Rules
function CircleRules({ formData, onUpdate, onNext, onBack }: {
  formData: CircleFormData;
  onUpdate: (data: Partial<CircleFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const addRule = () => {
    onUpdate({ circleRules: [...formData.circleRules, ''] });
  };

  const updateRule = (index: number, rule: string) => {
    const newRules = [...formData.circleRules];
    newRules[index] = rule;
    onUpdate({ circleRules: newRules });
  };

  const removeRule = (index: number) => {
    onUpdate({ circleRules: formData.circleRules.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">📋 Circle Rules</h2>
        <p className="text-lg text-gray-600">Set expectations for all members</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Circle Guidelines
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Clear rules help everyone understand expectations and build trust. These will be shown to potential members.
            </p>
            
            <div className="space-y-3">
              {formData.circleRules.map((rule, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <span className="text-gray-500 mt-3 text-sm">{index + 1}.</span>
                  <textarea
                    value={rule}
                    onChange={(e) => updateRule(index, e.target.value)}
                    placeholder="Enter a circle rule or guideline..."
                    rows={2}
                    className="flex-1 p-3 border border-gray-300 rounded-md resize-none"
                  />
                  <Button
                    onClick={() => removeRule(index)}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            
            <Button onClick={addRule} variant="outline" className="mt-4">
              + Add Another Rule
            </Button>
          </div>

          {/* Sample Rules */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700">💡 Suggested Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <div>• "Contribute by the 5th of each month, no exceptions"</div>
              <div>• "Communicate any financial difficulties immediately"</div>
              <div>• "Support and celebrate each other's progress"</div>
              <div>• "No personal loans or borrowing within the circle"</div>
              <div>• "Respect privacy - what's shared in circle stays in circle"</div>
              <div>• "Active participation in monthly check-ins required"</div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-green-500 hover:bg-green-600">
          Continue →
        </Button>
      </div>
    </div>
  );
}

// Step 6: Final Review
function FinalReview({ formData, onBack, onCreate, isLoading }: {
  formData: CircleFormData;
  onBack: () => void;
  onCreate: () => void;
  isLoading: boolean;
}) {
  const totalPerPerson = formData.monthlyContribution * formData.expectedMonths;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Review & Create</h2>
        <p className="text-lg text-gray-600">Double-check everything looks good</p>
      </div>

      {/* Circle Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700">Circle Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-600">Name:</span> {formData.name}</div>
                <div><span className="text-gray-600">Goal:</span> ${formData.goalAmount.toLocaleString()}</div>
                <div><span className="text-gray-600">Description:</span> {formData.description.substring(0, 100)}...</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Contribution Settings</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-600">Monthly:</span> ${formData.monthlyContribution}</div>
                <div><span className="text-gray-600">Payment Day:</span> {formData.contributionDay}{formData.contributionDay === 1 ? 'st' : formData.contributionDay === 2 ? 'nd' : formData.contributionDay === 3 ? 'rd' : 'th'} of month</div>
                <div><span className="text-gray-600">Timeline:</span> {formData.expectedMonths} months</div>
                <div><span className="text-gray-600">Distribution:</span> {formData.distributionMethod.replace('_', ' ')}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Member Settings</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-600">Max Members:</span> {formData.memberLimit}</div>
                <div><span className="text-gray-600">Visibility:</span> {formData.isPublic ? (formData.requireApproval ? 'Public (approval required)' : 'Public') : 'Private'}</div>
                <div><span className="text-gray-600">Grace Period:</span> {formData.latePaymentGraceDays} days</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-600">Chat:</span> {formData.enableChat ? 'Enabled' : 'Disabled'}</div>
                <div><span className="text-gray-600">Leaderboard:</span> {formData.enableLeaderboard ? 'Enabled' : 'Disabled'}</div>
                <div><span className="text-gray-600">Guests:</span> {formData.allowGuests ? 'Allowed' : 'Not allowed'}</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {formData.tags.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {tag.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {formData.circleRules.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Circle Rules</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {formData.circleRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-700">💰 Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${formData.monthlyContribution}</div>
              <div className="text-sm text-gray-600">Monthly contribution</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalPerPerson.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total per person</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${(totalPerPerson * formData.memberLimit).toLocaleString()}</div>
              <div className="text-sm text-gray-600">Circle total savings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" disabled={isLoading}>
          ← Back
        </Button>
        <Button 
          onClick={onCreate} 
          className="bg-green-500 hover:bg-green-600 px-8" 
          disabled={isLoading}
        >
          {isLoading ? 'Creating Circle...' : 'Create Circle 🎉'}
        </Button>
      </div>
    </div>
  );
}

// Main Component
export function CreateCircleWizard({
  isOpen,
  onClose,
  onCircleCreated,
  initialData = {}
}: CreateCircleWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CircleFormData>({ 
    ...DEFAULT_FORM_DATA, 
    ...initialData 
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useNotificationHelpers();

  const totalSteps = 6;

  const handleUpdate = (data: Partial<CircleFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Please log in to create a circle');
      }

      // Prepare API data
      const apiData = {
        name: formData.name,
        description: formData.description,
        goalAmount: formData.goalAmount,
        monthlyContribution: formData.monthlyContribution,
        memberLimit: formData.memberLimit,
        isPublic: formData.isPublic,
        requireApproval: formData.requireApproval,
        tags: formData.tags,
        expectedMonths: formData.expectedMonths,
        distributionMethod: formData.distributionMethod,
        circleRules: formData.circleRules,
        latePaymentGraceDays: formData.latePaymentGraceDays
      };

      console.log('Creating circle:', apiData);

      // Make API call
      const response = await fetch('/api/circles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create circle: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create circle');
      }

      console.log('✅ Circle created successfully:', result);

      // Create the circle object for the frontend
      const newCircle = {
        id: result.circleId,
        name: formData.name,
        description: formData.description,
        goalAmount: formData.goalAmount,
        currentAmount: 0,
        monthlyContribution: formData.monthlyContribution,
        memberLimit: formData.memberLimit,
        currentMembers: 1,
        createdBy: result.circle?.createdBy || 'current_user',
        createdByName: 'You',
        tags: formData.tags || [],
        activityLevel: 'active' as const,
        isPublic: formData.isPublic,
        createdAt: result.circle?.createdAt || new Date().toISOString(),
        expectedCompletionMonths: formData.expectedMonths,
        distributionMethod: formData.distributionMethod,
        circleRules: formData.circleRules || []
      };
      
      onCircleCreated(newCircle);
      onClose();
    } catch (error) {
      console.error('Error creating circle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create circle. Please try again.';
      showError('Circle Creation Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({ ...DEFAULT_FORM_DATA, ...initialData });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Create Your Savings Circle</h1>
                <p className="opacity-90">Build wealth together with community support</p>
              </div>
              <Button 
                onClick={handleClose}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-gray-900"
                disabled={isLoading}
              >
                ✕ Close
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
          
          {currentStep === 1 && (
            <TemplateSelection
              formData={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && (
            <BasicInformation
              formData={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <ContributionSettings
              formData={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <MemberSettings
              formData={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 5 && (
            <CircleRules
              formData={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 6 && (
            <FinalReview
              formData={formData}
              onBack={handleBack}
              onCreate={handleCreate}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateCircleWizard;
