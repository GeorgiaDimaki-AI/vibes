/**
 * Insights Dashboard Component
 * Main analytics dashboard showing all user insights
 */

'use client';

import { useEffect, useState } from 'react';
import { UserInsights } from '@/lib/users/analytics-service';
import { UsageChart } from './UsageChart';
import { TopItemsList } from './TopItemsList';
import { QueryHeatmap } from './QueryHeatmap';
import { SatisfactionWidget } from './SatisfactionWidget';

export function InsightsDashboard() {
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/insights');

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading insights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-8">
        <div className="text-gray-500">No insights available yet. Start using the app to see your analytics!</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Analytics</h1>
        <p className="text-gray-600">
          Track your usage patterns and discover insights about your cultural journey
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Queries</div>
          <div className="text-3xl font-bold">{insights.totalQueries}</div>
          <div className="text-sm text-gray-500 mt-2">
            {insights.queriesThisMonth} this month
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Query Growth</div>
          <div className={`text-3xl font-bold ${
            insights.trends.queryGrowth > 0 ? 'text-green-600' :
            insights.trends.queryGrowth < 0 ? 'text-red-600' :
            'text-gray-700'
          }`}>
            {insights.trends.queryGrowth > 0 ? '+' : ''}
            {insights.trends.queryGrowth.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-2">vs last month</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Avg Satisfaction</div>
          <div className="text-3xl font-bold">
            {insights.satisfaction.averageRating.toFixed(1)}
            <span className="text-xl text-gray-400">/5</span>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {insights.satisfaction.totalRatings} ratings
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Query Timeline</h2>
        <UsageChart timeline={insights.queryPatterns.timeline} />
      </div>

      {/* Top Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Interests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top Interests</h2>
          <TopItemsList
            items={insights.topInterests.map(i => ({ label: i.interest, value: i.count }))}
            emptyMessage="No interests tracked yet"
          />
        </div>

        {/* Top Regions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top Regions</h2>
          <TopItemsList
            items={insights.topRegions.map(r => ({ label: r.region, value: r.count }))}
            emptyMessage="No regions tracked yet"
          />
        </div>

        {/* Top Vibes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Top Matched Vibes</h2>
          <TopItemsList
            items={insights.topMatchedVibes.map(v => ({ label: v.vibeName, value: v.count }))}
            emptyMessage="No vibes matched yet"
          />
        </div>

        {/* Top Scenarios */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Common Scenarios</h2>
          <TopItemsList
            items={insights.topScenarios.map(s => ({ label: s.description, value: s.count }))}
            emptyMessage="No scenarios tracked yet"
          />
        </div>
      </div>

      {/* Query Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of Week Heatmap */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Activity by Day</h2>
          <QueryHeatmap
            data={insights.queryPatterns.busyDays}
            type="day"
          />
        </div>

        {/* Hour of Day Heatmap */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Activity by Hour</h2>
          <QueryHeatmap
            data={insights.queryPatterns.busyHours.slice(0, 10)}
            type="hour"
          />
        </div>
      </div>

      {/* Satisfaction Widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Satisfaction Metrics</h2>
        <SatisfactionWidget satisfaction={insights.satisfaction} trend={insights.trends.satisfactionTrend} />
      </div>

      {/* Emerging Interests */}
      {insights.trends.emergingInterests.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Emerging Interests</h2>
          <div className="flex flex-wrap gap-2">
            {insights.trends.emergingInterests.map((interest, idx) => (
              <span
                key={idx}
                className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-700 border border-purple-200"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
