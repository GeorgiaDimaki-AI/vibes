/**
 * Query Heatmap Component
 * Heatmap showing busy days or hours
 */

'use client';

interface QueryHeatmapProps {
  data: Array<{ day?: string; hour?: number; count: number }>;
  type: 'day' | 'hour';
}

export function QueryHeatmap({ data, type }: QueryHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No activity data available yet
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((item, idx) => {
        const percentage = (item.count / maxCount) * 100;
        const intensity = Math.min(Math.floor((item.count / maxCount) * 5), 4);

        const colors = [
          'bg-blue-100',
          'bg-blue-300',
          'bg-blue-500',
          'bg-blue-600',
          'bg-blue-700',
        ];

        const label = type === 'day'
          ? item.day
          : `${item.hour}:00`;

        return (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-20 text-sm text-gray-600 font-medium">
              {label}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className={`${colors[intensity]} h-6 rounded-full transition-all flex items-center justify-end pr-2`}
                  style={{ width: `${percentage}%` }}
                >
                  {item.count > 0 && (
                    <span className="text-xs font-bold text-white">
                      {item.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
