'use client';

import { useState } from 'react';
import { OnboardingProfile } from '@/lib/hooks/useOnboarding';
import { MapPin, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface RegionStepProps {
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
  onNext: () => void;
  onComplete?: () => void;
}

const regions = [
  { value: 'global', label: 'Global', icon: '🌍' },
  { value: 'north_america', label: 'North America', icon: '🗽' },
  { value: 'europe', label: 'Europe', icon: '🇪🇺' },
  { value: 'asia', label: 'Asia', icon: '🌏' },
  { value: 'latin_america', label: 'Latin America', icon: '🌎' },
  { value: 'middle_east', label: 'Middle East', icon: '🕌' },
  { value: 'africa', label: 'Africa', icon: '🌍' },
  { value: 'oceania', label: 'Oceania', icon: '🦘' },
];

export function RegionStep({ profile, setProfile, onNext }: RegionStepProps) {
  const [isDetecting, setIsDetecting] = useState(false);

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      // Try to get user's timezone and map to region
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Simple mapping based on timezone
      let detectedRegion = 'global';
      if (timezone.includes('America')) {
        if (timezone.includes('Argentina') || timezone.includes('Brazil') || timezone.includes('Chile') || timezone.includes('Mexico')) {
          detectedRegion = 'latin_america';
        } else {
          detectedRegion = 'north_america';
        }
      } else if (timezone.includes('Europe')) {
        detectedRegion = 'europe';
      } else if (timezone.includes('Asia')) {
        detectedRegion = 'asia';
      } else if (timezone.includes('Australia') || timezone.includes('Pacific')) {
        detectedRegion = 'oceania';
      }

      setProfile({ ...profile, region: detectedRegion });
      toast.success('Region detected!');
    } catch (error) {
      toast.error('Could not auto-detect region');
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🗺️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Select Your Region
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We'll prioritize cultural trends relevant to your area
        </p>
      </div>

      <button
        onClick={handleAutoDetect}
        disabled={isDetecting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
        aria-label="Auto-detect region"
        aria-busy={isDetecting}
      >
        <MapPin size={20} />
        {isDetecting ? 'Detecting...' : 'Auto-detect from timezone'}
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {regions.map((region) => (
          <button
            key={region.value}
            onClick={() => setProfile({ ...profile, region: region.value })}
            className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${
              profile.region === region.value
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
            }`}
            aria-label={`Select ${region.label}`}
            aria-pressed={profile.region === region.value}
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              {region.icon}
            </span>
            <span className={`text-sm font-medium ${
              profile.region === region.value
                ? 'text-purple-900 dark:text-purple-200'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {region.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> This helps filter vibes relevant to your region.
          You can always change this in your profile settings.
        </p>
      </div>
    </div>
  );
}
