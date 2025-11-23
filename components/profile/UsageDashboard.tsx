'use client';

import { useUserUsage } from '@/lib/hooks/useUserUsage';
import { TrendingUp, Calendar, Star, Activity } from 'lucide-react';
import { TierDisplay } from './TierDisplay';

export function UsageDashboard() {
  const { usage, loading, error } = useUserUsage();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          {error || 'Failed to load usage data'}
        </p>
      </div>
    );
  }

  const usagePercentage = usage.queryLimit > 0
    ? (usage.queriesThisMonth / usage.queryLimit) * 100
    : 0;

  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <div className="space-y-6">
      {/* Tier Display */}
      <TierDisplay tier={usage.tier} />

      {/* Usage Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Monthly Usage
        </h3>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Queries Used
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-white">
              {usage.queriesThisMonth} / {usage.queryLimit === -1 ? '∞' : usage.queryLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit
                  ? 'bg-red-500'
                  : isNearLimit
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          {isNearLimit && !isAtLimit && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              You are approaching your monthly limit
            </p>
          )}
          {isAtLimit && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              You have reached your monthly limit. Consider upgrading your tier.
            </p>
          )}
        </div>

        {/* Reset Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Calendar size={16} />
          <span>Resets on {new Date(usage.resetDate).toLocaleDateString()}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Queries
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
              {usage.totalQueries || 0}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star size={20} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Avg Rating
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              {usage.averageRating ? usage.averageRating.toFixed(1) : 'N/A'}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                This Month
              </span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200">
              {usage.queriesThisMonth}
            </p>
          </div>
        </div>
      </div>

      {/* Top Interests & Regions */}
      {(usage.topInterests?.length > 0 || usage.topRegions?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Interests */}
          {usage.topInterests?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Top Interests
              </h3>
              <div className="space-y-2">
                {usage.topInterests.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      {item.interest}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Regions */}
          {usage.topRegions?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Top Regions
              </h3>
              <div className="space-y-2">
                {usage.topRegions.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      {item.region.split('-').join(' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
