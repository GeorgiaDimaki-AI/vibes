'use client';

import { useState } from 'react';
import { OnboardingProfile } from '@/lib/hooks/useOnboarding';
import { Sparkles, Loader2 } from 'lucide-react';

interface TryItStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

export function TryItStep({ profile, onNext }: TryItStepProps) {
  const [scenario, setScenario] = useState(
    'Dinner with friends at a trendy restaurant in downtown'
  );
  const [advice, setAdvice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAdvice = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: scenario }),
      });

      if (!response.ok) {
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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Try It Out!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          See how personalized advice works with your profile
        </p>
      </div>

      <div>
        <label
          htmlFor="tryit-scenario"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Scenario
        </label>
        <textarea
          id="tryit-scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          placeholder="Describe your situation..."
        />
        <button
          onClick={getAdvice}
          disabled={loading || !scenario.trim()}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Analyzing vibes...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Get Personalized Advice
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {advice && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
              Here's your personalized advice!
            </h3>
            {advice.recommendations?.topics?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Topics to discuss:
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                  {advice.recommendations.topics.slice(0, 3).map((topic: any, idx: number) => (
                    <li key={idx}>{topic.topic}</li>
                  ))}
                </ul>
              </div>
            )}
            {advice.matchedVibes && (
              <div className="flex flex-wrap gap-2 mt-3">
                {advice.matchedVibes.slice(0, 5).map((match: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 rounded-full text-xs"
                  >
                    {match.vibe.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">
              <strong>Great!</strong> This is how Zeitgeist will help you navigate
              any social situation. Click Next to see a quick tour of features.
            </p>
          </div>
        </div>
      )}

      {!advice && !loading && !error && (
        <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Click "Get Personalized Advice" to see Zeitgeist in action
          </p>
        </div>
      )}
    </div>
  );
}
