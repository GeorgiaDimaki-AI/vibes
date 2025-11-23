'use client';

import { useState } from 'react';
import { OnboardingProfile } from '@/lib/hooks/useOnboarding';
import { Plus, X } from 'lucide-react';

interface InterestsStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

const popularInterests = [
  'Technology',
  'Fashion',
  'Music',
  'Art',
  'Food',
  'Travel',
  'Sports',
  'Gaming',
  'Business',
  'Health',
  'Science',
  'Entertainment',
  'Design',
  'Photography',
  'Writing',
  'Fitness',
];

export function InterestsStep({ profile, setProfile }: InterestsStepProps) {
  const [customInterest, setCustomInterest] = useState('');

  const toggleInterest = (interest: string) => {
    const interests = profile.interests.includes(interest)
      ? profile.interests.filter((i) => i !== interest)
      : [...profile.interests, interest];
    setProfile({ ...profile, interests });
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !profile.interests.includes(trimmed)) {
      setProfile({ ...profile, interests: [...profile.interests, trimmed] });
      setCustomInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter((i) => i !== interest),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What are you interested in?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select at least 1 topic. We'll boost vibes that match your interests.
        </p>
      </div>

      {/* Selected interests */}
      {profile.interests.length > 0 && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Selected ({profile.interests.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <button
                key={interest}
                onClick={() => removeInterest(interest)}
                className="flex items-center gap-1 px-3 py-1 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 rounded-full text-sm hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors"
                aria-label={`Remove ${interest}`}
              >
                {interest}
                <X size={14} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular interests */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Popular Interests
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {popularInterests.map((interest) => {
            const isSelected = profile.interests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${interest}`}
                aria-pressed={isSelected}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom interest */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Add Custom Interest
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
            placeholder="e.g., Cryptocurrency, Meditation..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            aria-label="Custom interest"
          />
          <button
            onClick={addCustomInterest}
            disabled={!customInterest.trim()}
            className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Add custom interest"
          >
            <Plus size={20} />
            Add
          </button>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Recommended:</strong> Select 3-5 interests for best results.
          You can always update these later.
        </p>
      </div>
    </div>
  );
}
