'use client';

import { useUser } from '@/lib/hooks/useUser';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PreferencesForm } from '@/components/profile/PreferencesForm';
import { Navigation } from '@/components/Navigation';
import { UserProfile } from '@/lib/hooks/useUser';
import { Loader2, User, Settings } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { profile, loading, error, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Reload the page to refresh the profile
      window.location.reload();
    } catch (error) {
      throw error;
    }
  };

  if (!isSignedIn) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Please sign in
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You need to be signed in to view your profile
            </p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-600" size={48} />
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">{error || 'Failed to load profile'}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your profile and preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <User size={18} />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Settings size={18} />
              Preferences
            </button>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            {activeTab === 'profile' && (
              <ProfileForm profile={profile} onUpdate={handleUpdateProfile} />
            )}
            {activeTab === 'preferences' && (
              <PreferencesForm profile={profile} onUpdate={handleUpdateProfile} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
