'use client';

import { OnboardingProfile } from '@/lib/hooks/useOnboarding';
import { LayoutDashboard, History, Heart, User, Home, Network } from 'lucide-react';

interface TourStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

const features = [
  {
    icon: Home,
    title: 'Home',
    description: 'Get instant advice for any social situation',
    color: 'purple',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'View your usage stats, insights, and cultural journey',
    color: 'blue',
  },
  {
    icon: History,
    title: 'History',
    description: 'Review all your past queries and advice received',
    color: 'green',
  },
  {
    icon: Heart,
    title: 'Favorites',
    description: 'Save and organize your favorite vibes and advice',
    color: 'red',
  },
  {
    icon: User,
    title: 'Profile',
    description: 'Manage your preferences, interests, and account settings',
    color: 'yellow',
  },
  {
    icon: Network,
    title: 'Graph',
    description: 'Explore the cultural graph and trending vibes',
    color: 'indigo',
  },
];

export function TourStep({ onComplete }: TourStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You're All Set!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Here's a quick tour of what you can do with Zeitgeist
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 bg-${feature.color}-100 dark:bg-${feature.color}-900/30 rounded-lg`}>
                  <Icon className={`text-${feature.color}-600 dark:text-${feature.color}-400`} size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
          Pro Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400">•</span>
            <span>Rate advice to help improve future recommendations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400">•</span>
            <span>Save your favorite vibes to quickly reference them later</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400">•</span>
            <span>Check the Dashboard to track your cultural insights over time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400">•</span>
            <span>Update your interests anytime to get better personalization</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Ready to navigate the zeitgeist with confidence?
        </p>
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-lg"
        >
          Start Using Zeitgeist
        </button>
      </div>
    </div>
  );
}
