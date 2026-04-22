import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { useNotificationHelpers } from './NotificationSystem';

// Types for Circle Dashboard
export interface CircleDetails {
  id: string;
  name: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  memberLimit: number;
  currentMembers: number;
  createdBy: string;
  createdByName?: string;
  tags: string[];
  activityLevel: 'active' | 'quiet' | 'archived';
  isPublic: boolean;
  distributionMethod: 'rotating' | 'equal' | 'goal_based';
  circleRules: string[];
  createdAt: string;
  expectedCompletionMonths?: number;
  nextContributionDue?: string;
}

export interface CircleMember {
  id: string;
  userId: string;
  userName: string;
  role: 'member' | 'admin' | 'moderator';
  totalContributed: number;
  contributionCount: number;
  joinedAt: string;
  isActive: boolean;
  streakCount?: number;
  nextContributionDue?: string;
  contributionStatus?: 'current' | 'pending' | 'late';
}

export interface CircleMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  messageType: 'chat' | 'contribution' | 'milestone' | 'announcement';
  sentAt: string;
  amount?: number;
}

export interface ContributionRecord {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'completed' | 'late';
  month: string;
}

interface CircleDashboardProps {
  circleId: string;
  onBack: () => void;
  isOpen?: boolean;
}

// Progress Circle Component
function ProgressCircle({ progress, size = 120 }: { progress: number; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-green-500 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-700">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

// Member Card Component
function MemberCard({ member, isCurrentUser }: { member: CircleMember; isCurrentUser: boolean }) {
  return (
    <Card className={cn("mb-3", isCurrentUser && "border-green-500 bg-green-50")}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                {member.userName}
                {isCurrentUser && <span className="text-green-600 text-sm ml-1">(You)</span>}
              </h3>
              {member.role === 'admin' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Admin</span>
              )}
              {member.role === 'moderator' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Moderator</span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 mt-1">
              Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Total Contributed:</span>
                <div className="font-semibold text-green-600">
                  ${member.totalContributed.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Payments:</span>
                <div className="font-semibold">
                  {member.contributionCount} payments
                </div>
              </div>
            </div>
            
            {member.streakCount && member.streakCount > 0 && (
              <div className="mt-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  🔥 {member.streakCount} month streak
                </span>
              </div>
            )}
          </div>
          
          <div className="ml-4">
            <div className={cn(
              "w-3 h-3 rounded-full",
              member.contributionStatus === 'current' ? "bg-green-500" :
              member.contributionStatus === 'pending' ? "bg-yellow-500" :
              member.contributionStatus === 'late' ? "bg-red-500" :
              "bg-gray-300"
            )}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chat Message Component
function ChatMessage({ message, isCurrentUser }: { message: CircleMessage; isCurrentUser: boolean }) {
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'contribution': return '💰';
      case 'milestone': return '🎉';
      case 'announcement': return '📢';
      default: return '💬';
    }
  };

  const getMessageBg = (type: string) => {
    switch (type) {
      case 'contribution': return 'bg-green-50 border-green-200';
      case 'milestone': return 'bg-yellow-50 border-yellow-200';
      case 'announcement': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border mb-3",
      getMessageBg(message.messageType),
      isCurrentUser && "ml-8"
    )}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{getMessageIcon(message.messageType)}</span>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-gray-900">
              {isCurrentUser ? 'You' : message.userName}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.sentAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>
          <p className="text-gray-700">{message.message}</p>
          {message.amount && (
            <div className="text-green-600 font-semibold mt-1">
              +${message.amount.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main CircleDashboard Component
export default function CircleDashboard({ circleId, onBack, isOpen = true }: CircleDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState<CircleDetails | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [currentView, setCurrentView] = useState<'overview' | 'members' | 'activity' | 'contribute'>('overview');
  const { showError, showSuccess, showWarning } = useNotificationHelpers();
  const [newMessage, setNewMessage] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Simulated current user - in real app, get from auth context
  const currentUserId = '1'; // Replace with actual user ID from auth

  // Load circle data
  useEffect(() => {
    if (!isOpen) return;
    
    loadCircleData();
  }, [circleId, isOpen]);

  const loadCircleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load circle details
      const circleResponse = await fetch(`/api/circles/${circleId}`);
      const circleData = await circleResponse.json();
      
      if (!circleData.success) {
        throw new Error(circleData.error || 'Failed to load circle');
      }
      
      setCircle(circleData.circle);

      // Load members
      const token = localStorage.getItem('authToken');
      const membersResponse = await fetch(`/api/circles/${circleId}/members`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const membersData = await membersResponse.json();
      
      if (membersData.success) {
        setMembers(membersData.members);
      }

      // Load messages/activity
      if (token) {
        try {
          const messagesResponse = await fetch(`/api/circles/${circleId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            if (messagesData.success) {
              setMessages(messagesData.messages);
            }
          }
        } catch (messagesError) {
          console.error('Error loading messages:', messagesError);
          // Don't fail the whole load if messages fail
        }
      }
      
    } catch (error) {
      console.error('Error loading circle data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load circle data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showWarning('Login Required', 'Please log in to send messages in the circle.');
        return;
      }

      const response = await fetch(`/api/circles/${circleId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          messageType: 'chat'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Add the new message to local state for immediate UI update
      const newMessageObj: CircleMessage = {
        id: result.messageId,
        userId: currentUserId,
        userName: 'You',
        message: newMessage.trim(),
        messageType: 'chat',
        sentAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newMessageObj]);
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Message Failed', error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    }
  };

  const handleContribution = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showWarning('Login Required', 'Please log in to make a contribution to the circle.');
        return;
      }

      const amount = parseFloat(contributionAmount);
      
      const response = await fetch(`/api/circles/${circleId}/contribute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          message: `Contribution of $${amount}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to record contribution: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to record contribution');
      }

      // Update local state
      if (circle) {
        setCircle({
          ...circle,
          currentAmount: circle.currentAmount + amount
        });
      }

      // Add contribution message to activity feed
      const contributionMessage: CircleMessage = {
        id: Date.now().toString(),
        userId: currentUserId,
        userName: 'You',
        message: `Made a contribution of $${amount}`,
        messageType: 'contribution',
        sentAt: new Date().toISOString(),
        amount: amount
      };
      
      setMessages(prev => [...prev, contributionMessage]);
      setContributionAmount('');
      
      showSuccess('Contribution Recorded', `Contribution of $${amount} recorded successfully!`);
      
    } catch (error) {
      console.error('Error recording contribution:', error);
      showError('Contribution Failed', error instanceof Error ? error.message : 'Failed to record contribution. Please try again.');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading circle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Circle Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The circle you\'re looking for doesn\'t exist or you don\'t have access to it.'}</p>
            <Button onClick={onBack} className="bg-green-600 hover:bg-green-700">
              Back to Circles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = (circle.currentAmount / circle.goalAmount) * 100;
  const isCurrentUserMember = members.some(m => m.userId === currentUserId);
  const currentUserMember = members.find(m => m.userId === currentUserId);

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onBack}
                  className="text-gray-600"
                >
                  ← Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{circle.name}</h1>
                  <p className="text-gray-600">{circle.currentMembers}/{circle.memberLimit} members</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!isCurrentUserMember && (
                  <Button className="bg-green-600 hover:bg-green-700">
                    Join Circle
                  </Button>
                )}
                {currentUserMember?.role === 'admin' && (
                  <Button variant="outline">Manage Circle</Button>
                )}
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-6 mt-4 border-b">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'members', label: 'Members', icon: '👥' },
                { id: 'activity', label: 'Activity', icon: '💬' },
                { id: 'contribute', label: 'Contribute', icon: '💰' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={cn(
                    "px-4 py-2 border-b-2 font-medium text-sm transition-colors",
                    currentView === tab.id
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {currentView === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Progress Section */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🎯 Circle Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-6">
                      <ProgressCircle progress={progress} />
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          ${circle.currentAmount.toLocaleString()}
                        </div>
                        <div className="text-gray-600">
                          of ${circle.goalAmount.toLocaleString()} goal
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                          ${(circle.goalAmount - circle.currentAmount).toLocaleString()} remaining
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          ${circle.monthlyContribution}
                        </div>
                        <div className="text-sm text-gray-600">Monthly Contribution</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {circle.expectedCompletionMonths || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Months to Goal</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {circle.currentMembers}
                        </div>
                        <div className="text-sm text-gray-600">Active Members</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Description & Rules */}
                <Card>
                  <CardHeader>
                    <CardTitle>About This Circle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-6">{circle.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Circle Rules:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {circle.circleRules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-2">
                      {circle.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Circle Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-gray-500">Created by:</span>
                      <div className="font-semibold">{circle.createdByName}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <div className="font-semibold">
                        {new Date(circle.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Distribution:</span>
                      <div className="font-semibold capitalize">
                        {circle.distributionMethod.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Activity Level:</span>
                      <span className={cn(
                        "px-2 py-1 text-xs rounded-full ml-2",
                        circle.activityLevel === 'active' ? "bg-green-100 text-green-800" :
                        circle.activityLevel === 'quiet' ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {circle.activityLevel}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {isCurrentUserMember && currentUserMember && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Contribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-500">Total Contributed:</span>
                          <div className="text-xl font-bold text-green-600">
                            ${currentUserMember.totalContributed.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Payments Made:</span>
                          <div className="font-semibold">
                            {currentUserMember.contributionCount}
                          </div>
                        </div>
                        {currentUserMember.nextContributionDue && (
                          <div>
                            <span className="text-gray-500">Next Due:</span>
                            <div className="font-semibold">
                              {new Date(currentUserMember.nextContributionDue).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {currentView === 'members' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Circle Members</h2>
                <p className="text-gray-600">
                  {members.length} active members contributing together
                </p>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-4">
                {members.map(member => (
                  <MemberCard 
                    key={member.id} 
                    member={member}
                    isCurrentUser={member.userId === currentUserId}
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === 'activity' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Circle Activity</h2>
                  <p className="text-gray-600">Stay connected with your circle members</p>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map(message => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isCurrentUser={message.userId === currentUserId}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Send Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-md resize-none"
                        rows={4}
                        placeholder="Share an update with your circle..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentView === 'contribute' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Make Your Contribution</h2>
                <p className="text-gray-600">
                  Keep your savings on track with your monthly contribution
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💰 Monthly Contribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-sm text-green-700">Expected Monthly Amount</div>
                        <div className="text-3xl font-bold text-green-800">
                          ${circle.monthlyContribution.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contribution Amount
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="text-lg"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        You can contribute any amount, but ${circle.monthlyContribution} is the expected monthly contribution
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleContribution}
                      disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                    >
                      Contribute ${contributionAmount || '0'}
                    </Button>
                    
                    <div className="text-center text-sm text-gray-500">
                      <p>💡 Your contribution helps everyone reach their savings goals faster</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
