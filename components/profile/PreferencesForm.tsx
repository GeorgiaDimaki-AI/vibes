'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/hooks/useUser';
import { Save, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const REGIONS = [
  'north-america',
  'europe',
  'asia',
  'latin-america',
  'middle-east',
  'africa',
  'oceania',
];

const COMMON_INTERESTS = [
  'tech',
  'fashion',
  'music',
  'art',
  'sports',
  'food',
  'travel',
  'gaming',
  'business',
  'science',
  'politics',
  'entertainment',
  'wellness',
  'sustainability',
];

interface PreferencesFormProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
}

export function PreferencesForm({ profile, onUpdate }: PreferencesFormProps) {
  const [region, setRegion] = useState(profile.region || '');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [avoidTopics, setAvoidTopics] = useState<string[]>(profile.avoidTopics || []);
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [newInterest, setNewInterest] = useState('');
  const [newAvoidTopic, setNewAvoidTopic] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim().toLowerCase())) {
      setInterests([...interests, newInterest.trim().toLowerCase()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(prev => prev.filter(i => i !== interest));
  };

  const addAvoidTopic = () => {
    if (newAvoidTopic.trim() && !avoidTopics.includes(newAvoidTopic.trim().toLowerCase())) {
      setAvoidTopics([...avoidTopics, newAvoidTopic.trim().toLowerCase()]);
      setNewAvoidTopic('');
    }
  };

  const removeAvoidTopic = (topic: string) => {
    setAvoidTopics(prev => prev.filter(t => t !== topic));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onUpdate({
        region: region || undefined,
        interests,
        avoidTopics,
        emailNotifications,
      });
      toast.success('Preferences updated successfully!');
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Region */}
      <div>
        <label
          htmlFor="region"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Primary Region
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">Global (All Regions)</option>
          {REGIONS.map(r => (
            <option key={r} value={r}>
              {r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Filter vibes to match your geographic location
        </p>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Interests
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_INTERESTS.map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                interests.includes(interest)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>

        {/* Selected Custom Interests */}
        {interests.filter(i => !COMMON_INTERESTS.includes(i)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {interests
              .filter(i => !COMMON_INTERESTS.includes(i))
              .map(interest => (
                <div
                  key={interest}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded-full"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="ml-1 hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Add Custom Interest */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
            placeholder="Add custom interest"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={addCustomInterest}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vibes matching your interests will be prioritized
        </p>
      </div>

      {/* Avoid Topics */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Topics to Avoid
        </label>
        {avoidTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {avoidTopics.map(topic => (
              <div
                key={topic}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 rounded-full"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeAvoidTopic(topic)}
                  className="ml-1 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newAvoidTopic}
            onChange={(e) => setNewAvoidTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAvoidTopic())}
            placeholder="Add topic to avoid"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={addAvoidTopic}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vibes related to these topics will be filtered out
        </p>
      </div>

      {/* Email Notifications */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="emailNotifications"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
        />
        <label htmlFor="emailNotifications" className="text-sm text-gray-700 dark:text-gray-300">
          Send me email notifications about new features and updates
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Save size={18} />
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  );
}
