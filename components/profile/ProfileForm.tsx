'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/hooks/useUser';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileFormProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [conversationStyle, setConversationStyle] = useState(profile.conversationStyle);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onUpdate({
        displayName: displayName || undefined,
        conversationStyle,
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="conversationStyle"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Conversation Style
        </label>
        <select
          id="conversationStyle"
          value={conversationStyle}
          onChange={(e) =>
            setConversationStyle(
              e.target.value as 'casual' | 'professional' | 'academic' | 'friendly'
            )
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="casual">Casual</option>
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="academic">Academic</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This affects how advice is presented to you
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Save size={18} />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
