import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

// Types for Community Circles
export interface Circle {
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
  circleImageUrl?: string;
  tags: string[];
  activityLevel: 'active' | 'quiet' | 'archived';
  isPublic: boolean;
  inviteCode?: string;
  createdAt: string;
  expectedCompletionMonths?: number;
}

export interface CircleMember {
  id: string;
  userId: string;
  userName: string;
  role: 'member' | 'admin' | 'moderator';
  totalContributed: number;
  joinedAt: string;
  isActive: boolean;
  streakCount?: number;
}

export interface UserCircle extends Circle {
  membership: CircleMember;
  nextContributionDue?: string;
  contributionStatus: 'current' | 'pending' | 'late';
}

interface CommunityCIrclesHubProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCircle: () => void;
  onJoinCircle: (circle: Circle) => void;
  initialView?: 'discover' | 'my-circles';
}

// Filter options for circle discovery
interface CircleFilters {
  goalAmount?: [number, number];
  monthlyContribution?: [number, number];
  timeframe?: string;
  tags?: string[];
  memberCount?: [number, number];
  activityLevel?: string;
}

// API helper functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json'
  };
};

const fetchAvailableCircles = async (filters: CircleFilters = {}): Promise<Circle[]> => {
  try {
    const params = new URLSearchParams();
    
    if (filters.goalAmount) {
      params.append('goalMin', filters.goalAmount[0].toString());
      params.append('goalMax', filters.goalAmount[1].toString());
    }
    
    if (filters.monthlyContribution) {
      params.append('monthlyMin', filters.monthlyContribution[0].toString());
      params.append('monthlyMax', filters.monthlyContribution[1].toString());
    }
    
    if (filters.activityLevel) {
      params.append('activityLevel', filters.activityLevel);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }

    const queryString = params.toString();
    const url = `/api/circles${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch circles: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.circles || [];
  } catch (error) {
    console.error('Error fetching circles:', error);
    throw error;
  }
};

const fetchUserCircles = async (): Promise<UserCircle[]> => {
  try {
    const response = await fetch('/api/user/circles', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please log in to view your circles');
      }
      throw new Error(`Failed to fetch user circles: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.circles || [];
  } catch (error) {
    console.error('Error fetching user circles:', error);
    throw error;
  }
};

