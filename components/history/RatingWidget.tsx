'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface RatingWidgetProps {
  adviceId: string;
  initialRating?: number;
  initialFeedback?: string;
  initialWasHelpful?: boolean;
  onRate: (rating: number, feedback?: string, wasHelpful?: boolean) => Promise<void>;
}

export function RatingWidget({
  adviceId,
  initialRating,
  initialFeedback,
  initialWasHelpful,
  onRate,
}: RatingWidgetProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(initialFeedback || '');
  const [wasHelpful, setWasHelpful] = useState(initialWasHelpful);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(!!initialRating);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await onRate(rating, feedback || undefined, wasHelpful);
      setHasRated(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rate this advice
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
              disabled={hasRated && submitting}
            >
              <Star
                size={28}
                className={`${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Was Helpful */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={`helpful-${adviceId}`}
          checked={wasHelpful || false}
          onChange={(e) => setWasHelpful(e.target.checked)}
          disabled={hasRated}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
        />
        <label
          htmlFor={`helpful-${adviceId}`}
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          This advice was helpful
        </label>
      </div>

      {/* Feedback */}
      <div>
        <label
          htmlFor={`feedback-${adviceId}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Additional feedback (optional)
        </label>
        <textarea
          id={`feedback-${adviceId}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={hasRated}
          placeholder="Tell us more about your experience..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none disabled:opacity-50"
        />
      </div>

      {/* Submit Button */}
      {!hasRated && (
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Send size={18} />
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      )}

      {hasRated && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Thank you for rating this advice!
        </p>
      )}
    </div>
  );
}
