'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Advice } from '@/lib/types';
import { Navigation } from '@/components/Navigation';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const { isSignedIn } = useUser();
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAdvice = async () => {
    if (!scenario.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: scenario }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to get advice');
        }
        if (response.status === 429) {
          throw new Error('You have reached your monthly query limit. Please upgrade your tier.');
        }
        throw new Error('Failed to get advice');
      }

      const data = await response.json();
      setAdvice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      getAdvice();
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Zeitgeist
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your cultural advisor for any situation
            </p>
            {!isSignedIn && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <AlertCircle size={16} />
                Sign in to get personalized advice and track your history
              </div>
            )}
          </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <label
            htmlFor="scenario-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Describe your situation
          </label>
          <textarea
            id="scenario-input"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Dinner with tech friends at a trendy restaurant in downtown..."
            aria-describedby="scenario-hint"
            aria-invalid={error ? true : undefined}
            className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          />
          <p id="scenario-hint" className="sr-only">
            Describe the situation you need cultural advice for. Minimum 5 characters required.
          </p>
          <button
            onClick={getAdvice}
            disabled={loading || !scenario.trim()}
            aria-busy={loading}
            aria-live="polite"
            className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Analyzing vibes...' : 'Get Advice'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Advice */}
        {advice && (
          <div className="space-y-6">
            {/* Matched Vibes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                Relevant Vibes
              </h2>
              <div className="flex flex-wrap gap-2">
                {advice.matchedVibes.slice(0, 10).map((match, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-sm"
                  >
                    <span className="font-medium text-purple-900 dark:text-purple-200">
                      {match.vibe.name}
                    </span>
                    <span className="ml-2 text-purple-600 dark:text-purple-400">
                      {(match.relevanceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics */}
            {advice.recommendations.topics.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Topics to Discuss
                </h2>
                <div className="space-y-4">
                  {advice.recommendations.topics.map((topic, idx) => (
                    <div key={idx} className="border-l-4 border-purple-500 pl-4">
                      <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                        {topic.topic}
                        {topic.priority === 'high' && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 px-2 py-1 rounded">
                            High Priority
                          </span>
                        )}
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {topic.talking_points.map((point, pidx) => (
                          <li
                            key={pidx}
                            className="text-gray-600 dark:text-gray-400"
                          >
                            • {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavior */}
            {advice.recommendations.behavior.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  How to Act
                </h2>
                <div className="space-y-3">
                  {advice.recommendations.behavior.map((rec, idx) => (
                    <div key={idx}>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {rec.aspect}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {rec.suggestion}
                      </p>
                      {rec.reasoning && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                          {rec.reasoning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Style */}
            {advice.recommendations.style.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Style Guide
                </h2>
                <div className="space-y-3">
                  {advice.recommendations.style.map((rec, idx) => (
                    <div key={idx}>
                      <h3 className="font-semibold text-gray-800 dark:text-white capitalize">
                        {rec.category}
                      </h3>
                      <ul className="mt-1 space-y-1">
                        {rec.suggestions.map((suggestion, sidx) => (
                          <li
                            key={sidx}
                            className="text-gray-600 dark:text-gray-400"
                          >
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                      {rec.reasoning && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                          {rec.reasoning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Reasoning */}
            {advice.reasoning && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Why these recommendations?
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  {advice.reasoning}
                </p>
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Confidence: {(advice.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!advice && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-gray-500 dark:text-gray-400">
              Describe any situation and get culturally-aware advice on topics, behavior, and style
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
