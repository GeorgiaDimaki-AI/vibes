/**
 * Usage Chart Component
 * Line chart showing queries over time
 */

'use client';

interface UsageChartProps {
  timeline: Array<{ date: string; count: number }>;
}

export function UsageChart({ timeline }: UsageChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No usage data available yet
      </div>
    );
  }

  // Calculate max for scaling
  const maxCount = Math.max(...timeline.map(t => t.count), 1);

  return (
    <div className="space-y-4">
      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-48">
        {timeline.map((item, idx) => {
          const height = (item.count / maxCount) * 100;
          const date = new Date(item.date);
          const dayMonth = `${date.getMonth() + 1}/${date.getDate()}`;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end group">
              <div className="relative w-full">
                <div
                  className="bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer"
                  style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                  title={`${dayMonth}: ${item.count} queries`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels (show every few days) */}
      <div className="flex justify-between text-xs text-gray-500">
        {timeline.filter((_, idx) => idx % Math.ceil(timeline.length / 6) === 0).map((item, idx) => {
          const date = new Date(item.date);
          return (
            <span key={idx}>
              {date.getMonth() + 1}/{date.getDate()}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="text-sm text-gray-600 text-center">
        Daily queries over the last {timeline.length} days
      </div>
    </div>
  );
}
