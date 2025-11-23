'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface OnboardingProfile {
  region?: string;
  interests: string[];
  conversationStyle: 'casual' | 'professional' | 'academic' | 'friendly';
}

export function useOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile>({
    region: undefined,
    interests: [],
    conversationStyle: 'casual',
  });

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      // Save profile to backend
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          onboardingCompleted: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      toast.success('Welcome to Zeitgeist!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  return {
    currentStep,
    profile,
    setProfile,
    nextStep,
    prevStep,
    completeOnboarding,
    isCompleting,
  };
}
