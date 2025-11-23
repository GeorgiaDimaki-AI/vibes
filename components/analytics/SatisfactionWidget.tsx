/**
 * Satisfaction Widget Component
 * Shows satisfaction metrics with rating distribution
 */

'use client';

interface SatisfactionWidgetProps {
  satisfaction: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
    helpfulPercentage: number;
  };
  trend: 'up' | 'down' | 'stable';
}

export function SatisfactionWidget({ satisfaction, trend }: SatisfactionWidgetProps) {
  const { averageRating, totalRatings, ratingDistribution, helpfulPercentage } = satisfaction;

  if (totalRatings === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No ratings yet. Rate your advice to see satisfaction metrics!
      </div>
    );
  }

  const maxRatingCount = Math.max(...Object.values(ratingDistribution), 1);

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-800">
            {averageRating.toFixed(1)}
            <span className="text-xl text-gray-400">/5</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">Average Rating</div>
          <div className={`text-2xl mt-2 ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-800">
            {helpfulPercentage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">Found Helpful</div>
          <div className="text-xs text-gray-400 mt-2">
            {totalRatings} total ratings
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Distribution</h3>
        {[5, 4, 3, 2, 1].map(rating => {
          const count = ratingDistribution[rating] || 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          const barWidth = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;

          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12">
                <span className="text-sm font-medium text-gray-700">{rating}</span>
                <span className="text-yellow-400">★</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                <div
                  className="bg-yellow-400 h-4 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="w-16 text-right">
                <span className="text-sm text-gray-600">{count}</span>
                <span className="text-xs text-gray-400 ml-1">({percentage.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stars Visualization */}
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-3xl ${
              star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}
