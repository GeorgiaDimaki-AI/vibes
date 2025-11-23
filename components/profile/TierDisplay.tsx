'use client';

import { Crown, Zap, TrendingUp, Infinity } from 'lucide-react';

const tierConfig = {
  free: {
    name: 'Free',
    icon: TrendingUp,
    gradient: 'from-gray-400 to-gray-600',
    benefits: [
      'Global cultural graph access',
      'Basic advice generation',
      '5 queries per month',
    ],
  },
  light: {
    name: 'Light',
    icon: Zap,
    gradient: 'from-blue-400 to-blue-600',
    benefits: [
      'Everything in Free',
      'Regional filtering',
      'Interest-based boosting',
      '25 queries per month',
    ],
  },
  regular: {
    name: 'Regular',
    icon: Crown,
    gradient: 'from-purple-400 to-purple-600',
    benefits: [
      'Everything in Light',
      'Advice history tracking',
      'Usage analytics',
      'Learning from feedback',
      '100 queries per month',
    ],
  },
  unlimited: {
    name: 'Unlimited',
    icon: Infinity,
    gradient: 'from-purple-600 to-blue-600',
    benefits: [
      'Everything in Regular',
      'Unlimited queries',
      'API access',
      'Priority support',
    ],
  },
};

interface TierDisplayProps {
  tier: 'free' | 'light' | 'regular' | 'unlimited';
}

export function TierDisplay({ tier }: TierDisplayProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center`}
          >
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
              {config.name} Tier
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current plan
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Benefits
        </h4>
        <ul className="space-y-2">
          {config.benefits.map((benefit, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
            >
              <svg
                className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {tier !== 'unlimited' && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Want more features?
          </p>
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold rounded-lg cursor-not-allowed"
          >
            Upgrade (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );
}
