import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ChevronRight, Shield, TrendingUp, Users, Award, BarChart3, BookOpen, Zap, CheckCircle, ArrowRight, Star, Globe, Lock, Target } from 'lucide-react';

interface WelcomeOverviewProps {
  onNext: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

// Platform capabilities and features
const PLATFORM_FEATURES = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Professional Portfolio Management",
    description: "Institutional-grade investment strategies with real-time rebalancing and tax optimization"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Risk Management",
    description: "Advanced risk assessment and monitoring with downside protection strategies"
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Goal-Based Planning",
    description: "Personalized wealth-building strategies aligned with your life objectives"
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Real-Time Analytics",
    description: "Comprehensive performance tracking and market intelligence dashboard"
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Global Diversification",
    description: "Access to international markets, alternatives, and cryptocurrency investments"
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: "Bank-Level Security",
    description: "Advanced encryption and regulatory compliance to protect your assets"
  }
];

// Value propositions for different client types
const VALUE_PROPOSITIONS = [
  {
    type: "New Investors",
    title: "Start Your Wealth Journey",
    description: "Learn investing fundamentals while building your first portfolio with professional guidance",
    benefits: ["Educational resources", "Low minimum investment", "Automated rebalancing"]
  },
  {
    type: "Experienced Investors",
    title: "Optimize Your Strategy",
    description: "Advanced tools and analytics to enhance your existing investment approach",
    benefits: ["Institutional strategies", "Tax optimization", "Alternative investments"]
  },
  {
    type: "High Net Worth",
    title: "Comprehensive Wealth Management",
    description: "Full-service wealth management with personalized service and exclusive opportunities",
    benefits: ["Dedicated advisor", "Private investments", "Estate planning"]
  }
];

// Onboarding process overview
const ONBOARDING_STEPS = [
  { title: "Personal Profile", description: "Share your background and financial situation", duration: "5 min" },
  { title: "Risk Assessment", description: "Comprehensive risk tolerance evaluation", duration: "8 min" },
  { title: "Investment Preferences", description: "Define your investment strategy preferences", duration: "6 min" },
  { title: "Goal Setting", description: "Establish your financial objectives", duration: "7 min" },
  { title: "Account Setup", description: "Complete verification and account opening", duration: "10 min" },
  { title: "Portfolio Design", description: "Review your personalized investment strategy", duration: "5 min" }
];

export const WelcomeOverview: React.FC<WelcomeOverviewProps> = ({ 
  onNext, 
  onSkip, 
  isLoading = false 
}) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-rotate through features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % PLATFORM_FEATURES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Animated progress bar
  useEffect(() => {
    const timer = setTimeout(() => setProgress(20), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Award className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Professional</span> Wealth Management
        </h1>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Experience institutional-grade investment management designed for your success. 
          Let's build a personalized wealth strategy that adapts to your goals and grows with you.
        </p>

        <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mt-6">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>SEC Registered</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span>$2B+ AUM</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>98% Client Satisfaction</span>
          </div>
        </div>
      </div>

      {/* Platform Features Showcase */}
      <Card className="bg-gradient-to-br from-gray-50 to-white border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-900">Why Choose Our Platform?</CardTitle>
          <p className="text-gray-600">Institutional capabilities designed for individual investors</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_FEATURES.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg border-2 transition-all duration-500 ${
                  index === currentFeature
                    ? 'border-blue-500 bg-blue-50 transform scale-105 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`mb-4 ${index === currentFeature ? 'text-blue-600' : 'text-gray-600'}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Value Propositions */}
      <div className="grid md:grid-cols-3 gap-6">
        {VALUE_PROPOSITIONS.map((prop, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="text-sm text-blue-600 font-medium mb-1">{prop.type}</div>
              <CardTitle className="text-xl">{prop.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{prop.description}</p>
              <ul className="space-y-2">
                {prop.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onboarding Process Overview */}
      <Card className="bg-white shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-900">Your Onboarding Journey</CardTitle>
          <p className="text-gray-600">A comprehensive 6-step process designed to understand you and your goals</p>
          
          <div className="mt-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Total time: ~40 minutes</span>
            </div>
            <Progress value={progress} className="w-full max-w-md mx-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ONBOARDING_STEPS.map((step, index) => (
              <div 
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  </div>
                  <span className="text-xs text-gray-500">{step.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Key Benefits */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 text-blue-600 mr-2" />
              What You'll Get
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Personalized investment portfolio</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Detailed risk analysis report</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Goal-based wealth strategy</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Tax optimization recommendations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Ongoing portfolio monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Access to premium features</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Ready to Begin Your Wealth Journey?</h2>
          <p className="text-gray-600">
            Join thousands of investors who trust us with their financial future. 
            Your personalized wealth strategy is just a few steps away.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={onNext}
            disabled={isLoading}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Starting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Start My Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>

          {onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              size="lg"
              className="px-8 py-3 w-full sm:w-auto"
            >
              I'll Do This Later
            </Button>
          )}
        </div>

        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 mt-6">
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center space-x-1">
            <BookOpen className="w-3 h-3" />
            <span>Educational Resources</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>Expert Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverview;
