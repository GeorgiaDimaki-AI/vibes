'use client';

import { useState } from 'react';
import { AdviceHistory } from '@/lib/hooks/useHistory';
import { Calendar, Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { RatingWidget } from './RatingWidget';
import toast from 'react-hot-toast';

interface AdviceHistoryItemProps {
  item: AdviceHistory;
  onDelete: (id: string) => Promise<void>;
  onRate: (id: string, rating: number, feedback?: string, wasHelpful?: boolean) => Promise<void>;
}

export function AdviceHistoryItem({ item, onDelete, onRate }: AdviceHistoryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this advice?')) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(item.id);
      toast.success('Advice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete advice');
    } finally {
      setDeleting(false);
    }
  };

  const handleRate = async (rating: number, feedback?: string, wasHelpful?: boolean) => {
    await onRate(item.id, rating, feedback, wasHelpful);
    setShowRating(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Calendar size={16} />
            <span>{new Date(item.timestamp).toLocaleString()}</span>
            {item.rating && (
              <div className="flex items-center gap-1 ml-4">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{item.rating}/5</span>
              </div>
            )}
          </div>
          <p className="text-gray-800 dark:text-white font-medium">
            {item.scenario.description}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Delete advice"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Matched Vibes */}
      {item.advice.matchedVibes && item.advice.matchedVibes.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Matched Vibes
          </p>
          <div className="flex flex-wrap gap-2">
            {item.advice.matchedVibes.slice(0, 5).map((match, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded-full"
              >
                {match.vibe.name}
              </span>
            ))}
            {item.advice.matchedVibes.length > 5 && (
              <span className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                +{item.advice.matchedVibes.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium mb-4"
      >
        {expanded ? (
          <>
            <ChevronUp size={16} />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown size={16} />
            Show Details
          </>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Topics */}
          {item.advice.recommendations.topics.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                Topics
              </h4>
              <ul className="space-y-2">
                {item.advice.recommendations.topics.map((topic, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{topic.topic}:</span>{' '}
                    {topic.talking_points.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Behavior */}
          {item.advice.recommendations.behavior.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                Behavior
              </h4>
              <ul className="space-y-2">
                {item.advice.recommendations.behavior.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{rec.aspect}:</span> {rec.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Style */}
          {item.advice.recommendations.style.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                Style
              </h4>
              <ul className="space-y-2">
                {item.advice.recommendations.style.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium capitalize">{rec.category}:</span>{' '}
                    {rec.suggestions.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reasoning */}
          {item.advice.reasoning && (
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                Reasoning
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {item.advice.reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rating Section */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!item.rating && !showRating && (
          <button
            onClick={() => setShowRating(true)}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
          >
            Rate this advice
          </button>
        )}

        {showRating && (
          <RatingWidget
            adviceId={item.id}
            initialRating={item.rating}
            initialFeedback={item.feedback}
            initialWasHelpful={item.wasHelpful}
            onRate={handleRate}
          />
        )}

        {item.rating && !showRating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={
                      star <= item.rating!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }
                  />
                ))}
              </div>
            </div>
            {item.feedback && (
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                {item.feedback}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
