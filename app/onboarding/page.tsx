'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      <OnboardingWizard />
    </div>
  );
}
