'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  tier: 'free' | 'light' | 'regular' | 'unlimited';
  queriesThisMonth: number;
  queryLimit: number;
  region?: string;
  interests: string[];
  avoidTopics: string[];
  conversationStyle: 'casual' | 'professional' | 'academic' | 'friendly';
  emailNotifications: boolean;
  shareDataForResearch: boolean;
  createdAt: string;
  lastActive: string;
  onboardingCompleted: boolean;
}

export function useUser() {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useClerkUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [clerkLoaded, isSignedIn, user]);

  return {
    user,
    profile,
    isLoaded: clerkLoaded && !loading,
    isSignedIn,
    loading,
    error,
  };
}
