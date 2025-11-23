/**
 * Top Items List Component
 * Generic component for displaying top N items with counts
 */

'use client';

interface TopItemsListProps {
  items: Array<{ label: string; value: number }>;
  emptyMessage?: string;
  maxItems?: number;
}

export function TopItemsList({ items, emptyMessage = 'No data available', maxItems = 5 }: TopItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        {emptyMessage}
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);
  const maxValue = Math.max(...displayItems.map(i => i.value), 1);

  return (
    <div className="space-y-3">
      {displayItems.map((item, idx) => {
        const percentage = (item.value / maxValue) * 100;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700 truncate flex-1 mr-2">
                {item.label}
              </span>
              <span className="text-gray-500 font-mono">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
