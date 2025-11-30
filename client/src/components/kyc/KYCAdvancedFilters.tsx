import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface KYCAdvancedFiltersProps {
  onFilterChange: (filters: KYCFilters) => void;
  initialFilters?: KYCFilters;
  onReset: () => void;
  isLoading?: boolean;
}

export interface KYCFilters {
  status: string;
  riskLevel: string;
  searchQuery: string;
  dateRange: {
    start: string;
    end: string;
  };
  submissionDateRange: {
    start: string;
    end: string;
  };
  reviewDateRange: {
    start: string;
    end: string;
  };
  documentType: string;
  nationality: string;
  reviewer: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const defaultFilters: KYCFilters = {
  status: 'all',
  riskLevel: 'all',
  searchQuery: '',
  dateRange: { start: '', end: '' },
  submissionDateRange: { start: '', end: '' },
  reviewDateRange: { start: '', end: '' },
  documentType: 'all',
  nationality: 'all',
  reviewer: 'all',
  sortBy: 'submitted_at',
  sortOrder: 'DESC'
};

export const KYCAdvancedFilters: React.FC<KYCAdvancedFiltersProps> = ({
  onFilterChange,
  initialFilters = defaultFilters,
  onReset,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<KYCFilters>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (key: keyof KYCFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeChange = (rangeType: 'dateRange' | 'submissionDateRange' | 'reviewDateRange', dateType: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      [rangeType]: {
        ...prev[rangeType],
        [dateType]: value
      }
    }));
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    onReset();
  };

  const getQuickFilterButton = (label: string, filterKey: keyof KYCFilters, filterValue: string) => (
    <button
      key={label}
      onClick={() => handleFilterChange(filterKey, filterValue)}
      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
        filters[filterKey] === filterValue
          ? 'bg-blue-500 text-white border-blue-500'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
      }`}
      disabled={isLoading}
    >
      {label}
    </button>
  );

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange' || key === 'submissionDateRange' || key === 'reviewDateRange') {
      const range = value as { start: string; end: string };
      return range.start || range.end;
    }
    const defaultValue = defaultFilters[key as keyof KYCFilters];
    return value !== defaultValue;
  });

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-800">
            Advanced Filters & Search
          </CardTitle>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Actions Row */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Quick Filters</label>
          <div className="flex flex-wrap gap-2">
            {getQuickFilterButton('Pending Review', 'status', 'pending')}
            {getQuickFilterButton('Under Review', 'status', 'under_review')}
            {getQuickFilterButton('High Risk', 'riskLevel', 'high')}
            {getQuickFilterButton('Recently Submitted', 'sortBy', 'submitted_at')}
            {getQuickFilterButton('Recently Reviewed', 'sortBy', 'reviewed_at')}
          </div>
        </div>

        {/* Main Search Bar */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, ID, or document number..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="w-full px-4 py-2 pr-10 bg-white border-2 border-blue-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Basic Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={isLoading}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              disabled={isLoading}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <div className="flex space-x-2">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={isLoading}
              >
                <option value="submitted_at">Submission Date</option>
                <option value="reviewed_at">Review Date</option>
                <option value="first_name">Name</option>
                <option value="risk_level">Risk Level</option>
                <option value="verification_status">Status</option>
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'ASC' | 'DESC')}
                className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={isLoading}
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-gray-200">
            {/* Date Range Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Submission Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.submissionDateRange.start}
                    onChange={(e) => handleDateRangeChange('submissionDateRange', 'start', e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  />
                  <input
                    type="date"
                    value={filters.submissionDateRange.end}
                    onChange={(e) => handleDateRangeChange('submissionDateRange', 'end', e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Review Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.reviewDateRange.start}
                    onChange={(e) => handleDateRangeChange('reviewDateRange', 'start', e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  />
                  <input
                    type="date"
                    value={filters.reviewDateRange.end}
                    onChange={(e) => handleDateRangeChange('reviewDateRange', 'end', e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Additional Filters</label>
                <div className="space-y-2">
                  <select
                    value={filters.documentType}
                    onChange={(e) => handleFilterChange('documentType', e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  >
                    <option value="all">All Document Types</option>
                    <option value="identity_front">Identity (Front)</option>
                    <option value="identity_back">Identity (Back)</option>
                    <option value="proof_of_address">Proof of Address</option>
                    <option value="selfie_verification">Selfie Verification</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Filter by nationality..."
                    value={filters.nationality === 'all' ? '' : filters.nationality}
                    onChange={(e) => handleFilterChange('nationality', e.target.value || 'all')}
                    className="w-full px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Active Filters:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filters).map(([key, value]) => {
                    if (key === 'dateRange' || key === 'submissionDateRange' || key === 'reviewDateRange') {
                      const range = value as { start: string; end: string };
                      if (range.start || range.end) {
                        return (
                          <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {range.start || 'Any'} - {range.end || 'Any'}
                          </span>
                        );
                      }
                      return null;
                    }
                    
                    const defaultValue = defaultFilters[key as keyof KYCFilters];
                    if (value !== defaultValue && value !== '' && value !== 'all') {
                      return (
                        <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {String(value)}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
