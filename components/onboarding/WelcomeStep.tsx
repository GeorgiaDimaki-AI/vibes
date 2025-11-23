'use client';

import { Sparkles, Zap, TrendingUp, Shield } from 'lucide-react';
import { OnboardingProfile } from '@/lib/hooks/useOnboarding';

interface WelcomeStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">✨</div>
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        Welcome to Zeitgeist
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Your personal cultural advisor that helps you navigate any social situation with confidence
      </p>

      {/* Value propositions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
        <div className="flex gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Sparkles className="text-purple-600 dark:text-purple-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Culturally Aware Advice
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get recommendations on topics, behavior, and style based on current trends
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Zap className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Personalized for You
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tailored to your region, interests, and communication style
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <TrendingUp className="text-green-600 dark:text-green-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Track Your Journey
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Save favorites and see your cultural insights over time
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <Shield className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Privacy First
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your data is yours. No selling, no tracking beyond improving your experience
            </p>
          </div>
        </div>
      </div>

      {/* Tier benefits */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          You are on the Free tier
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Get 5 queries per month with basic advice. Upgrade anytime for regional filtering,
          interest matching, and unlimited queries.
        </p>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Let's set up your profile in just a few steps (takes less than 2 minutes)
      </p>
    </div>
  );
}
