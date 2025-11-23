'use client';

import { OnboardingProfile } from '@/lib/hooks/useOnboarding';

interface StyleStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

const conversationStyles = [
  {
    value: 'casual' as const,
    label: 'Casual',
    icon: '😊',
    description: 'Friendly and relaxed tone',
    example: 'Hey! For that dinner, definitely talk about the latest tech trends...',
  },
  {
    value: 'professional' as const,
    label: 'Professional',
    icon: '💼',
    description: 'Formal and business-like',
    example: 'I recommend discussing industry developments and networking opportunities...',
  },
  {
    value: 'academic' as const,
    label: 'Academic',
    icon: '🎓',
    description: 'Analytical and detailed',
    example: 'Based on current cultural trends, consider exploring topics such as...',
  },
  {
    value: 'friendly' as const,
    label: 'Friendly',
    icon: '🤝',
    description: 'Warm and supportive',
    example: "You'll do great! Here are some conversation starters that work well...",
  },
];

export function StyleStep({ profile, setProfile }: StyleStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Conversation Style
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          How would you like advice to be presented?
        </p>
      </div>

      <div className="space-y-3">
        {conversationStyles.map((style) => {
          const isSelected = profile.conversationStyle === style.value;
          return (
            <button
              key={style.value}
              onClick={() => setProfile({ ...profile, conversationStyle: style.value })}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
              aria-label={`Select ${style.label} style`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl" role="img" aria-hidden="true">
                  {style.icon}
                </span>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    isSelected
                      ? 'text-purple-900 dark:text-purple-200'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {style.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {style.description}
                  </p>
                  <div className={`p-3 rounded-lg text-sm italic ${
                    isSelected
                      ? 'bg-white dark:bg-gray-800'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    "{style.example}"
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Don't worry, you can change this anytime in your profile settings.
        </p>
      </div>
    </div>
  );
}