// Success Stories Component
function SuccessStories() {
  const stories = [
    {
      name: 'The Dream Team Circle',
      members: 8,
      goalReached: 40000,
      timeframe: '18 months',
      outcome: 'All members bought their first cars',
      quote: '"We did it together! None of us could have saved $5,000 alone, but as a team we each got exactly what we needed."',
      author: 'Keisha, Circle Admin'
    },
    {
      name: 'Single Parents Strong',
      members: 6,
      goalReached: 18000,
      timeframe: '12 months',
      outcome: 'Emergency funds for all families',
      quote: '"Having that security blanket changed everything for my kids and me. The circle kept me accountable when times got tough."',
      author: 'David, Circle Member'
    }
  ];

  return (
    <div className="bg-green-50 rounded-lg p-6 mb-8">
      <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">🎉 Circle Success Stories</h3>
      <div className="grid md:grid-cols-2 gap-6">
        {stories.map((story, index) => (
          <Card key={index} className="border-green-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-green-700 mb-2">{story.name}</h4>
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">${story.goalReached.toLocaleString()}</span> saved by{' '}
                <span className="font-medium">{story.members} members</span> in{' '}
                <span className="font-medium">{story.timeframe}</span>
              </div>
              <p className="text-green-800 font-medium mb-2">{story.outcome}</p>
              <blockquote className="italic text-gray-700 text-sm">
                "{story.quote}"
                <footer className="text-xs text-gray-500 mt-1">— {story.author}</footer>
              </blockquote>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Circle Card Component
function CircleCard({ circle, onJoin, showJoinButton = true }: { 
  circle: Circle; 
  onJoin: (circle: Circle) => void;
  showJoinButton?: boolean;
}) {
  const progressPercentage = (circle.currentAmount / circle.goalAmount) * 100;
  const spotsRemaining = circle.memberLimit - circle.currentMembers;
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-yellow-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900">{circle.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{circle.description}</p>
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-green-600">
              ${circle.goalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Goal</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress: ${circle.currentAmount.toLocaleString()}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Circle Details */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-500">Monthly Contribution:</span>
            <div className="font-semibold text-gray-900">${circle.monthlyContribution}</div>
          </div>
          <div>
            <span className="text-gray-500">Members:</span>
            <div className="font-semibold text-gray-900">
              {circle.currentMembers}/{circle.memberLimit}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Timeline:</span>
            <div className="font-semibold text-gray-900">
              {circle.expectedCompletionMonths ? `${circle.expectedCompletionMonths} months` : 'Flexible'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Activity:</span>
            <div className={cn(
              "font-semibold capitalize",
              circle.activityLevel === 'active' ? 'text-green-600' :
              circle.activityLevel === 'quiet' ? 'text-yellow-600' :
              'text-gray-600'
            )}>
              {circle.activityLevel}
            </div>
          </div>
        </div>

        {/* Tags */}
        {circle.tags && circle.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {circle.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Created by {circle.createdByName || 'Anonymous'} • {new Date(circle.createdAt).toLocaleDateString()}
          </div>
          {showJoinButton && (
            <div className="flex items-center gap-2">
              {spotsRemaining > 0 ? (
                <Button onClick={() => onJoin(circle)} size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                  Join Circle ({spotsRemaining} spots left)
                </Button>
              ) : (
                <Button disabled size="sm" className="bg-gray-300">
                  Circle Full
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Filter Panel Component
function FilterPanel({ filters, onFiltersChange }: {
  filters: CircleFilters;
  onFiltersChange: (filters: CircleFilters) => void;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Find Your Perfect Circle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Goal Amount Range */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Goal Amount</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                const range = e.target.value;
                if (range === 'all') {
                  onFiltersChange({ ...filters, goalAmount: undefined });
                } else {
                  const [min, max] = range.split('-').map(Number);
                  onFiltersChange({ ...filters, goalAmount: [min, max] });
                }
              }}
            >
              <option value="all">Any Amount</option>
              <option value="1000-5000">$1,000 - $5,000</option>
              <option value="5000-15000">$5,000 - $15,000</option>
              <option value="15000-30000">$15,000 - $30,000</option>
              <option value="30000-100000">$30,000+</option>
            </select>
          </div>

          {/* Monthly Contribution */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Monthly Contribution</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                const range = e.target.value;
                if (range === 'all') {
                  onFiltersChange({ ...filters, monthlyContribution: undefined });
                } else {
                  const [min, max] = range.split('-').map(Number);
                  onFiltersChange({ ...filters, monthlyContribution: [min, max] });
                }
              }}
            >
              <option value="all">Any Amount</option>
              <option value="50-200">$50 - $200</option>
              <option value="200-500">$200 - $500</option>
              <option value="500-1000">$500 - $1,000</option>
              <option value="1000-10000">$1,000+</option>
            </select>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Activity Level</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                const level = e.target.value;
                onFiltersChange({ 
                  ...filters, 
                  activityLevel: level === 'all' ? undefined : level 
                });
              }}
            >
              <option value="all">Any Activity</option>
              <option value="active">Very Active</option>
              <option value="quiet">Quiet</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <Input
            placeholder="Search circles by name, description, or tags..."
            className="w-full"
          />
        </div>

        {/* Popular Tags */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Popular Categories</label>
          <div className="flex flex-wrap gap-2">
            {['emergency-fund', 'homeownership', 'investment', 'entrepreneurship', 'education', 'vacation', 'wedding'].map((tag) => (
              <button
                key={tag}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-full transition-colors"
              >
                {tag.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// My Circles Dashboard Component
function MyCirclesDashboard({ userCircles }: { userCircles: UserCircle[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Circles</h2>
        <div className="text-sm text-gray-600">
          Total Active: {userCircles.length} circles
        </div>
      </div>

      {userCircles.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-6xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Circles Yet</h3>
            <p className="text-gray-600 mb-4">
              Join your first savings circle to start building wealth with community support
            </p>
            <Button className="bg-yellow-500 hover:bg-yellow-600">
              Browse Available Circles
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {userCircles.map((circle) => (
            <Card key={circle.id} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-gray-900">{circle.name}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      Role: <span className="font-medium capitalize">{circle.membership.role}</span> • 
                      Joined: {new Date(circle.membership.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ${circle.membership.totalContributed.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Your Total</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Circle Progress: ${circle.currentAmount.toLocaleString()}</span>
                    <span>{Math.round((circle.currentAmount / circle.goalAmount) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full" 
                      style={{ width: `${Math.min((circle.currentAmount / circle.goalAmount) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Next Contribution */}
                {circle.nextContributionDue && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-yellow-800">Next Contribution Due</h4>
                        <p className="text-yellow-700 text-sm">
                          ${circle.monthlyContribution} due by {new Date(circle.nextContributionDue).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                        Pay Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Message Circle
                  </Button>
                  {circle.membership.role === 'admin' && (
                    <Button variant="outline" size="sm">
                      Manage Circle
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Component
export function CommunityCIrclesHub({
  isOpen,
  onClose,
  onCreateCircle,
  onJoinCircle,
  initialView = 'discover'
}: CommunityCIrclesHubProps) {
  const [currentView, setCurrentView] = useState<'discover' | 'my-circles'>(initialView);
  const [availableCircles, setAvailableCircles] = useState<Circle[]>([]);
  const [userCircles, setUserCircles] = useState<UserCircle[]>([]);
  const [filters, setFilters] = useState<CircleFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter available circles based on current filters
  const filteredCircles = availableCircles.filter(circle => {
    if (filters.goalAmount) {
      const [min, max] = filters.goalAmount;
      if (circle.goalAmount < min || circle.goalAmount > max) return false;
    }
    
    if (filters.monthlyContribution) {
      const [min, max] = filters.monthlyContribution;
      if (circle.monthlyContribution < min || circle.monthlyContribution > max) return false;
    }
    
    if (filters.activityLevel && circle.activityLevel !== filters.activityLevel) {
      return false;
    }
    
    return true;
  });

  // Load data from API
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Reload data when filters change for discover view
  useEffect(() => {
    if (isOpen && currentView === 'discover') {
      loadAvailableCircles();
    }
  }, [filters, isOpen, currentView]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadAvailableCircles(),
        loadUserCircles()
      ]);
    } catch (err) {
      console.error('Error loading circle data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableCircles = async () => {
    try {
      const circles = await fetchAvailableCircles(filters);
      setAvailableCircles(circles);
    } catch (err) {
      console.error('Error loading available circles:', err);
      // Don't throw - let component handle partial failures gracefully
    }
  };

  const loadUserCircles = async () => {
    try {
      const circles = await fetchUserCircles();
      setUserCircles(circles);
    } catch (err) {
      console.error('Error loading user circles:', err);
      // Don't throw - user might not be logged in or have no circles
      if (err instanceof Error && err.message.includes('log in')) {
        // User not logged in - this is expected for discover view
        setUserCircles([]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-green-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">🤝 Community Circles</h1>
                <p className="text-xl opacity-90">Save together, grow together, achieve together</p>
              </div>
              <Button 
                onClick={onClose}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-gray-900"
              >
                ✕ Close
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentView('discover')}
                variant={currentView === 'discover' ? 'default' : 'outline'}
                className={currentView === 'discover' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                🔍 Discover Circles
              </Button>
              <Button
                onClick={() => setCurrentView('my-circles')}
                variant={currentView === 'my-circles' ? 'default' : 'outline'}
                className={currentView === 'my-circles' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                👥 My Circles ({userCircles.length})
              </Button>
            </div>
            
            <Button
              onClick={onCreateCircle}
              className="bg-green-500 hover:bg-green-600"
            >
              ➕ Start New Circle
            </Button>
          </div>

          {/* Content */}
          {error ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Circles</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData} className="bg-blue-500 hover:bg-blue-600">
                Try Again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-600">Loading circles...</p>
            </div>
          ) : (
            <>
              {currentView === 'discover' && (
                <div>
                  {/* Success Stories */}
                  <SuccessStories />
                  
                  {/* Filter Panel */}
                  <FilterPanel filters={filters} onFiltersChange={setFilters} />
                  
                  {/* Available Circles */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Available Circles ({filteredCircles.length})
                    </h2>
                    
                    {filteredCircles.length === 0 ? (
                      <Card className="text-center py-8">
                        <CardContent>
                          <div className="text-6xl mb-4">🔍</div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Circles Found</h3>
                          <p className="text-gray-600 mb-4">
                            Try adjusting your filters or create a new circle that matches your goals
                          </p>
                          <Button onClick={onCreateCircle} className="bg-green-500 hover:bg-green-600">
                            Start Your Own Circle
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid lg:grid-cols-2 gap-6">
                        {filteredCircles.map((circle) => (
                          <CircleCard
                            key={circle.id}
                            circle={circle}
                            onJoin={onJoinCircle}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'my-circles' && (
                <MyCirclesDashboard userCircles={userCircles} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommunityCIrclesHub;
